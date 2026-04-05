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