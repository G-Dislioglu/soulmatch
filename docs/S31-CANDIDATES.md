# S31 Candidates

- Status: partially adopted; S31 Task 4a implemented and live-probed, false-positive pipeline path (Schritte A, C, D) still open as of S34 (2026-04-20)
- Source: external Claude handoff from 2026-04-17, validated against current repo before adoption

## Session-Tracking

- **S31 (2026-04-18):** Task 4a geliefert (Outbound-HTTP-Observability in `server/src/lib/outboundHttp.ts`, `efa5e5e`). Live-Probe landete als `docs/S31-OBSERVABILITY-VERIFIED.md` (`7a4b550`). Atomare Mehrdatei-Commits in `/git-push` via GitHub Git Data API (`363d416` → `ad8abd0`).
- **S32 (2026-04-19):** Kein direkter Fortschritt am S31-Fix. Parallelarbeit an Beings, Render-Deploy-Optimierung (paths-ignore), Anti-Drift-System Phase 1 (CLAUDE-CONTEXT.md + Session-Close-Template + dieser Spec-Block).
- **S33 (2026-04-19):** Zhipu-Pool-Konsolidierung + F7 Pool-Config-Persistenz. Kein direkter S31-Fortschritt.
- **S34 (2026-04-20 morgens):** Session-Log-Endpoint live inkl. SHA-Backfill. Kein direkter S31-Fortschritt.

**Weiterhin offen:** Schritte A (SHA-Verify in `opusSmartPush.ts`), C (Workflow-Härtung in `builder-executor.yml`, Abort bei leerem Diff), D (Orchestrator-Status-Treue). Das ist der explizit empfohlene nächste Block nach S34.

## Current State

- S31 Task 4a is now repo-visible: `server/src/lib/outboundHttp.ts` wraps `undici.fetch` with host-only success/error observability, request IDs, durations and `OUTBOUND_HTTP_QUIET` opt-out (`efa5e5e`).
- Hard pre-push checks were executed before the feature push: `cd client && npx tsc -b` and `cd server && npx tsc --noEmit` both green.
- Live builder-path probe is repo-visible: a deployed `/git-push` call wrote `docs/S31-OBSERVABILITY-VERIFIED.md` and landed as `7a4b550` on `main`.
- Still open: Render-console proof for the emitted `[outbound]` / `[outbound-err]` lines was not directly readable from this tool context, and the broader S31 false-positive pipeline path documented below remains unfixed.

## Inspection Report

- Hypothese: TEILWEISE BESTAETIGT
- 1. Workflow-Apply-Step: [.github/workflows/builder-executor.yml](../.github/workflows/builder-executor.yml) lines 36-40 and 66-71 use an inline `node -e` script; there is no external apply script. Excerpt: `- name: Apply patches` ... `if (updated === current) { console.error('REPLACE_FAILED', patch.file); process.exit(1); }`.
- 2. No-op/commit handling: [.github/workflows/builder-executor.yml](../.github/workflows/builder-executor.yml) lines 139-143 explicitly treat empty staged diff as green exit. Excerpt: `CHANGES=$(git diff --cached --name-only | wc -l)` ... `echo "No changes to commit"` ... `exit 0`.
- 3. Patch payload normalization: [server/src/routes/opusBridge.ts](../server/src/routes/opusBridge.ts) lines 867-874 convert `/push` search/replace input into a real replace action. Excerpt: `action: 'replace' as const, oldText: f.search, newText: f.replace`.
- 4. Dispatch semantics only: [server/src/lib/builderGithubBridge.ts](../server/src/lib/builderGithubBridge.ts) lines 62-63 return success on dispatch acceptance alone. Excerpt: `if (response.status === 204 || response.status === 200) { return { triggered: true }; }`.
- 5. smartPush success signal: [server/src/lib/opusSmartPush.ts](../server/src/lib/opusSmartPush.ts) lines 102-109 return `pushed: errors.length === 0` with no SHA or commit verification.
- 6. orchestrateTask propagation: [server/src/lib/opusTaskOrchestrator.ts](../server/src/lib/opusTaskOrchestrator.ts) lines 322-326 map `push.pushed` directly to phase status and partial/fail behavior. Excerpt: `status: push.pushed ? 'ok' : 'error'`.
- Tatsächlicher Fail-Mode: ein nicht matchender `replace`-Patch sollte im Workflow rot scheitern; der repo-belegte false-positive path ist stattdessen `dispatch accepted` plus spaeter `No changes to commit` with `exit 0`, waehrend `smartPush` schon vorher `pushed: true` gesetzt hat.
- Erste Fix-Empfehlung: engster erster Hebel ist `opusSmartPush.ts`, weil dort `dispatch accepted` sofort zu Produkt-`success` aufgewertet wird, obwohl der Workflow spaeter noch ohne Commit gruen enden kann.

