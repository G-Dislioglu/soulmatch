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

- `status`: `active`
- `truth_class`: `derived_from_review`
- `source_type`: `repo_review`
- `next_gate`: `proposal`
- `why_not_now`: UI-Redesign-Block fuer die restlichen Tabs ist jetzt abgeschlossen; der Audit ist damit wieder der naechste enge technische Kandidat.
- `non_scope`: neue TTS-Engine, Credits-System, grosser Persona-Router-Refactor
- `risk`: kann bei schlechtem Zuschnitt in generelles Audio-Refactoring kippen
- `betroffene_bereiche`: `client/src/hooks/useSpeechToText.ts`, `client/src/modules/M06_discuss/**`, `server/src/routes/studio.ts`, `server/src/lib/ttsService.ts`
- `kurzurteil`: Bereits gebaute Voice-Funktionalitaet verdient vor neuen Audio-Ideen einen engen Stabilitaetsblock.
- `evidence`: STT-Loop-Guards im Client, SSE-Text-vor-Audio im Server und TTS-Fallback mit zwei Engines sind repo-sichtbar.

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