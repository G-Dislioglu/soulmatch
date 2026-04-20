# RADAR

## Zweck

Diese Datei sammelt relevante Soulmatch-Ideen, Risiken, externe Vorschlaege,
Review-Ableitungen und moegliche naechste Bloecke in einer kontrollierten,
KI-lesbaren Radaransicht.

`RADAR.md` ist nicht die operative Ist-Wahrheit. Dafuer ist `STATE.md`
zustaendig.

`RADAR.md` haelt fest:

- welche Kandidaten existieren
- wie ihr Status ist
- auf welcher Wahrheitsklasse sie beruhen
- warum etwas jetzt dran ist oder bewusst nicht jetzt
- welcher naechste Gate-Schritt noetig ist

## Update-Vertrag

Diese Datei muss aktualisiert werden, wenn:

- ein neuer Arbeitskandidat aus Code-Review oder Nutzerkontext entsteht
- ein Proposal aktiv, geparkt, uebernommen oder verworfen wird
- ein neuer Drift-Befund einen Doku- oder Audit-Block rechtfertigt
- ein Radar-Kandidat in reale Arbeit ueberfuehrt wird
- ein externer Review-Vorschlag bewusst fuer Soulmatch uebernommen oder abgegrenzt wird

## Status-Taxonomie

Bevorzugte Stati:

- `active`
- `parked`
- `adopted`
- `rejected`
- `unclear`

Truth Classes:

- `proposal_only`
- `repo_visible`
- `derived_from_review`
- `local_only`

Typische `next_gate`-Werte:

- `scan`
- `proposal`
- `user_approval`
- `implementation`
- `archive`

## Nutzung

Fuer neue Soulmatch-Arbeit zuerst lesen:

1. `STATE.md`
2. `RADAR.md`
3. `AGENTS.md`
4. erst dann relevante Code-Dateien oder alte Briefings

## Scan-Pipeline

Wenn neue Ideen oder Reviews hereinkommen, in dieser Reihenfolge arbeiten:

1. Quelle sichten
2. nicht wegstreichbaren Kern benennen
3. Risiken und betroffene Bereiche markieren
4. gegen Soulmatch-Fit pruefen
5. nur dann einen begrenzten Block vorschlagen
6. nur nach Nutzerfreigabe in echte Arbeit ueberfuehren

## Soulmatch-Fit-Fragen

Ein guter Soulmatch-Kandidat:

- ist direkt auf existierende Dateien oder reale Produktnaehten bezogen
- bleibt als enger Block formulierbar
- zieht nicht stillschweigend neue Provider-, Persistenz- oder UI-Achsen auf
- verbessert Wahrheit, Stabilitaet oder klaren Nutzwert
- laesst sich ohne Doku-Selbsttaeuschung in `STATE.md` spiegeln

## Aktuell relevante Radar-Eintraege

### Kandidat A - UI Redesign Design System Foundation

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `REDESIGN.md`, `client/src/design/tokens.ts`, `client/src/index.css`, `STATE.md`, `AGENTS.md`
- `why_not_now`: `none`
- `non_scope`: Layout-Komponenten, Home-Modul, Chat-Umbau, Backend-Aenderungen
- `risk`: niedrig, solange der Block auf Tokens und globale CSS-Grundlagen begrenzt bleibt
- `betroffene_bereiche`: `REDESIGN.md`, `client/src/design/tokens.ts`, `client/src/index.css`
- `kurzurteil`: Die Redesign-Spezifikation ist jetzt kanonisch im Repo verankert, und Block 1 des UI-Umbaus ist als Design-System-Foundation umgesetzt.
- `evidence`: `REDESIGN.md` eingecheckt; Tokens und globale CSS-Regeln wurden auf den neuen Design-System-Vertrag umgestellt.