## Vollstaendiger S31 Prompt

```text
TITEL: Fix false-positive success in /opus-task + /opus-feature pipeline

PROBLEM (S30 finding, 2026-04-17):
Die Pipeline meldete status: 'success' fuer einen /opus-feature-Task (feat-mo38m9f0-jyy1, 
DNS-hardening auf server/src/index.ts). Aber kein Code-Commit landete auf main. 
Nur der automatische Regen-Index-Folgeauftrag (516af17) erschien in der Git-History.

Root-Cause-Kette:
1. orchestrateTask ruft pushEdits → smartPush → internal /push-Endpoint
2. /push dispatcht GitHub Action via repository_dispatch ('builder-task')
3. /push returned {triggered: true} = "Dispatch-Event gesendet"
4. smartPush setzt pushed = (errors.length === 0) → true, auch ohne realen Commit
5. GitHub Action (#1162) lief 1m 9s und endete GRUEN, aber ohne Code-Diff
   (vermutlich: replace-Patch-oldText wurde nicht gefunden → Action toleriert no-op als Erfolg)
6. Parallel fire-and-forget regenerateRepoIndex() triggerte separaten Commit → falscher Anschein eines Deploys
7. orchestrateTask aggregiert phases.every(p => ok||skipped) → status: 'success'

ZU AENDERNDE DATEIEN:
1. server/src/lib/opusSmartPush.ts
2. server/src/lib/opusTaskOrchestrator.ts  
3. .github/workflows/builder-executor.yml (oder wie auch immer der Workflow heisst, 
   der repository_dispatch='builder-task' empfaengt)

FIX PLAN:

Schritt A — SHA-Verify in smartPush:
- Vor dem /push-Call: GET https://api.github.com/repos/G-Dislioglu/soulmatch/commits/main 
  → preSha (erste 7 Zeichen)
- Nach /push-Dispatch: 3x polling alle 15s → postSha
- Return pushed: true NUR wenn postSha !== preSha UND postSha content matches expected files
- Wenn postSha === preSha nach 45s: return pushed: false, error: 'dispatch succeeded but no commit landed within 45s — likely apply phase failed silently'

Schritt B — asyncDispatch Semantik klaeren:
- Aktuell: asyncDispatch: true heisst "Action laeuft asynchron, wir wissen nicht ob Commit kam"
- Neu: asyncDispatch + SHA-Verify aus Schritt A ersetzen das. pushed = true IFF commit exists.
- deploy-wait Phase kann dann auf pushed.realCommitSha warten statt auf Render-HTTP-Polling

Schritt C — GitHub Action haerten:
- Der Apply-Step (node scripts/apply-patches.mjs oder wie auch immer) muss mit Exit 1 abbrechen, 
  wenn auch nur ein einzelner Patch seinen anchor/oldText nicht findet
- Keine silent-no-op-Toleranz
- Commit-Step nur wenn git diff --cached nicht-leer ist; sonst Exit 1 mit klarer Fehlermeldung

Schritt D — orchestrateTask phase-status:
- phases.push({phase: 'push', status: push.pushed ? 'ok' : 'error', ...}) bleibt so
- Aber: push.pushed entspricht nach Schritt A jetzt der Realitaet
- allOk-Check wird damit automatisch korrekt

AKZEPTANZKRITERIUM:
- /opus-feature mit nicht-applicable-Patch → status: 'partial' oder 'failed' (nicht 'success')
- /opus-feature mit gueltigem Patch → status: 'success' UND git log main zeigt den Commit
- builder-executor Action mit leerem Diff → Action-Status: failure (nicht success)

VORSICHT:
- Rate-Limit der GitHub Contents API beim SHA-polling (bei hoher Frequenz auf 5000/h begrenzt) 
  → OAuth-Token im Env schon vorhanden (GITHUB_TOKEN)? Falls nicht → auth via PAT aus secrets
- Nicht mit dem TSC-Retry-Mechanismus von f6b6990 interferieren — der baut auf tscRetryContext auf, 
  nicht auf push-phase-status
- regenerateRepoIndex() fire-and-forget soll bleiben, aber nur triggern wenn push.pushed === true 
  (nach neuer Semantik, also realer Commit)

TEST:
Manuell nachstellen: 
/opus-feature mit intent das absichtlich einen nicht-existenten Anchor vorschreibt 
(z.B. "fuege Code nach der Zeile UNIQUE_MARKER_THAT_DOES_NOT_EXIST ein") 
→ erwartet: status !== 'success', klare Fehlermeldung in summary
```

## Note

Die Inspection hat den Kernbefund bestaetigt, aber den vermuteten Mechanismus praezisiert: der repo-belegte False-Positive-Path ist aktuell eher `dispatch accepted + no staged diff + exit 0` als ein still toleriertes `REPLACE_FAILED`.