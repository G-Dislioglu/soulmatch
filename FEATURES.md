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

### Builder orchestration, Maya 3-layer memory und Architect Phase 1

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-28`
- `quality`: `phase1_architect_dispatch_and_patrol_contract_line_repo_visible`
- `known_gap`: Die fruehere Phase-0-Kontrollschicht ist nicht mehr nur ein enger Architect-Gate-Pfad. `architectPhase1.ts` traegt Assumption-Registry, finale Assembly und Dispatch weiter; `be952a7`, `8fab1e6`, `451a3a8`, `d0ec9ee`, `adf3658` und `3f08301` ziehen Team-Koordination, aktive Regeln, stillen no-DB-Fallback und `dispatchSections` repo-sichtbar bis in Control Plane, Observation und Orchestrator. `741c8ab` macht diese Linie in der Builder-UI sichtbar: Deep Patrol spricht clientseitig den bestehenden Deep-Contract, und `/api/architect/state` wird kompakt im Studio-Kontext gesurfaced. `332000c` zieht die Routine-Seite nach: feste Routine-Scouts werden ehrlich read-only gezeigt, der vorhandene body-lose Trigger ist im Client nutzbar, und Feed-Fehler werden sichtbar. Nicht Teil dieser Wahrheit ist weiterhin eine breite Routine-Patrol-Produktlogik mit freier Modellkonfiguration, Scheduling oder Patrol-Profiles.
- `next_recommended_step`: Keine neue Builder-UI- oder Patrol-Achse aufmachen. Der naechste sinnvolle Builder-Schritt liegt jetzt im Autonomie-Korridor: entweder degraded-provider Hardening fuer den `gpt`-Pfad oder ein bewusst kleiner K2.6b-Live-DryRun-Subset.
- `evidence`: `server/src/lib/builderTeamAwareness.ts`, `server/src/lib/memoryBus.ts`, `server/src/lib/builderControlPlane.ts`, `server/src/lib/directorPrompt.ts`, `server/src/lib/architectPhase1.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/architect.ts`, `server/src/routes/builder.ts`, `server/src/routes/opusBridge.ts`, `client/src/modules/M16_builder/hooks/useBuilderApi.ts`, `client/src/modules/M16_builder/hooks/useMayaApi.ts`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, `client/src/modules/M16_builder/ui/PatrolConsole.tsx`; repo-sichtige Builder-Linie ueber `bad1eca`, `cfb88b0`, `b21859b`, `b7db2ee`, `be952a7`, `8fab1e6`, `451a3a8`, `d0ec9ee`, `adf3658`, `3f08301`, `741c8ab`, `332000c`. Live-Wahrheit bleibt enger: `/api/architect/state` und der produktive Resolve-/Health-Pfad wurden zuletzt getrennt vor `741c8ab` verifiziert, daher bleibt `last_live_runtime_head` bewusst vor diesem Branch-Stand.`

### Render deploy pipeline

- `status`: `active`
- `truth_basis`: `repo_visible`
- `last_checked`: `2026-04-26`
- `quality`: `live_verified_with_resolve_based_commit_probe`
- `known_gap`: Der Deploypfad ist fuer den aktuellen Block belastbar verifiziert. Verbleibende Unruhe liegt auf Operator-Ebene (sporadische lokale DNS-/TTY-Umgebungseffekte), nicht in der produktiven Runtime-Commit-Wahrheit.
- `next_recommended_step`: Kein Deploy-Umbau auf Verdacht. Bei erneutem Incident nur den engen Operator-Pfad pruefen (EXPECT_COMMIT, resolve-basierter Health-Check, tokenisierte Route-Probe) und erst dann Script-Details anfassen.
- `evidence`: `.github/workflows/render-deploy.yml`, `tools/wait-for-deploy.sh`, `README.md`, `DEPLOY.md`, `server/src/routes/health.ts`; finale Verifikation 2026-04-26: Runtime erreicht Commit `8469150186bebaa8d8a2d9052b1cc483ff32cbb2` ueber `/api/health`, danach erfolgreicher authentifizierter Check auf `/api/builder/opus-bridge/approval-validate` gegen denselben Live-Stand.

### Opus-Bridge orchestration

- `status`: `active`
- `truth_basis`: `repo_visible_plus_runtime_probe`
- `last_checked`: `2026-04-29`
- `quality`: `k26a_batch1_green_but_provider_degraded`
- `known_gap`: Die Builder-Pipeline ist lokal weiter belastbar fuer den engen K2.6a-DryRun-Korridor: `K26-T01`, `T02`, `T04`, `T05`, `T07`, `T08`, `T09` und `T10` laufen nach `ca4b55a` ohne Deviation durch. Class_1 bleibt fuer exakte Single-File- und Create-Targets sauber, class_2 failt ohne Approval ehrlich closed, class_3 blockt jetzt schon im Preflight, und Ambiguitaetsfaelle raten keine Scope-Dateien mehr. Der reale Restpunkt ist jetzt nicht mehr Governance-Drift, sondern Provider-Zuverlaessigkeit: der `gpt`-Worker degradierte im Batch wiederholt auf Transportebene (`fetch failed`), waehrend `grok` und `gemini` den Lauf trugen. Der Builder bleibt damit weiter kein allgemeiner autonomer Feature-Autopilot: class_2 braucht frische gueltige Approval-Artifacts plus Reviewpflicht, class_3 bleibt `manual_only`/protected.
- `next_recommended_step`: Nicht sofort neue Features aufmachen. Entweder den degraded-provider-Pfad fuer `gpt` haerten oder ein bewusst kleines K2.6b-Live-DryRun-Subset schneiden.
- `evidence`: Block-1B-Konsolidierung abgeschlossen mit Commit `9681fad` (`/execute` + Quick Mode -> orchestrateTask), Commit `86f5666` (`/chain` -> orchestrateTask), Commit `d0b6239` (`/build` nutzt orchestrateTask als inneren Executor). K2.1 lokal gruen fuer class_1/class_2/class_3 mit `grok`+`gemini` (swarm -> validate -> claim-gate -> judge -> safety). K2.2 live gruen fuer class_1/class_2/class_3 bei dryRun+skipDeploy. K2.3/K2.4 live gruen ueber Approval-Validate- und fail-closed-Readiness-Pfad. K2.5 Strict-Scope Push Smoke live gruen mit `status=success`, `taskClass=class_1`, `executionPolicy=allow_push`, `pushAllowed=true`, `requiredExternalApproval=false`, `landed=true`, `verifiedCommit=d31882257f91eb9ffecc729b5981450376539502`; Remote-Diff nur `docs/archive/push-test.md`, ohne `SESSION-LOG.md`, ohne `builder-repo-index.json`, ohne Folgecommits nach 90 Sekunden. K2.6a Runner-Harness kam mit `fc012b4` repo-sichtig dazu; `ca4b55a` haertet Scope-Resolver, `class_3`-Preflight-Block und fail-closed-Klassifizierung ohne echte Scope-Pfade. Die aktuelle Batch-1-Evidenz liegt extern in `C:/Users/guerc/OneDrive/Desktop/soulmatch/k26a-batch1-results.json` und repo-sichtig in `docs/BUILDER-BENCHMARK-K2.6A-BATCH1-REPORT.md`: `totalTasks=8`, `passCount=8`, `deviationCount=0`, `providerDegraded=["gpt"]`.

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
