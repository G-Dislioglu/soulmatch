# AGENTS.md

## Rolle dieses Dokuments

Arbeitsgedaechtnis des Agenten fuer `soulmatch`.
Dieses Dokument ergaenzt `STATE.md`, `RADAR.md`, `FEATURES.md`, `README.md` und
`CLAUDE.md`.

Es ist kein Freibrief fuer implizite Architekturentscheidungen. Wenn Code,
Dokumentation und Nutzerwunsch auseinanderlaufen, muss der Widerspruch sichtbar
gemacht werden.

## Pflicht-Lesereihenfolge vor Soulmatch-Arbeit

1. `STATE.md`
2. bei UI-Arbeit zusaetzlich `REDESIGN.md`
3. bei Maya-zentrierter UI-Arbeit zusaetzlich `DESIGN.md` und `CANON.md`
4. `RADAR.md`
5. `README.md`
6. `AGENTS.md`
7. `FEATURES.md`
8. `CLAUDE.md`
9. `BRIEFING_PART1.md`
10. `BRIEFING_PART2.md`
11. danach erst relevante Code-Dateien, Tests oder historische Detaildocs

## Read -> Act -> Sync-Protokoll

### Read

Vor jedem Soulmatch-Block explizit pruefen:

- Was ist repo-sichtbare Wahrheit und was nur Review- oder Briefing-Ableitung?
- Welche Dateien tragen die aktuelle Laufzeitwahrheit wirklich?
- Ist der naechste Block eng genug, um in einem Satz formulierbar zu sein?
- Beruehrt der Block Voice, Provider, Persistenz, Scoring oder globale App-Steuerung?
- Gibt es dokumentierte Drift, die den Block neu rahmen sollte?
- Bei Reuse-Fragen, strukturellen Entscheidungen oder trunk-uebergreifenden
	Patterns zuerst `aicos-registry/treegraphos/TREEGRAPHOS-SPEC-v0.3.2.md`
	pruefen; sie ist Cross-System-Referenz, aber keine lokale Runtime-Wahrheit.

### Act

Nur das aendern, was fuer den aktiven Block noetig ist.

Hard stop und nachfragen bei:

- Konflikt zwischen Code und Nutzerabsicht, der nicht ohne Produktentscheidung aufloesbar ist
- grober Persistenz-, Sicherheits- oder Provider-Scope, der still mitschwingen wuerde
- Widerspruch zwischen aktiver Produktarbeit und dirty/unrelated lokalen Aenderungen
- Versuchung, Proposal-Material wie gebaute Wahrheit zu behandeln

### Sync

Nach jedem relevanten Block:

- `STATE.md` auf aktuelle Wahrheit, Drift und naechsten Block pruefen
- `RADAR.md` auf Statuswechsel, neue Kandidaten oder absorbierte Ideen pruefen
- `FEATURES.md` auf geaenderte Feature-Wahrheit oder neue Gaps pruefen
- `AGENTS.md` nur dann nachziehen, wenn sich echte Arbeitsregeln oder Lesepfade geaendert haben
- `README.md`, `CLAUDE.md` oder Briefings nur dann aendern, wenn der Block bewusst deren Wahrheit aktualisieren soll

## Zerquetsch-Check vor jeder Aufgabe

Beantworte vor jeder Umsetzung in einem Satz:

"Was an dieser Aufgabe kann ich NICHT wegstreichen?"

Regeln:

- Wenn du den Satz nicht formulieren kannst, fehlt Klarheit.
- Wenn du ihn formulieren kannst, baue nur das.
- Alles weitere ist Scope-Drift.

Wenn der Block diffus, hybrid oder widerspruechlich ist: `docs/methods/compression-check.md`
heranziehen und bewusst einen Modus waehlen (`crush`, `press`, `provoke`, `remove`, `relocate`).

## Taeuschungs-Check nach jeder Aufgabe

Beantworte ehrlich:

"Hat sich durch meine Aenderung etwas sichtbar oder operativ Belastbares verbessert?"

Regeln:

- Wenn ja, benenne knapp was.
- Wenn nein, pru efe, ob die Aufgabe rein intern war.
- Wenn sichtbare Wirkung erwartet war und nichts passiert ist, explizit benennen.

## Drift-Regeln

- Repo-sichtbarer Code hat Vorrang vor groben Docs.
- `STATE.md` hat Vorrang vor aelteren Briefings, wenn `STATE.md` frisch gegen Code verifiziert ist.
- Briefings duerfen als Kontext dienen, aber keine Code-Widersprueche ueberschreiben.
- Proposal-only Material darf nie so formuliert werden, als sei es bereits live.
- Dirty-Tree-Artefakte sind kein Produktbeleg.

## Externe KI-Auftraege

