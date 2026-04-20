# F11 — Context-Broker

- **Status:** in_implementation
- **Zweck:** schmale read-only Kontext-Schicht fuer Claude vor einem spaeteren MCP-Block
- **Scope:** Session-Start-Paket, Multi-File-Read, whitelist-basierte Ops-Queries

## Problem

Claude verliert zwischen Sessions verdichtete Repo-Wahrheit. Heute muss der Session-Start ueber viele einzelne Datei- und Status-Abfragen zusammengesucht werden: `docs/CLAUDE-CONTEXT.md`, `STATE.md`, `RADAR.md`, `docs/SESSION-STATE.md`, neuer Handoff, letzte Commits, einzelne Code-Dateien, operative Builder-Daten.

Die Informationen existieren bereits im Repo und in der Builder-Runtime, aber sie liegen verstreut. Der Verlust ist weniger ein reines Modell-Problem als ein schlechter Einstiegspfad.

F11 baut deshalb **keinen MCP-Server**, sondern eine kleinere Vorstufe: einen read-only Context-Broker innerhalb des bestehenden Servers.

## Endpoints

### POST /api/context/session-start

Liefert ein kompaktes Session-Start-Paket mit:

- `generatedAt`
- `repoHead`
- `anchors`: `docs/CLAUDE-CONTEXT.md`, `STATE.md`, `RADAR.md`, `docs/SESSION-STATE.md`, neuester Handoff
- `recentCommits`: letzte 15 Commits
- `activeDrifts`: aus der Front-Matter von `docs/CLAUDE-CONTEXT.md`
- `runtimeSeams`: aus `STATE.md`

### POST /api/context/files/read

Multi-File-Read fuer bis zu 20 Repo-Pfade in einem Call.

Modes:

- `full`: voller Inhalt, bei >500KB truncation
- `outline`: Import-Block plus `export`-Zeilen
- `slice`: Zeilenbereich, 1-indexed inclusive

### POST /api/context/ops/query

Read-only Query gegen eine kleine Whitelist:

- `builder_agent_profiles`
- `async_jobs`
- `pool_state`
- `builder_tasks`

Nur `id` und `status` als Filter, kein freies SQL, keine Writes, keine Joins.

## Auth

Alle drei Endpoints nutzen denselben Opus-Token-Guard wie die bestehende Bridge (`?opus_token=...` oder Bearer-Header via `requireOpusToken`).

## Akzeptanzkriterium

1. `POST /api/context/session-start` liefert in einem Call die vier Anker, einen Handoff, Drifts, Runtime-Seams und die letzten Commits.
2. `POST /api/context/files/read` kann mindestens drei Dateien in einer Response liefern und markiert fehlende Pfade unter `notFound`.
3. `POST /api/context/ops/query` gibt fuer eine erlaubte Tabelle read-only Rows zurueck und lehnt unbekannte Tabellen mit 400 ab.

## Nicht-Scope

- kein MCP-Protokoll
- keine Write-Endpoints
- kein Deploy-Trigger
- kein freies SQL
- keine Schema-Aenderung

## Design-Notiz

F11 ist bewusst whitelist-basiert und klein. Wenn sich diese Schicht bewahrt, kann sie spaeter als MCP-Server oder MCP-Toolset exponiert werden. Der Broker soll zuerst den Session-Start und gezielte Nachfragen billiger und stabiler machen, nicht die gesamte IDE ersetzen.