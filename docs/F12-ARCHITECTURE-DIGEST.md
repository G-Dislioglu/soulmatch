# F12 — Architecture-Digest

- **Status:** `adopted`
- **Vorgänger:** F11 (Context-Broker)
- **Zweck:** strukturiertes Architektur-Wissen über das Repo, als erweiterter Endpoint im bestehenden Context-Broker
- **Scope:** ein neuer read-only Endpoint `POST /api/context/architecture-digest`, der dem Broker beibringt wie der Repo-Aufbau gedacht ist — nicht nur was in welchen Dateien steht

## Problem

F11 liefert Repo-Wahrheit auf Datei-Ebene (Session-Start-Paket, Multi-File-Read, Ops-Queries). Was fehlt, ist **strukturiertes Architektur-Wissen**:

- Welche Module gibt es im Client? (M04, M07, M14 usw. — die Nummernstruktur ist organisch gewachsen und nicht dokumentiert)
- Welche Routes gehören zu welchem Subsystem? (Builder, Context-Broker, Studio, Health)
- Welche Tabellen hält die DB, und was gehört zusammen? (Builder-Stack vs. Produkt-Stack vs. Operativ-Stack)
- Wie hängt das Soulmatch-Repo mit `maya-core/` und `aicos-registry/` zusammen?

Heute gewinnt jede neue KI (Claude, Maya-Director, Worker) dieses Wissen durch **mehrfaches File-Lesen plus Raten**. Das ist a) langsam, b) fehleranfällig, c) der Haupt-Einstiegspunkt für Halluzinationen wie sie F6 abfangen musste.

F12 schließt diese Lücke: ein einziger Tool-Call liefert den strukturierten Aufbau, nicht den Dateiinhalt.

## Abgrenzung

- **Kein** LLM-Call bei Auslieferung. Der Digest ist statisch-deterministisch, wird aus Quellen zusammengebaut die bereits im Repo existieren.
- **Kein** neuer Daten-Store. Alle Quellen sind existierende Dateien, Tabellen, oder Ableitungen aus `builder-repo-index.json`.
- **Keine** Architektur-Meinung. Der Digest beschreibt Ist-Zustand, nicht Soll-Zustand.
- **Kein** Write-Endpoint. Read-only wie der Rest des Context-Brokers.

## Endpoint

### POST /api/context/architecture-digest

Auth wie der Rest: `requireOpusToken` mit Query-Param `opus_token`.

Body kann optional Subset-Filter haben:

```json
{
  "sections": ["modules", "routes", "db_tables", "cross_repos"]  // default: alle
}
```

Response-Schema:

```json
{
  "generatedAt": "ISO-8601",
  "repoHead": "commit-sha",
  
  "modules": {
    "M03_profile": {
      "path": "client/src/modules/M03_profile",
      "purpose": "Benutzerprofil, Geburtsdaten, Persona-Präferenzen",
      "main_exports": ["loadProfile", "saveProfile", "ProfileProvider"],
      "depends_on": ["M01_core"],
      "used_by": ["M04_astrology-adapter", "M07_reports"],
      "file_count": 12
    },
    "M04_astrology-adapter": { ... },
    "M07_reports": { ... },
    "M14_guide": { ... },
    "M16_builder": { ... }
  },
  
  "routes": {
    "builder": {
      "base": "/api/builder",
      "mount_file": "server/src/routes/builder.ts",
      "subrouters": {
        "opus-bridge": {
          "base": "/api/builder/opus-bridge",
          "mount_file": "server/src/routes/opusBridge.ts",
          "endpoint_count": 36
        }
      }
    },
    "context": {
      "base": "/api/context",
      "mount_file": "server/src/routes/contextBroker.ts",
      "endpoints": ["session-start", "files/read", "ops/query"]
    },
    "health": {
      "base": "/api/health",
      "mount_file": "server/src/routes/health.ts",
      "endpoints": ["/", "opus-task-async", "opus-job-status"]
    },
    "studio": {
      "base": "/api/studio",
      "mount_file": "server/src/routes/studio.ts"
    }
  },
  
  "db_tables": {
    "builder_stack": {
      "tables": ["builder_tasks", "builder_memory", "builder_chatpool", 
                 "builder_agent_profiles", "builder_error_cards", 
                 "pool_state", "async_jobs"],
      "purpose": "Builder-Pipeline-Zustand, Worker-Briefings, Memory-Layers"
    },
    "product_stack": {
      "tables": ["users", "session_memories", ...],
      "purpose": "Soulmatch-App-Runtime: Benutzer, Persona-Gespräche, Gedächtnis pro User/Persona"
    }
  },
  
  "cross_repos": {
    "soulmatch": {
      "role": "main app + builder runtime",
      "github": "https://github.com/G-Dislioglu/soulmatch"
    },
    "maya-core": {
      "role": "Maya als standalone Companion, Thread-Digest-Pipeline",
      "github": "https://github.com/G-Dislioglu/aicos-registry/tree/main/maya-core",
      "note": "liegt als Unterordner in aicos-registry, eigene Next.js-App"
    },
    "aicos-registry": {
      "role": "Karten-System (94 Cards), MEC-Phasen, Unified System Spec",
      "github": "https://github.com/G-Dislioglu/aicos-registry"
    }
  },
  
  "conventions": {
    "module_prefix": "M<NN>_<name> — organisch gewachsene Nummer, nicht an Reihenfolge gebunden",
    "worker_profile_model_ids": "poolState.ts POOL_MODEL_MAP ist source of truth, workerProfiles.ts hält Drift-Warnung-Header",
    "bridge_auth": "opus_token für /api/builder/opus-bridge/* und /api/context/*",
    "docs_vs_container": "Dockerfile Runtime-Stage kopiert nur server/ + client/dist — docs/ und Root-Files sind NICHT im Container (siehe F11-Followup)"
  }
}
```

