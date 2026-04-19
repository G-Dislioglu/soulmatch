# HANDOFF S32 — Anti-Drift-System Phase 1, Beings, Render-Deploy-Optimierung

**Datum:** 2026-04-19 (späte Abend-Session)
**Vorgänger:** S31 (2026-04-18, `docs/HANDOFF-S31.md`)
**Repo-Head bei Session-Start:** `ad8abd0` (gemäß SESSION-STATE S31)
**Repo-Head bei Handoff-Commit:** `b0233dc` plus der Commit dieses Handoffs (wird im nächsten Code-Commit im STATE-Header nachgezogen)

---

## 1. Geliefert heute

### 1a. Drei Beings dokumentiert und committed

**Commits:** `2c255fe` (Amara), `d0befbb` (Sibyl + Lilith + Kaya)

Das Being-Codex-v1.2-Programm ist damit für das Kern-Ensemble abgeschlossen: Maya
(committed in S31-Zeitraum als `2f44ddb`), Amara, Sibyl, Lilith und Kaya liegen
jetzt alle als strukturierte Markdown-Dokumente unter `docs/beings/`. Die Dateien
verändern bewusst kein Live-Verhalten — sie sind Spezifikation für die geplante
Migration in die zentrale Persona-Umgebung (`maya-core`). Die bestehenden
Persona-Definitionen in `server/src/lib/personaRouter.ts` und
`server/src/studioPrompt.ts` sind davon unberührt und bleiben als Übergangs-Code.

Orion ist zu Kaya umbenannt — aber nur im Being-Dokument. Der Code referenziert
weiterhin `orion` in mehreren Pfaden: `personaRouter.ts`, `studioPrompt.ts`
(mehrere Stellen), `client/src/modules/M07_reports/ui/HallOfSouls.tsx`. Der
Code-Refactor ist bewusst ein eigener Task, der mit der Maya-Core-Migration
zusammen gemacht wird.

### 1b. Render-Deploy-Optimierung für Docs-Commits

**Commits:** `76da5a1` (Workflow-paths-ignore), Dashboard-Seite manuell

Zwei unabhängige Schichten greifen jetzt ineinander, damit reine Docs-Änderungen
keinen Render-Build mehr auslösen:

- `.github/workflows/render-deploy.yml` hat ein `paths-ignore` für
  `docs/**`, `**/*.md`, `.github/ISSUE_TEMPLATE/**`, `LICENSE` bekommen. Der
  GitHub-Action-Lauf springt bei solchen Commits nicht mehr an.
- Render-Dashboard-Build-Filter: Included Paths sind `server/**`, `Dockerfile`,
  `package.json`; Ignored Paths sind `docs/**`, `**/*.md`,
  `builder-repo-index.json`. Renders eigener Auto-Deploy-Pfad springt bei
  Docs-Only-Commits ebenfalls nicht an.

Zusammen: Beings-, Handoff-, STATE-, RADAR-Commits sind ab jetzt in Sekunden
durch, ohne 6–8 Minuten Build-Warteschleife. Erstmalig wirksam bei `d0befbb`
(Sibyl/Lilith/Kaya) und `b0233dc` (Anti-Drift-System). Beide Commits haben keinen
Deploy ausgelöst.

### 1c. Gemini-3.1-Flash-Lite-Pool-Eintrag + abgeschlossene Qualitätsprobe

**Commit:** `2734d0f` — Pool-Mapping und Provider-Specs ergänzt.

Gemini-3.1-Flash-Lite wurde als zusätzliches Scout-Modell in
`server/src/lib/poolState.ts` und `docs/provider-specs.md` aufgenommen
(Model-ID `gemini-3.1-flash-lite-preview`, $0.25/$1.50 pro 1M Token, 1M
Kontext-Fenster, `thinking_level` konfigurierbar). Motivation war eine
Kosten-/Qualitäts-Probe als möglicher Ersatz für Opus im Maya-Moderator-Pool.

Ergebnis der Probe (im Chat dokumentiert, Quell-Artefakte nicht committed):
Flash-Lite als Council-Moderator scheitert gegen drei starke Council-Modelle —
Roundtable endet bei `no_consensus`, wo Opus-Maya einen `unanimous`-Konsens
erzwingt. Grobe Bewertung: Flash-Lite ~45/100 in Moderator-Rolle, Opus ~85/100.
Pool wurde am Session-Ende auf `['opus']` zurückgestellt.

