# SESSION-STATE

**Letzte Session:** S34 (2026-04-20, erweitert um Docs-Audit + workerProfiles-Fix)
**Handoff:** `docs/HANDOFF-S34b.md`
**Repo-Head:** Code-Commits `b6fa46f` (S34 PUT-Fix), `01e35e2` (workerProfiles Model-IDs), Follow-up-Backfills `9c72a6f` und `9cf39f8`, Docs-Audit-Commits `aecf53d` + `6ca04e9` + `92bcb61`. Live: `9cf39f8`.

## Aktive Entscheidungen

- **Pipeline-Executor-Pfade:** `/opus-feature` (kanonisch, volle Pipeline inkl. Denker-Triade), `/opus-task` (Quick-Modus, deterministischer Scope), `/build` (legacy Wrapper um `executeTask`)
- **Maya-Routing:** `determineBuildMode()` in `builderFusionChat.ts`:233 entscheidet autonom zwischen Quick und Pipeline. Triggers für Pipeline: taskType S (Architektur), risk=high, "deep mode"/"pipeline" keywords, multi-file signals, 3+ distinkte File-Pfade, taskType D+medium, taskType C (Frontend+Backend kombiniert). Sonst Quick.
- **Council-Rollen:** Architekt/Skeptiker/Pragmatiker round-robin auf Council-Pool-Models via `COUNCIL_ROLES` + `buildCouncilParticipants()`, Maya moderiert, hard ceiling 5 Runden
- **Worker-Pool:** GLM 5 Turbo, GLM 5.1, MiniMax M2.7, Kimi K2.5, Qwen 3.6+ (Zhipu-direkt via `poolState.ts`, keine Free-Tier-Modelle; Destillierer und Scouts nutzen GLM 4.7 FlashX statt Flash wegen Data-Collection)
- **Patrol:** 6 Deep-Modelle (GLM-5.1, GLM-5-Turbo, GPT-5.4, Sonnet 4.6, DeepSeek-R, Kimi), 3 Routine-Scouts
- **Agent Habitat:** `builder_agent_profiles` DB-Tabelle aktiv, Post-Task-Loop läuft via `updateAgentProfiles()`, `buildAgentBrief()` wird in Worker-Prompts injiziert (`opusWorkerSwarm.ts`:594), `reflectOnTask()` nach jedem Task mit GLM-5-Turbo
- **TSC-Auto-Retry:** 3 Versuche max in `runTscCompileCheck`-Loop (`opusBridgeController.ts`:920–980); funktioniert in `decomposer-direct` und `auto-decomposer` Pfaden; Roundtable-only-Pfad noch ohne Retry (Lücke, siehe Offene Tasks)
- **Pipeline-Monitoring:** Live-Polling pro Pool via `PoolChatWindow` (Maya/Council/Destillierer/Worker/Scout)
- **Denker-Triade:** Vordenker (`opusVordenker.ts`) pre-scan live, Mitdenker deferred v4.1, Nachdenker via `reflectOnTask()` in `agentHabitat.ts`:184
- **Deploy-Pipeline (ab S30):** `render-deploy.yml` ist alleinverantwortlich für Deploys. `/git-push` triggert weiterhin kein `triggerRedeploy()` mehr (Fix in S30, Commit `58887c7`), erzeugt GitHub-Commits jetzt aber direkt ueber die Git Data API und kann Mehrdatei-Payloads atomar in genau einem Commit schreiben. Manuelle Redeploys nur via `POST /render/redeploy`.
- **Token-Limits:** Worker + Meister beide 100000 (aus S24)
- **Anchor-Patch:** 5 Modi in `opusWorkerSwarm.ts` (insert-after, insert-before, replace-block, patch, overwrite) aus S24
- **LIVE-PROBE Disclaimer-Token:** `localStorage.setItem('soulmatch_disclaimer_v2', 'accepted')` — Wert ist `'accepted'`, nicht `'true'`
- **Pre-Push TSC-Check (Render-strikt):** `cd client && npx tsc -b` und `cd server && npx tsc --noEmit` obligatorisch vor `/git-push` (Render ist strikt mit noUnusedParameters)
- **Regie-Regel:** Claude soll Builder-Infrastruktur (`/opus-feature`, `/opus-task`, `/git-push`) für Code- und Doku-Änderungen nutzen statt manuell via create_file/str_replace — das spart Tool-Budget und demonstriert die Pipeline

## Offene Tasks