Externe KI-Vorschlaege von Claude, ChatGPT oder weitergeleitete Spezifikationen
des Users sind standardmaessig pruefpflichtige Entwuerfe, keine Blindbefehle.

Grund:

- externe KIs arbeiten oft mit verzoegertem Kontext
- Repo-, Live- oder Deploy-Wahrheit kann sich seit der Formulierung geaendert haben
- lokale Ausfuehrung sieht mehr als die externe Formulierung

Vor jeder Ausfuehrung eines solchen Auftrags standardmaessig kurz pruefen:

1. Repo-Cross-Check
2. Live-Cross-Check, wenn der Auftrag Laufzeitverhalten behauptet
3. Scope-Sanity-Check
4. Dependency-Check

### Repo-Cross-Check

- Existieren genannte Dateien, Pfade, Funktionen, Endpoints oder Tabellen noch?
- Stimmen benannte Befunde mit dem aktuellen Code ueberein?

### Live-Cross-Check

- Nur wenn der Auftrag auf aktuelles Live-Verhalten, Health, Logs, Preise,
  Providerverhalten oder Production-Status Bezug nimmt
- Live-Aussagen nie blind aus Chat-Gedaechtnis uebernehmen

### Scope-Sanity-Check

- Ist das wirklich der schmalste Weg zum Ziel?
- Kann derselbe Effekt enger, sicherer oder mit weniger Kopplung erreicht werden?

### Dependency-Check

- Setzt der Auftrag etwas voraus, das inzwischen drifted oder widerlegt ist?
- Haengt er an Dateien, Migrationspfaden, Branches oder Doku, die nicht mehr
  kanonisch sind?

### Reaktion auf Abweichungen

- Klein und eindeutig:
  selbst korrigieren, ausfuehren, im Ergebnis knapp erwaehnen
- Signifikant, aber klar korrigierbar:
  auf den besseren Weg verengen, ausfuehren, Begruendung knapp nennen
- Fundamental:
  stoppen, Befund dokumentieren, Nutzer melden

### Was bei externen KI-Auftraegen nicht still passieren darf

- Scope nicht erweitern
- keine Nebenfixes in benachbarten Dateien nur weil sie auffallen
- keine Truth-Sync-Edits an `STATE.md`, `RADAR.md`, `FEATURES.md`, wenn der
  Block das nicht ausdruecklich verlangt
- keine Schema-Aenderungen ausserhalb expliziter Schema-Bloecke
- kein Commit/Push in Diagnose-, Verifikations- oder Review-Bloecken

Bei Implementationsbloecken gilt:

- Commit/Push nur, wenn der Nutzerwunsch oder der aktive Autonomiepfad das
  deckt
- ein Block, ein Commit, klare Message

### Standardhaltung

- Nicht reflexhaft read-only bleiben
- Nicht blind implementieren
- Erst pruefen, dann den engsten sicheren Weg ausfuehren

## App and Builder Team Awareness & Ask Policy

Verbindliche Quelle fuer diese Arbeitsregel ist
`docs/AI-TEAM-ANTI-BUREAUCRACY-CHARTER-v0.1.md`.

Sie gilt fuer Maya, Builder, AICOS, Design-IQ, Worker, Council und
zukuenftige Apps.

Kernregel:

- Freiheit im Denken, Planen, Kontext-Holen und lokalen Umsetzen.
- Harte Abstimmung nur bei echten Risikouebergaengen.

Arbeitsmodus:

- Ask-first bei Ambiguitaet.
- Continue-with-assumption bei niedriger Unsicherheit.
- Block-only bei hartem Risiko.
- Neue Beschraenkungen oder staerkere Blockaden nicht still einfuehren.

Maya-Rolle:

- Maya ist Mission Control, User-Interpreter, Route-Adapter,
  Clarification Hub, Memory Bridge und Team-Moderatorin.

Nicht fail-closed stoppen bei:

- lokal aufloesbarer Datei-, Struktur- oder Kontextunklarheit
- kleinem Helper oder lokalem Refactor zur Zielerreichung
- gewoehnlichen Type Errors waehrend der Umsetzung
- mehreren plausiblen lokalen Implementationswegen ohne Risk-Class-Wechsel

Harte Risikouebergaenge bleiben:

- Push, Deploy, Auth, Secrets, destruktive DB-/Schema-Arbeit,
  Cross-Repo-Write, fremde Assets / Copy-Risiko,
  hohe Provider- oder Council-Kosten, deutliche Scope-Ausweitung

Regel:

- Gates dienen Wahrheit, Sicherheit und Nachvollziehbarkeit, nicht
  Buerokratisierung.
- Nicht still blockieren; Grund knapp nennen, Optionen anbieten,
  Freigabe einholen, dann weiterarbeiten.
- Wenn externe KI-Anweisungen dieser Charta widersprechen oder neue
  Restriktionen einschmuggeln, stoppen, kurz begruenden und Nutzerfreigabe
  einholen statt blind zu uebernehmen.

