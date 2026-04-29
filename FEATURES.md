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
- `last_checked`: `2026-04-25`
- `quality`: `phase1_architect_gate_live_with_backtick_precision_fix`
- `known_gap`: Die fruehere Phase-0-Kontrollschicht ist jetzt in einen echten Phase-1-Pfad uebergegangen: `architectPhase1.ts` fuehrt AICOS-Meta-Loader, Assumption-Registry, finale Assembly und Dispatch-Gate ein; `/api/architect/state` zeigt den Beobachtungszustand read-only; `builder_assumptions` ist produktiv aktiv. `specHardening.ts` ist seit 910fbed, a5220e1 und bf36900 fuer die zentralen Forbidden-Patterns, die vier heuristischen Randchecks und den zuvor zu groben BACKTICK-Fall code-aware bzw. praezisiert, und 0e4c075 macht Findings-, Truncation- und Signal-Counts im State sichtbar. Die aktuelle Designentscheidung ist nun bewusst festgezogen: `BACKTICK_IN_REGEX` bleibt `block`, global bleibt nur `checkLengthLimits`, und die Begrenzung auf `latestObservation` plus den ehrlich benannten Zaehler `observedAssemblies` wird akzeptiert, bis ein echter Verlaufstelemetrie-Bedarf auftaucht.
- `next_recommended_step`: Keinen breiten Capability- oder meta-008-Ausbau auf denselben Pfad legen. Die A-Light-Diagnose war gruen genug fuer einen engen lokalen AICOS-Sync: `sol-cross-057` bis `sol-cross-061` sind jetzt im eingebetteten Soulmatch-Snapshot unter `aicos-registry/cards/solutions/` repo-sichtbar vorhanden, waehrend die Runtime in `architectPhase1.ts` und `councilScout.ts` weiter direkt das separate Public-Upstream-Index auf `master` liest. Wenn weitergemacht wird, dann nur bei neuem repo-belegtem Bedarf: konkreter False-Positive-Schmerz, reale Severity-Zweifel oder eine explizite Entscheidung, den lokalen Snapshot breiter zu pflegen. Aus diesem Mini-Import darf weiterhin keine volle lokale Paritaet mit dem Upstream-Repo abgeleitet werden.
- `evidence`: `server/src/lib/builderControlPlane.ts`, `server/src/lib/directorContext.ts`, `server/src/lib/specHardening.ts`, `server/src/lib/architectPhase1.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/routes/architect.ts`, `server/src/routes/health.ts`, `server/src/routes/opusBridge.ts`, `server/src/schema/builder.ts`, `server/migrations/0001_builder_assumptions.sql`; Feature-Commit `47deb25` live verifiziert am 2026-04-24, Hotfix `4a072ec` ebenfalls live verifiziert, Guard-Hardening `910fbed` live verifiziert am 2026-04-25, Observability-Block `0e4c075` live verifiziert am 2026-04-25, Phase-2B-Guard-Refinement `a5220e1` live verifiziert am 2026-04-25, BACKTICK-Praezisions-Fix `bf36900` live verifiziert am 2026-04-25, produktive Migration ueber `/api/builder/opus-bridge/migrate`, `/api/architect/state` mit `persistenceMode=database`, Live-Gate-Smoke `job-mod99ozd` blockt die Poison-Assumption vor dem Worker-Swarm bei akzeptierten Meta-Karten `meta-001` bis `meta-007`, ein weiterer Live-Dry-Run mit prose-eingebetteten Triggerwoertern wurde vom Async-Path akzeptiert statt vom Hardening-Gate geblockt, der Observability-Smoke hob `observedAssemblies` live von 0 auf 1 bei weiterhin leeren Block-/Warn- und Truncation-Counts, der Phase-2B-Smoke hob `observedAssemblies` live von 1 auf 2 bei weiterhin leeren Block-/Warn- und Truncation-Counts trotz erklaerender Prosa mit `/foo/`, Backticks, Escape-Sequenzen, Template-Placeholders und Quote-Fragment, und der Praezisions-Smoke liess das harmlose Codebeispiel `console.log("/api/users"); /* doc \`text\` and more \`text\` */` live durch bei weiter leeren Block-/Warn-Counts.`

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
- `quality`: `k26c_first_controlled_push_green_not_general_autonomy`
- `known_gap`: Die Builder-Pipeline ist jetzt nicht mehr nur bis K2.6b live verifiziert. `1761f3e`, `4e4c72b` und `1272ccd` ziehen fail-closed Scope-Klassifikation, degraded-provider-Hardening und eine resiliente Judge-Fallback-Lane auf `main`; `96fc618` fuehrt den K2.6b-Live-Runner fuer den echten Async-HTTP-Pfad ein; `fb6b767` richtet den T07-Runner-Contract auf ehrliches class_2 fail-closed aus; `9f978e6` verengt den degraded-state auf Provider+Model-Ebene. Gegen die matching Live-Runtime `9f978e6` blieb der enge K2.6b-Subset gruen 5/5. Danach landete mit `0738700` auch der erste enge K2.6c-Controlled-Push gruen: ein exakter single-file docs append auf `docs/archive/push-test.md`, `taskClass=class_1`, `executionPolicy=allow_push`, `pushAllowed=true`, `landed=true`. Das ist echte branch-sichtige und live ausgeloeste Runtime-Wahrheit fuer den engsten freien class_1-Korridor, aber weiterhin keine allgemeine Freigabe fuer freie Feature-Autonomie: class_2 bleibt Approval- und Review-pflichtig, class_3 bleibt `manual_only`/protected, und provider independence ist noch nicht breit ueber alle Taskfamilien belegt.
- `next_recommended_step`: Kein neuer UI-, Patrol- oder Infra-Restblock. Als naechstes genau eine zweite K2.6c-Familie aus demselben engen Corridor auditiert pruefen: exakter single-file anchored replacement oder exakter single create-target tiny helper push. Provider-Unabhaengigkeit weiter beobachten, aber nicht wieder mit Nebenarbeit vermischen.
- `evidence`: Block-1B-Konsolidierung abgeschlossen mit Commit `9681fad` (`/execute` + Quick Mode -> orchestrateTask), Commit `86f5666` (`/chain` -> orchestrateTask), Commit `d0b6239` (`/build` nutzt orchestrateTask als inneren Executor). K2.1 lokal gruen fuer class_1/class_2/class_3 mit `grok`+`gemini` (swarm -> validate -> claim-gate -> judge -> safety). K2.2 live gruen fuer class_1/class_2/class_3 bei dryRun+skipDeploy. K2.3/K2.4 live gruen ueber Approval-Validate- und fail-closed-Readiness-Pfad. K2.5 Strict-Scope Push Smoke live gruen mit `status=success`, `taskClass=class_1`, `executionPolicy=allow_push`, `pushAllowed=true`, `requiredExternalApproval=false`, `landed=true`, `verifiedCommit=d31882257f91eb9ffecc729b5981450376539502`; Remote-Diff nur `docs/archive/push-test.md`, ohne `SESSION-LOG.md`, ohne `builder-repo-index.json`, ohne Folgecommits nach 90 Sekunden. Autonomie-Hardening auf `main` ueber `1761f3e`, `4e4c72b`, `1272ccd`, `96fc618`, `fb6b767` und `9f978e6`. Repo-sichtiger K2.6b-Live-Report in `docs/BUILDER-BENCHMARK-K2.6B-LIVE-SUBSET-REPORT.md`; externer Ergebnisreport `C:/Users/guerc/OneDrive/Desktop/soulmatch/k26b-live-results-post-provider-model-scope.json` mit `totalTasks=5`, `passCount=5`, `deviationCount=0`, `liveCommit=9f978e66039a0ab325c9b4ecd9acc43a1a343b70`. Repo-sichtiger K2.6c-Controlled-Push-Report in `docs/BUILDER-BENCHMARK-K2.6C-CONTROLLED-PUSH-REPORT.md`; live ausgeloester class_1 push auf verifiedCommit `073870033853e7fcdd306efe4b6833a1959079b9` mit genau einem geaenderten Pfad `docs/archive/push-test.md`.

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