0. **[DONE 2026-04-20 via S34, Commits df85a18 + b6fa46f + 9c72a6f] `/session-log`-Endpoint** — Copilot baute den Endpoint über Nacht, hatte einen TS-Build-Fehler (PUT nicht in githubGitRequest-Signatur). Fix via Ein-Zeilen-Typ-Erweiterung. Live verifiziert: Test-Push c342ddd generierte Log-Eintrag mit `pending`, 2s später Follow-up 9c72a6f mit echtem SHA `c342ddd`.
0a. **[S33-DONE 2026-04-19] STATE.md-Header nachziehen** — `current_repo_head`, `last_verified_against_code`, `last_completed_block`, `next_recommended_block` stehen seit S31 still. Im nächsten Code-Commit mitnehmen, damit der Render-Deploy nicht nur für Header-Update läuft.
0b. **[S32-NEU] RADAR-Kandidat F6 eintragen** — `Pipeline-Scouts mit echtem File-Zugriff`. Aus S32 Flash-Lite-Qualitätsprobe: Scouts (code/pattern/risk) arbeiten ohne Repo-Zugriff, Distiller prüft nicht gegen Scope. Strukturell größer Hebel als S31-Fix. Details in `docs/HANDOFF-S32.md` Abschnitt 2b.
0c. **[S32-NEU] Kaya-Code-Rename** — `orion` → `kaya` in `server/src/lib/personaRouter.ts`, `server/src/studioPrompt.ts`, `client/src/modules/M07_reports/ui/HallOfSouls.tsx`. Bewusst zurückgestellt bis Maya-Core-Migration.
1. **TSC-Retry Roundtable-Pfad schließen** — Im Roundtable-only-Pfad `tscRetryContext` aus Roundtable-Patches synthetisieren und an Decomposer delegieren. Schließt Schritt 6 auf 100%. ~30 Min.
2. **Block 5d PR #2 — Context-Split** — Maya-Guide via React Context statt Prop-Drilling. ~45 Min. `lostpointercapture` + Click-Debounce sind schon in PR #1 enthalten.
3. **Maya-Core nächsten Block schneiden** — maya-core STATE.md `next_recommended_block` ist explizit "Noch nicht öffentlich neu geschnitten" seit 2026-04-05. Produktentscheidung nötig.
4. **[DONE 2026-04-18] DNS-cache-overflow Hardening** — `undici`-Dispatcher + `dns.setDefaultResultOrder('ipv4first')` + `setDefaultAutoSelectFamily(false)` in `server/src/lib/outboundHttp.ts`. 7 Hotpath-Files auf `outboundFetch` umgestellt (`f6b080f`+`5300975`). Live auf `20bc008`. Verifiziert via zwei `/git-push` Probes (`70156d1`, `20bc008`), beide HTTP 200 in ~1.5s, keine DNS-overflow mehr. Probe-Artefakte in `docs/S31-PROBE-20260418.md` und `docs/S31-PROBE-20260418-2.md`.
4a. **[DONE 2026-04-18] Outbound-HTTP Observability** — `server/src/lib/outboundHttp.ts` loggt jetzt host-only Success-/Error-Metadaten in `outboundFetch()` mit `requestId`, `method`, `host`, `durationMs`, `status`, `ok` bzw. `errName`, `errCode`, `errCause`; `OUTBOUND_HTTP_QUIET=1` unterdrueckt die Logs, Semantik bleibt unveraendert (`efa5e5e`). Harte Pre-Push-Checks: `cd client && npx tsc -b` = `CLIENT_TSC_OK`, `cd server && npx tsc --noEmit` = `SERVER_TSC_OK`. Lokaler Laufzeitbeleg: `[outbound] {"requestId":"h3g0zzte","method":"GET","host":"api.github.com","durationMs":717,"status":200,"ok":true}` und `[outbound-err] {"requestId":"k07998or","method":"GET","host":"nonexistent-s31-probe.invalid","durationMs":230,"errName":"TypeError","errCause":"ENOTFOUND"}`. Live-Beleg: echter `/git-push`-Probe gegen die deployte Bridge erzeugte `docs/S31-OBSERVABILITY-VERIFIED.md` auf `main` (`7a4b550`). Render-Console-Log-Tail wurde nach dem Deploy von `a95c366` vom Nutzer manuell im Render-Dashboard verifiziert (2026-04-18 ~12:39 UTC): vier `[outbound]`-Zeilen mit korrektem JSON-Format, alle Felder befüllt, nur `host` (kein Path/Header/Body), plausible Dauer (170-910ms). Semantik bestaetigt: GET 404 + PUT 201 bei Neu-Datei (`action: create`), GET 200 + PUT 200 bei Update. 4a damit vollstaendig geschlossen.
4b. **[PROCESS S31] Agent-Lapsus dokumentieren** — `f6b080f` wurde gepusht ohne dass der vorgeschriebene `cd server && npx tsc --noEmit` Pre-Push-Check lief, obwohl diese Regel explizit in SESSION-STATE.md steht. Resultat: Render-Build failed, `b99b663` docs-Sync erbte den kaputten Build, erst `5300975` nachzog. Tooling-Frage: sollte der Pre-Push-Check in den Agent-Workflow eingebaut sein statt als Disziplin-Regel?
4c. **[DONE 2026-04-18] /git-push atomare Mehrdatei-Commits** — `server/src/routes/opusBridge.ts` ersetzt die fruehere Contents-API-Dateischleife durch einen atomaren Git-Data-Ablauf: Branch-Ref lesen, Parent-Commit lesen, Base-Tree rekursiv lesen, Blobs fuer Nicht-Deletes schreiben, genau einen Tree und genau einen Commit bauen, danach den Ref bewegen. Duplicate-Pfade und fehlende Delete-Ziele scheitern vor jedem Write atomar. Harte Pre-Push-Checks: `cd client && npx tsc -b` = `CLIENT_TSC_OK`, `cd server && npx tsc --noEmit` = `SERVER_TSC_OK`. Feature-Commit `363d416` lief erfolgreich auf Render; echter Live-Probe gegen die deployte Bridge erzeugte `docs/S31-MULTIFILE-PROBE-a.md`, `docs/S31-MULTIFILE-PROBE-b.md` und `docs/S31-MULTIFILE-PROBE-c.md` in genau einem Remote-Commit `ad8abd0a2ac6e2cf6419f8598c0d524efbe7d127`, und `/api/health` zeigte diesen Commit anschliessend live.
5. **Async Job-Pattern für /opus-task** (aus S24, noch offen) — löst Render 60s Timeout bei großen Tasks.
6. **Patrol Finding Auto-Fix** (aus S24, noch offen) — Pipeline automatisch Fixes für Patrol-Findings generieren.
7. **Docs-Consolidation Rest:** `opus-bridge-v4-spec.md` Status-Abgleich, `MAYA-BUILDER-AUSBAU-BLUEPRINT-v2.md` + `MAYA-BUILDER-CONTRACT.md` Aktualität prüfen.
8. **[S31-Kern noch offen] False-Positive-Pipeline-Path-Fix** — Spec in `docs/S31-CANDIDATES.md`. Schritt A: SHA-Verify in `opusSmartPush.ts` (pre/post-Sha Vergleich nach `/push`-Dispatch). Schritt C: `builder-executor.yml` bricht bei leerem Diff ab (kein stilles `exit 0` mehr). Schritt D: Orchestrator-Status-Treue. Ist der inhaltliche Haupt-Thread nach `/session-log`. S31 hat nur Task 4a (Observability) und atomare Mehrdatei-Commits geliefert, Kern-Fix bleibt offen.