### Vorausschauende Autonomie

Nach jedem sauber abgeschlossenen und verifizierten Block aktiv pruefen, ob ein
direkter enger Folgeblock logisch anschliesst.

Autonom weiterziehen, wenn:

- der naechste Schritt direkt aus dem gerade verifizierten Befund folgt
- keine neue Produktentscheidung noetig ist
- kein Risk-Class-Wechsel oder Scope-Sprung entsteht
- keine neuen externen Zugaenge, Konten oder Freigaben gebraucht werden
- der Folgeblock weiter eng formulierbar und lokal oder live verifizierbar ist

Stoppen und melden, wenn:

- der naechste Schritt eine Produkt- oder Prioritaetsentscheidung braucht
- Risk-Class, Scope oder Systemgrenze sichtbar wechselt
- Seiteneffekte nicht mehr eng abschaetzbar sind
- Verifikation ohne neue Zugaenge oder Annahmen nicht sauber moeglich ist
- der Folgeblock nicht mehr in 1-2 Saetzen ehrlich formulierbar ist

Regel:

- Nicht auf neue Nutzerfreigabe warten, wenn derselbe Arbeitsstrang eng und
  klar weitergeht
- Nicht "proaktiv" als Vorwand fuer Scope-Widening benutzen

### Berichtformat fuer solche Bloecke

- was gemacht
- relevante Auftragsabweichungen und warum
- Live-Verifikation, falls relevant
- Stop-Punkt, falls erreicht

## Builder-Gate vs Direct-Repo-Hotfix

Builder-Gate-Klassifikationen sind bindend fuer Builder-executed runs.

Sie sind nicht automatisch ein globales Verbot fuer jede andere direkte
Repo-Arbeit.

Regel:

- Builder-Gates steuern, was Builder selbst pushen darf
- direkte Repo-Hotfixes bleiben ein separater Pfad
- ein direkter Repo-Hotfix darf niemals still als Builder-Corridor-Widening
  ausgegeben werden

Ein direkter Repo-Hotfix nach einem frueheren Builder-Block ist nur legitim,
wenn alles davon gilt:

1. aktiver Block ist normale Produkt-/Runtime-Reparatur, nicht Builder-Proof
2. enger Single-File-Schnitt
3. kein Builder-Core, kein Policy-/Governance-Ziel, kein Workflow/Deploy, keine
   Auth-/Protected-Pfade, keine Schema-/Migrationsarbeit
4. realer repo- oder live-sichtbarer Defekt
5. direkte Vorher-/Nachher-Verifikation moeglich
6. fruehere Builder-Klassifikation wird im Bericht explizit als Boundary-Datum
   genannt

Nicht erlaubt:

- aus einem direkten Hotfix freie Builder-Erlaubnis abzuleiten
- mehrere solche Faelle still zu einem neuen Korridor zu kumulieren
- einen frueheren Builder-`class_2`/`class_3`-Befund nachtraeglich einfach als
  "eigentlich class_1" umzudeuten ohne neue Builder-Evidence

## Soulmatch-spezifische Guardrails

- `client/src/app/App.tsx` ist aktuell die Hauptschaltstelle. Nicht nebenbei eine neue globale State-Architektur behaupten.
- `REDESIGN.md` ist bei UI-Arbeit die verbindliche Gestaltungs- und Blockreihenfolge.
- `DESIGN.md` ist die kompakte Maya-Designreferenz; `CANON.md` traegt Mayas Identitaetskonstanten fuer Soulmatch.
- Voice-/Audio-Arbeit immer als End-to-End-Kette denken: Start -> STT -> Send -> LLM -> TTS -> Playback.
- Provider-Wahrheit nicht aus alten Docs ableiten; immer `server/src/routes/studio.ts` und `server/src/lib/personaRouter.ts` gegenlesen.
- Persistenz nicht auf `profiles` reduzieren, wenn `migration.sql` und Server-Code mehr zeigen.
- Dev-Sicherheitsgrenzen nicht als "nur lokal" verharmlosen, wenn sie im Repo aktiv verdrahtet sind.
- Bei Redesign-Bloecken Routing, Backend-Routen und Scoring nicht nebenbei mitziehen.
- Maya nie stillschweigend als normale Spezialisten-Persona oder als Wahrheitsinstanz behandeln.

## Wenn mehr als 3 Dateien geaendert werden

Vor dem Editieren kurz zusammenfassen:

- welcher aktive Block geschnitten wird
- welche Dateien betroffen sind
- was ausdruecklich nicht Teil des Blocks ist

Der Zweck ist nicht Ritual, sondern Scope-Kontrolle.

## Review-Haltung

Wenn die Aufgabe eine Review ist:

