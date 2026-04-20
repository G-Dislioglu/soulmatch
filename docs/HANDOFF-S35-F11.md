# HANDOFF S35-F11 — Context-Broker für Claude

**Datum:** 2026-04-20 späte Abendsession (ca. 19:40 – 20:55)
**Vorgänger:** S35-F10 (`docs/HANDOFF-S35-F10.md`)

**Commits dieser Session:**
- `fe9b90a` — F11 Initial: contextBroker.ts neu mit drei Endpoints, mount in index.ts, docs/F11-CONTEXT-BROKER.md, STATE+RADAR+FEATURES synchronisiert
- `0a71429` — F11 Followup: lokal-first mit GitHub-Fallback für Root-/docs-Dateien, SESSION-STATE-Anker für Handoff-Discovery, GitHub Commits-API für recentCommits

**Live-Commit nach Session-Ende:** `0a71429`

---

## 1. Was in S35-F11 passiert ist

### 1a. Ausgangspunkt — Frage nach MCP und mehr Zugriff

Nach Abschluss von F10 kam die Frage auf ob Connectors/MCP mir tieferen Einblick geben würden. Die Analyse führte zu einer wichtigen Erkenntnis: **der eigentliche Flaschenhals ist nicht "mehr Tools", sondern "verdichteter Session-Start"**. Heute morgen brauchte ich ca. 8-12 curl-Roundtrips um die wichtigsten Anker zu laden (CLAUDE-CONTEXT, STATE, RADAR, SESSION-STATE, aktueller Handoff, recent commits). Jeder davon kostet Zeit und verbraucht Context-Window.

Copilot hat vor dem Bau einen besseren Vorschlag gemacht: **statt eines vollen MCP-Servers zuerst einen schmalen Context-Broker** mit drei read-only Endpoints. Das adressiert das echte Problem bei minimaler Komplexität.

### 1b. F11 Umsetzung — drei Endpoints

**POST /api/context/session-start** — Verdichtetes Session-Start-Paket. Liefert in einer Response: CLAUDE-CONTEXT.md, STATE.md, RADAR.md, SESSION-STATE.md, neuester HANDOFF-*.md, letzte 15 Commits, parsed drift_watchlist aus CLAUDE-CONTEXT YAML, runtime_seams aus STATE. Ca. 130-140 KB Response.

**POST /api/context/files/read** — Multi-File-Read mit drei Modi: `full` (kompletter Inhalt, bei >500 KB automatisch truncated), `outline` (nur Imports + export-Zeilen), `slice` (Zeilenbereich). Max 20 Pfade pro Request. Pfad-Traversal-Safeguard.

**POST /api/context/ops/query** — Whitelist-basierte Read-Only-DB-Queries. Nur vier Tabellen erlaubt: `builder_agent_profiles`, `async_jobs`, `pool_state`, `builder_tasks`. Filter nur nach `id` oder `status`. Max limit 50, default 20. Kein freies SQL, keine JOINs, keine Writes.

Alle drei nutzen das bestehende `requireOpusToken`-Middleware.

### 1c. Produktionsdrift und Followup

Probe 1 nach Initial-Commit scheiterte mit HTTP 500 "File not found: docs/CLAUDE-CONTEXT.md". Ursache: Dockerfile kopiert im Runtime-Stage nur `/app/server` und `client/dist`. Root-Dateien wie `STATE.md`, `RADAR.md` und der ganze `docs/`-Ordner liegen nicht im Container.

Copilot hat vor dem Followup-Fix zwei Architekturentscheidungen des ursprünglichen Prompts korrigiert:

1. **Nicht pauschal "alles via GitHub"** — sondern lokal-first mit GitHub-Fallback. Lokale Dateien werden direkt gelesen wenn vorhanden (Dev-Mode funktioniert ohne Netz), nur im Container-Fall wird auf `raw.githubusercontent.com` zurückgegriffen.
2. **Handoff-Discovery nicht via GitHub Contents API** — sondern aus `docs/SESSION-STATE.md`-Anker. Der Anker ist kanonisch und existiert immer, keine Rate-Limit-Anfälligkeit, keine fragile Datei-Sortierung.

`recentCommits` nutzt die GitHub Commits API statt lokales `git log` (git ist im Container nicht verfügbar).

### 1d. Live-Verify nach Followup

Alle drei Endpoints HTTP 200 mit korrekten Payloads:

