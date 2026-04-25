# STATE

## Zweck

Diese Datei ist die kanonische operative Kurzwahrheit fuer `soulmatch`.
Sie ist der schnellste Einstieg fuer neue Chats, Reviews und den naechsten
Arbeitsblock.

Diese Datei ersetzt weder `README.md`, `CLAUDE.md`, `BRIEFING_PART1.md` noch
`BRIEFING_PART2.md`. Sie verdichtet deren aktuell relevante Arbeitswahrheit.

## STATE HEADER

- `current_repo_head`: `890b03b`
- `current_branch`: `main`
- `last_verified_against_code`: `2026-04-25`
- `truth_scope`: `repo_visible_plus_reviewed_inference`
- `local_drift_present`: `yes`
- `hybrid_architecture`: `yes`
- `primary_runtime_seams`: `client/src/app/App.tsx | server/src/routes/studio.ts | server/src/lib/personaRouter.ts | server/src/lib/memoryService.ts | server/src/lib/opusBridgeController.ts | server/src/lib/opusTaskOrchestrator.ts | server/src/lib/architectPhase1.ts | server/src/routes/architect.ts | server/src/lib/builderFusionChat.ts | server/src/studioPrompt.ts`
- `last_completed_block`: `Der Betriebs-Followup 890b03b haertet `tools/wait-for-deploy.sh` gegen den realen docs-only bzw. non-runtime Push-Fall: Das Skript skippt jetzt nur dann frueh, wenn auf den aktuellen `HEAD` gewartet wird oder kein `EXPECT_COMMIT` gesetzt ist und der letzte Commit ausschliesslich nicht-runtime-relevante Pfade (`*.md`, `docs/**`, `tools/wait-for-deploy.sh`, `.github/workflows/render-deploy.yml`) betrifft. Fuer explizite Nicht-HEAD-Commits bleibt das bisherige strikte Wait-Verhalten erhalten. Lokal liefen `bash -n tools/wait-for-deploy.sh`, der positive Skip-Fall auf dem docs-only `HEAD`, der Gegencheck gegen den Code-Commit `bf36900` sowie die Standard-Invocation `DEPLOY_RESOLVE_IP=216.24.57.7 EXPECT_COMMIT=$(git rev-parse HEAD) bash tools/wait-for-deploy.sh` nach dem Push gruen. Der anschliessende AICOS-Lokalbestand-Check bestaetigt repo-sichtbar nur eigene `sol-cross`-Dateien fuer `013`, `031`, `034`, `055` und `056` sowie textuelle Referenzen auf `sol-cross-042`, `sol-cross-060`, `err-cross-001` und `err-cross-002`; `sol-cross-057` bis `sol-cross-061` existieren lokal nicht als Card-Dateien, und `ee049b4` ist in diesem Repo keine aufloesbare Revision.`
- `next_recommended_block`: `Die enge Design-/Produktentscheidungsrunde zum Hardening bleibt geschlossen: `BACKTICK_IN_REGEX` bleibt auf `block`, global bleibt nur `checkLengthLimits`, und Verlaufstelemetrie bleibt deferred bis echter Entscheidungsdruck entsteht. Der docs-only/non-runtime Deploy-Betriebsfall ist mit 890b03b fuer den normalen `HEAD`-Wait-Pfad repo-sichtbar gehaertet. Wenn als naechstes ein AICOS-Folgeblock gewuenscht ist, muss er jetzt zuerst die Diskrepanz zwischen lokaler Registry und Memory-Behauptung klaeren: Lokal gibt es keine Card-Dateien `sol-cross-057` bis `sol-cross-061` und keinen Commit `ee049b4`; sinnvoll ist daher zunaechst nur eine Herkunftsklaerung (anderer Commit, anderes Repo oder fehlerhafte Memory), nicht bereits eine Implementierung.`
- `read_order_version`: `v2`

## Update-Vertrag

Diese Datei muss nach jedem wichtigen Soulmatch-Block geprueft und bei Bedarf
aktualisiert werden.

Pflicht-Update bei:

- Aenderung sichtbarer Produktlogik in Profil, Match, Discuss, Studio oder Timeline
- Aenderung der LLM-, Audio-, Persistenz- oder Routing-Wahrheit
- neuem belastbaren Drift-Befund zwischen Code und Dokumentation
- Aenderung des empfohlenen naechsten Blocks
- relevanten Git- oder Deploy-Fakten, die den Arbeitsstand neu rahmen

Wenn diese Datei nicht mehr zu Code oder Dokumentation passt, gilt sie als
veraltet und muss nachgezogen werden.

## Lesereihenfolge

Fuer neue Soulmatch-Arbeit zuerst lesen:

1. `STATE.md`
2. `RADAR.md`
3. `README.md`
4. `AGENTS.md`
5. `FEATURES.md`
6. `CLAUDE.md`
7. `BRIEFING_PART1.md`
8. `BRIEFING_PART2.md`
9. danach erst relevante Code-Dateien oder Tests

## Truth Classes

- `Current Repo-Visible Truth` = direkt im Workspace-Code oder in eingecheckten Dateien pruefbar
- `Current Working Assumptions` = sinnvolle Arbeitsannahmen aus Review oder laufender Priorisierung, aber nicht harte Produktwahrheit
- `Current Architecture Reality` = strukturelle Laufzeitlage auch dann, wenn sie technisch hybrid oder unsauber ist
- `Known Drift / Contradictions` = belegbare Widersprueche zwischen Code, Docs und frueheren Aussagen
- `proposal_only` Material darf nicht stillschweigend als gebaut ausgegeben werden

## Executive Summary

Soulmatch ist aktuell ein pnpm-Monorepo mit React/Vite-Client und Express-Server.
Die sichtbare Produktflaeche ist breit modulbasiert, aber global in
`client/src/app/App.tsx` zusammengezogen. Die Hauptachsen sind Profil,
Scoring/Match, Discuss/Studio, Timeline und Settings.

Die aktuell relevante Laufzeitrealitaet ist hybrider als die grobe Doku es teils
behautet: Profilspeicherung laeuft ueber PostgreSQL, zusaetzlich existieren
weitere DB-Tabellen fuer Session- und Voice-Memory, waehrend viele andere
Nutzerzustaende weiter in `localStorage` leben. Bei LLM und Audio ist Gemini
heute realer Bestandteil der Laufzeit und nicht nur Planungsrest.

Neu repo-sichtbar und live verifiziert ist ausserdem Phase 1 der Internal-
Architect-Control-Plane: `server/src/lib/architectPhase1.ts` augmentiert
Builder-Tasks jetzt ueber AICOS-Meta-Quellen und Assumptions, baut daraus die
finale Dispatch-Instruktion und blockt vergiftete Fragmente vor dem
Worker-Swarm. `server/src/routes/architect.ts` exponiert den Beobachtungszustand
read-only ueber `/api/architect/state`, und `builder_assumptions` ist produktiv
migriert. Ein spaeter Live-Smoke deckte dabei einen echten False-Positive im
Exfiltration-Regex auf; `4a072ec` haertet diesen Guard nach, ohne harmlose
Meta-Karten weiter zu blocken.

Der explizit angeforderte UI-Redesign-Pfad ist jetzt durch die weiteren
Tab-Huellen fuer Astro, Report/Match und Hall of Souls sichtbar fortgesetzt.
Explore wurde anschliessend per Produktentscheidung aus der sichtbaren
Navigation und App-Renderkette entfernt, waehrend die Aetheria-Module selbst im
Repo unberuehrt bleiben. Direkt danach wurde ein enger Freisprechen-Audit auf
die STT-Kette in M06 geschnitten: Der sichtbare Transcript-Entwurf war nicht an
das Chat-Input gebunden, und der Silence-Flush verliess sich zu eng auf finale
SpeechRecognition-Segmente. Darauf aufbauend ist jetzt auch die LiveTalk-nahe
Gemini-TTS-Integration fuer `/api/discuss` verdrahtet: Die Gear-Voice-Auswahl
geht als Persona-Setting in den Request, TTS spielt asynchron ohne Chat-Blockade,
und waehrend der Wiedergabe erscheint ein sichtbarer Speaking-Status im Chat.
Der danach geschnittene Crush-v1.1-Block haertet die drei sichtbarsten Discuss-
Naehte direkt im Bestand: M06 nutzt den SSE-Pfad jetzt auch fuer normale Chat-
Antworten mit fruehem Typing-Signal, Chat und Studio haengen ueber einen kleinen
globalen Media-Controller an demselben Stop-/Abort-Pfad, und der Discuss-Prompt
bekommt jetzt den expliziten App-Modus statt still immer Studio zu behaupten.
Die Provider-Schicht streamt dabei weiterhin nicht tokenweise aus dem Modell,
sondern sendet Text erst nach fertiger Provider-Antwort ins SSE. Der naechste
saubere Produktblock ist damit weniger UI als ehrliche Real-Provider-
Verifikation der Restlatenz und der TTS-/Abort-Fehlerpfade unter echten Keys.

Parallel dazu ist die Builder-Studio-Prototyping-Lane jetzt als echter Gate-
Schritt enger an die Spezifikation gezogen: Typen `B`, `C` und `P` halten nach
der ersten Preview in `prototype_review`, die Vorschau ist im Builder-UI direkt
eingebettet, und normale `Run`-/`Approve`-/`Revert`-Pfade greifen dort nicht
mehr still weiter. Stattdessen laufen Freigabe, Revision und Verwerfen jetzt
ueber eigene Prototype-Review-Routen und einen separaten `discarded`-Status.

Direkt danach ist auch der Builder-Arbeitsfluss selbst haerter geworden: Reine
`+`-Patches werden im GitHub-Executor bei bestehenden Dateien nicht mehr als
stilles Overwrite behandelt, sondern append-sicher angewandt. Parallel dazu ist
fuer Maya im Builder eine neue 3-Layer-Memory verdrahtet: Arbeitsgedaechtnis
lebt kurzzeitig im Prozess-RAM, Episoden, semantische Verdichtung und Worker-
Profile liegen im neuen `builder_memory`-Pfad und werden an Task-Uebergaengen
synchronisiert. Vor dem manuellen Schema-Push auf Render degradieren diese
DB-Zugriffe bewusst weich statt den Builder zu brechen. Darauf aufbauend ist
der Builder-Chat jetzt auch enger an die realen Schutzgatter gezogen: Maya
blockt namentlich bekannte Blacklist-Dateien bereits im Chat vor der
Task-Erstellung, erklaert geblockte oder review-beduerftige Tasks im Status mit
einem konkreteren Fehlerbild, und `retry` startet den letzten blockierten Lauf
gezielt erneut. Quick-Mode-Tasks laufen dabei jetzt ueber `executeTask` statt
ueber den haengenden Orchestrator-Pfad, und das `agentHabitat` speichert pro
Worker die letzten drei Nachdenker-Learnings fuer den naechsten Prompt mit.

Parallel dazu ist auch die Opus-Bridge-Lane enger an ihre reale Laufzeitwahrheit
gezogen worden: `providers.ts` kennt jetzt `zhipu` und `openrouter`, der aktive
GLM-Pfad fuer Scout, Distiller, Roundtable und Worker laeuft ueber OpenRouter
(`z-ai/glm-4.7-flash`, `z-ai/glm-5-turbo`), `@READ` kann Dateien
per Multi-Pfad-Aufloesung in den ChatPool injizieren, und die L1-/BDL-Regeln
sind auf eigene Befehlszeilen zugeschnitten. Der akute Patch-Collector-Bruch
ist jetzt an der Parser-Naht gefixt: `@PATCH` mit folgendem
`<<<SEARCH ... ===REPLACE ... >>>`-Block wird wieder als echter Patch-Body
erkannt und vor dem GitHub-Dispatch in `replace`-/`append`-Payloads
normalisiert statt still als leerer Patch zu verschwinden. Der direkte
GitHub-Push-Pfad ist seitdem ebenfalls enger gehaertet: `/git-push` schreibt
Mehrdatei-Payloads jetzt atomar ueber GitHub-Ref-, Commit-, Tree- und Blob-
Calls statt ueber eine per-Datei-Contents-Schleife und wurde live mit drei
Dateien, identischem `commitSha` pro Result und genau einem Remote-Commit
`ad8abd0` verifiziert. Offen bleibt damit weniger die Commit-Semantik selbst
als der breitere Opus-Bridge-Pfad auf Render inklusive `@READ`-Injection,
Roundtable-BDL und Distiller-/Judge-Treue. Lokal ist diese Lane inzwischen
noch eine Stufe enger geschnitten: Das F13-Claim-Gate fuehrt jetzt zusaetzlich
ein sichtbares `scopeCompatibility`-Signal pro Claim, ohne neue Reject-Codes
oder neue Hard-Blocker einzufuehren, und manuelle unindexierte Scope-Pfade
bekommen genau einen Repo-Truth-Fresh-Check ueber denselben Raw-Fetch-Pfad,
statt sofort als Halluzination zu sterben. Dieser F14A-Schnitt ist inzwischen
auch ueber den echten HTTP-Pfad `/api/health/opus-task-async` auf Production
runtime-verifiziert: Case 1 endet bei `anchored + compatible` plus
Judge-Approve, Case 2 bei `anchored + mismatch` plus Judge-Reject, Case 3
zeigt fuer einen realen unindexierten manual-scope-Pfad den Fresh-Check statt
Fruehreject, und Case 4 verwirft einen nicht existierenden Pfad ohne
Create-Signal sauber ueber `rejectedPaths`. Offen bleibt damit fuer die
Opus-Bridge weniger F14A selbst als die breiteren Render-Themen wie `@READ`,
Roundtable-BDL, Distiller-/Judge-Treue und GLM-Laufzeit unter OpenRouter.

Parallel dazu blockt die Builder-Runtime haengende Tasks jetzt auch autonom:
ein eigener Server-Interval prueft alle 5 Minuten auf veraltete Tasks in
`planning`, `consensus` und `push_candidate`, setzt deren Status auf `blocked`
und schreibt den Grund sowohl in `builder_opus_log` als auch als Maya-Hinweis
in den ChatPool, damit die Ursache in der bestehenden Observe-Ansicht sichtbar
bleibt.

Der juengste Builder-S17-Block haertet diese Lane weiter sichtbar: Der
Fusion-Chat versteht jetzt den Intent `cancel` fuer einzelne Tasks, `latest`
und `all_stuck`, die Builder-UI zeigt an offenen Tasks einen `x`-Abbruchknopf,
und `opusDistiller.ts` verankert den ausdruecklichen User-Intent jetzt haerter,
damit Funktionsnamen wie `getWorstPerformers` nicht mehr auf bereits bekannte
Namen wie `getTopPerformers` driften. Repo-sichtbar vorhanden sind ausserdem
der Debug-Endpunkt `/api/builder/opus-bridge/debug-scope`, die Persistenz von
`builder_agent_profiles.last_learnings` und der Quick-Mode-Pfad ueber
`executeTask` statt ueber den frueher haengenden Orchestrator-Zweig.

Der danach geschnittene Builder-S25-Block oeffnet jetzt die naechste
Steuerungsebene direkt im Produkt: `health.ts` stellt den frueher ueberschriebenen
Async-Opus-Task-Endpunkt samt Job-Status wieder her, `opusBridgeController.ts`
regeneriert nach erfolgreichem GitHub-Push den Repo-Index wieder serverseitig,
und der Builder-Maya-Pfad hat jetzt einen separaten Director-Modus. Dieser
Director baut aus `STATE.md`, Continuity, letzten Tasks, Agent-Profilen und
Patrol-Lage einen System-Prompt auf, kann interne Builder-/Opus-Aktionen aus
`action`-Bloecken ausfuehren und ist in der aktiven `BuilderStudioPage` jetzt ueber ein
Director-Dropdown zwischen `Opus 4.6`, `GPT 5.4` und `GLM 5.1` umschaltbar.
Dazu kommt ein `Fast`/`Deep`-Thinking-Schalter, der fuer Opus, GPT 5.4 und
GLM 5.1 bis in die echte Provider-Konfiguration durchgereicht wird; unter den
Director-Antworten erscheinen die serverseitig ausgefuehrten Actions als
eigene Badges statt nur als Fliesstext-Zusammenfassung. GLM 5.1 ist parallel
auch als `meister-glm51` im Council und als `glm51` in Worker-Registry,
Worker-Preset und Pool-Mapping repo-sichtbar aufgenommen. Der engere naechste
Korrekturschnitt macht aus diesem Director jetzt explizit kein zweites Wesen,
sondern ein Maya-Brain: Im UI heisst der Schalter jetzt `Maya Brain`, die
Antwortlabels bleiben `Maya (...)`, und jede Brain-Interaktion schreibt Maya
best-effort eine neue Continuity-Notiz in `builder_memory`. Parallel dazu kann
Maya ueber `memory-read` und `memory-write` dieselbe Builder-Memory direkt als
Tool lesen und beschreiben, ohne ueber eigene geschuetzte HTTP-Routen zu
loopen. Der spaetere Frontend-Check hat dabei einen echten Sichtbarkeitsdrift
offengelegt: Die live Route `/builder` rendert `BuilderStudioPage` als einzige
aktive Builder-Maya-Flaeche. Deshalb sitzen Maya-Brain-Toggle,
Opus/GPT 5.4/GLM 5.1-Auswahl, Fast/Deep-Schalter, Action-Badges und die
GLM-5.1-Pool-Buttons fuer Maya/Council/Worker jetzt zusaetzlich in der real
gerenderten Builder-Studio-Oberflaeche selbst. Darauf aufbauend ist die
Builder-Pool-Ansicht jetzt in vier engen UI-Bloecken sichtbar gewachsen:
Scout, Council, Destillierer und Worker lesen ihren Live-Feed ueber den bereits vorhandenen
`/observe/:taskId`-Pfad, der Opus-Token wird getrennt vom Builder-Token
persistiert, und die festen Bottom-Widgets sind wieder verschwunden. Stattdessen
haengen die vier Feeds jetzt als LIVE-Popups direkt an den jeweiligen
PoolBar-Kacheln, waehrend die bestehende Pool-Konfiguration ueber denselben
Kachelblock erhalten bleibt. Die Feed-Bubbles zeigen Actor-Labels,
Runden-Badges und heben Maya-Moderator-Nachrichten sichtbar vor normalen
Council- oder System-Nachrichten hervor.
Die Patrol-Lane bleibt davon bewusst getrennt: Statt eines weiteren Pool-Buttons
klappt die bestehende SESSION-Bar jetzt selbst einen kompakten Findings-Feed aus,
der `patrol-status` plus `patrol-findings` ueber den Opus-Token liest und
Severity-Badges, Detail-Accordion und Dateivorschau direkt im Builder-Studio
zeigt, waehrend die separate Patrol Console als Vollansicht erhalten bleibt.
Darauf aufbauend hat Maya jetzt auch eine erste sichtbare Presence Shell direkt
im Builder: Eine DOM-basierte Target Registry sammelt `data-maya-target`-Ziele,
ein kleiner leuchtender Guide-Punkt schwebt per Transition zu Pool-, Session-,
Task- und Action-Elementen, und eine temporaere Maya-Tour erklaert drei reale
Arbeitsstationen im Builder. Dieser Presence-Pfad ist inzwischen enger an die
echte Builder-Interaktion gekoppelt: Reale Ereignisse wie Task-Auswahl,
Prototype-Review, freigabebereite Tasks und geoeffnete Patrol-Findings fuehren
Maya direkt an die passenden Ziele; zusaetzlich duerfen jetzt sowohl der
Standard-Builder-Chat als auch der Maya-Brain-Director am Ende ihrer sichtbaren
Antwort genau einen `[NAVIGATE:ziel]`-Tag liefern, der clientseitig entfernt und
stattdessen als Guide-Bewegung plus Bubble umgesetzt wird. Damit bleibt die
sichtbare Antwort sauber, waehrend Maya trotzdem auf `pool.*`, Session-, Task-,
Dialog- oder Action-Ziele deuten kann. Fuer ruhigere Bewegung ignoriert die
Target-Registry jetzt style-Mutationen aus dem eigenen Highlighting, die Figure
hat einen festen `maya-idle`-Anker im Builder-Container, die Bubble ist komplett
pointer-event-frei, und der Builder-Maya-Chat nutzt ueber einen sichtbaren
Mic-Button dieselbe vorhandene Speech-to-Text-Kette wie andere Soulmatch-
Oberflaechen. Bewusst weiter offen bleiben semantische Figure-Zustaende,
echtes TTS im Builder und jede Form autonomer Steuerung.

Operativ ist der Git-Stand fuer den naechsten Chat klar: Der fruehere blinde
Verlass auf Render Auto Deploy ist jetzt als Drift benannt, aber der Repo-Pfad
ist enger gezogen. Das Repo enthaelt keine aktive `render.yaml`, sondern einen
GitHub-Deploypfad, der zuerst kurz auf Render Auto Deploy wartet und
`RENDER_DEPLOY_HOOK_URL` nur noch als Fallback nutzt; `tools/wait-for-deploy.sh`
akzeptiert dafuer jetzt konfigurierbare Timeouts und wartet weiterhin auf den
exakten Commit aus `/api/health` statt nur auf irgendein HTTP 200. Der naechste
enge Block ist damit kein weiterer Deploy-Umbau, sondern die Live-Verifikation
dieses Pfads plus die produktive Maya-Brain-Pruefung auf Render. Parallel dazu
ist der Builder-Pipeline-Drift enger bereinigt: Die tote `MayaDashboard`-
Nebenflaeche ist entfernt, und der Repo-Index wird jetzt auch dann neu erzeugt,
wenn ein GitHub-Actions-Commit erst ueber den spaeteren Callback als erfolgreich
bestaetigt wird. Damit bleibt der Scope-Resolver auch auf diesem Randpfad naeher
an der echten Repo-Wahrheit. Direkt danach ist auch der New-File-Pfad expliziter
gezogen: Wenn der Resolver jetzt eine neue Datei als Ziel erkennt, bleibt diese
Absicht nicht mehr still als `NEW FILE` im Prompt stecken, sondern wird als
Create-Mode bis in ChangeRouter, Worker-Anweisung und SmartPush durchgereicht.
Darauf aufbauend ist jetzt auch die Siegerwahl haerter: `opusJudge.ts` waehlt
nicht mehr blind irgendeinen formalen Gewinner, sondern kann Kandidaten bei
fehlenden expliziten Zielpfaden, fehlenden Create-Targets oder zu breitem
Out-of-Scope-Drift komplett verwerfen.

Parallel dazu ist der Repo-Brain-Rahmen jetzt naeher an Maya Core ausgerichtet:
`docs/methods/compression-check.md` verankert die ausgefuehrte Zerquetsch-Methode,
`DESIGN.md` komprimiert Maya-Designkonstanten fuer Soulmatch, und `CANON.md`
trennt Mayas Rolle sauber von Spezialisten- oder Wahrheitsinstanz-Drift.
Die Cross-System-Treegraphos-Spezifikation liegt jetzt bewusst im
`aicos-registry/treegraphos/`-Bereich statt unter `docs/`, damit sie nicht als
Soulmatch-interne Produktdoku gelesen wird; fuer Reuse-, Struktur- und andere
trunk-uebergreifende Entscheidungen ist sie Referenz, aber keine direkte
Runtime-Wahrheit fuer Soulmatch.

## Current Repo-Visible Truth

- Monorepo mit `client/` und `server/`; Root-Skripte starten beide Services.
- Der Client nutzt React, TypeScript, Vite und `wouter`; globaler App-State lebt in
  `client/src/app/App.tsx`.
- `REDESIGN.md` ist jetzt die kanonische UI-Spezifikation fuer den Umbau und
  priorisiert eine schrittweise Umsetzung ueber Design System, Layout, Startseite,
  Chat und weitere Tabs.
- `docs/methods/compression-check.md` ist jetzt die Methodenreferenz fuer den
  ausfuehrlicheren Zerquetsch-Check bei diffusen oder scope-gefaehrdeten Aufgaben.
- `DESIGN.md` ist jetzt die kompakte Maya-Designreferenz fuer Soulmatch.
- `CANON.md` definiert Mayas Identitaetskonstanten innerhalb von Soulmatch.
- `aicos-registry/treegraphos/TREEGRAPHOS-SPEC-v0.3.2.md` ist jetzt die aktive
  Cross-System-Spezifikation fuer Reuse-, Graph-, Case- und Strukturfragen;
  die zugehoerigen Hardening-Runs und Legacy-Referenzen liegen daneben unter
  `aicos-registry/treegraphos/hardening/` und `aicos-registry/treegraphos/legacy/`.
- `client/src/modules/M00_home/` enthaelt jetzt die neue Startseite mit Greeting,
  Tagesenergie, Profil-/Score-Karte, Guides, Insights und Soul-Card-Vorschau.
- `client/src/modules/M01_app-shell/` enthaelt jetzt die aktive Shell fuer Sidebar,
  Topbar und den wiederverwendbaren LiveTalk-Button; `client/src/app/App.tsx`
  verdrahtet diese Komponenten direkt.
- `client/src/hooks/useLiveTalk.ts` haelt den gemeinsamen Shell-State fuer
  `liveTalkActive`, `ttsEnabled`, `micEnabled`, `autoSend` und `selectedVoice` und
  synchronisiert Sidebar- und Topbar-Schalter ueber denselben Controller.
- `client/src/hooks/useSpeechToText.ts` faellt beim Silence-Flush jetzt auf den
  sichtbaren Transcript-Buffer zurueck, falls der Browser keine finalen
  Segmente geliefert hat; damit geht Interim-Text beim `onend` nicht mehr still
  verloren.
- `client/src/modules/M06_discuss/ui/` enthaelt jetzt die neue Chat-Struktur mit
  `PersonaList`, `MayaChips`, `GearDropdown`, `LiveTalkBanner`,
  `PersonaSettingsPanel` und `MayaOverlay`; `DiscussionChat.tsx` nutzt diese
  Komponenten aktiv.
- `client/src/modules/M06_discuss/ui/DiscussionChat.tsx` spiegelt den laufenden
  STT-Entwurf jetzt sichtbar ins Eingabefeld, solange dort nicht bereits ein
  eigenstaendig getippter Text des Nutzers liegt.
- `client/src/modules/M06_discuss/ui/GearDropdown.tsx` und
  `client/src/modules/M06_discuss/ui/PersonaSettingsPanel.tsx` arbeiten jetzt
  mit den Gemini-TTS-Stimmen `Aoede`, `Kore`, `Puck` und `Fenrir` statt mit
  Persona-IDs als Voice-Plaetzhalter.
- LiveTalk-TTS laeuft fuer M06 aktuell ueber `POST /api/discuss`, das aus dem
  `studioRouter` kommt; `DiscussionChat.tsx` sendet die gewaehlte Stimme als
  `personaSettings[personaId].voice` mit, und `server/src/lib/ttsService.ts`
  uebernimmt diese Voice als Gemini-Override.
- `client/src/modules/M06_discuss/hooks/useDiscussApi.ts` nutzt jetzt einen
  abortierbaren Request-Pfad mit globalem Stop-Handler; `DiscussionChat.tsx`
  schickt M06-Antworten immer ueber SSE, zeigt ein fruehes Typing-Signal und
  laesst Audio separat nachkommen.
- Persona-Antworten werden bei aktivem LiveTalk jetzt asynchron vorgelesen,
  ohne dass der Chat bis zum Ende der Wiedergabe im Loading-Zustand bleibt.
- Waehrend eine Antwort abgespielt wird, zeigt der Chat sichtbar
  `spricht gerade · <Voice>` an.
- `client/src/lib/globalMediaController.ts` ist jetzt die kleine gemeinsame
  Client-Wahrheit fuer laufende Audio-/Request-Aktivitaet; Topbar-Stop, Shell-
  LiveTalk-Off, M06 und `M08_studio-chat/ui/StudioSession.tsx` nutzen denselben
  Stop-/Abort-Pfad.
- `server/src/routes/studio.ts` akzeptiert fuer `/api/discuss` jetzt `appMode`
  und sendet im Stream-Modus ein fruehes `typing`-Event vor dem Text-Event.
- `server/src/lib/ttsService.ts` und `server/src/routes/studio.ts` schneiden
  Discuss-TTS im SSE-Pfad jetzt in einen fruehen ersten Satz plus Rest-Chunk:
  beide TTS-Laeufe starten parallel, der erste Audio-Chunk kann frueher
  ankommen, und der Rest wird zeitlich so nachgeschoben, dass die bestehende
  Client-Wiedergabe den ersten Teil nicht sofort hart ueberschreibt.
- `server/src/routes/studio.ts` unterdrueckt fuer `/api/discuss` jetzt spaete
  `text`-, `audio`- und `audio_error`-Events aus bereits ueberholten Runden,
  damit ein neuer Request mit derselben `userId` keinen alten SSE-Nachlauf mehr
  in M06 durchdrueckt.
- `server/src/studioPrompt.ts` injiziert jetzt einen expliziten App-Modus-Block,
  damit Maya im Chat nicht mehr still Studio-Kontext behauptet.
- `client/src/app/App.tsx` haengt jetzt `PAGE_ASTRO`, `PAGE_REPORT` und
  `PAGE_SOULS` ueber gemeinsame `TabPageShell`- und `TabSectionFrame`-Wrapper in
  die neue Shell-Sprache ein, ohne ihre bestehende Fachlogik umzuschreiben.
- Explore ist per Produktentscheidung nicht mehr Teil der sichtbaren Navigation;
  `APP_PAGES` und der Explore-Renderpfad in `client/src/app/App.tsx` wurden
  entfernt, waehrend `client/src/modules/M15_aetheria/` unangetastet bleibt.
- `client/scripts/visual-check.mjs` laeuft nach dem Tab-Block weiter gruen, ist
  aber aktuell primaer auf Home, Sidebar und Chat als Sichtbarkeitscheck
  ausgerichtet.
- `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx` ist die aktive
  Builder-Oberflaeche fuer Task-Liste, Dialogansicht, Evidence Packs und
  eingebettete Prototype-Previews und traegt jetzt auch die sichtbare Maya-
  Brain-Steuerung ueber die Route `/builder`.
- `client/src/modules/M16_builder/hooks/useMayaApi.ts` verdrahtet den Builder-
  Maya-Pfad fuer Context, Chat, Director, Memory und Actions; `client/src/app/App.tsx`
  rendert die Builder-Flaeche aktuell nur ueber `/builder`.
- Der Server nutzt Express im ESM-Modus; API-Routen werden in
  `server/src/index.ts` gemountet.
- `server/src/index.ts` mountet aktuell u. a. `/api/health`, `/api/meta`,
  `/api/profile`, `/api/scoring`, `/api/numerology`, `/api/astro`, `/api/match`,
  `/api/journey`, `/api/geo`, `/api/studio`, `/api/guide` und Zimage-Routen.
- `server/src/routes/builder.ts` stellt eine eigene Builder-API bereit; die
  Preview-Route `/api/builder/preview/:taskId` ist bewusst ohne Dev-Token
  lesbar, waehrend Mutation-Routen weiter hinter `requireDevToken` liegen.
- `server/src/lib/builderDialogEngine.ts` fuehrt fuer Task-Typen `B`, `C` und
  `P` hoechstens das erste `@PROTOTYPE`-Kommando aus, speichert die Vorschau als
  Artifact und stoppt danach in `prototype_review` statt still in die Code-Lane
  weiterzulaufen.
- Prototype-Review ist jetzt statusstrikt: `approve-prototype`,
  `revise-prototype` und `discard` akzeptieren nur `prototype_review`, waehrend
  die normale `approve`-/`revert`-Logik diesen Zustand explizit zurueckweist.
- `server/src/lib/builderGithubBridge.ts` markiert reine Additions-Patches fuer
  bestehende Dateien jetzt als `append`, und `.github/workflows/builder-executor.yml`
  wendet diese Patches append-sicher an statt existierende Dateien still zu
  ueberschreiben.
- `server/src/lib/builderMemory.ts`, `server/src/lib/builderFusionChat.ts`,
  `server/src/lib/builderDialogEngine.ts` und `server/src/routes/builder.ts`
  verdrahten jetzt eine Builder-Memory-Kette mit RAM-Arbeitsgedaechtnis,
  episodischer Persistenz, semantischer Verdichtung und Worker-Profilen.
- `server/src/schema/builder.ts` erweitert `builder_agent_profiles` um
  `last_learnings`; `server/src/lib/agentHabitat.ts` speichert die letzten drei
  Nachdenker-Learnings pro Worker und injiziert sie wieder in spaetere Briefs.
- `server/src/lib/providers.ts`, `server/src/lib/opusScoutRunner.ts`,
  `server/src/lib/opusRoundtable.ts`, `server/src/lib/builderBdlParser.ts`,
  `server/src/lib/opusBridgeController.ts` und `server/src/routes/opusBridge.ts`
  tragen jetzt die aktive Opus-Bridge-Kette mit OpenRouter-GLM-Modellen,
  `@READ`-Datei-Injektion und SEARCH/REPLACE-faehigem Patch-Collector.
- `server/src/lib/directorContext.ts`, `server/src/lib/directorPrompt.ts`,
  `server/src/lib/directorActions.ts`, `server/src/routes/builder.ts` und
  `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx` tragen jetzt den
  produktnahen Maya-Director-Pfad; `server/src/routes/health.ts` enthaelt
  wieder `/api/health/opus-task-async` und `/api/health/opus-job-status`.
- `server/src/routes/opusBridge.ts` enthaelt jetzt zusaetzlich den Debug-Pfad
  `/api/builder/opus-bridge/debug-scope`, um den effektiven Task-Scope gegen
  die Zielruntime sichtbar zu pruefen.
- `server/src/lib/builderFusionChat.ts` klassifiziert jetzt `cancel` auch fuer
  `latest` und `all_stuck`; `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`
  bietet dafuer an offenen Tasks einen sichtbaren Abbruchknopf mit UI-Block-Pfad.
- `server/src/lib/opusDistiller.ts` enthaelt jetzt einen harten User-Intent-
  Anker und einen Duplicate-Hinweis, wenn ein vom User genannter Funktionsname
  bereits im Scope existiert.
- `server/src/lib/builderStaleDetector.ts` startet ueber `server/src/index.ts`
  als Singleton-Interval, blockiert stale Builder-Tasks nach statusabhaengigem
  Timeout und schreibt den Grund in ChatPool plus `builder_opus_log`.
- `server/src/lib/builderFusionChat.ts` kennt jetzt die Builder-Blacklist
  namentlich, blockt solche Ziel-Dateien direkt im Chat vor jeder Task-Erzeugung,
  erklaert geblockte oder `review_needed`-Tasks im Status ueber Actions/Reviews
  genauer nach und akzeptiert `retry` fuer den letzten retry-faehigen Lauf.
- `server/src/lib/agentHabitat.ts` speichert jetzt pro Worker drei kompakte
  Nachdenker-Learnings in `builder_agent_profiles.last_learnings` und injiziert
  sie beim naechsten Worker-Brief wieder in den Prompt.
- `server/src/schema/builder.ts` definiert jetzt die Tabelle `builder_memory`;
  bis zum manuellen Schema-Push auf Render fangen die neuen Builder-Memory-
  Pfade fehlende Tabellenzugriffe bewusst ab und loggen nur Fehler.
- `server/src/lib/personaRouter.ts` verwendet aktuell Gemini, DeepSeek, OpenAI
  und Grok/xAI im Persona-Umfeld; Gemini ist fuer mehrere Personas aktiv.
- `server/src/routes/studio.ts` hat provider-seitige Konfiguration fuer
  `gemini`, `openai`, `deepseek` und `xai`; Default fuer Studio faellt auf
  `gemini` zurueck.
- `server/src/lib/ttsService.ts` implementiert produktiven TTS-Fallback zwischen
  Gemini Preview TTS und OpenAI TTS. Chatterbox ist nicht repo-sichtbar integriert.
- `client/src/hooks/useSpeechToText.ts` implementiert browserbasiertes STT mit
  Continuous-Mode, Restart-Backoff, Consent-Flag und Guardrails gegen Restart-Loops.
- `server/src/lib/memoryService.ts` schreibt Session-Memory in die Tabelle
  `session_memories` und liest sie fuer Memory-Kontext wieder aus.
- `migration.sql` legt `persona_memories`, `voice_profiles` und
  `session_memories` an. Die Persistenzrealitaet ist daher breiter als
  `profiles` allein.
- `server/src/routes/dev.ts` akzeptiert weiter ein eingebautes Fallback-Passwort,
  falls `DEV_TOKEN` nicht gesetzt ist.
- Der Git-Stand ist auf `main` bei `9cf39f8` (Stand nach S34); die Working-Tree-
  Lage kann auf dem lokalen Klon weiter dirty sein durch Testartefakte — das ist
  kein Produktsignal.

## Current Working Assumptions

- Der Nutzer hat den aktiven Fokus fuer die naechsten UI-Bloecke explizit auf den
  Redesign-Pfad gesetzt; diese Priorisierung hat Vorrang vor der zuvor empfohlenen
  Voice-Audit-Reihenfolge.
- Treegraphos soll fuer Soulmatch nur dann aktiv konsultiert werden, wenn ein
  Block Reuse, Cross-System-Patterns, strukturelle Orientierung oder die
  Grenze zwischen Proposal und operativer Arbeitswahrheit betrifft; fuer
  normale Produkt- und Runtime-Fragen bleibt der lokale Code vorrangig.
- Die Audio-/Discuss-Linie ist bereits wichtig genug, dass ihre Fehlergrenzen
  explizit beobachtet und dokumentiert werden sollten, bevor neue Audio-Ideen
  hinzukommen.
- Credits-/Monetarisierungslogik ist noch kein sauberes aktives Runtime-System,
  obwohl in `server/src/studioPrompt.ts` und `server/src/routes/studio.ts`
  bereits Kosten- bzw. Credit-Signale auftauchen.
- Die neue Builder-Memory-Persistenz ist repo-sichtbar verdrahtet, aber auf der
  Deploy-Runtime erst nach einem manuellen `drizzle-kit push` fuer
  `builder_memory` voll wirksam; bis dahin ist nur das RAM-Arbeitsgedaechtnis
  sicher aktiv.
- Das Repo braucht fuer kuenftige Arbeit eine harte Trennung zwischen
  repo-sichtbarer Wahrheit, Review-Ableitung und Proposal-Material, weil mehrere
  vorhandene Docs noch zu grob vereinfachen.

## Current Architecture Reality

### Produktordnung

- `client/src/app/App.tsx` ist der globale State-Container und damit die reale
  Oberflaechen-Schaltzentrale.
- Die uebergeordnete Shell-Struktur fuer Navigation und Header ist jetzt in
  `client/src/modules/M01_app-shell/` ausgelagert, bleibt aber in `App.tsx`
  orchestral verdrahtet.
- Die Startseite ist als eigener M00-Block ausgelagert und wird in `App.tsx` als
  Default-Flaeche vor den bestehenden nummerischen Tabs angezeigt.
- Der Discuss-Tab ist jetzt auf eine feste Persona-Liste statt auf die alte
  Companion-/Persona-Select-Strecke umgestellt.
- Astro, Report/Match und Hall of Souls bleiben fachlich in ihren bisherigen
  App- und Modulpfaden, teilen aber jetzt eine gemeinsame aeussere
  Seitenhierarchie fuer Header, Border-Rahmen und Card-Einbettung.
- Explore ist aktuell keine sichtbare Runtime-Seite mehr; die zugrunde liegenden
  Aetheria-Dateien bleiben nur noch als ungerenderter Modulbestand im Repo.
- Profile, Scores, Match, Journey, Studio und Timeline laufen nicht ueber ein
  dediziertes State-Framework, sondern ueber Props und `useState`.
- Navigation ist page- und overlay-getrieben, nicht URL-zentriert.

### LLM- und Audio-Realitaet

- Persona-Routing und Studio-Routing sind nicht identisch modelliert, sondern
  auf mehrere Konfigurationsstellen verteilt.
- `server/src/lib/personaRouter.ts` enthaelt sowohl allgemeine Persona-Provider
  als auch tiefere Persona-Konfiguration fuer Standard, Deep und TTS.
- Discuss kann Text ueber SSE sofort sichtbar machen, ein fruehes Typing-Signal
  senden und Audio spaeter nachliefern.
- Der globale Shell-LiveTalk-State steuert jetzt auch den Chat-Tab fuer Banner,
  Gear-Dropdown und Persona-Settings; die M06-Runtime nutzt weiter einen lokalen
  Audio-/STT-Hook fuer Aufnahme und Playback.
- Chat und Studio haben jetzt zusaetzlich einen kleinen gemeinsamen
  Global-Stop-Pfad fuer laufende Requests und Playback, ohne dass dafuer eine
  neue globale State-Architektur eingezogen wurde.
- Der konkrete Freisprechen-Bruch lag in der letzten Meile der Eventkette:
  sichtbarer Speech-Entwurf und Silence-Auto-Send waren nicht robust genug an
  das Chat-Input bzw. an Interim-only-Ergebnisse gekoppelt.
- Die TTS-Kette fuer Discuss nutzt in `server/src/lib/ttsService.ts` jetzt
  zusaetzlich einen Fast-First-Pfad fuer den SSE-Stream: erster Satz frueh,
  Rest-Chunk parallel vorbereitet; die Voice-Wahl kommt weiter aus dem Client
  statt nur aus starren Persona-Mappings.
- Die TTS-Fallback-Kette in `server/src/lib/ttsService.ts` akzeptiert jetzt auch
  nur einen verfuegbaren Provider-Key; fehlende Engines werden uebersprungen,
  statt den gesamten Audio-Pfad still zu sperren.
- `server/scripts/discuss-audio-probe-check.mjs` ist jetzt das gezielte
  Repo-Werkzeug fuer Real-Provider-Verifikation von `/api/discuss`: es prueft
  `typing -> text -> audio|audio_error -> done`, validiert TTS-Telemetrie,
  misst Latenzen und deckt Round-Cancel-Leaks ueber dieselbe `userId` auf.
- Es existieren weiterhin mehrere Client-Playback-Pfade im Repo
  (`M06_discuss`, `M02_ui-kit`, Teile von M08); das ist derzeit eher ein
  `relocate`-/`biegt`-Thema als ein akuter Laufzeitbruch.
- Die Provider-Schicht in `server/src/lib/providers.ts` streamt weiterhin nicht
  tokenweise; die aktuelle Latenzverbesserung ist daher ein frueheres SSE-
  Sichtbarkeitssignal, kein echtes Delta-Streaming aus dem Modell.

### Persistenzrealitaet

- `profiles` ist die klarste aktive Kern-Persistenz fuer Userprofile.
- `session_memories` ist nicht nur Schema-Rest, sondern wird von
  `server/src/lib/memoryService.ts` aktiv beschrieben und gelesen.
- `builder_assumptions` ist jetzt produktiv aktiv: `server/src/lib/architectPhase1.ts`
  liest und schreibt diese Tabelle fuer die neue Assumption-Registry, und die
  Tabelle wurde live ueber den geschuetzten Remote-Migrationspfad angelegt.
- `persona_memories` und `voice_profiles` sind im Schema vorhanden; ihr genauer
  aktiver Nutzungsgrad sollte in einem separaten Audit geprueft werden.
- Viele Nutzerzustaende bleiben bewusst oder historisch in `localStorage`, u. a.
  Chat, Timeline, Soul Cards, Settings und mehrere Persona-/Safety-Flags.

### Betriebsrealitaet

- Der Repo-Zustand ist derzeit nicht clean; Testartefakte liegen untracked bzw.
  modified im Working Tree.
- Die Root-Dokumentation vereinfacht mehrere Runtime-Aspekte zugunsten eines
  MVP-Narrativs, was als Einstieg hilfreich, aber als operative Wahrheit zu grob ist.
- `/api/architect/state` ist ein beobachtender read-only Endpoint und kein
  kanonischer Prefetch fuer AICOS-Meta-Karten; die dort sichtbaren Meta-Fragmente
  erscheinen erst nach einer realen Assembly mit `metaSourceIds`.
- Das UI bekommt jetzt eine zweite harte Wahrheitsschicht: `REDESIGN.md` fuer den
  visuellen und strukturellen Zielzustand, ohne Routing-, Backend- oder
  Scoring-Vertraege neu zu oeffnen.
- Fuer Maya-zentrierte UI- und Rollenarbeit existiert jetzt zusaetzlich eine
  kompakte Referenzschicht aus `DESIGN.md` und `CANON.md`, damit Maya nicht je
  Block neu erfunden wird.
- Der neue Shell-LiveTalk-State ist bewusst noch von der bestehenden M06-Discuss-
  Audio-Engine getrennt; Shell-Sync ist gebaut, aber keine heimliche Voice-
  Vereinheitlichung behauptet.

## Known Drift / Contradictions

- `CLAUDE.md` und `BRIEFING_PART1.md` beschreiben die LLM-Provider unvollstaendig
  oder veraltet. Repo-sichtbar existiert heute auch Gemini als aktiver Provider.
- `CLAUDE.md` beschreibt Persistenz stark vereinfacht als `profiles` in DB plus
  sonst `localStorage`; `migration.sql` und `server/src/lib/memoryService.ts`
  zeigen zusaetzliche DB-Realitaet.
- `BRIEFING_PART1.md` nennt `profiles` als einzige persistente DB-Tabelle; das
  ist gegen den aktuellen Repo-Stand falsch.
- `server/src/routes/dev.ts` enthaelt ein eingebautes Passwort. Das ist mit einem
  sauberen, env-getriebenen Sicherheitsnarrativ nicht konsistent.
- Das Repo hat produktive Audio-/Voice-Pfade, aber keinen eingecheckten
  Repo-Brain- oder Audit-Rahmen fuer deren Stabilitaet, bis zu diesem Block.
- Der Working Tree enthaelt Testresultate; diese sind keine Produktwahrheit und
  duerfen nicht als Feature- oder Qualitaetsbeleg gelesen werden.

## Active Sources Of Truth

- schnelle operative Wahrheit: `STATE.md`
- Arbeitsregeln und Sync-Disziplin: `AGENTS.md`
- auditierbarer Feature-Stand: `FEATURES.md`
- Ideen-, Risiko- und Adoptionssteuerung: `RADAR.md`
- Methodenreferenz fuer Zerquetsch-Disziplin: `docs/methods/compression-check.md`
- Maya-Designkonstanten: `DESIGN.md`
- Maya-Identitaetskonstanten: `CANON.md`
- Repo-Kommandos, Architektur- und Typcheck-Regeln: `CLAUDE.md`
- breiter technischer Hintergrund, aber nur eingeschraenkt aktuelle Wahrheit:
  `BRIEFING_PART1.md`, `BRIEFING_PART2.md`, `README.md`
- Code hat bei Widerspruch Vorrang vor groben Docs

## Last Completed Block

### Name

F9 — False-Positive Pipeline Path Fix (Schritt A+D live, Schritt C pending)

### Ergebnis

Der Hauptrisk S31 (Pipeline meldet `success` ohne reale Commit-Landung) ist
strukturell geschlossen. Schritt A und D sind live via Commit `1065cd3`:
`server/src/lib/pushResultWaiter.ts` (neues Modul, in-memory Waiter-Queue),
`server/src/lib/opusSmartPush.ts` (liest taskId aus `/push`-Response, wartet
via Promise.all auf execution-result-Callbacks mit 3-Min-Timeout, `pushed: true`
nur bei verifizierter Landung), `server/src/routes/builder.ts`
(execution-result-Handler mit neuem `committed === false`-Branch, signalisiert
`landed:true/false` terminal). Schritt D funktioniert automatisch, weil
`opusTaskOrchestrator.ts:323` seit jeher `status: push.pushed ? 'ok' : 'error'`
macht — sobald `push.pushed` ehrlich ist, ist der Orchestrator-Status ehrlich.
Probe-Test am 2026-04-20 bestaetigt Live-Wirkung: `checks_failed`-Callback wird
vom neuen Handler mit `reason`-Feld in `builderActions` geschrieben, Task-Status
`review_needed`.

Schritt C (Workflow-Haertung in `.github/workflows/builder-executor.yml`) ist
durch eine Token-Limitation blockiert: Der Bridge-GitHub-Token hat keinen
`workflows`-Scope, GitHub rejected Tree-Creates die Workflow-Files enthalten
mit 404. Fertige Datei wurde manuell uebergeben; Commit steht aus (Via GitHub
Web-UI oder persoenlichem PAT).

Drift 12 in `docs/CLAUDE-CONTEXT.md` dokumentiert die Token-Limitation.

### Nicht Teil dieses Blocks

- kein SHA-Polling-Pfad (Callback-Pattern wurde bewusst als saubere Alternative gewaehlt)
- kein Umbau von `opusTaskOrchestrator.ts` (Schritt D fixt sich automatisch)
- kein Anruehren des fire-and-forget `regenerateRepoIndex()` in `/push` (als Nebenbefund dokumentiert)
- keine Kaya-Code-Rename-Arbeit (wartet weiter auf Maya-Core-Migration)

## Next Recommended Block

### Name

F9 Schritt C Commit + Akzeptanztest

### Ziel

Den Workflow-Haertungs-Commit manuell landen (builder-executor.yml empty-diff
sendet Callback + `exit 1` statt stillem `exit 0`) und den F9-Akzeptanztest
fahren: `/opus-feature` mit absichtlich nicht-existentem Anchor muss
`status: partial` oder `failed` liefern, nicht `success`. Nach Schritt C in
Sekunden, ohne Schritt C via 3-Min-Timeout (funktional korrekt, nur langsamer).

### Warum dieser Block jetzt sinnvoll ist

- Schritt A+D sind live, aber Schritt C schliesst die F9-Loop so, dass der
  Fehlerfall sofort statt per Timeout sichtbar wird.
- Ein gruener Akzeptanztest nach Schritt C ist die eindeutige Bestaetigung,
  dass die False-Positive-Pipeline-Meldung strukturell behoben ist.
- Erst danach lohnt sich die Arbeit an F6 (File-Scout) oder anderen aufgestauten
  Builder-Themen.

### Scope

- `.github/workflows/builder-executor.yml` (manueller Commit via Web-UI, 2 Zeilen raus + 5 rein)
- `/opus-feature`-Aufruf mit UNIQUE_MARKER_THAT_DOES_NOT_EXIST-Intent
- Beobachtung von `status`, `phases.push`, `builderActions.result.reason`

### Nicht-Scope

- neue Executor-Pfade oder Worker-Swarm-Umbau
- Render-Deploy-Pipeline-Aenderungen
- Bridge-Token-Scope-Erweiterung (eigener Block fuer spaeter)

### Fortschritt

- Fertige `builder-executor.yml` wurde in der F9-Session an Gürcan uebergeben;
  Commit steht ausstehend bis zum naechsten Laptop-Fenster.

## Alternative Valid Next Blocks

- `UI Redesign Weitere Tabs`
- `Dev Token Hardening`
- `Persistence Reality Audit`
- `Provider Truth Sync`
- `Credits Reality Audit`

## Not Now

- grosser Architekturumbau fuer globales State-Management
- stillschweigende Rueckkehr zu einer vereinfachten "nur profiles in DB"-Erzaehlung
- neue TTS- oder Voice-Systeme nur aus Wunschbild heraus
- broad cleanup des gesamten Dirty Trees als Hauptblock
- stiller UI-Grossumbau ohne Bindung an `REDESIGN.md`

## Guardrails

- Repo-sichtbarer Code hat Vorrang vor Briefing- oder README-Vereinfachungen
- proposal-only Ideen nie als aktive Produktwahrheit ausgeben
- UI-Redesign-Arbeit an `REDESIGN.md` ausrichten, nicht an ad-hoc-Einfallsloesungen
- Audio-/Voice-Arbeit nur als enger, testbarer Block schneiden
- Persistenzrealitaet nicht kuenstlich kleiner oder groesser behaupten als der Code
  sie zeigt
- Dirty-Tree-Artefakte nicht mit Produktwahrheit verwechseln

## External Review Use

Externe Reviews sollen zuerst lesen:

1. `STATE.md`
2. `RADAR.md`
3. `AGENTS.md`
4. `FEATURES.md`
5. erst dann die relevanten Code-Dateien

Externe Reviews sollen klar trennen zwischen:

- repo-sichtbarer Wahrheit
- review-abgeleiteter Arbeitsannahme
- geparkter Idee
- bewusstem Nicht-Scope

## Next Chat Bootstrap

Wenn ein neuer Chat startet oder Kontextverlust droht:

1. `STATE.md` lesen
2. `RADAR.md` lesen
3. `AGENTS.md` lesen
4. `FEATURES.md` lesen
5. letzten verifizierten Stand und den naechsten Block benennen
6. erst dann in Code oder Aenderungen gehen

### Arcana Studio Phase 1 - Datenmodell

- server/src/shared/types/persona.ts: PersonaDefinition, VoiceConfig,
  CharacterTuning, ToneMode, SignatureQuirk, GeminiVoiceName, AccentKey
- server/src/lib/voiceCatalog.ts: 30 Stimmen-Katalog, 13 Akzente,
  System-Persona-Voice-Map, Credit-Tiers
- arcana_migration.sql: persona_definitions, persona_voice_overrides,
  persona_presets (noch nicht ausgefuehrt)
- server/src/lib/voicePromptBuilder.ts: buildTtsPrompt() - VoiceConfig -> TTS-Prompt
- server/src/lib/directorPromptBuilder.ts: buildDirectorPrompt() - PersonaDefinition -> System-Prompt
- server/src/lib/__tests__/promptBuilders.smoke.ts: Smoke-Test mit Napoleon-Beispiel
- Keine bestehenden Dateien veraendert

### Arcana Studio Phase 3 - TTS Integration

- server/src/lib/ttsService.ts nutzt im Gemini-Pfad jetzt bevorzugt
  personaSettings.voice, danach SYSTEM_PERSONA_VOICES, danach das alte
  getPersonaVoice()-Fallback
- System-Personas mit Arcana-VoiceConfig erhalten im Gemini-Pfad jetzt einen
  buildTtsPrompt()-angereicherten Text statt nur des alten Director-Wrappers
- Das alte getPersonaVoiceDirector()-Verhalten bleibt als Fallback fuer Personas
  ohne Arcana-Systemeintrag erhalten
- OpenAI-TTS-Pfad bleibt unveraendert
- Signatur und Rueckgabetyp von generateTTS() bleiben unveraendert

### Arcana Studio Phase 4 - API Routes + DB

- arcana_migration.sql wurde als Referenz beibehalten; der Arcana-Block wurde
  in migration.sql integriert und von dort lokal gegen die DB ausgefuehrt
- server/src/schema/arcana.ts registriert persona_definitions,
  persona_voice_overrides und persona_presets fuer Drizzle
- server/src/routes/arcana.ts liefert CRUD fuer Personas, TTS-Preview sowie
  Voice-, Accent- und Preset-Katalog-Endpoints
- server/src/index.ts mountet arcanaRouter unter /api direkt nach studioRouter,
  wodurch die Routen unter /api/arcana/* erreichbar sind
- DB-Tabellen: persona_definitions, persona_voice_overrides, persona_presets
- Kein Credit-Check, keine Moderation, keine UI und keine Aenderung an Studio-
  oder Discuss-Flow

### Arcana Studio Phase 5 - PersonaSettings Voice & Accent

- client/src/data/voiceCatalog.ts liefert den Client-Katalog fuer 30 Stimmen,
  13 Akzente und System-Defaults pro Persona
- client/src/modules/M06_discuss/ui/PersonaSettingsPanel.tsx nutzt jetzt ein
  gruppiertes Voice-Dropdown, ein Accent-Dropdown und einen dezenten
  Preview-Button fuer /api/arcana/tts-preview
- client/src/modules/M06_discuss/ui/GearDropdown.tsx ersetzt die alte
  4-Stimmen-Buttonleiste durch ein Dropdown im bestehenden Inline-Token-Stil
- client/src/modules/M06_discuss/ui/DiscussionChat.tsx sendet jetzt die Stimme
  aus dem Persona-Panel-State, mit Fallback ueber liveTalk.selectedVoice auf den
  System-Default; Accent wird ebenfalls mitgeschickt
- client/src/modules/M06_discuss/hooks/useDiscussApi.ts erlaubt accent im
  personaSettings-Payload
- server/src/lib/ttsService.ts liest im Gemini-VoiceConfig jetzt auch den
  Accent-Override aus personaSettings, sonst den System-Akzent
- Bestehende Controls fuer Quirks, Charakter-Tuning, Ton-Modus und Maya-Extras
  bleiben erhalten; Server-Flow und Studio-Flow bleiben unveraendert

### M06 Discuss Hardening - Audio Fehler sichtbar

- client/src/modules/M06_discuss/ui/DiscussionChat.tsx nutzt beim Senden keine
  stale personaSettings-Closure mehr; Panel-Settings haengen jetzt korrekt in
  den Hook-Dependencies
- Die Header-Anzeige fuer laufende Wiedergabe zeigt jetzt die tatsaechlich
  angeforderte Persona-Stimme statt blind liveTalk.selectedVoice
- client/src/modules/M06_discuss/ui/PersonaSettingsPanel.tsx spiegelt die
  Panel-Stimmwahl nicht mehr still in den globalen LiveTalk-State
- server/src/routes/studio.ts sendet im Stream-Modus jetzt audio_error-Events,
  wenn TTS ausfaellt oder keine Audio-Engine verfuegbar ist
- client/src/modules/M06_discuss/hooks/useDiscussApi.ts und
  client/src/modules/M06_discuss/ui/DiscussionChat.tsx machen diese
  Audio-Ausfaelle jetzt fuer den User sichtbar, statt sie nur im Server-Log zu
  verlieren

### Render Keep-Alive - Cold Start abfedern

- server/src/lib/keepAlive.ts pingt in Produktion alle 10 Minuten
  https://soulmatch-1.onrender.com/api/health an und loggt Status bzw. Fehler
- server/src/index.ts startet den Keep-Alive-Hook direkt nach app.listen()
- M06 Discuss brauchte dafuer keine UI-Aenderung; Text wird bereits vor Audio
  aus dem SSE text-Event in den Chat geschrieben
- server/src/routes/studio.ts nutzt fuer generateTTS() im Discuss-Pfad jetzt
  30s Timeout statt 20s, damit der erste Warmup-/TTS-Call weniger leicht in
  den Timeout kippt

### Filler System Phase F1 - Phrasen-Katalog

- server/src/lib/fillerCatalog.ts: 160 Filler-Phrasen fuer 10 Personas,
  7 Kategorien (thinking, acknowledging, intrigued, preparing, empathizing,
  challenging, transitioning) und Hilfsfunktionen fuer Persona-, Kategorie-
  und Zufallsauswahl
- server/scripts/generateFillerAudio.ts: Einmal-Skript fuer die lokale Gemini-
  TTS-Generierung aller Filler-Audios nach server/assets/filler/{personaId}/
  {fillerId}.pcm; noch nicht ausgefuehrt
- server/assets/filler/: Asset-Ordner mit .gitkeep als Platzhalter fuer lokal
  generierte Filler-Clips
- .gitignore ignoriert generierte PCM-Dateien unter server/assets/filler/**
- Keine Laufzeit-Integration in Discuss oder Studio; F2/F3 bleiben offen

### Arcana Studio Phase 6.1 - Creator UI Grundstruktur

- client/src/modules/M09_arcana/: neues Arcana-Studio-Modul mit Hook, Persona-
  Liste, Tuning-Platzhalter und Live-Vorschau-Platzhalter
- ArcanaStudioPage.tsx: Drei-Spalten-Layout fuer Liste, Tuning und Vorschau
- ArcanaPersonaList.tsx: System- und User-Personas aus der Arcana-API sowie
  ein Button fuer neue Persona-Entwuerfe
- ArcanaPersonaTuning.tsx: Platzhalterflaeche fuer Phase 6.2 mit read-only/
  disabled Controls
- ArcanaLivePreview.tsx: Platzhalter mit funktionierendem TTS-Preview-Button
- useArcanaApi.ts: Client-Hook fuer Personas, Presets und TTS-Preview; nutzt
  clientseitigen Voice-/Accent-Katalog und einen stabilen lokalen Arcana-User-
  Fallback
- client/src/app/App.tsx rendert unter dem bestehenden Studio-Tab jetzt Arcana
  Studio statt M08 StudioPage; M08-Dateien bleiben unveraendert im Repo
- server/src/routes/arcana.ts akzeptiert fuer GET /api/arcana/personas jetzt
  userId ueber Query-Parameter, damit User-Personas im Browser ladbar sind