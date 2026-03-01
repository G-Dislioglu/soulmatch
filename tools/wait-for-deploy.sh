#!/usr/bin/env bash
# tools/wait-for-deploy.sh
#
# Polls the live Render deployment until it returns HTTP 200 or times out.
# Run this after every push to main to confirm the deploy succeeded.
#
# Usage:
#   bash tools/wait-for-deploy.sh
#
# Exit codes:
#   0  — deployment is live and healthy
#   1  — timed out (10 minutes) without a 200 response

set -euo pipefail

URL="${DEPLOY_URL:-https://soulmatch-1.onrender.com/api/meta}"
MAX_SECONDS=600   # 10 minutes
INTERVAL=30
ELAPSED=0
ATTEMPTS=0

echo ""
echo "  Waiting for live deploy"
echo "  URL:      $URL"
echo "  Interval: ${INTERVAL}s"
echo "  Timeout:  $((MAX_SECONDS / 60)) minutes"
echo ""

while [ "$ELAPSED" -lt "$MAX_SECONDS" ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  TIMESTAMP=$(date '+%H:%M:%S')

  # curl: -s silent, -o discard body, -w print status code, --max-time abort after 10s
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null || echo "000")

  if [ "$STATUS" = "200" ]; then
    echo "  ✅ [$TIMESTAMP] Deploy live — $URL returned 200 (after ${ELAPSED}s / ${ATTEMPTS} attempt(s))"
    echo ""
    exit 0
  fi

  echo "  ⏳ [$TIMESTAMP] HTTP $STATUS — next check in ${INTERVAL}s (${ELAPSED}s elapsed)"

  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "  ❌ Deploy did not become healthy within $((MAX_SECONDS / 60)) minutes."
echo "     Last status: HTTP $STATUS"
echo "     Check the Render dashboard for build/deploy errors."
echo ""
exit 1
