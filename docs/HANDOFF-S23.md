<!--
HANDOFF-S23.md — Wiederhergestellt am 2026-04-20 abends (S35).
Original lag als `undefined` im Repo-Root (Bridge-Push-Bug bei ursprünglichem Commit 6ff65f9 hat den Dateipfad nicht korrekt gesetzt — siehe Drift 14 in docs/CLAUDE-CONTEXT.md). Der Inhalt unten ist unverändert aus der Original-Datei übernommen. Die `undefined`-Datei im Repo-Root sollte via `git rm` entfernt werden.
-->

# HANDOFF S23 — Scout Patrol UI + Pipeline-Upgrade

**Datum:** 14.04.2026
**Vorgänger:** HANDOFF-S22.md

---

## Erledigt in S23

### 1. Regex-Fix in `looksLikeTaskRequest` (builderFusionChat.ts)
- `fueg` → `fuege?` — erkennt jetzt "füge" und "fuege"
- Worker-Bug gefixt: `.test(normalized)` war entfernt worden → immer `true` → wiederhergestellt
- Commits: `767cf32`, `6a7c9ba`

### 2. Patrol Backend-Endpoints (opusBridge.ts)
- `GET /patrol-status` → totalFindings, bySeverity, lastRound, triaged, crossConfirmed
- `GET /patrol-findings` → Findings-Liste mit Severity-Filter, Limit
- Datenquelle: `builder_error_cards` Tabelle
- Copilot hat die Endpoints sauber in opusBridge.ts integriert (Commit `c7f53e0`)

### 3. PatrolConsole UI (PatrolConsole.tsx)
- Eigene React-Komponente unter `client/src/modules/M16_builder/ui/PatrolConsole.tsx`
- Dark Theme, Severity-Filter (Alle/Kritisch/Hoch/Mittel/Niedrig/Info)
- Expandierbare Finding-Cards mit Problem/Lösung/betroffene Dateien
- Deep Patrol Trigger-Button (🔬 Deep Analyse) pro Finding
- Route: `/patrol?opus_token=...`
- Barrel-Export in `M16_builder/index.ts`

### 4. Patrol als 6. Pool in BuilderConfigPanel
- PoolType um `'patrol'` erweitert
- Pool-Karte mit Orange-Akzent (#ff8c42)
- Reused Scout-Models für Deep-Analyse

### 5. Worker Token-Limits aufgehoben
- `opusWorkerSwarm.ts`: maxTokens von 6000 → 100000
- Bestätigt: Minimax liefert jetzt 17.491 chars Output (vorher max 6000)
- Pipeline kann Files bis ~400 Zeilen zuverlässig verarbeiten

### 6. SESSION-STATE.md aktualisiert
- S23-Block via opus-task (Worker: Qwen) deployed

### 7. opus-status Endpoint
- Fix deployed via opus-task (Worker: Minimax) — zeigt jetzt reale Token-Limits

### 8. Cleanup & Build-Fix
- Render-Hänger (8h stuck deploy) gelöst via Manual Deploy + Build Cache Clear
- 5 obsolete Müll-Dateien entfernt (patrolMount.ts, fileReader.ts, patrol.ts, patrolApi.ts, patrolRoutes.ts)
- Broken import in opusVordenker.ts entfernt

---

## Live-Status nach S23

| System | Wert |
|--------|------|
| Patrol Findings | 166 total: 3 critical, 27 high, 67 medium, 59 low, 10 info |
| Patrol Rounds | Automatisch alle 60 Min |
| Deep Patrol Models | 6 registriert |
| Token Limits | 100.000 (Worker + Meister) |
| Pipeline Success | PatrolConsole (320Z), ConfigPanel (323Z) — beide per opus-task |
| Builder Pools | 6: Maya, Council, Distiller, Worker, Scout, Patrol |

---

## Bekannte offene Punkte

1. **Maya Chat-Endpoint nicht erreichbar per API** — Auth-Pattern unklar (`/api/builder/chat` gibt 404). Chat funktioniert über die UI, aber kein programmatischer Test möglich.
2. **Render Request-Timeout ~30-60s** — Lange opus-tasks (>90s Swarm-Phase) liefern HTML statt JSON zurück. Workaround: dryRun → Content extrahieren → git-push.
3. **opusBridge.ts (1400 Zeilen)** — Weiterhin zu groß für Full-File-Overwrite. Nächster Schritt: Anchor-Patch-Modus (insert-after mit Ankerstelle statt komplette Datei).
4. **BuilderStudioPage.tsx (1600 Zeilen)** — Nur per Copilot editierbar.
5. **Patrol-Route in BuilderStudioPage** — Patrol-Karte und Scout Console Block in der Builder UI fehlen noch (innerhalb der 1600-Zeilen-Datei).

---

## Nächste Session (S24) — Empfohlene Prioritäten

1. **Anchor-Patch-Modus** für die Pipeline — größter Hebel
2. **Patrol-Karte in BuilderStudioPage** (per Copilot)
3. **Deep Patrol Backend** testen — POST trigger-deep Endpoint verifizieren
4. **Maya Chat-Intent** in der UI testen (Bauauftrag vs. Frage)

---

## Workflow-Reminder

- **Regie-Rolle:** Claude gibt Builder-Calls, kein manuelles Repo-Clonen
- **dryRun→git-push:** Bewährter Workaround für Render-Timeouts
- **Token-Auth:** `opus_token=opus-bridge-2026-geheim`
- **TypeScript-Check vor Push:** `cd client && npx tsc -b` + `cd server && pnpm build`
- **opusBridge.ts zu groß:** Nur per Copilot oder Anchor-Patch
