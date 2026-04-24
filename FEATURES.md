# FEATURES

## Zweck

Diese Datei ist das auditierbare Feature-Ledger fuer `soulmatch`.
Sie ist kein Werbetext und keine Wunschliste, sondern eine knappe Uebersicht ueber
reale Features, ihren Wahrheitsstatus, erkennbare Luecken und die letzte Pruefung.

## Wahrheitsfelder

- `truth_basis`: `repo_visible` | `code_inferred` | `derived_from_review` | `doc_claim`
- `last_checked`: Datum der letzten pruefbaren Sichtung
- `evidence`: knapper Nachweis ueber Datei oder Repo-Fakt

## Feature Ledger

### App Shell und globaler State

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `stable_but_centralized`
- `known_gap`: Home, Discuss, Astro, Report/Match, Souls und Explore sprechen jetzt dieselbe Shell-Sprache, aber Journey, Studio und Profile folgen noch nicht vollstaendig demselben Seitenrahmen.
- `next_recommended_step`: Weitere Layout-Angleichungen nur als expliziten Block schneiden; keine stillen State-Umbauten nebenbei.
- `evidence`: `client/src/app/App.tsx` verdrahtet zentralen State, Home-Entry, Shell-LiveTalk und die gemeinsamen `TabPageShell`-/`TabSectionFrame`-Wrapper fuer mehrere Seiten, waehrend M00, M01 und M06 sichtbare UI-Bloecke tragen.

### UI Shell Layout und LiveTalk Shell Controls

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `foundation_live`
- `known_gap`: Shell, Chat und Studio teilen jetzt zwar einen kleinen globalen Stop-/Abort-Pfad, aber die eigentlichen Audio-Engines bleiben weiter verteilt.
- `next_recommended_step`: Nur dann weiter zentralisieren, wenn ein konkreter Audio-Bug mehrere Pfade zugleich betrifft.
- `evidence`: `client/src/modules/M01_app-shell/Sidebar.tsx`, `client/src/modules/M01_app-shell/Topbar.tsx`, `client/src/hooks/useLiveTalk.ts`, `client/src/lib/globalMediaController.ts`, `client/src/modules/M06_discuss/ui/DiscussionChat.tsx`, `client/src/modules/M08_studio-chat/ui/StudioSession.tsx`, `client/src/app/App.tsx`.

### Startseite / Home Dashboard

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `new_foundation_live`
- `known_gap`: Die neue Home-Flaeche ist sichtbar integriert, aber noch nicht gegen einen spaeteren expliziten Home-Back-Entry in der Navigation oder gegen echte visuelle Regressionstests abgesichert.
- `next_recommended_step`: Bei den weiteren Tabs darauf achten, dass Home der gestalterische Referenzpunkt bleibt und spaeter gezielt pruefen, ob ein expliziter Ruecksprungpunkt noetig ist.
- `evidence`: `client/src/modules/M00_home/ui/HomePage.tsx` und Teilkomponenten sind eingecheckt; `client/src/app/App.tsx` startet jetzt auf `activePage === 'home'`.

### Discuss / Chat Tab Layout

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `redesign_live`
- `known_gap`: Der Chat ist strukturell neu gebaut, aber die vorhandene Browser-Pruefung deckt weiterhin vor allem Home, Sidebar und Chat ab und ist kein vollstaendiger Regressionstest fuer alle Redesign-Seiten.
- `next_recommended_step`: Chat nur noch ueber klar geschnittene Voice- oder Qualitaetsbloecke vertiefen.
- `evidence`: `client/src/modules/M06_discuss/ui/DiscussionChat.tsx`, `PersonaList.tsx`, `MayaChips.tsx`, `PersonaSettingsPanel.tsx`, `MayaOverlay.tsx`, `GearDropdown.tsx`, `LiveTalkBanner.tsx`.