## Datenquellen und Ableitungslogik

### `modules`

Quelle: `client/src/modules/M*` Verzeichnisse.

- `path`: direkter Verzeichnispfad
- `purpose`: aus einer neuen `MODULE.md` pro Modul **oder** aus dem ersten Kommentar-Block der `index.ts`, falls Kommentar `/** PURPOSE: ... */`. Fallback: leer, dann muss der Module-Betreuer nachziehen.
- `main_exports`: Re-Exports aus `index.ts` des Moduls, per Regex extrahiert (`export { X, Y, Z } from`)
- `depends_on`: andere Module die in den Imports auftauchen (`import ... from '../M<NN>_*'`)
- `used_by`: invers aus `depends_on` aller anderen Module berechnet
- `file_count`: `readdirSync` rekursiv, nur `.ts`/`.tsx`

**Offene Frage:** wird `purpose` pro Modul als eigene kleine MD-Datei gepflegt (Aufwand einmalig ca. 5 Modul×2 Min = 10 Min), oder reicht Kommentar-Block-Extraktion? Meine Neigung: `MODULE.md` pro Modul, weil das auch von Menschen sauber gelesen werden kann.

### `routes`

Quelle: `server/src/index.ts` Router-Mounts.

- Parse aller `app.use('<base>', <router>)` Aufrufe
- Für jeden Router: suche die `<router>Router.post|get|put|delete`-Aufrufe in der Mount-Datei und sammle Endpoint-Namen
- Subrouter: wenn Mount-Datei weitere Router importiert und mountet (wie `builder.ts` → `opusBridgeRouter`), rekursiv.

### `db_tables`

Quelle: `server/src/schema/builder.ts` plus evtl. `server/src/schema/product.ts` (falls existiert — sonst Produkt-Tabellen aus Supabase-Schema).

- Parse aller `pgTable('<name>', ...)` Aufrufe
- Gruppierung nach Namens-Präfix: `builder_*` → builder_stack, `session_*` oder `user_*` → product_stack
- Weitere Gruppen bei Bedarf (z.B. `pool_state` ist eine Ausnahme vom `builder_`-Präfix und muss explizit zugeordnet werden — das ist ein Config-File im Digest selbst, nicht aus dem Code ableitbar)

**Wichtig:** der Digest bewertet nicht den Zweck der Tabellen jenseits der Präfix-Gruppierung. Ein Satz pro Gruppe, keine Pro-Tabellen-Prosa.

### `cross_repos`

Statisches Config-Feld im Broker-Code. Kein Auto-Discovery. Wenn Gürcan ein viertes Repo aufnimmt (Bluepilot), kommt ein neuer Eintrag dazu.

### `conventions`

Statisches Config-Feld. Dokumentiert Dinge die im Code nicht selbsterklärend sind, aber wichtig für Verständnis:

- Module-Nummerierungs-Konvention
- Auth-Tokens welches-für-was
- Dockerfile-Mismatch (wichtig nach F11!)
- Worker-Profile vs. Pool-State-Trennung

## Implementierung — geschätzter Aufwand

Neue Datei `server/src/lib/architectureDigest.ts` mit:

- `buildModulesDigest()` — lokal `readdirSync` über `client/src/modules/`, oder falls im Container via GitHub Contents API, plus Index-Zugriff
- `buildRoutesDigest()` — Parse `server/src/index.ts`
- `buildDbTablesDigest()` — Parse `server/src/schema/builder.ts`
- Statische Config-Blöcke für cross_repos + conventions
- Caching mit 5-Min-TTL (Architektur ändert sich nicht oft, aber Caching macht wiederholte Calls günstig)

