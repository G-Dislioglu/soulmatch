# SESSION-STATE

**Letzte Session:** S31 (2026-04-18)
**Handoff:** `docs/HANDOFF-S30.md`
**Repo-Head:** `20bc008`

## Aktive Entscheidungen

- **Pipeline-Executor-Pfade:** `/opus-feature` (kanonisch, volle Pipeline inkl. Denker-Triade), `/opus-task` (Quick-Modus, deterministischer Scope), `/build` (legacy Wrapper um `executeTask`)
- **Maya-Routing:** `determineBuildMode()` in `builderFusionChat.ts`:233 entscheidet autonom zwischen Quick und Pipeline. Triggers für Pipeline: taskType S (Architektur), risk=high, "deep mode"/"pipeline" keywords, multi-file signals, 3+ distinkte File-Pfade, taskType D+medium, taskType C (Frontend+Backend kombiniert). Sonst Quick.
- **Council-Rollen:** Architekt/Skeptiker/Pragmatiker round-robin auf Council-Pool-Models via `COUNCIL_ROLES` + `buildCouncilParticipants()`, Maya moderiert, hard ceiling 5 Runden
- **Worker-Pool:** GLM 5.1, GLM 5 Turbo, GLM 4.7 FlashX (Zhipu-direkt-Routes entfernt, GLM läuft über OpenRouter)
- **Patrol:** 6 Deep-Modelle (GLM-5.1, GLM-5-Turbo, GPT-5.4, Sonnet 4.6, DeepSeek-R, Kimi), 3 Routine-Scouts
- **Agent Habitat:** `builder_agent_profiles` DB-Tabelle aktiv, Post-Task-Loop läuft via `updateAgentProfiles()`, `buildAgentBrief()` wird in Worker-Prompts injiziert (`opusWorkerSwarm.ts`:594), `reflectOnTask()` nach jedem Task mit GLM-5-Turbo
- **TSC-Auto-Retry:** 3 Versuche max in `runTscCompileCheck`-Loop (`opusBridgeController.ts`:920–980); funktioniert in `decomposer-direct` und `auto-decomposer` Pfaden; Roundtable-only-Pfad noch ohne Retry (Lücke, siehe Offene Tasks)
- **Pipeline-Monitoring:** Live-Polling pro Pool via `PoolChatWindow` (Maya/Council/Destillierer/Worker/Scout)
- **Denker-Triade:** Vordenker (`opusVordenker.ts`) pre-scan live, Mitdenker deferred v4.1, Nachdenker via `reflectOnTask()` in `agentHabitat.ts`:184
- **Deploy-Pipeline (ab S30):** `render-deploy.yml` ist alleinverantwortlich für Deploys. `/git-push` triggert nur Contents-API-Push, kein `triggerRedeploy()` mehr (Fix in S30, Commit `58887c7`). Manuelle Redeploys nur via `POST /render/redeploy`.
- **Token-Limits:** Worker + Meister beide 100000 (aus S24)
- **Anchor-Patch:** 5 Modi in `opusWorkerSwarm.ts` (insert-after, insert-before, replace-block, patch, overwrite) aus S24
- **LIVE-PROBE Disclaimer-Token:** `localStorage.setItem('soulmatch_disclaimer_v2', 'accepted')` — Wert ist `'accepted'`, nicht `'true'`
- **Pre-Push TSC-Check (Render-strikt):** `cd client && npx tsc -b` und `cd server && npx tsc --noEmit` obligatorisch vor `/git-push` (Render ist strikt mit noUnusedParameters)
- **Regie-Regel:** Claude soll Builder-Infrastruktur (`/opus-feature`, `/opus-task`, `/git-push`) für Code- und Doku-Änderungen nutzen statt manuell via create_file/str_replace — das spart Tool-Budget und demonstriert die Pipeline

## Offene Tasks

1. **TSC-Retry Roundtable-Pfad schließen** — Im Roundtable-only-Pfad `tscRetryContext` aus Roundtable-Patches synthetisieren und an Decomposer delegieren. Schließt Schritt 6 auf 100%. ~30 Min.
2. **Block 5d PR #2 — Context-Split** — Maya-Guide via React Context statt Prop-Drilling. ~45 Min. `lostpointercapture` + Click-Debounce sind schon in PR #1 enthalten.
3. **Maya-Core nächsten Block schneiden** — maya-core STATE.md `next_recommended_block` ist explizit "Noch nicht öffentlich neu geschnitten" seit 2026-04-05. Produktentscheidung nötig.
4. **[DONE 2026-04-18] DNS-cache-overflow Hardening** — `undici`-Dispatcher + `dns.setDefaultResultOrder('ipv4first')` + `setDefaultAutoSelectFamily(false)` in `server/src/lib/outboundHttp.ts`. 7 Hotpath-Files auf `outboundFetch` umgestellt (`f6b080f`+`5300975`). Live auf `20bc008`. Verifiziert via zwei `/git-push` Probes (`70156d1`, `20bc008`), beide HTTP 200 in ~1.5s, keine DNS-overflow mehr. Probe-Artefakte in `docs/S31-PROBE-20260418.md` und `docs/S31-PROBE-20260418-2.md`.
4a. **[OPEN S31] Outbound-HTTP Observability** — In `outboundFetch` + `/git-push`-Handler fehlen Request-ID, Zielhost-Logging, Error-Signatur, Dauer. Wenn der Bug wiederkommt, ist Diagnose so blind wie gestern. Plan: `requestId` generieren, `{requestId, method, host, durationMs, status}` loggen, bei Fehler zusätzlich `{errName, errCode, errCause}`. Nur lesend, keine Verhaltensänderung. ~20 Min.
4b. **[PROCESS S31] Agent-Lapsus dokumentieren** — `f6b080f` wurde gepusht ohne dass der vorgeschriebene `cd server && npx tsc --noEmit` Pre-Push-Check lief, obwohl diese Regel explizit in SESSION-STATE.md steht. Resultat: Render-Build failed, `b99b663` docs-Sync erbte den kaputten Build, erst `5300975` nachzog. Tooling-Frage: sollte der Pre-Push-Check in den Agent-Workflow eingebaut sein statt als Disziplin-Regel?
5. **Async Job-Pattern für /opus-task** (aus S24, noch offen) — löst Render 60s Timeout bei großen Tasks.
6. **Patrol Finding Auto-Fix** (aus S24, noch offen) — Pipeline automatisch Fixes für Patrol-Findings generieren.
7. **Docs-Consolidation Rest:** `opus-bridge-v4-spec.md` Status-Abgleich, `MAYA-BUILDER-AUSBAU-BLUEPRINT-v2.md` + `MAYA-BUILDER-CONTRACT.md` Aktualität prüfen.

## Reuse-First Regel (aus S24)

- R1: Search Before Build — immer zuerst grep/search ob Feature schon existiert
- R2: Copy Over Abstract — bestehende Patterns wiederverwenden, keine premature generalization
- R3: Proof Obligation — Behauptungen über Code-Stand mit grep/test belegen, nicht aus Memory beanspruchen

## Session-Historie-Lücke

S22, S23, S26, S27, S28, S29 haben keine Handoff-Files im Repo. Kontext-Rekonstruktion nur via Memory-Einträge + Code-Befunde. Für neue Chats: `STATE.md` + `docs/HANDOFF-S30.md` zuerst, dann bei Bedarf `HANDOFF-S25.md` und `HANDOFF-2026-04-12-PIPELINE-COMPLETE.md` für Pipeline-Geschichte.