### Weitere Tabs im neuen Shell-Rahmen

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `wrapper_level_live`
- `known_gap`: Die Redesign-Angleichung fuer Astro, Report/Match, Souls und Explore ist sichtbar live, aber die Browser-Pruefung prueft diese Seiten noch nicht gezielt in derselben Tiefe wie Home und Chat.
- `next_recommended_step`: Wenn weitere UI-Arbeit folgt, zuerst gezielte visuelle Checks fuer diese vier Seiten ergaenzen statt die Wrapper still weiter auszudehnen.
- `evidence`: `client/src/app/App.tsx` nutzt `TabPageShell` und `TabSectionFrame` fuer `PAGE_ASTRO`, `PAGE_REPORT`, `PAGE_SOULS` und `PAGE_EXPLORE`.

### Profile CRUD und DB-Persistenz

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `usable`
- `known_gap`: Doku vereinfacht die Persistenz teilweise zu stark und blendet weitere DB-Tabellen aus.
- `next_recommended_step`: Doku und Persistenzrealitaet synchron halten; spaeter Nutzungsgrad von Zusatz-Tabellen auditieren.
- `evidence`: `server/src/routes/profile.ts`, `server/src/db.ts`, `migration.sql`.

### Studio / Multi-provider LLM orchestration

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `powerful_but_distributed`
- `known_gap`: Provider- und Modellwahrheit ist ueber mehrere Dateien verteilt, und echtes Token-Streaming endet weiterhin vor `server/src/lib/providers.ts`.
- `next_recommended_step`: Provider-Truth-Sync und echtes Provider-Streaming getrennt betrachten; beides nicht still vermischen.
- `evidence`: `server/src/routes/studio.ts` und `server/src/lib/personaRouter.ts` enthalten aktive Konfiguration fuer Gemini, OpenAI, DeepSeek und xAI/Grok.

### Persona routing und definitions

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `feature_rich`
- `known_gap`: Persona-Provider, Deep-Mode und TTS-Praeferenzen liegen an mehreren Konfigurationspunkten.
- `next_recommended_step`: Nur refactoren, wenn ein konkreter Routing- oder Voice-Block es verlangt.
- `evidence`: `server/src/lib/personaRouter.ts` enthaelt Persona-Provider, Persona-Definitionen und Deep-/TTS-Konfiguration.

### Discuss / Freisprechen / Voice flow

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-05`
- `quality`: `hardened_but_not_fully_streamed`
- `known_gap`: Chat zeigt jetzt frueher Feedback, laesst Stop/Abort global zu, schneidet TTS im SSE-Pfad in einen fruehen Satz plus Rest-Chunk und unterdrueckt spaete SSE-Nachlaeufer aus ueberholten Runden, aber die Provider-Schicht streamt noch keine echten Token-Deltas und echtes Live-Audio via WebSocket existiert weiter nicht.
- `next_recommended_step`: `server/scripts/discuss-audio-probe-check.mjs` gegen lokale oder deployte Runtime mit echten Keys laufen lassen und Timing-/Fallback-Befunde festhalten.
- `evidence`: `client/src/hooks/useSpeechToText.ts`, `client/src/modules/M06_discuss/hooks/useDiscussApi.ts`, `client/src/modules/M06_discuss/hooks/useLiveTalk.ts`, `client/src/modules/M06_discuss/ui/DiscussionChat.tsx`, `client/src/modules/M08_studio-chat/ui/StudioSession.tsx`, `client/src/lib/globalMediaController.ts`, `server/src/routes/studio.ts`, `server/src/studioPrompt.ts`, `server/src/lib/ttsService.ts`, `server/scripts/discuss-audio-probe-check.mjs`, vorhandene Audio-E2E-Dateien unter `client/e2e/`.

### TTS fallback chain

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-05`
- `quality`: `implemented_not_fully_hardened`
- `known_gap`: Die Key-Abhaengigkeit ist enger korrigiert und der Discuss-Stream nutzt jetzt einen Fast-First-TTS-Split statt auf komplettes Volltext-Audio zu warten, aber unter echten Provider-Keys fehlen weiter belastbare Laufzeitbefunde fuer Latenz, Chunk-Uebergang und Fallback-Kombinationen.
- `next_recommended_step`: Probe mit `pnpm discuss:audio:probe` unter den gewuenschten Provider-Flags und Zielumgebungen fahren.
- `evidence`: `server/src/lib/ttsService.ts`, Audio-Pfad in `server/src/routes/studio.ts` und `server/scripts/discuss-audio-probe-check.mjs`.

