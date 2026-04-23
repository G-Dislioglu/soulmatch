#!/usr/bin/env bash
# tools/wait-for-deploy.sh
#
# Polls the live Render deployment until it returns HTTP 200 and, optionally,
# serves the expected commit hash.
# Run this after every push to main to confirm the deploy succeeded.
#
# Usage:
#   bash tools/wait-for-deploy.sh
#   EXPECT_COMMIT=$(git rev-parse HEAD) bash tools/wait-for-deploy.sh
#   DEPLOY_RESOLVE_IP=216.24.57.7 EXPECT_COMMIT=$(git rev-parse HEAD) bash tools/wait-for-deploy.sh
#
# Exit codes:
#   0  — deployment is live and healthy
#   1  — timed out without a matching healthy deployment; the workflow stays red
#        even if Render finishes shortly afterwards because this script enforces
#        strict live-verify semantics rather than fire-and-forget deploys
#
# Drift 13 note (2026-04-20):
#   Two paths resolve to "deployment healthy":
#     (a) LIVE_COMMIT == EXPECTED_COMMIT (the normal case)
#     (b) LIVE_COMMIT is a descendant of EXPECTED_COMMIT, i.e. the session-log
#         backfill hook from S34 pushed a docs-only commit on top of the code
#         commit. Render auto-deploys the newest head (the backfill), so the
#         live commit SHA differs from the expected one even though the code
#         change is live. Without the ancestor check all S35 code commits
#         (1065cd3, 01e35e2, 8a4317d, 52b7e28) marked the CI workflow as
#         FAILED after a 10min timeout even though the container ran the new
#         code. See docs/CLAUDE-CONTEXT.md drift 13 entry.
#   The ancestor check needs full git history on the runner, so render-deploy.yml
#   was updated with fetch-depth: 0 in the same commit (859d980).

set -euo pipefail

URL="${DEPLOY_URL:-https://soulmatch-1.onrender.com/api/health}"
EXPECTED_COMMIT="${EXPECT_COMMIT:-}"
RESOLVE_IP="${DEPLOY_RESOLVE_IP:-}"
MAX_SECONDS="${DEPLOY_WAIT_SECONDS:-420}"   # default: 7 minutes
INTERVAL="${DEPLOY_POLL_INTERVAL:-15}"
ELAPSED=0
ATTEMPTS=0
HOST=$(printf '%s' "$URL" | sed -E 's#https?://([^/]+).*#\1#')

echo ""
echo "  Waiting for live deploy"
echo "  URL:      $URL"
if [ -n "$EXPECTED_COMMIT" ]; then
  echo "  Commit:   $EXPECTED_COMMIT"
fi
if [ -n "$RESOLVE_IP" ]; then
  echo "  Resolve:  $HOST -> $RESOLVE_IP"
fi
echo "  Interval: ${INTERVAL}s"
echo "  Timeout:  ${MAX_SECONDS}s"
echo ""

while [ "$ELAPSED" -lt "$MAX_SECONDS" ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  TIMESTAMP=$(date '+%H:%M:%S')

  CURL_ARGS=(-s --max-time 10)
  if [ -n "$RESOLVE_IP" ]; then
    CURL_ARGS+=(--resolve "$HOST:443:$RESOLVE_IP")
  fi

  BODY=$(curl "${CURL_ARGS[@]}" "$URL" 2>/dev/null || true)
  STATUS=$(printf '%s' "$BODY" | node -e "
    const input = require('fs').readFileSync(0, 'utf8').trim();
    if (!input) {
      process.stdout.write('000');
      process.exit(0);
    }
    try {
      const data = JSON.parse(input);
      process.stdout.write(data && data.status === 'ok' ? '200' : '500');
    } catch {
      process.stdout.write('000');
    }
  ")

  LIVE_COMMIT=$(printf '%s' "$BODY" | node -e "
    const input = require('fs').readFileSync(0, 'utf8').trim();
    if (!input) {
      process.stdout.write('');
      process.exit(0);
    }
    try {
      const data = JSON.parse(input);
      process.stdout.write(String(data.commit || data.gitCommit || ''));
    } catch {
      process.stdout.write('');
    }
  ")

  if [ "$STATUS" = "200" ]; then
    if [ -z "$EXPECTED_COMMIT" ] || [ "$LIVE_COMMIT" = "$EXPECTED_COMMIT" ]; then
      echo "  ✅ [$TIMESTAMP] Deploy live — commit ${LIVE_COMMIT:-unknown} (after ${ELAPSED}s / ${ATTEMPTS} attempt(s))"
      echo ""
      exit 0
    fi

    # Accept backfill-on-top case: the live commit may be a descendant of the
    # expected code commit because the session-log hook pushed a docs-only
    # backfill immediately afterwards.
    # Refresh refs here because LIVE_COMMIT may have been pushed after the
    # runner's initial checkout.
    git fetch --quiet origin main 2>/dev/null || true
    if [ -n "$LIVE_COMMIT" ] && git merge-base --is-ancestor "$EXPECTED_COMMIT" "$LIVE_COMMIT" 2>/dev/null; then
      echo "  ✅ [$TIMESTAMP] Deploy live — commit ${LIVE_COMMIT} is descendant of expected ${EXPECTED_COMMIT} (session-log backfill detected, accepting)"
      echo ""
      exit 0
    fi

    echo "  ⏳ [$TIMESTAMP] HTTP 200 but still on commit ${LIVE_COMMIT:-unknown} — waiting for $EXPECTED_COMMIT"
  else
    echo "  ⏳ [$TIMESTAMP] HTTP $STATUS — next check in ${INTERVAL}s (${ELAPSED}s elapsed)"
  fi

  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "  ❌ Deploy did not become healthy within ${MAX_SECONDS}s."
echo "     Last status: HTTP $STATUS"
if [ -n "$EXPECTED_COMMIT" ]; then
  echo "     Expected commit: $EXPECTED_COMMIT"
  echo "     Live commit:     ${LIVE_COMMIT:-unknown}"
fi
echo "     Check the Render dashboard for build/deploy errors."
echo ""
exit 1
