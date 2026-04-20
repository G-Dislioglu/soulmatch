# HANDOFF S35-F12 — Architecture-Digest

**Datum:** 2026-04-20 spätabends (ca. 21:40 – 22:30)
**Vorgänger:** S35-F11 (`docs/HANDOFF-S35-F11.md`)
**Commit dieser Session:** `f3cbc57`
**Live auf Render:** `f3cbc57`

---

## 1. Was in S35-F12 passiert ist

### 1a. Motivation

Nach F11 kam die Frage: "Verstehen alle unsere KIs die Ordner-Struktur wirklich gut?" Antwort: nein. F11 liefert Repo-Wahrheit auf Datei-Ebene, aber keine strukturierte Architektur-Übersicht. Jede neue KI musste durch mehrfaches File-Lesen plus Raten rekonstruieren, was zu M-Nummern gehört, wo Routes gemountet sind, welche DB-Tabellen zusammenhängen.

F12 schließt diese Lücke mit einem neuen read-only Endpoint `POST /api/context/architecture-digest` im Context-Broker.

### 1b. Umsetzung

Drei Vorab-Entscheidungen vor Copilot-Start:
1. Modul-purpose via Kommentar-Extraktion aus index.ts (kein MODULE.md-Pflicht) — mit Fallback-Text wenn nicht vorhanden
2. sections-Filter ja (spart Tokens bei gezielten Nachfragen)
3. conventions-Block im gleichen Endpoint (nicht separat)

Copilot hat **drei Korrekturen** gegen den ursprünglichen Prompt eingezogen, bevor er gebaut hat:

1. **Modul-dependencies aus allen .ts/.tsx-Dateien pro Modul**, nicht nur `index.ts`. Grund: die echten Cross-Module-Imports (93 Treffer) sitzen verstreut in den Moduldateien, nicht gesammelt in index.ts.

2. **Routes aus realen `app.use`-Mounts in `server/src/index.ts`**, nicht aus den Spec-Beispielpfaden. Grund: meine Spec hatte `/api/studio` als Beispiel, aber in Wahrheit ist `/api` gemountet. Beispiele als Wahrheit zu übernehmen wäre sofort gebrochen.

3. **DB-Tabellen auch aus `db.ts` und `arcana.ts`**, nicht nur `builder.ts`. Grund: Produkt-Tabellen (`profiles`, `persona_definitions`, `persona_presets`, `persona_voice_overrides`) hätten sonst gefehlt.

Alle drei Korrekturen berechtigt. Mein Prompt hätte ohne diese Schritte einen schwächeren Digest produziert.

### 1c. Live-Verify

- **Probe 1 (alle Sections):** HTTP 200, 15.8 KB. 19 Module mit echten `depends_on`/`used_by`. M02_ui-kit als meistgenutztes Modul (9 used_by) — plausibel. 16 Routes mit Subrouter-Erkennung. 18 DB-Tabellen in 3 Gruppen.
- **Probe 2 (sections-Filter):** `{sections:["routes","db_tables"]}` liefert nur generatedAt, repoHead, routes, db_tables. 4.6 KB statt 15.8 KB → **70% Token-Ersparnis** bei gezielten Nachfragen.
- **Probe 3 (Cache-Hit):** zwei aufeinanderfolgende Calls mit identischem generatedAt → 5-Min-Cache greift.

### 1d. Nebenbefund

M02_ui-kit depends_on `['M06_discuss', 'M08_studio-chat']` — verdächtig, weil ein UI-Kit normalerweise keine Module importieren sollte, die es selbst benutzen. Könnte eine zirkuläre Dependency oder Test-Import sein. Notiert als offener Prüfpunkt, kein F12-Bug.

---

## 2. Prozess-Lehren

### 2a. Copilot als Architektur-Prüfer