Zusätzlicher Befund aus der Probe, der **in die Pipeline-Architektur zurückfließen
muss**: Die bestehenden Scouts (graph, code, pattern, risk, web) produzieren für
Tasks mit präzisem Scope-Parameter halluzinierte Datei-Pfade und erfundene
Schema-Details, weil kein Scout tatsächlich die im Scope genannten Dateien liest.
Der Distiller übernimmt die Halluzinationen ohne Gegenprüfung gegen den
Scope-Parameter. Modellstärke allein löst das nicht — ein stärkeres Modell
(GLM-5-Turbo) scheiterte in derselben Pipeline noch schlechter (~24/100 mit
Laufzeit-Syntax-Bug). Der strukturelle Hebel wäre ein `file-scout`, der die im
Scope genannten Dateien tatsächlich liest, plus ein Distiller-seitiger
Scope-Gegencheck. Siehe Abschnitt 3 für den Kandidaten-Eintrag.

**`/solo-task`-Testendpoint und `skipScouts`-Flag** waren für die Probe temporär
eingebaut und sind mit Commit `aca5ad3` wieder entfernt worden. Der einzige
verbleibende Rest ist der Pool-Mapping-Eintrag, der für späteren Gebrauch
stehen bleibt.

### 1d. Anti-Drift-System Phase 1 committed

**Commit:** `b0233dc` — drei neue Docs-Dateien.

Die in dieser Session diagnostizierte Kernschwäche war nicht ein einzelner
Kontext-Drift, sondern ein systematisches Problem: Chat-Handoffs zwischen
Claude-Sessions verlieren regelmäßig strategische Weichenstellungen, auch wenn
das Repo die Fakten enthält — weil der Summary beim Chat-Start nicht zuverlässig
auf die Repo-Dateien verweist.

Gebaut wurden drei Dokumente in `docs/`:

- `CLAUDE-CONTEXT.md` — Claude-verwalteter Kontext-Anker mit YAML-Front-Matter
  für maschinenlesbare Fakten (aktive Threads, Drift-Watchlist, harte
  User-Regeln) plus Prosa-Sektionen für Denk-Kontext. Wird am Ende jeder
  Chat-Session gepflegt.
- `SESSION-CLOSE-TEMPLATE.md` — Checkliste, die Claude am Ende jeder Session
  durchläuft: Front-Matter-Update, Drift-Einträge, Prosa-Sektionen prüfen,
  STATE/RADAR/SESSION-STATE-Checks, Commit-Vorschlag.
- `BUILDER-TASK-session-log.md` — Spec für den `/session-log`-Endpoint, der in
  einem folgenden Builder-Task gebaut werden soll. Zweck: bei jedem erfolgreichen
  `/git-push` wird automatisch ein strukturierter Eintrag an
  `docs/SESSION-LOG.md` angehängt, im selben Commit mit der Code-Änderung. Damit
  ist auch ohne Chat-Session-Close ein lückenloses Protokoll aller Code-Pushs
  vorhanden.

Parallel wurden meine (Claude-Opus) internen Memory-Einträge von 30 auf 15
zurückgefahren. Alle projekt-technischen Einträge wurden entfernt (werden jetzt
aus dem Repo gelesen), Verhaltenspräferenzen und ein Anker-Eintrag bleiben. Der
Anker-Eintrag verpflichtet mich, bei Arbeit an den verbundenen Repos zuerst
`docs/CLAUDE-CONTEXT.md` und `docs/SESSION-LOG.md` zu lesen.

---

## 2. Prozess-Lehren aus dieser Session

### 2a. Das Anti-Drift-System wurde beim Einführen selbst verletzt

Die Session endete mit einem Commit der CLAUDE-CONTEXT.md (`last_session: S32`,
`last_updated: 2026-04-19`), aber STATE.md-Header und SESSION-STATE.md wurden
nicht nachgezogen. Erst die Folge-Session hat das gemerkt und im Lese-Ritual
bemerkt. Ohne ein striktes Session-Close-Ritual bleibt auch das beste
Meta-System ein Papier-System.

