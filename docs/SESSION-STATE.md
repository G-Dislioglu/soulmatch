# SESSION-STATE — Stand 13.04.2026, S20

## Kanonische Builder-Wahrheit

### Zwei Executor-Pfade (Maya routet automatisch)

| Pfad | Endpoint | Wann | Laufzeit | Kosten |
|------|----------|------|----------|--------|
| **Schnellmodus** | `/opus-task` | Einfache Tasks, kleine Aenderungen | ~30-90s | ~$0.02 |
| **Pipeline-Modus** | `/build` | Komplexe Tasks, Multi-File, Architektur | ~2min | ~$0.15-0.30 |

Maya entscheidet via `determineBuildMode()` in `builderFusionChat.ts`.

### Pipeline-Modus: Volle Kette
```
Scout (Pool) → Destillierer (Pool) → Council (Pool, Maya-moderiert)
  → Worker (Pool, Memory-aware, Agent Brief) → TSC Verify [Auto-Retry] → GitHub Push → Deploy
  → Nachdenker: updateAgentProfiles() + reflectOnTask() + buildAgentBrief()
```

### Schnellmodus: Direkt
```
Instruction → Scope Resolver → Worker → JSON Overwrite → Push → Deploy
```

## UI: Zwei Builder-Seiten

| Route | Seite | Status |
|-------|-------|--------|
| `/maya` | MayaDashboard | Voll funktional, Cancel+Delete Buttons, Pool-Config, Memory |
| `/builder` | BuilderStudioPage | Token-Bug gefixt, Tasks laden, Maya Chat, Cancel+Delete |

Guercan bevorzugt `/builder` — perspektivisch alle Maya-Features dorthin konsolidieren.
Token-Logik: `localStorage('maya-token')` als Fallback, validiert gegen `/maya/context`.

## S19 Ergebnisse (13.04.2026)

### Docs + Cleanup
| # | Aktion | Status |
|---|--------|--------|
| 1 | CLAUDE.md Drift gefixt (Persistence, Provider, Module, Builder) | ✅ Deployed |
| 2 | STATE.md auf S18-Stand (Header + Bloecke) | ✅ Deployed |
| 3 | 14 tote Code-Dateien geloescht | ✅ Verifiziert |
| 4 | 6 Docs archiviert + 2 Artefakte geloescht | ✅ Verifiziert |

### Pipeline-Tests
| # | Test | Ergebnis |
|---|------|----------|
| 5 | Schnellmodus: getRecentCompletedTasks (builderMetrics.ts) | ✅ Deployed, Commit 5524972 |
| 6 | GET /metrics Endpoint (opusBridge.ts) | ✅ Manuell gepusht nach Council-Deadlock |
| 7 | FIND_PATTERN Support im Roundtable | ✅ Fix deployed (local grep + GitHub Search API) |
| 8 | Pipeline-Test: /pipeline-health Endpoint | ❌ Worker SEARCH/REPLACE fehlerhaft auf grosser Datei |

### Pipeline-Erkenntnisse
- **Schnellmodus funktioniert zuverlaessig** fuer kleine Dateien (<10KB)
- **Pipeline-Modus (Council)** hat zwei behobene/bekannte Probleme:
  1. ~~FIND_PATTERN nicht implementiert~~ → **Gefixt**: local grep + GitHub Code Search Fallback
  2. **Worker SEARCH/REPLACE ungenau auf grossen Dateien** (>20KB): Minimax produziert falsche SEARCH-Bloecke
- **Status-Tracking-Bug**: Task-Status bleibt auf "scouting" wenn Pipeline intern weiterlaeuft
- **Chat→Build**: Erzeugt ACTION-Bloecke die im UI als Buttons gerendert werden (designed flow). Auto-Execute nur bei intent=task Klassifikation (konservativ)

## Autonome Systeme