9. **[DONE 2026-04-19 via F7, Commit ae3e020] Pool-Config-Persistenz** — `pool_state`-Tabelle in Neon PostgreSQL, Single-Row-Design (id=1). `initializePoolState()` laedt persistierte Config beim Serverstart, `updatePools()` schreibt fire-and-forget UPSERT. Live-Test: Maya auf `['opus']` gesetzt, Container via `/render/redeploy` neu gestartet, Config ueberlebt Restart. Code-Default bleibt Sicherheits-Fallback.

## Reuse-First Regel (aus S24)

- R1: Search Before Build — immer zuerst grep/search ob Feature schon existiert
- R2: Copy Over Abstract — bestehende Patterns wiederverwenden, keine premature generalization
- R3: Proof Obligation — Behauptungen über Code-Stand mit grep/test belegen, nicht aus Memory beanspruchen

## Session-Historie-Lücke

S22, S23, S26, S27, S28, S29 haben keine Handoff-Files im Repo. Kontext-Rekonstruktion nur via Memory-Einträge + Code-Befunde. Für neue Chats: `docs/CLAUDE-CONTEXT.md` + `STATE.md` + `docs/HANDOFF-S32.md` zuerst, dann bei Bedarf `HANDOFF-S31.md`, `HANDOFF-S30.md`, und für Pipeline-Geschichte `HANDOFF-S25.md` und `HANDOFF-2026-04-12-PIPELINE-COMPLETE.md`.