Konsequenz für S33+: die Session-Close-Übung ist nicht optional. Entweder
Claude schlägt sie am Session-Ende explizit vor, oder der User triggert sie mit
dem Stichwort "Session-Close". Ohne den Schritt kommt jede neue Session mit
veralteten Anker-Dateien an.

### 2b. Pipeline-Scouts brauchen echten File-Zugriff

Die Flash-Lite-Probe hat beiläufig einen strukturellen Befund aus der
Builder-Pipeline aufgedeckt: Drei von fünf Scouts (code, pattern, risk) arbeiten
ohne echten Repo-Zugriff und antworten aus Trainingsdaten. Der `graph-scout`
liefert nur Daten, wenn der Scope im Architecture Graph indexiert ist, sonst
leer. Der `web-scout` macht echte Websuche, ist aber nicht repo-spezifisch.

Der Distiller prüft Scout-Outputs nicht gegen den Scope-Parameter. Folge:
erfundene Pfade und erfundene Schema-Details landen als Fakten im Worker-Brief.
Modellstärke allein löst das nicht — stärkere Modelle scheitern in derselben
Falle, nur langsamer und mit anderen Bug-Signaturen.

Der sinnvollste Fix ist ein zusätzlicher `file-scout` mit tatsächlicher
`readFile`-Funktion auf die im Scope genannten Dateien, plus ein Distiller-
seitiger Regex-Check gegen Scope-Parameter. Das ist kein kleiner Fix, aber der
strukturell größte Hebel für Pipeline-Qualität — vermutlich größer als der
S31-False-Positive-Fix selbst. Als RADAR-Kandidat F6 dokumentiert (siehe unten).

### 2c. Render-Deploy-Optimierung: zwei Schichten, eine Wirkung

Der `paths-ignore`-Workflow allein reicht nicht — Render hat einen eigenen
Auto-Deploy-Pfad, der unabhängig vom Workflow läuft. Dafür gibt es die
Dashboard-Build-Filter. Erst beide Schichten zusammen eliminieren die Wartezeit
für Docs-Commits vollständig. Die Dashboard-Filter sind im Code-Repo nicht
sichtbar — wer später auf dieser Struktur aufbaut, muss die Filter im
Dashboard verifizieren können. Eintrag in `docs/CLAUDE-CONTEXT.md` oder
`STATE.md` wäre sinnvoll.

---

## 3. Offener Stand am Session-Ende

### 3a. Direkt aus S32 entstandene offene Threads

- **`/session-log`-Endpoint bauen** (Spec: `docs/BUILDER-TASK-session-log.md`).
  Nächster konkreter Builder-Task. Via `/opus-feature` an den Builder geben.
  Kleiner, abgegrenzter Block — macht Anti-Drift-System Schicht 3 (Runtime-Log)
  scharf. Sollte Priorität haben, bevor andere Builder-Arbeit läuft, damit
  folgende Commits bereits automatisch protokolliert werden.

- **STATE.md-Header nachziehen** — `current_repo_head`, `last_verified_against_code`,
  `last_completed_block`, `next_recommended_block` sind seit S31 nicht
  aktualisiert. Im nächsten Code-Commit mitnehmen, damit der unvermeidbare
  Render-Deploy nicht nur für einen Header-Update läuft.

- **RADAR-Kandidat F6 anlegen** — `Pipeline-Scouts mit echtem File-Zugriff`.
  Details in Abschnitt 2b. Sollte als `active / proposal` eingetragen werden.

- **Kaya-Rename im Code** — `orion` → `kaya` in `personaRouter.ts`,
  `studioPrompt.ts`, `HallOfSouls.tsx`. Bewusst zurückgestellt bis zur
  Maya-Core-Migration.

### 3b. Aus S30/S31 übernommen, weiterhin offen

- **S31-False-Positive-Pipeline-Path-Fix** (aus `docs/S31-CANDIDATES.md`).
  Schritt A (SHA-Verify in `opusSmartPush.ts`), Schritt C (Workflow-Härtung in
  `builder-executor.yml`), Schritt D (Orchestrator-Status-Treue) noch nicht
  gebaut. S31 hat nur Task 4a (Outbound-Observability) + atomare
  Mehrdatei-Commits geliefert. Dies bleibt der inhaltliche Haupt-Thread nach
  `/session-log`.