### Session memory

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `real_but_under-documented`
- `known_gap`: Session-Memory ist real im Code, aber in Root-Dokumenten noch nicht sauber als aktive Persistenz erfasst.
- `next_recommended_step`: Bei naechstem Persistenz-Audit Nutzungsgrenzen und Datenfluss genauer dokumentieren.
- `evidence`: `server/src/lib/memoryService.ts` schreibt und liest `session_memories`.

### Context Broker fuer Claude / Builder-Kontext

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-20`
- `quality`: `narrow_read_only_v1_with_runtime_fallback`
- `known_gap`: Der Broker liefert Session-Start-Anker, Multi-File-Reads und eine kleine Ops-Whitelist in einem engeren API-Pfad. Nach der ersten Live-Probe ist klar, dass Root- und `docs/`-Dateien in Production nicht im Container liegen; der Followup schiebt diese Pfade auf GitHub main nach. Danach fehlt noch die erneute Live-Verifikation fuer Session-Start und gemischte File-Reads.
- `next_recommended_step`: Session-Start und gemischte `files/read`-Pfade gegen die deployte Runtime erneut pruefen und erst danach entscheiden, ob Claude-Session-Start oder Director-Tools auf diesen Pfad umgestellt werden sollen.
- `evidence`: `server/src/routes/contextBroker.ts`, `server/src/index.ts`, `docs/F11-CONTEXT-BROKER.md`, Dockerfile-Runtime-Stage kopiert nur `/app/server` und `client/dist`.

### Architecture Digest fuer Context Broker

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-20`
- `quality`: `deterministic_cached_v1`
- `known_gap`: Der neue Digest strukturiert Module, Routes, DB-Tabellen, Cross-Repo-Hinweise und Konventionen in einem read-only Endpoint. Noch offen ist die Live-Verifikation gegen die deployte Runtime, inklusive sections-Filter und 5-Min-Cache-Hit. Die Module-purpose-Felder bleiben so gut wie die gepflegten `/** PURPOSE: ... */`-Kommentare in den Modul-`index.ts`-Dateien.
- `next_recommended_step`: Drei Live-Proben fahren: voller Digest, gefilterter Digest und Cache-Hit innerhalb von 5 Minuten; danach entscheiden, ob Claude-Session-Start standardmaessig `session-start` plus `architecture-digest` zieht.
- `evidence`: `server/src/lib/architectureDigest.ts`, `server/src/routes/contextBroker.ts`, `docs/F12-ARCHITECTURE-DIGEST.md`.