Copilot hat heute insgesamt **sechsmal** Claude-Prompts korrigiert (fünfmal früher, plus dreimal vor F12-Bau). Alle Korrekturen berechtigt. Das Muster etabliert sich: Claude plant grob und framed den Prompt, Copilot prüft gegen die reale Code-Struktur und schärft bevor er baut, User entscheidet bei Grundsatzfragen. Diese Rollenteilung ist jetzt belastbar dokumentiert.

### 2b. Lokale Laufzeit-Probe vor Push

Copilot hat bei F12 erstmals **lokale Funktionsaufrufe** gefahren (`node --import tsx -e "..."`), nicht nur TSC. Das hat die Live-Probe zum reinen Bestätigungs-Schritt gemacht statt zur Debugging-Session. Empfehlung für zukünftige Blöcke mit nicht-trivialer Geschäftslogik: lokale Laufzeit-Probe gehört zum Standardablauf dazu.

### 2c. Spec-Beispiele sind nicht Code-Wahrheit

Meine F12-Spec hatte Beispielpfade wie `/api/studio`, die in Wahrheit anders gemountet sind. Für zukünftige Specs: entweder klar als Beispiel markieren, oder erst aus dem Code ableiten. Der Instinkt "Spec gibt Richtung, Code gibt Wahrheit" hat sich wieder bestätigt.

---

## 3. Was live ist nach S35-F12

- **F12 komplett** — vierter Endpoint im Context-Broker
- Strukturierte Architektur-Wissen in einem Tool-Call
- 5-Min-Cache + sections-Filter für Token-Effizienz
- RADAR-Kandidat F12 auf `adopted`

---

## 4. Offen für die nächste Session

### 4a. Kleine Follow-ups

1. **Modul-PURPOSE-Kommentare einfügen** — in die wichtigsten 5-8 Module einen `/** PURPOSE: ... */`-Kommentar in index.ts setzen. Einmalige Handarbeit ~15 Min, macht den Digest endgültig aussagekräftig.
2. **Zirkulärer Import prüfen** — M02_ui-kit → M06_discuss/M08_studio-chat verifizieren. Könnte ein Refactor-Kandidat sein.
3. **F10-Followup Live-Verify** — neuer Job, Container-Restart, Status-Wechsel bei Cache-Miss beobachten.
4. **Double-Deploy-Fix live beobachten** — nächster Code-Commit sollte nur einen Deploy zeigen.

### 4b. Konvention festlegen

5. **Claude-Session-Start-Konvention in CLAUDE-CONTEXT.md** dokumentieren — ab jetzt als Standard-Einstieg: `POST /api/context/session-start` plus bei Bedarf `/architecture-digest`.

### 4c. Strukturell offene Blöcke

6. **F13: echter MCP-Server** — nicht dringend, natürliche Fortsetzung
7. **opus-feature F6-Hardening** — nur bei Evidenz eines konkreten Halluzinations-Problems
8. **Altlast:** FUSION-ENGINE-SPEC, ARCHITECTURE-GRAPH-SPEC, Maya-Core-Cut, Kaya-Rename (16 Orion-Stellen)

---

## 5. Für neue Chats — empfohlener Einstieg ab jetzt

**Ein Tool-Call, zwei Tool-Calls, drei Tool-Calls:**

1. `POST /api/context/session-start?opus_token=...` → Anker + Commits + Drifts + Seams (~137 KB)
2. `POST /api/context/architecture-digest?opus_token=...` → strukturiertes Repo-Verständnis (~16 KB)
3. Bei Bedarf: `/files/read` für spezifische Dateien, `/ops/query` für DB-Zustände

Das ersetzt die frühere Session-Start-Kaskade von 8-12 einzelnen curl-Roundtrips.

**Wichtige Erinnerungen (unverändert):**
- Drift 12 (Bridge-Token ohne workflows-Scope) — Workflow-Commits bleiben Copilots Domäne
- Session-Close-Template v2 (drei Phasen) ist Pflicht
- Bei parallelem Copilot-Arbeit prüfen ob geplante Aufgaben bereits erledigt sind
- Specs geben Richtung, Code gibt Wahrheit — neue Lehre aus F12