| System | Status |
|--------|--------|
| Stale-Detector | Aktiv, 5-Min-Intervall, 10 Statuse |
| Cancel-System | Override-EP + Maya-Intent + UI-Buttons |
| Distiller Intent-Treue | Wortlaut-Anker + Duplikat-Check (S17) |
| Auto-Index-Regen | Feuert nach jedem /git-push |
| FIND_PATTERN | **NEU S19**: local grep + GitHub Code Search API Fallback |

## Aktive Entscheidungen

1. `/opus-task` = Schnellmodus, `/build` = Pipeline-Modus
2. Full-File JSON Overwrite als einziger Change-Contract
3. SEARCH/REPLACE in `/push` bleibt fuer >50KB Dateien
4. Keine Free-Modelle (OpenRouter `:free` verboten)
5. Preise/Specs: `docs/provider-specs.md` pruefen
6. TSC Verify ist Pflicht vor jedem Push
7. `/builder` ist die bevorzugte UI
8. Grosse Dateien (>20KB) besser ueber `/git-push` direkt statt Pipeline

## S20 Ergebnisse (13.04.2026)

### Cleanup + Bug-Fixes
| # | Aktion | Status |
|---|--------|--------|
| 1 | Duplikat POST /cleanup geloescht (alter Endpoint Zeile 1009) | Deployed |
| 2 | FK-Luecke gefixt: builderMemory + sourceTaskId Cascade | Deployed |
| 3 | Resilientes Cleanup: per-task try/catch + raw SQL fallback | Deployed |
| 4 | 363 alte Tasks geloescht: DB sauber (503 done, 0 blocked) | Verifiziert |
| 5 | Status-Tracking-Bug gefixt: updateTaskStatus() Helper + 5 Phasen-Updates | Deployed |
| 6 | Stale-Detector: council Status (15min Threshold) hinzugefuegt | Deployed |
| 7 | Fuzzy Line Matching fuer SEARCH/REPLACE auf grossen Dateien (70% Threshold) | Deployed |

### Status-Phasen (NEU S20)
```
scouting -> planning -> council -> swarm -> applying -> done/error
```
Jede Phase wird live in builder_tasks.status geschrieben. Stale-Detector kennt alle Phasen.

## Offene Probleme (priorisiert)

### Hoch
1. **Worker SEARCH/REPLACE auf grossen Dateien**: ~~Minimax produziert falsche Anker~~ → **Mitigiert S20**: Fuzzy Line Matching (70% Threshold) als Fallback wenn exakter Match fehlschlaegt. Muss in Praxis getestet werden.

### Mittel
2. `/builder` + `/maya` Konsolidierung (beide >50KB, braucht Copilot)
3. Chat-Intent-Klassifizierung zu konservativ (oft 'chat' statt 'task')
4. Task-Detail-View "undefined" in `/builder`
5. `/migrate` Runtime-Fix
6. orchestrateTask entfernen (Legacy)

### Perspektivisch
7. Nachdenker-Aggregation
8. Pipeline-Monitoring UI (Live-Fortschritt im Chat)
9. AICOS-Card-Integration

## Neue Endpoints (S19-S20)

| Endpoint | Methode | Was |
|----------|---------|-----|
| `/metrics` | GET | getTaskStats() + getRecentCompletedTasks() |
| `/cleanup` | POST | Bulk-Delete (dryRun, statuses-Filter, resilient cascade) |

## Technische Details

- **Repo:** github.com/G-Dislioglu/soulmatch, Branch main
- **Live:** soulmatch-1.onrender.com
- **Auth:** token=builder-2026-geheim, opus_token=opus-bridge-2026-geheim
- **Push:** POST /api/builder/opus-bridge/push?opus_token=...
- **Git-Push:** POST /api/builder/opus-bridge/git-push?opus_token=... (supports delete:true)
- **TS-Check:** `cd server && npx tsc --noEmit && cd ../client && npx tsc -b`
- **Sequential Push:** 60-75s Delay, 50KB per-file Limit (Action), unbegrenzt via /git-push