### Kandidat B - UI Redesign Layout Components

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M01_app-shell/**`, `client/src/hooks/useLiveTalk.ts`, `client/src/app/App.tsx`, `STATE.md`, `REDESIGN.md`
- `why_not_now`: `none`
- `non_scope`: Chat-Umbau im Ganzen, Startseite, Backend-Routen
- `risk`: kann bei schlechtem Zuschnitt in breiten App-Shell-Refactor kippen
- `betroffene_bereiche`: `client/src/modules/M01_app-shell/**`, `client/src/hooks/useLiveTalk.ts`, `client/src/app/App.tsx`
- `kurzurteil`: Die neue Shell-Struktur mit Sidebar, Topbar, synchronem LiveTalk-Button und Banner ist repo-sichtbar umgesetzt.
- `evidence`: M01-App-Shell-Komponenten und globaler LiveTalk-Shell-State sind eingecheckt und in `App.tsx` aktiv verdrahtet.

### Kandidat C - UI Redesign Startseite

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M00_home/**`, `client/src/app/App.tsx`, `REDESIGN.md`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: Chat-Umbau, Backend-Routen, Persistenz-Aenderungen, globales State-Redesign
- `risk`: kann in breiten Home- und Discovery-Refactor kippen, wenn bestehende Module ohne engen Schnitt vermischt werden
- `betroffene_bereiche`: `client/src/modules/M00_home/**`, `client/src/app/App.tsx`, Design-System-Bausteine
- `kurzurteil`: Die neue Startseite ist repo-sichtbar umgesetzt und als Default-Flaeche in die Shell integriert.
- `evidence`: `client/src/modules/M00_home/**` existiert, `client/src/app/App.tsx` startet auf `activePage === 'home'`, und `REDESIGN.md` markiert Impl 4 als `completed`.

### Kandidat C2 - UI Redesign Chat-Tab Umbau

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M06_discuss/ui/**`, `client/src/app/App.tsx`, `REDESIGN.md`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: Backend-Routen, Scoring-Aenderungen, globale State-Neuarchitektur, breite Persistenzarbeit
- `risk`: kann in M06-Voice-, Persona- und Layout-Refactor zugleich kippen, wenn Feed, Input und Settings nicht eng geschnitten werden
- `betroffene_bereiche`: `client/src/modules/M06_discuss/**`, `client/src/app/App.tsx`, Design-System-Bausteine, bestehende Shell-Komponenten
- `kurzurteil`: Der neue Chat-Tab ist repo-sichtbar umgesetzt und nutzt jetzt Maya-Sonderrolle, globale LiveTalk-Steuerung und Slide-in-Settings.
- `evidence`: `client/src/modules/M06_discuss/ui/` enthaelt die neuen Chat-Komponenten, `DiscussionChat.tsx` nutzt sie aktiv, und `REDESIGN.md` markiert Impl 5 als `completed`.

### Kandidat C3 - UI Redesign Weitere Tabs

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: Backend-Routen, State-Neuarchitektur, Persistenz-Aenderungen, Voice-Audit als Nebenpfad
- `risk`: kann in breit verteilten UI-Umbau kippen, wenn Tab fuer Tab nicht eng geschnitten wird
- `betroffene_bereiche`: weitere Client-Module gemaess `REDESIGN.md`, `client/src/app/App.tsx`, Design-System-Bausteine
- `kurzurteil`: Astro, Report/Match, Hall of Souls und Explore sind jetzt sichtbar in die neue Shell- und Frame-Sprache eingehaengt, ohne ihre bestehende Produktlogik umzuschreiben.
- `evidence`: `client/src/app/App.tsx` nutzt jetzt `TabPageShell` und `TabSectionFrame` fuer diese Seiten, und `REDESIGN.md` markiert Impl 6 als `completed`.

### Kandidat D - Freisprechen / Voice Reliability Audit

- `status`: `adopted`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `client/src/modules/M06_discuss/**`, `client/src/modules/M08_studio-chat/ui/StudioSession.tsx`, `client/src/lib/globalMediaController.ts`, `server/src/routes/studio.ts`, `server/src/studioPrompt.ts`, `STATE.md`, `FEATURES.md`
- `why_not_now`: `none`
- `non_scope`: neue TTS-Engine, Credits-System, grosser Persona-Router-Refactor, tokenweises Provider-Streaming
- `risk`: Restlatenz bleibt, solange `server/src/lib/providers.ts` keine echten Token-Deltas liefert
- `betroffene_bereiche`: `client/src/hooks/useSpeechToText.ts`, `client/src/modules/M06_discuss/**`, `server/src/routes/studio.ts`, `server/src/lib/ttsService.ts`
- `kurzurteil`: Der enge Voice-Hardening-Block ist jetzt repo-sichtbar umgesetzt: frueheres Chat-Feedback, globaler Stop/Abort fuer Chat und Studio und sauberer Moduskontext fuer Maya.
- `evidence`: `useDiscussApi.ts` ist abortierbar und streamt M06 immer ueber SSE; `Topbar.tsx`, Shell-LiveTalk und `StudioSession.tsx` teilen jetzt einen globalen Stop-Pfad; `studioPrompt.ts` nutzt `appMode`.

### Kandidat I - True Provider Streaming

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: Der aktuelle Crush-Block hat die sichtbare UX-Haerte geliefert; fuer echte weitere Latenzsenkung muesste jetzt gezielt die Provider-Schicht geoeffnet werden.
- `non_scope`: neuer Persona-Umbau, allgemeiner SSE-Refactor ueber alle Routen
- `risk`: mittel bis hoch, weil `server/src/lib/providers.ts` heute request/response-zentriert arbeitet und Provider unterschiedlich streamen
- `betroffene_bereiche`: `server/src/lib/providers.ts`, `server/src/routes/studio.ts`, ggf. Provider-spezifische Adapter
- `kurzurteil`: Die aktuelle Verbesserung ist fruehes SSE-Feedback, aber noch kein echtes Token-Streaming aus dem Modell.
- `evidence`: `server/src/routes/studio.ts` sendet `typing` und danach fertigen Text; `server/src/lib/providers.ts` streamt keine Provider-Deltas.

### Kandidat J - LiveTalk Real-Provider Probe Execution

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: neuer Provider-Stack, Persona-Router-Refactor, browserweite Audio-Neuarchitektur
- `risk`: niedrig bis mittel; Kosten und Laufzeit liegen eher in realen Provider-Calls als im Repo-Scope
- `betroffene_bereiche`: `server/scripts/discuss-audio-probe-check.mjs`, `server/src/routes/studio.ts`, laufende Ziel-Runtime
- `kurzurteil`: Der Verifikationsblock hat jetzt ein eigenes Probe-Werkzeug und eine geschlossene Cancel-Naht; offen ist vor allem die Ausfuehrung gegen echte Zielumgebungen.
- `evidence`: `server/scripts/discuss-audio-probe-check.mjs` prueft SSE-Timings, Audio-Telemetrie und Round-Cancel-Verhalten; `server/src/routes/studio.ts` unterdrueckt spaete Events aus ueberholten Runden.

### Kandidat E - Dev Token Hardening

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `user_approval`
- `why_not_now`: Voice-Stabilitaet hat den groesseren direkten Produkthebel.
- `non_scope`: komplette Auth-Einfuehrung, Rollenmodell, Benutzerkonten
- `risk`: klein; Gefahr liegt eher in stillen lokalen Tools, die das eingebaute Passwort nutzen koennten
- `betroffene_bereiche`: `server/src/routes/dev.ts`, evtl. Root-Doku
- `kurzurteil`: Das eingebaute Passwort sollte entfernt oder mindestens klar als temporarer Sonderfall behandelt werden.
- `evidence`: `server/src/routes/dev.ts` nutzt `process.env.DEV_TOKEN || BUILTIN_PASSWORD`.

### Kandidat F - Persistence Reality Audit

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: Erst Voice-Audit oder Security-Hardening schneiden; sonst oeffnet sich Scope in DB, Docs und Runtime zugleich.
- `non_scope`: Migration-Neudesign, komplette Vereinheitlichung aller Speicherorte
- `risk`: mittel, weil Tabelle-vorhanden nicht automatisch gleich produktiv-genutzt bedeutet
- `betroffene_bereiche`: `migration.sql`, `server/src/lib/memoryService.ts`, weitere DB-nahe Dateien, Root-Doku
- `kurzurteil`: Soulmatch braucht eine ehrliche Sicht darauf, welche DB-Tabellen wirklich produktiv genutzt werden und welche nur Schema-Vorrat sind.
- `evidence`: `session_memories` ist aktiv im Code; `persona_memories` und `voice_profiles` sind im Schema sichtbar.

### Kandidat F2 - Builder Memory Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: Der Codeblock ist gebaut und typgeprueft; offen ist jetzt nicht mehr Architektur, sondern der manuelle Deploy-Schritt fuer die neue Tabelle und der Live-Nachweis der Persistenzkette.
- `non_scope`: weitere Builder-Architektur, neuer Prompt-Umbau, breite Persistenzvereinheitlichung ueber das Gesamtprodukt
- `risk`: mittel; ohne manuellen Render-Schema-Push bleibt die neue Builder-Memory im Deploy nur teilweise wirksam, obwohl der Code bereits darauf vertraut und nur weich degradiert.
- `betroffene_bereiche`: `server/src/schema/builder.ts`, `server/src/lib/builderMemory.ts`, `server/src/lib/builderFusionChat.ts`, `server/src/lib/builderDialogEngine.ts`, `server/src/routes/builder.ts`, Deploy-Runtime
- `kurzurteil`: Der naechste saubere Block ist die echte Laufzeitverifikation der neuen Maya-Builder-Memory nach manuellem Schema-Push.
- `evidence`: `builder_memory` ist im Schema angelegt; Builder chat, engine und routes synchronisieren Memory bereits im Code; Fehlerpfade fuer fehlende Tabelle sind abgefedert.

### Kandidat F3 - Opus Bridge Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: neuer Scout-Mix, Kostenpolitik fuer Default-Writer, Heavy-Crush-Ausbau
- `risk`: mittel; die direkte `/git-push`-Commit-Semantik ist jetzt live belegt, aber Render kann im breiteren Opus-Pfad weiter an `@READ`-Pfaden, BDL-Disziplin oder Judge-/Distiller-Drift scheitern.
- `betroffene_bereiche`: `server/src/lib/providers.ts`, `server/src/lib/opusScoutRunner.ts`, `server/src/lib/opusRoundtable.ts`, `server/src/lib/builderBdlParser.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/routes/opusBridge.ts`, Ziel-Runtime auf Render
- `kurzurteil`: Der direkte GitHub-Commit-Pfad ist nach dem atomaren Mehrdatei-Probe nicht mehr die offene Hauptnaht; der naechste enge Block ist der Live-Nachweis der kompletten Opus-Bridge von Roundtable-BDL und `@READ` bis Distiller-/Judge-Treue unter Render.
- `evidence`: Der Provider-Layer kennt `zhipu` und `openrouter`; der aktive GLM-Pfad fuer Scout, Distiller, Roundtable und Worker ist auf OpenRouter-Modelle umgestellt; `builderBdlParser.ts` erkennt SEARCH/REPLACE-`@PATCH` jetzt wieder als Patch-Body; `server/src/routes/opusBridge.ts` schreibt Mehrdatei-Payloads atomar ueber die Git Data API; der Live-Probe-Commit `ad8abd0` erzeugte drei Dateien mit identischem `commitSha` in allen `/git-push`-Results.

### Kandidat F4 - Builder S17 Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: weiterer Builder-Umbau, Persona-Routing, Scoring, breite UI-Politur
- `risk`: mittel; die Repo-Naht ist gebaut, aber der eigentliche Produktwert haengt jetzt an drei Live-Pruefpunkten statt an weiterem Code.
- `betroffene_bereiche`: `server/src/lib/builderFusionChat.ts`, `server/src/lib/opusDistiller.ts`, `server/src/lib/builderStaleDetector.ts`, `server/src/index.ts`, `server/src/routes/opusBridge.ts`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, Render-Runtime
- `kurzurteil`: S17 ist repo-sichtbar live im Code, aber der naechste enge Block ist jetzt die Verifikation von Distiller-Intent-Treue, sichtbarem UI-Cancel und `[stale-detector]`-Logs auf Render.
- `evidence`: `builderFusionChat.ts` kennt `cancel` inkl. `all_stuck`; `BuilderStudioPage.tsx` zeigt einen Cancel-Knopf fuer offene Tasks; `builderStaleDetector.ts` loggt `[stale-detector]` und blockiert alte Tasks; `opusDistiller.ts` verankert `getWorstPerformers` explizit gegen Drift auf `getTopPerformers`; `opusBridge.ts` bietet `debug-scope`.

### Kandidat F5 - Director Live Verification

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `live_async_validation`
- `why_not_now`: `none`
- `non_scope`: neuer Director-Skill-Baum, breite UI-Politur, neuer Patrol-Endpoint-Faecherschnitt
- `risk`: mittel; die grundlegende Action-Delegation ist jetzt live belegt, aber der produktive Nutzwert haengt weiter an echtem Async-Task-Lauf, Statusnachfuehrung und sauberer Chat-/UI-Rueckmeldung.
- `betroffene_bereiche`: `server/src/lib/directorContext.ts`, `server/src/lib/directorPrompt.ts`, `server/src/lib/directorActions.ts`, `server/src/routes/builder.ts`, `server/src/routes/health.ts`, `client/src/modules/M16_builder/hooks/useMayaApi.ts`, `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`, Render-Runtime
- `kurzurteil`: Der bisherige Director fuehlt sich jetzt repo-sichtbar als Maya-Werkzeug an statt wie ein zweites Wesen: Maya Brain, Maya-Labels, direkte Memory-Tools und automatische Continuity-Notizen sind gebaut. Der fruehere UI-Drift ist enger bereinigt: die live Route `/builder` zeigt diese Brain-Steuerung nur noch in `BuilderStudioPage`, und die tote Nebenflaeche ist aus dem aktiven Builder-Modul entfernt. Der naechste enge Block bleibt trotzdem der Live-Nachweis fuer delegierte Async-Tasks samt Status, UI-Spur und echter Memory-Rueckwirkung.
- `evidence`: `BuilderStudioPage.tsx` zeigt den sichtbaren Brain-Toggle inkl. Opus/GPT 5.4/GLM 5.1, Fast/Deep und Action-Badges auf der realen `/builder`-Route; `builder.ts` persistiert nach jeder Brain-Interaktion eine neue Continuity-Notiz in `builder_memory`; `directorActions.ts` bietet direkte `memory-read`- und `memory-write`-Tools; `directorPrompt.ts` beschreibt Maya explizit als dieselbe Identitaet mit wechselbarem Brain; `opusWorkerSwarm.ts`, `opusWorkerRegistry.ts` und `poolState.ts` fuehren `GLM 5.1` als Meister-/Worker-Pfad.

### Kandidat F5b - Builder Index Refresh Randpfad

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: neuer Resolver, breitere Pipeline-Architektur, Render-Deploy
- `risk`: niedrig; der Fix haengt nur den bereits existierenden Repo-Index-Refresh an den spaeteren GitHub-Commit-Callback.
- `betroffene_bereiche`: `server/src/routes/builder.ts`, `server/src/lib/opusBridgeController.ts`, `server/src/lib/opusIndexGenerator.ts`, `server/src/lib/builderScopeResolver.ts`
- `kurzurteil`: Der bestehende Index-Refresh war auf mehreren direkten Push-Pfaden schon da, aber nicht sauber auf dem Callback-Randpfad abgesichert. Dieser Pfad zieht den Refresh jetzt nach Commit-Bestaetigung ebenfalls.
- `evidence`: `opusBridgeController.ts` regeneriert den Index nach erfolgreichem Push bereits direkt; `builder.ts` triggert `regenerateRepoIndex()` jetzt auch im `execution-result`-Commit-Callback; `opusIndexGenerator.ts` invalidiert danach den Resolver-Cache.

### Kandidat F5c - Builder Create-Mode explizit

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: neuer Judge, Related-Files-Recherche, UI-Ausbau, Deploy-Verifikation
- `risk`: niedrig; der Block macht einen schon halb vorhandenen New-File-Pfad explizit, statt ein zweites Erstellungsmodell einzufuehren.
- `betroffene_bereiche`: `server/src/lib/builderScopeResolver.ts`, `server/src/lib/opusChangeRouter.ts`, `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/opusSmartPush.ts`
- `kurzurteil`: Neue Dateien sind im internen Opus-Task jetzt kein impliziter Sonderfall mehr. Resolver, ChangeRouter, Worker-Prompt und SmartPush tragen denselben Create-Zustand durch, statt sich nur auf fehlende Datei-Inhalte zu verlassen.
- `evidence`: `builderScopeResolver.ts` liefert fuer Create-Faelle jetzt `method: create`; `opusChangeRouter.ts` kennt `create` als eigenen Modus; `opusTaskOrchestrator.ts` gibt Create-Targets explizit in den Worker-Prompt; `opusSmartPush.ts` behaelt den Envelope-Modus bis zum Push statt ihn wieder zu erraten.

### Kandidat F5d - Semantischer Judge gegen Instruktionsdrift

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `why_not_now`: `none`
- `non_scope`: neuer Parallel-Judge, breite Pipeline-Neuarchitektur, Scout-Umbau
- `risk`: mittel; der Block haertet den bestehenden Judge sichtbar, aber die Laufzeitqualitaet haengt weiter daran, ob der spaetere Briefing-Kontext deterministisch und nicht driftig bleibt.
- `betroffene_bereiche`: `server/src/lib/opusJudge.ts`, `server/src/lib/opusTaskOrchestrator.ts`, Worker-Briefing-Kontext
- `kurzurteil`: Der bestehende Judge ist jetzt haerter statt breiter geworden: Er kann Kandidaten bei fehlenden expliziten Zielpfaden, fehlenden Create-Targets oder zu breitem Scope auch komplett ablehnen, statt immer einen Sieger zu kueren.
- `evidence`: `opusJudge.ts` bewertet jetzt Blocking-Issues und Warnings pro Kandidat und kann per `approved: false` alle Kandidaten verwerfen; `opusTaskOrchestrator.ts` bricht nach einer Judge-Ablehnung vor dem Push sauber ab.

### Kandidat F5e - Deterministische Related-Files-Briefing-Lane

- `status`: `active`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `implementation`
- `why_not_now`: `none`
- `non_scope`: neuer Scout-Mix, LLM-Dateisuche, breiter Resolver-Umbau
- `risk`: mittel; ohne diesen Block bekommt der Worker weiter weniger belastbaren Kontext als ueber Imports, Rueckreferenzen und Dateinaehe eigentlich moeglich waere.
- `betroffene_bereiche`: `server/src/lib/opusTaskOrchestrator.ts`, Repo-Index-/Import-Helfer, Worker-Briefing-Kontext
- `kurzurteil`: Nach Create-Mode und Judge-Hardening ist der naechste enge Hebel keine neue Intelligenzschicht, sondern ein deterministischer Neben-Kontext fuer thematisch benachbarte Dateien.
- `evidence`: Der Scope-Resolver ist heute deterministisch, aber das nachgelagerte Worker-Briefing kennt noch keine gezielte Related-Files-Anreicherung aus Imports oder Rueckreferenzen.

### Kandidat F6 - File-Scout gegen Scope-Halluzination

- `status`: `active`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: `Aktuell hoehere Prioritaet auf S31-False-Positive-Pipeline-Path-Fix (Kandidat F8 sub-thread). F6 wird erst nach S31-Fix sauber umsetzbar.`
- `non_scope`: neuer LLM-Scout, breiter Resolver-Umbau, LSP-basierte Symbol-Aufloesung
- `risk`: mittel; ohne diesen Block formuliert der Builder weiter Dateipfade die es so nicht gibt, was zu silent-REPLACE_FAILED und False-Positive-Pipeline-Meldungen beitraegt.
- `betroffene_bereiche`: `server/src/lib/opusTaskOrchestrator.ts`, `server/src/lib/builderScopeResolver.ts`, `server/src/lib/builder-repo-index.json`
- `kurzurteil`: Deterministische Verifikation jedes angefragten Dateipfads gegen den Repo-Index vor dem Workerlauf. Kein Scope-Pfad darf in den Worker-Kontext, ohne dass die Datei wirklich im Index gefunden wurde.
- `evidence`: Mehrfach beobachtet in S30 und S31: Worker bekommen Scope-Pfade wie `client/src/...` die aber in der Datei-Wahrheit des Repos nicht existieren, der Workflow meldet spaeter `No changes to commit` und beendet gruen.

### Kandidat F7 - Pool-Config-Persistenz ueber DB

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/lib/poolState.ts`, `server/src/schema/builder.ts`, `STATE.md`
- `kurzurteil`: UI-Pool-Selektionen ueberleben jetzt Render-Deploys und Container-Neustarts. Vorher wurde `activePools` pro Container-Boot aus dem Code-Default geladen, sodass jede UI-Aenderung nach dem naechsten Restart verloren war.
- `evidence`: S33b-Session hat die `poolState`-Tabelle in Neon angelegt, `initializePoolState()` laedt beim Serverstart die persistierten Pools, `persistPoolsAsync()` schreibt Aenderungen fire-and-forget zurueck. Live verifiziert per Test (Pool-Wechsel -> Redeploy -> Config intakt).

### Kandidat F8 - Session-Log-Endpoint mit SHA-Backfill

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `server/src/routes/opusBridge.ts`, `server/src/lib/builderGithubBridge.ts`, `docs/SESSION-LOG.md`, `docs/CLAUDE-CONTEXT.md`
- `kurzurteil`: Jeder erfolgreiche `/git-push` schreibt automatisch einen strukturierten Eintrag in `docs/SESSION-LOG.md` im selben Commit. Ein Fire-and-forget Follow-up-Commit ersetzt den `pending`-SHA-Marker durch den echten Commit-SHA.
- `evidence`: S34-Session (2026-04-20) hat den Endpoint live geschaltet und verifiziert: Test-Push c342ddd generierte Log-Eintrag mit `pending`, 2s spaeter kam Follow-up 9c72a6f mit echtem SHA. SHA-Backfill-Commit ist docs-only und loest keinen Render-Deploy aus (paths-ignore in render-deploy.yml). Damit ist die Runtime-Schicht des Anti-Drift-Systems scharf.

### Kandidat F9 - S31 False-Positive Pipeline Path

- `status`: `mostly_adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `schritt_c_manual_commit_then_acceptance_test`
- `absorbed_into`: `server/src/lib/pushResultWaiter.ts` (neu), `server/src/lib/opusSmartPush.ts`, `server/src/routes/builder.ts`, `STATE.md`, `SESSION-STATE.md`, `CLAUDE-CONTEXT.md`
- `why_not_now`: `Schritt A+D live (Commit 1065cd3), Schritt C (workflow-File) geblockt durch Bridge-Token ohne workflows-Scope (siehe Drift 12). Manueller Workflow-Commit via Web-UI oder persoenlichem PAT noetig.`
- `non_scope`: neuer Executor-Pfad, Renderer-Umbau, breiter Workflow-Umbau
- `risk`: niedrig nach Schritt A+D; Schritt C erhoeht nur die Erkennungsgeschwindigkeit bei empty-diff-Faellen von 3-Min-Timeout auf sofortiges Signal.
- `betroffene_bereiche`: `server/src/lib/pushResultWaiter.ts` (neu), `server/src/lib/opusSmartPush.ts`, `server/src/routes/builder.ts`, `.github/workflows/builder-executor.yml` (offen)
- `kurzurteil`: Callback-basierter Wait statt SHA-Polling (Entscheidung vom 2026-04-20): smartPush wartet via in-memory Waiter-Queue auf execution-result-Callbacks, `pushed: true` nur bei verifizierter Landung. Probe-Test bestaetigt Live-Wirkung.
- `evidence`: S30-Befund (2026-04-17) mit Task feat-mo38m9f0-jyy1 dokumentiert in docs/S31-CANDIDATES.md. F9-Session-Protokoll in docs/HANDOFF-S35-F9.md. Live-Probe mit taskId d6fbfb91-0bde-4ea3-8d61-4ecd393bfd1c zeigt `reason:"checks_failed"` im neuen Handler-Schema (altes Schema hat das Feld nicht).

### Kandidat G - Provider Truth Sync

- `status`: `active`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: Der Repo-Brain-Block hat den Drift markiert; ein eigener Sync-Block sollte danach gezielt Docs und ggf. Naming bereinigen.
- `non_scope`: Provider-Neuauswahl oder Modellpolitik neu erfinden
- `risk`: mittel, weil Persona-Routing und Studio-Konfiguration ueber mehrere Dateien verteilt sind
- `betroffene_bereiche`: `server/src/lib/personaRouter.ts`, `server/src/routes/studio.ts`, `CLAUDE.md`, `BRIEFING_PART1.md`
- `kurzurteil`: Docs und Code sollen dieselbe Provider-Wahrheit tragen; aktuell tun sie das nicht.
- `evidence`: Repo-sichtbar ist Gemini heute aktiver Bestandteil mehrerer Routen und Persona-Zuordnungen.

### Kandidat H - Credits Reality Audit

- `status`: `parked`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `scan`
- `why_not_now`: Noch unklar, ob Credits bereits Produktvertrag oder nur internes Meta-Signal sind.
- `non_scope`: Pricing, Bezahlfluss, Auth, Accounts
- `risk`: hoher semantischer Drift, wenn interne Zahlen vorschnell als fertige Monetarisierungslogik gelesen werden
- `betroffene_bereiche`: `server/src/studioPrompt.ts`, `server/src/routes/studio.ts`, Settings-/UI-Bereiche
- `kurzurteil`: Erst klaeren, was Credits heute real bedeuten, bevor darauf Produkt- oder UX-Entscheidungen gebaut werden.
- `evidence`: Credits-Signale tauchen im Servercode auf, ohne sauberen Endnutzervertrag in den Root-Dokumenten.

### Kandidat I - Chatterbox TTS Integration

- `status`: `parked`
- `truth_class`: `proposal_only`
- `source_type`: `prior_chat_context`
- `next_gate`: `user_approval`
- `why_not_now`: Aktuell existiert bereits eine produktive Gemini/OpenAI-TTS-Linie; ein neuer Engine-Import waere Scope-Drift vor dem Stabilitaetsaudit.
- `non_scope`: Ersatz der bestehenden Audio-Linie ohne Vorab-Audit
- `risk`: oeffnet Audio-, Infra- und Qualitaetsscope gleichzeitig
- `betroffene_bereiche`: kuenftige Audio-Linie, derzeit keine repo-sichtbare Implementierung
- `kurzurteil`: Nicht verwerfen, aber klar als spaeteres Proposal fuehren.
- `evidence`: Im aktuellen Repo ist Chatterbox nicht als produktive TTS-Engine sichtbar.

## Abgeschlossene Radar-Eintraege

### Repo Brain Foundation

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `repo_review`
- `next_gate`: `archive`
- `absorbed_into`: `STATE.md`, `FEATURES.md`, `RADAR.md`, `AGENTS.md`
- `kurzurteil`: Soulmatch hat jetzt eine eigene truth-marked Repo-Brain-Schicht statt verstreuter grober Meta-Doku.

### UI Redesign Spec Intake

- `status`: `adopted`
- `truth_class`: `repo_visible`
- `source_type`: `user_spec`
- `next_gate`: `archive`
- `absorbed_into`: `REDESIGN.md`, `STATE.md`, `AGENTS.md`
- `kurzurteil`: Der UI-Umbau ist jetzt nicht mehr nur Chat-Kontext, sondern eine explizite Repo-Spezifikation mit eigener Blockreihenfolge.

## Erkannte Luecken

| Bereich | Luecke | Prioritaet |
|---|---|---|
| Visuelle Checks | Home, Sidebar und Chat sind per Browser-Script geprueft, aber Astro, Match, Souls und Explore noch nicht gleich tief | hoch |
| Voice / Audio | Kein enger, eingecheckter Audit-Rahmen fuer STT + SSE + TTS-Zusammenspiel | mittel |
| Persistenz | Nutzungsgrad von `persona_memories` und `voice_profiles` nicht sauber verdichtet | mittel |
| Sicherheitsgrenzen | `/api/dev/*` hat weiterhin ein eingebautes Passwort-Fallback | mittel |
| Provider-Wahrheit | Code und Root-Doku tragen nicht dieselbe Provider-Realitaet | mittel |

## Aufnahme-Regeln fuer neue Radar-Eintraege

Ein neuer Eintrag soll mindestens enthalten:

- Titel
- Status
- `truth_class`
- `next_gate`
- `why_not_now`
- `non_scope`
- `risk`
- betroffene Bereiche
- 1-Satz-Kurzurteil
- knappe Evidenz oder Quelle

## Adoption-Regeln

Ein Radar-Eintrag darf nur dann auf `adopted` wechseln, wenn mindestens eines klar belegt ist:

- reale Repo-Aenderung vorhanden
- `STATE.md` fuehrt den Block als abgeschlossene Arbeitswahrheit
- die geaenderten Dateien oder die neue Doku-Verankerung sind benennbar

Ein Eintrag darf nicht stillschweigend von `parked` oder `active` nach `adopted`
wandern.

## Nicht-Ziele

`RADAR.md` ist nicht dafuer da,

- komplette Architekturwahrheit zu ersetzen
- Proposal-Material als gebaut darzustellen
- jede interessante Idee in aktive Arbeit zu verwandeln
- den gesamten Dirty Tree zu inventarisieren

## Naechste sinnvolle Pflege

- Nach dem naechsten UI-, Audio-, Provider- oder Persistenzblock Status und Gate sauber nachziehen.
- Externe Vorschlaege nur dann uebernehmen, wenn sie als enger Soulmatch-Block formulierbar bleiben.
- Geparkte Ideen regelmaessig auf echten Soulmatch-Fit pruefen statt sie unmarkiert mitzuschleppen.