Erweiterung in `server/src/routes/contextBroker.ts`:

- Ein neuer Handler `contextBrokerRouter.post('/architecture-digest', ...)` der `buildArchitectureDigest()` aus der neuen Lib-Datei aufruft
- Optional `sections`-Filter im Request-Body

**Aufwand geschätzt:** 60-90 Min Copilot-Arbeit. Module-Parsing ist der aufwendigste Teil, der Rest ist Regex + statische Config.

**Optional:** einmaliger Aufwand für Gürcan, `MODULE.md` in die 5-8 Hauptmodule zu legen (ca. 15-20 Min). Kann aber auch nachträglich passieren.

## Akzeptanzkriterium

Drei Live-Proben:

1. **Alle Sections:** `POST /api/context/architecture-digest` ohne Body. Erwartet: vollständige Response mit allen vier Sektionen plus conventions. Jede Section non-leer, sinnvolle Werte.

2. **Section-Filter:** `{sections: ["routes"]}`. Erwartet: nur `generatedAt`, `repoHead`, `routes` im Response, andere Felder fehlen oder sind null.

3. **Caching:** zwei aufeinanderfolgende Calls innerhalb von 5 Min sollten den zweiten aus Cache liefern (messbar durch Response-Zeit, aber das ist optional für die Akzeptanz — wichtiger ist identisches `generatedAt`).

## Nutzen für die verschiedenen KIs

**Claude (ich):** kann am Session-Anfang nach `session-start` direkt `architecture-digest` abrufen und weiß sofort wo was lebt. Spart Such-Roundtrips.

**Maya-Builder-Direktorin:** kann bei Task-Start den Digest in den Prompt integrieren. Keine halluzinierten Modul-Namen mehr („M22 soll geändert werden" wenn es nur M01-M16 gibt).

**Worker-KIs:** profitieren indirekt — Maya baut bessere Worker-Prompts mit Digest-Kontext, Worker sehen präzisere Scope-Listen.

**Soulmatch-Produkt-Personas (Stella, Kael usw.):** profitieren **nicht direkt**. Sie haben ihr eigenes Gedächtnis-Pattern (`session_memories`) für User-Beziehungen. F12 ist ausdrücklich nicht für sie.

## Nicht-Scope (zur Klarheit)

- **Kein** MCP-Protokoll-Export (das bleibt F13 oder später)
- **Keine** Write-Operationen (Digest wird generiert, nicht editiert)
- **Kein** Versioning des Digests (immer nur aktueller Stand)
- **Keine** Cross-Repo-Introspektion (maya-core und aicos-registry werden nur verlinkt, nicht eingelesen — das wäre ein eigener Block F13 oder mehr)
- **Keine** LLM-basierte Zusammenfassung von Code (deterministisch bleiben)

## Session-Tracking

- **S35-F11 (2026-04-20 abends):** F12-Spec geschrieben, Umsetzung verschoben.

## Entscheidungen der Umsetzung

- **Module purpose:** Kommentar-Extraktion aus `client/src/modules/M*/index.ts` via `/** PURPOSE: ... */`, mit Fallback `no purpose documented — add /** PURPOSE: ... */ in index.ts`.
- **sections-Filter:** aktiv. Unbekannte Section-Namen werden mit Warn-Log ignoriert, `generatedAt` und `repoHead` bleiben immer in der Response.
- **conventions-Block:** bleibt Teil desselben Endpoints, damit Architekturorientierung in einem Call ankommt.

## Umsetzungsnotiz

- Modul-Abhängigkeiten werden nicht nur aus `index.ts`, sondern aus allen `.ts`/`.tsx`-Dateien pro Modul abgeleitet, weil die echten Cross-Module-Imports in Soulmatch dort leben.
- Route-Basen folgen den realen `app.use(...)`-Mounts in `server/src/index.ts`; Beispielpfade in dieser Spec sind keine Runtime-Wahrheit.
- Datei- und Tree-Zugriffe laufen lokal-first mit GitHub-fallback, damit der Digest sowohl in Dev als auch im Runtime-Container funktioniert.

## Implementierungsstand

- Neuer Helper in `server/src/lib/architectureDigest.ts`
- Neuer Endpoint `POST /api/context/architecture-digest` im bestehenden Context-Broker
- 5-Min-In-Memory-Cache je Section-Satz
- Lokal-first mit GitHub-fallback fuer Dateien und Repo-Tree, damit Dev und Runtime-Container denselben Digest liefern koennen