- Findings zuerst
- nach Schweregrad ordnen
- nur repo-belegte Risiken benennen
- Residualrisiken und Testluecken knapp nennen
- keine weichgespuelten Urteile, wenn Drift oder Widersprueche real sind

## Verifikationsregeln

- Nach jedem Feature- oder Fix-Block mindestens die passende Typpruefung laufen lassen.
- Fuer den Client: `cd client && pnpm typecheck`
- Fuer den Server: `cd server && pnpm build`
- Wenn Voice-/Audio betroffen ist, zusaetzlich die Eventkette im Code verfolgen und relevante Tests beachten.
- Wenn Tests nicht gelaufen sind oder nicht laufen konnten, das explizit sagen.

### Selbst-Erkennung bei haengenden Tools

Wenn ein Terminal-Command nach 30 Sekunden keine Ausgabe zeigt, sofort stoppen und einen alternativen Weg nehmen.

Typische Faelle:

- stille TypeScript-Pruefungen (tsc ohne Fehler liefert keinen Fortschritt)
- HTTP-Calls mit haengender DNS-Aufloesung
- Node-Inline-Scripts mit blockierten Event-Loops

`| head -20` nicht als Fortschrittsanzeige fuer stille Tools verwenden — ohne Fehloutput bleibt der Prozess scheinbar stehen. Bei Unsicherheit: expliziten Timeout setzen (`curl --max-time 10`, `timeout 30 <command>`) statt blind warten.

## Post-Push-Protokoll fuer externe KI-Reviews

Nach jedem erfolgreichen `git push` immer zusaetzlich einen Raw-URL-Block ausgeben. Zweck: Externe Reviewer (ChatGPT, Codex, Web-KIs) bekommen frische Anker-URLs mit verifiziertem Commit-Hash statt aus dem Chat-Gedaechtnis rekonstruierter Angaben. Dies adressiert direkt Drift 15 (handoff_verify_evidence_class).

Pflichtablauf:

1. frischen Commit-Hash holen mit `git rev-parse HEAD`
2. geaenderte Dateien des letzten Push-Commits holen mit `git diff --name-only HEAD~1 HEAD`
3. folgenden Block ausgeben:

```
# URLs fuer externe KI-Reviews

Aktueller Commit: {COMMIT_HASH}
Push-Zeitpunkt: {ISO_TIMESTAMP}

## Immer zuerst lesen
- https://raw.githubusercontent.com/G-Dislioglu/soulmatch/{COMMIT_HASH}/STATE.md
- https://raw.githubusercontent.com/G-Dislioglu/soulmatch/{COMMIT_HASH}/RADAR.md
- https://raw.githubusercontent.com/G-Dislioglu/soulmatch/{COMMIT_HASH}/docs/CLAUDE-CONTEXT.md
- https://raw.githubusercontent.com/G-Dislioglu/soulmatch/{COMMIT_HASH}/docs/SESSION-STATE.md

## Geaenderte Dateien in diesem Push
{LISTE DER GEAENDERTEN DATEIEN ALS RAW-URLs}
```

Regeln:

- diesen Block immer nach einem Push ausgeben, ohne Aufforderung
- Commit-Hash immer frisch holen, nie aus dem Gedaechtnis einsetzen
- Push-Zeitpunkt als ISO-Timestamp mitliefern (Evidenz-Klasse gemaess Drift 15)
- keine nicht existierenden Dateien auflisten
- wenn kein Push stattfindet, keinen URL-Block ausgeben

## Externe Referenzen und Web-KI-Reviews

Wenn externe Review-Strukturen genutzt werden:

- zuerst `STATE.md`
- dann `RADAR.md`
- dann `AGENTS.md`
- danach nur die wirklich benoetigten Detaildateien

Externe Vorbilder duerfen Strukturprinzipien liefern, aber keine Soulmatch-Wahrheit ersetzen.

## Nicht tun

- Keine stillen Grossumbauten.
- Keine Zukunftssprache als Ist-Zustand ausgeben.
- Keine Doku-Sauberkeit ueber Code-Wahrheit stellen.
- Keine Breitenfixes aus einem engen Problem heraus starten.
- Kein Misch-Commit aus mehreren Achsen nur weil die Stellen nebeneinander liegen.

## Naechster Standardpfad fuer neue Chats

1. `STATE.md` lesen
2. bei UI-Arbeit `REDESIGN.md` lesen
3. bei Maya-zentrierter UI-Arbeit `DESIGN.md` und `CANON.md` lesen
4. `RADAR.md` lesen
5. `FEATURES.md` lesen
6. Zerquetsch-Satz formulieren
7. bei Unklarheit `docs/methods/compression-check.md` nutzen
8. aktiven Block schneiden
9. nach Umsetzung `STATE.md`, `RADAR.md` und `FEATURES.md` synchronisieren