### Builder orchestration und Maya 3-layer memory

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-17`
- `quality`: `live_in_code_runtime_checks_pending`
- `known_gap`: Builder blockt jetzt bekannte Blacklist-Dateien schon im Chat, erklaert geblockte Laeufe genauer, stoppt stale Tasks serverseitig nach Timeout automatisch und zeigt den Grund ueber Maya-/Opus-Logs in der bestehenden Observe-Ansicht. Quick-Mode-Tasks laufen ueber `executeTask`, `agentHabitat` speichert pro Worker drei kompakte Nachdenker-Learnings fuer den naechsten Prompt, offene Tasks koennen direkt in der Builder-UI manuell geblockt werden, und Maya hat jetzt zusaetzlich ein `Maya Brain` mit internen Action-Blocks, Modell-Dropdown (`Opus 4.6`, `GPT 5.4`, `GLM 5.1`), `Fast`/`Deep`-Thinking, sichtbaren Action-Badges, explizitem Fast/Deep-Modus im Director-Prompt, lokalem Lauf-/Toolstatus in `BuilderStudioPage` und automatischer Continuity-Rueckschreibung pro Brain-Interaktion. Diese Steuerelemente sitzen jetzt direkt in der aktiven `/builder`-Oberflaeche `BuilderStudioPage`. Ueber `memory-read` und `memory-write` greift dieselbe Maya auch direkt auf `builder_memory` zu. GLM 5.1 ist repo-sichtbar auch als Meister und Worker verdrahtet. Scout, Council, Destillierer und Worker koennen jetzt ueber denselben Observe-Pfad als read-only Live-Feed im Builder gelesen werden; Builder- und Opus-Token werden dafuer getrennt im Browser gehalten, die frueheren Bottom-Widgets sind durch PoolBar-Popups ersetzt, die sichtbaren Trigger heissen `LIVE`, und die Bubbles zeigen Actor-Labels, Runden-Badges sowie eine eigene Hervorhebung fuer `maya-moderator` und gedimmte System-Nachrichten. Patrol ist zusaetzlich als eigener SESSION-Bar-Feed sichtbar angebunden und liest `patrol-status` plus `patrol-findings` getrennt vom ChatPool ueber den Opus-Token. Maya ist zusaetzlich als Presence Shell direkt im Builder sichtbar: `useMayaTargetRegistry` scannt DOM-Ziele ueber `data-maya-target`, `useMayaFigureGuide` bewegt die Figur jetzt als Body-Portal mit fixed/absolute-Fallback, generation-gebundenen Settlern, reduced-motion-Sofortpfad, rAF-Stabilisierung und Drag ohne React-Koordinaten-State, `maya-highlight.css` kapselt den Highlight-Ring ausserhalb der Page, und `MayaFigure` bleibt goldnah statt LiveTalk-gruen codiert. Sowohl Standard-Maya-Chat als auch Maya Brain koennen ueber denselben `[NAVIGATE:ziel]`-Pfad gezielt auf reale UI-Elemente zeigen, ohne den Tag sichtbar im Chat stehen zu lassen; der Builder-Chat nutzt dafuer weiter den sichtbaren Mic-Button ueber die bestehende `useSpeechToText`-Kette. Offen bleiben damit vor allem semantische Chat-/Director-Zustaende statt nur Positionsziele, belastbare Browser-/Render-Verifikation dieser Presence-Shell, echtes Builder-TTS, der delegierte Async-Opus-Task auf Render und belastbarer Async-Jobstatus. Die persistente Ebene braucht auf Render aber weiter den manuellen Schema-Push fuer `builder_memory` und `builder_agent_profiles.last_learnings`; bis dahin bleibt die neue Memory im Deploy nur RAM-gestuetzt plus soft-failing DB-Zugriffe.
- `next_recommended_step`: Die jetzt gehaertete Maya-Figure als naechstes an semantische Chat-/Director-Zustaende wie Thinking, Tool-Status und Fehler koppeln und den Portal-/Navigate-Pfad inklusive Mic-Eingang in echten Builder-Sessions oder Playwright gegen Render pruefen.
- `evidence`: `client/src/app/App.tsx`, `client/src/modules/M16_builder/lib/mayaTransitions.ts`, `client/src/modules/M16_builder/hooks/useMayaApi.ts`, `client/src/modules/M16_builder/hooks/useMayaFigureGuide.ts`, `client/src/modules/M16_builder/ui/maya-highlight.css`, `client/src/modules/M16_builder/ui/MayaFigure.tsx`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, `server/src/lib/builderGithubBridge.ts`, `.github/workflows/builder-executor.yml`, `server/src/lib/builderMemory.ts`, `server/src/lib/builderFusionChat.ts`, `server/src/lib/builderDialogEngine.ts`, `server/src/lib/agentHabitat.ts`, `server/src/lib/builderScopeResolver.ts`, `server/src/lib/builderStaleDetector.ts`, `server/src/lib/directorContext.ts`, `server/src/lib/directorPrompt.ts`, `server/src/lib/directorActions.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/lib/opusChangeRouter.ts`, `server/src/lib/opusSmartPush.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/builder.ts`, `server/src/routes/health.ts`, `server/src/schema/builder.ts`, `server/src/index.ts`.

### Render deploy pipeline

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-24`
- `quality`: `live_verified_with_local_dns_workaround`
- `known_gap`: Der eigentliche Repo-Deploypfad ist jetzt praktisch bestaetigt: Push auf `main` brachte Render von `d381d00` auf `a53dd69`, und `/api/health` lieferte danach HTTP 200 mit dem neuen Commit. Offen ist nicht mehr der Workflow-Fallback selbst, sondern ein lokales Operator-Gap: Auf dem Windows/bash-Client schlug die DNS-Aufloesung fuer `soulmatch-1.onrender.com` mit curl code 6 fehl, waehrend dieselbe Runtime ueber `--resolve` bzw. `DEPLOY_RESOLVE_IP=216.24.57.7` sauber erreichbar war.
- `next_recommended_step`: Den lokalen DNS-Resolve-Drift fuer die Render-Domain separat beobachten oder spaeter eng haerten; der normale Deploypfad selbst braucht vor dem naechsten Builder-Block keinen weiteren Umbau.
- `evidence`: `.github/workflows/render-deploy.yml`, `tools/wait-for-deploy.sh`, `README.md`, `DEPLOY.md`, `server/src/routes/health.ts`; Live-Probe 2026-04-24 nach Push `d381d00 -> a53dd69`: Standard-curl lokal mit Host-Resolve-Failure, aber `DEPLOY_RESOLVE_IP=216.24.57.7 EXPECT_COMMIT=$(git rev-parse HEAD) bash tools/wait-for-deploy.sh` wechselte nach 165s auf `a53dd69`, und direkter `curl --resolve soulmatch-1.onrender.com:443:216.24.57.7 https://soulmatch-1.onrender.com/api/health` lieferte HTTP 200 plus `commit: a53dd69...`.

