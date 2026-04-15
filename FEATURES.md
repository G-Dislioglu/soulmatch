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

### Builder orchestration und Maya 3-layer memory

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-15`
- `quality`: `live_in_code_runtime_checks_pending`
- `known_gap`: Builder blockt jetzt bekannte Blacklist-Dateien schon im Chat, erklaert geblockte Laeufe genauer, stoppt stale Tasks serverseitig nach Timeout automatisch und zeigt den Grund ueber Maya-/Opus-Logs in der bestehenden Observe-Ansicht. Quick-Mode-Tasks laufen ueber `executeTask`, `agentHabitat` speichert pro Worker drei kompakte Nachdenker-Learnings fuer den naechsten Prompt, offene Tasks koennen direkt in der Builder-UI manuell geblockt werden, und Maya hat jetzt zusaetzlich ein `Maya Brain` mit internen Action-Blocks, Modell-Dropdown (`Opus 4.6`, `GPT 5.4`, `GLM 5.1`), `Fast`/`Deep`-Thinking, sichtbaren Action-Badges und automatischer Continuity-Rueckschreibung pro Brain-Interaktion. Diese Steuerelemente sitzen jetzt direkt in der aktiven `/builder`-Oberflaeche `BuilderStudioPage`. Ueber `memory-read` und `memory-write` greift dieselbe Maya auch direkt auf `builder_memory` zu. GLM 5.1 ist repo-sichtbar auch als Meister und Worker verdrahtet. Offen bleiben der echte delegierte Async-Opus-Task auf Render, belastbarer Async-Jobstatus und die UI-Sichtbarkeit der ausgefuehrten Schritte unter echtem Live-Lauf. Die persistente Ebene braucht auf Render aber weiter den manuellen Schema-Push fuer `builder_memory` und `builder_agent_profiles.last_learnings`; bis dahin bleibt die neue Memory im Deploy nur RAM-gestuetzt plus soft-failing DB-Zugriffe.
- `next_recommended_step`: Auf Render einen echten Maya-Brain-Flow mit delegiertem Async-Opus-Task pruefen, dabei `Fast`/`Deep`, Jobstatus, Continuity-Rueckschreibung und Builder-Studio-Sichtbarkeit verfolgen und parallel `[stale-detector]`, `blocked`, ChatPool-Hinweis und `builder_opus_log` gegen den Live-Lauf abgleichen.
- `evidence`: `client/src/app/App.tsx`, `client/src/modules/M16_builder/hooks/useMayaApi.ts`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, `server/src/lib/builderGithubBridge.ts`, `.github/workflows/builder-executor.yml`, `server/src/lib/builderMemory.ts`, `server/src/lib/builderFusionChat.ts`, `server/src/lib/builderDialogEngine.ts`, `server/src/lib/agentHabitat.ts`, `server/src/lib/builderStaleDetector.ts`, `server/src/lib/directorContext.ts`, `server/src/lib/directorPrompt.ts`, `server/src/lib/directorActions.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/routes/builder.ts`, `server/src/routes/health.ts`, `server/src/schema/builder.ts`, `server/src/index.ts`.

### Render deploy pipeline

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-15`
- `quality`: `repo_triggered_live_verification_pending`
- `known_gap`: Render Auto Deploy alleine ist als Betriebsweg zu unzuverlaessig. Das Repo nutzt jetzt einen GitHub-Workflow, der Render ueber `RENDER_DEPLOY_HOOK_URL` triggert und den Live-Commit ueber `/api/health` verifiziert. Voll bestaetigt ist das erst nach einem echten Lauf mit gesetztem Secret im Ziel-Repo.
- `next_recommended_step`: GitHub-Secret `RENDER_DEPLOY_HOOK_URL` setzen, einen Push auf `main` ausloesen und pruefen, ob `.github/workflows/render-deploy.yml` bis zum erwarteten Commit auf Render durchlaeuft.
- `evidence`: `.github/workflows/render-deploy.yml`, `tools/wait-for-deploy.sh`, `README.md`, `DEPLOY.md`, `server/src/routes/health.ts`.

### Opus-Bridge orchestration

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-15`
- `quality`: `pipeline_live_local_verification_done_runtime_checks_pending`
- `known_gap`: Scout, Distiller, Roundtable und Worker nutzen fuer GLM jetzt OpenRouter statt Direkt-Zhipu, aber der End-to-End-Nachweis auf Render fuer Datei-Injektion, echte BDL-Ausgabe auf eigener Zeile, automatischen GitHub-Commit, Distiller-Treue bei `getWorstPerformers` und stabile GLM-Laufzeit unter OpenRouter steht noch aus.
- `next_recommended_step`: Einen echten Builder-/Opus-Task gegen die Zielruntime fahren und dabei pruefen, ob `getWorstPerformers` im Titel und Brief erhalten bleibt, ob `@READ` als `[system]`-Dateiinhalt ankommt, ob `patches[]` nicht leer bleibt und ob `GITHUB_PAT` den Dispatch/Commit wirklich erlaubt.
- `evidence`: `server/src/lib/providers.ts`, `server/src/lib/poolState.ts`, `server/src/lib/opusScoutRunner.ts`, `server/src/lib/opusRoundtable.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/lib/opusDistiller.ts`, `server/src/lib/opusWorkerSwarm.ts`, `server/src/lib/opusWorkerRegistry.ts`, `server/src/routes/opusBridge.ts`.

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