- **TSC-Retry Roundtable-Pfad schließen** (S30-Rest).
- **Block 5d PR #2 — Context-Split** (Maya-Guide via React Context, S30-Rest).
- **Maya-Core nächsten Block schneiden** — blockiert seit 2026-04-05,
  produktseitige Entscheidung nötig.
- **Async Job-Pattern für `/opus-task`** (S24-Rest).
- **Patrol Finding Auto-Fix** (S24-Rest).

### 3c. RADAR-Kandidaten, die weiterhin `active` sind

- **F3** — Opus-Bridge End-to-End Live-Verification auf Render (`@READ`-Pfade,
  BDL-Disziplin, Judge-/Distiller-Treue).
- **F4** — Builder-S17 Live-Verification (Distiller-Intent, UI-Cancel,
  Stale-Detector-Logs).
- **F5** — Director Live async-validation.
- **F5e** — Deterministische Related-Files-Briefing-Lane.
- **G** — Provider Truth Sync (Docs-vs-Code-Drift für Provider-Naming).

### 3d. Strategischer Ausblick unverändert

Soulmatch-Feature-Arbeit bleibt pausiert. Builder-App muss stabilisiert werden,
danach Maya-Core-Schnitt, dann Persona-Migration von Soulmatch nach Maya-Core.
Bluepilot Phase 1 erst nach stabilem Maya-Core. Historische-Figuren-Spec als
Preset-Kategorie im (zukünftigen) Maya-Core-Arcana-Studio — wartet auf
Maya-Core-Schnitt.

---

## 4. Drifts aus S32 (Detail-Dokumentation)

Die vier Drifts, die in CLAUDE-CONTEXT.md `drift_watchlist` festgehalten sind,
kamen alle in dieser Session zur Oberfläche:

1. **persona_registry_location** (severity: high) — Claude hat historische
   Figuren zuerst als Soulmatch-Feature behandelt. Korrekt: gesamte
   Persona-Infrastruktur wandert nach `maya-core`.
2. **arcana_studio_scope** (severity: high) — Claude schlug Arcana-Erweiterung
   in Soulmatch vor. Korrekt: Arcana wird nach `maya-core` geklont und auf
   Being-Codex v1.2 refactored, Soulmatch bleibt Client.
3. **legacy_personas_in_code** (severity: medium) — Versuchung, Luna/Stella/
   Kael/Lian sofort als v1.2-Dokumente durchzuschreiben. Korrekt: warten bis
   Maya-Core-Schnitt.
4. **orion_rename_to_kaya** (severity: low) — Nur Dokument umbenannt, Code
   unverändert. Wird mit Maya-Core-Migration zusammen refactored.

Neu in diesem Handoff dokumentiert (nicht in CLAUDE-CONTEXT.md eingetragen, weil
Prozess-Drift statt Inhalts-Drift):

5. **self_referential_drift_in_antidrift_session** — Die Session, die das
   Anti-Drift-System einführte, verletzte es am Session-Ende selbst, indem
   STATE.md und SESSION-STATE.md nicht nachgezogen wurden. Lehre:
   Session-Close-Disziplin muss von Anfang an mitlaufen, nicht erst wenn das
   System "fertig" ist.

---

## 5. Für neue Chats: Einstiegs-Reihenfolge

1. `docs/CLAUDE-CONTEXT.md` — Claude-spezifischer Anker (neu seit S32)
2. `STATE.md` — kanonischer aktueller Stand
3. `RADAR.md` — aktive Kandidaten
4. `docs/SESSION-STATE.md` — Session-Entscheidungen, offene Tasks
5. Dieser Handoff (`docs/HANDOFF-S32.md`) — was in S32 passiert ist
6. Bei DNS/Bridge-Themen: `docs/HANDOFF-S31.md`, `docs/HANDOFF-S30.md`
7. Bei Pipeline-Themen: `docs/HANDOFF-2026-04-12-PIPELINE-COMPLETE.md` und
   `docs/HANDOFF-S25.md`
8. Bei Pipeline-Qualitäts-Themen (Scout-Halluzinationen):
   Abschnitt 2b dieses Handoffs plus RADAR-Kandidat F6

Session-Historie-Lücke unverändert: S22, S23, S26, S27, S28, S29 ohne
Handoff-Files im Repo.