### Opus-Bridge orchestration

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-23`
- `quality`: `git_push_atomic_live_broader_runtime_checks_pending`
- `known_gap`: Scout, Distiller, Roundtable und Worker nutzen fuer GLM jetzt OpenRouter statt Direkt-Zhipu, der Opus-Task-Pfad traegt neue Dateien explizit als `create` durch Scope, Prompt und Push, und der bestehende Judge kann Kandidaten gegen die Original-Instruktion komplett ablehnen. F14A selbst ist inzwischen live runtime-verifiziert; offen bleibt damit nicht mehr der Claim-Gate-Basisvertrag, sondern der breitere End-to-End-Nachweis auf Render fuer Datei-Injektion via `@READ`, echte BDL-Ausgabe auf eigener Zeile, Distiller-Treue bei `getWorstPerformers` und stabile GLM-Laufzeit unter OpenRouter.
- `next_recommended_step`: Einen echten Builder-/Opus-Task gegen die Zielruntime fahren und dabei pruefen, ob `getWorstPerformers` im Titel und Brief erhalten bleibt, ob `@READ` als `[system]`-Dateiinhalt ankommt, ob neue Dateien als `create` statt als implizites Overwrite geloggt werden, ob der Judge Out-of-Scope-Kandidaten weiter stabil verwirft und ob `GITHUB_PAT` den Dispatch/Commit wirklich erlaubt.
- `evidence`: `server/src/lib/providers.ts`, `server/src/lib/poolState.ts`, `server/src/lib/opusScoutRunner.ts`, `server/src/lib/opusRoundtable.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/lib/opusDistiller.ts`, `server/src/lib/opusJudge.ts`, `server/src/lib/opusClaimGate.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusWorkerSwarm.ts`, `server/src/lib/opusWorkerRegistry.ts`, `server/src/routes/opusBridge.ts`, `docs/F14-PHASE1-CLAIM-GATE-SPEC.md`; Live-Probe `ad8abd0a2ac6e2cf6419f8598c0d524efbe7d127` erzeugte `docs/S31-MULTIFILE-PROBE-a.md`, `docs/S31-MULTIFILE-PROBE-b.md` und `docs/S31-MULTIFILE-PROBE-c.md` in genau einem Remote-Commit. Zusaetzlich ist F14A auf Production ueber `/api/health/opus-task-async` gegen `d375304` runtime-verifiziert: `job-mobq28w2` bestaetigt `anchored + compatible` plus Judge-Approve, `job-mobq72r1` bestaetigt `anchored + mismatch` plus Judge-Reject, `job-mobpxh4b` bestaetigt den Fresh-Check fuer realen unindexierten manual scope, `job-mobpt6rd` bestaetigt den Fruehreject fuer einen nicht existierenden Pfad ohne Create-Signal.

### Schema fuer persona_memories und voice_profiles

- `status`: `schema_present_usage_unclear`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `unknown`
- `known_gap`: Tabellen sind vorhanden, aktiver Produktnutzen ist im schnellen Review nicht so klar sichtbar wie bei `session_memories`.
- `next_recommended_step`: Separaten Persistenz-Realitaetscheck fahren, statt Nutzung still zu behaupten oder still zu negieren.
- `evidence`: `migration.sql` definiert beide Tabellen; im schnellen Code-Review war keine gleich starke aktive Nutzungsnaht sichtbar wie bei `session_memories`.

### Scoring engine

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `well-defined`
- `known_gap`: Oeffentliche Doku und Runtime muessen bei kuenftigen Formel-Aenderungen konsequent synchronisiert werden.
- `next_recommended_step`: Bei jeder Scoring-Aenderung `STATE.md` und `FEATURES.md` nachziehen.
- `evidence`: `CLAUDE.md` verweist auf `server/src/shared/scoring.ts` als Single Source of Truth.

### Match engine und narrative layer

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `usable`
- `known_gap`: Narrative und Berechnung sind getrennt; das ist gut, braucht aber weiter explizite Qualitaets- und Driftbeobachtung.
- `next_recommended_step`: Nur bei konkreter Match-Arbeit tiefer nachziehen.
- `evidence`: Client und Server verdrahten Match-Berechnung und Narrative getrennt; `App.tsx` fuehrt Match-Compute und Narrative-Merge aus.

### Timeline und Soul Cards

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `local-first`
- `known_gap`: Der Zustand lebt weitgehend clientseitig in `localStorage`, also ohne serverseitige Rueckfallebene.
- `next_recommended_step`: Nur mit explizitem Produktentscheid auf DB oder Export erweitern.
- `evidence`: `CLAUDE.md` und `BRIEFING_PART2.md` beschreiben Timeline und Soul Cards als lokale Persistenz; `App.tsx` bindet Timeline-Services aktiv ein.

### Credits / cost signaling

- `status`: `partial_meta_contract`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `unclear`
- `known_gap`: Credit-Werte tauchen im Prompt- und Studio-Kontext auf, ohne dass daraus bereits ein sauberer Endnutzervertrag ableitbar waere.
- `next_recommended_step`: Erst auditieren, dann entscheiden, ob Produktfeature oder internes Meta-Signal.
- `evidence`: `server/src/studioPrompt.ts` und `server/src/routes/studio.ts` fuehren Credits-Signale.

### Dev route protection

- `status`: `active_but_weak`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-03-29`
- `quality`: `needs_hardening`
- `known_gap`: Eingebautes Fallback-Passwort ist ein klarer Hardening-Kandidat.
- `next_recommended_step`: `Dev Token Hardening` als kleiner separater Block.
- `evidence`: `server/src/routes/dev.ts` nutzt `process.env.DEV_TOKEN || BUILTIN_PASSWORD`.

## Nicht als Feature zaehlen

- `client/test-results/**` ist Testartefakt, keine Produktwahrheit.
- geparkte Ideen in `RADAR.md` sind keine gebauten Features.
- grobe Aussagen aus alten Briefings zaehlen nicht gegen den Code, wenn sie veraltet sind.

## Pflege-Regeln

- Bei jedem neuen Produktblock `truth_basis`, `last_checked` und `known_gap` nachziehen.
- Keine Qualitaetsnoten ohne knappe Begruendung vergeben.
- Wenn Nutzung unklar ist, `usage_unclear` oder `derived_from_review` markieren statt Sicherheit vorzutaeuschen.