- **session-start:** 137 KB Response, alle vier Anker vollständig, latestHandoff automatisch auf `docs/HANDOFF-S35-F10.md`, 15 recentCommits, 14 activeDrifts inkl. drift 14 von heute, 6 runtimeSeams.
- **files/read:** vier gemischte Pfade (2× server/ lokal + 2× docs/ via GitHub) alle gefunden, outline-mode komprimiert sinnvoll.
- **ops/query:** pool_state, builder_agent_profiles, async_jobs alle mit korrekten Rows. Unbekannte Tabelle `users` → HTTP 400 mit allowed-Liste → Whitelist greift.

---

## 2. Prozess-Lehren

### 2a. Dritter Chat-Turn gleich Spec, vierter Turn gleich Code

F11 ist das reinste Beispiel dieser Session für den Arbeitsmodus: Frage → Inspection → Prompt an Copilot → Umsetzung → Live-Verify → Followup → Live-Verify → Close. Copilot hat dabei zweimal mein Prompt inhaltlich verbessert (beide Male berechtigt). Die Rollenteilung Claude-plant / Copilot-baut-mit-Code-Realitäts-Check / User-entscheidet skaliert.

### 2b. Dockerfile-Realität muss in jeden Server-seitigen Block einfließen

Der Dockerfile-Mismatch zwischen "Repo hat docs/" und "Container hat nur server/" ist nicht neu — war schon bei der Opus-Bridge-Genesis ein Thema (siehe Drift 12-Kontext). Bei F11 ist es sofort aufgeschlagen. Erinnerung für zukünftige Server-Blöcke: **frage dich immer ob die benötigten Dateien im Container sind**. Nicht das Repo ist der Container.

### 2c. Der eigene Bau ersetzt keinen MCP, aber er schiebt den Bedarf weg

F11 macht einen echten MCP-Server weniger dringend. Ein MCP-Server wird immer noch Sinn machen wenn Claude schreibende Operationen direkt braucht, oder für Standard-Tooling-Kompatibilität. Aber der Leidensdruck ist jetzt deutlich niedriger.

---

## 3. Was live ist nach S35-F11

- **F11 komplett** — Context-Broker mit drei Endpoints live und verifiziert
- Session-Start-Paket via einem Tool-Call statt 8-12 Roundtrips
- Multi-File-Read mit outline/slice-Modi
- Whitelist-basierter Ops-Query (Read-Only)
- RADAR-Kandidat F11 auf `adopted`

---

## 4. Offen für die nächste Session

### 4a. Nutzung etablieren

1. **Claude-Session-Start-Konvention** — in zukünftigen Chats als erste Handlung `POST /api/context/session-start` aufrufen. Könnte als Standard in CLAUDE-CONTEXT.md vermerkt werden.

### 4b. Strukturell offene Blöcke

2. **F12 — echter MCP-Server** (nicht dringend) — als eigener Block später, wenn schreibende MCP-Tools nötig werden oder Standard-Kompatibilität gewünscht.
3. **FUSION-ENGINE-SPEC** — Multi-Provider-Ensemble pro Persona
4. **ARCHITECTURE-GRAPH-SPEC v1.1** bauen
5. **Maya-Core-Cut** — seit 2026-04-05 offen
6. **Kaya-Rename im Code** — 16 Orion-Stellen

### 4c. Technische Nachlese dieser Session

7. **F10-Followup-Live-Verify** — neuer Job + Container-Restart, Status-Wechsel bei Cache-Miss muss greifen. 5 Min Test.
8. **Double-Deploy-Fix live beobachten** — nächster Code-Commit sollte einen Deploy zeigen, nicht zwei.

---

## 5. Für neue Chats — neue Einstiegs-Möglichkeit

**Empfohlene Reihenfolge ab jetzt:**

1. `POST /api/context/session-start?opus_token=opus-bridge-2026-geheim` → komplettes Setup
2. Bei Bedarf: einzelne Dateien via `/api/context/files/read`
3. Bei Bedarf: DB-Zustände via `/api/context/ops/query`

**Alter Weg (einzelne curls) funktioniert weiterhin**, ist nur langsamer. Der Broker ist additiv, nichts wurde ersetzt oder deprecated.

**Wichtige Erinnerungen (unverändert):**
- Drift 12 (Bridge-Token ohne workflows-Scope) — Workflow-Commits bleiben Copilots Domäne
- Session-Close-Template v2 (drei Phasen) ist Pflicht
- Bei parallelem Copilot-Arbeit immer prüfen ob geplante Aufgaben bereits erledigt sind

Session-Historie-Lücke: geschlossen am 2026-04-20. HANDOFF-S22-S29-RECONSTRUCTED.md + HANDOFF-S23.md decken alles ab.
