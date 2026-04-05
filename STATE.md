# STATE

## Zweck

Diese Datei ist die kanonische operative Kurzwahrheit fuer `soulmatch`.
Sie ist der schnellste Einstieg fuer neue Chats, Reviews und den naechsten
Arbeitsblock.

Diese Datei ersetzt weder `README.md`, `CLAUDE.md`, `BRIEFING_PART1.md` noch
`BRIEFING_PART2.md`. Sie verdichtet deren aktuell relevante Arbeitswahrheit.

## STATE HEADER

- `current_repo_head`: `b55cf2e`
- `current_branch`: `main`
- `last_verified_against_code`: `2026-04-05`
- `truth_scope`: `repo_visible_plus_reviewed_inference`
- `local_drift_present`: `yes`
- `hybrid_architecture`: `yes`
- `primary_runtime_seams`: `client/src/app/App.tsx | server/src/routes/studio.ts | server/src/lib/personaRouter.ts | server/src/lib/memoryService.ts`
- `last_completed_block`: `Builder append-safe patching + Maya 3-layer Builder memory`
- `next_recommended_block`: `Render-Schema-Push fuer builder_memory und Live-Verifikation der Builder-Memory-Kette`
- `read_order_version`: `v1`

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
DB-Zugriffe bewusst weich statt den Builder zu brechen.

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
  eingebettete Prototype-Previews.
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
- Der Git-Stand ist auf `main` bei `b55cf2e`; der Working Tree ist dirty,
  aktuell vor allem durch `client/test-results`.

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
- Die TTS-Kette fuer Discuss nutzt weiter `generateTTS` in `server/src/lib/ttsService.ts`,
  aber die Voice-Wahl kommt jetzt aus dem Client statt nur aus starren
  Persona-Mappings.
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
- `persona_memories` und `voice_profiles` sind im Schema vorhanden; ihr genauer
  aktiver Nutzungsgrad sollte in einem separaten Audit geprueft werden.
- Viele Nutzerzustaende bleiben bewusst oder historisch in `localStorage`, u. a.
  Chat, Timeline, Soul Cards, Settings und mehrere Persona-/Safety-Flags.

### Betriebsrealitaet

- Der Repo-Zustand ist derzeit nicht clean; Testartefakte liegen untracked bzw.
  modified im Working Tree.
- Die Root-Dokumentation vereinfacht mehrere Runtime-Aspekte zugunsten eines
  MVP-Narrativs, was als Einstieg hilfreich, aber als operative Wahrheit zu grob ist.
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

TTS Crush Audit und LiveTalk Hardening

### Ergebnis

Der enge Crush-Audit auf den bestehenden TTS-Bestand hat zwei `kippt`-Punkte
belegt und minimal behoben: Erstens blockierte der normale LiveTalk-Request in
M06 die sichtbare Persona-Antwort noch bis zum fertigen TTS-Bundle; deshalb
nutzt `DiscussionChat.tsx` fuer Audio jetzt den SSE-Pfad von `/api/discuss`.
Zweitens koppelte der Route-/Service-Pfad Audio faktisch an gleichzeitig
vorhandene Gemini- und OpenAI-Keys; `server/src/routes/studio.ts` und
`server/src/lib/ttsService.ts` ueberspringen jetzt fehlende Engines sauber,
statt den ganzen TTS-Pfad vorab zu verlieren. Weitere doppelte Playback-Pfade
im Repo wurden als `relocate` markiert, aber bewusst nicht in diesem Block
umgebaut.

### Nicht Teil dieses Blocks

- kein neuer Audio-Stack und keine neue TTS-Route
- kein Umbau der parallelen Audio-Player in M02 oder M08
- keine Real-Key-Ende-zu-Ende-Verifikation gegen produktive Provider
- keine Bereinigung des bestehenden Dirty Trees
- keine Aenderung an Scoring, Match oder globaler App-Architektur

## Next Recommended Block

### Name

Real-Provider-Verifikation fuer LiveTalk TTS

### Ziel

Die jetzt korrigierte LiveTalk-TTS-Kette mit echten Provider-Keys und realen
Fehlerfaellen pruefen: Voice-Auswahl, Fallback von Gemini zu OpenAI,
sichtbare Degradation ohne Audio und reproduzierbare Fehlersignale bei
Provider- oder Autoplay-Problemen.

### Warum dieser Block jetzt sinnvoll ist

- Der Crush-Audit hat die zwei akuten Laufzeitbrueche geschlossen, aber noch
  keine echte Provider-Verifikation unter Realbedingungen geliefert.
- Audio ist jetzt produktnaeher verdrahtet als zuvor; damit steigen die Kosten
  von stillen Fallback- oder Fehlerpfad-Irrtuemern.
- Erst nach belastbarer TTS-Realverifikation lohnt sich ein weiterer Voice-
  oder UX-Ausbau.

### Scope

- `server/scripts/discuss-audio-probe-check.mjs`
- `server/src/routes/studio.ts`
- gezielte Ausfuehrung gegen lokale oder deployte Runtime mit echten Keys

### Nicht-Scope

- neue Design-Bloecke ausserhalb von M06
- Umbau der gesamten Audio-Architektur im Repo
- Scoring-, Match-, Routing- oder Persistenz-Neudesign
- broad cleanup aller historischen Voice-Pfade in einem Rutsch

### Fortschritt

- Repo-seitig existiert jetzt ein gezieltes Probe-Skript fuer den Block; die
  eigentliche Real-Key-Ausfuehrung bleibt bewusst ein operativer Schritt gegen
  eine laufende Runtime statt nur statischer Code-Aenderung.

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