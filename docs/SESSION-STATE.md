# SESSION-STATE — Stand 13.04.2026, S18

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
| `/maya` | MayaDashboard | Voll funktional, Cancel+Delete Buttons |
| `/builder` | BuilderStudioPage | Token-Bug gefixt, Tasks laden, Maya Chat, Cancel+Delete |

Guercan bevorzugt `/builder` — perspektivisch alle Maya-Features dorthin konsolidieren.
Token-Logik: `localStorage('maya-token')` als Fallback, validiert gegen `/maya/context`.

## S18 Fixes (13.04.2026)

| # | Fix |
|---|-----|
| 1 | `/maya/action` Proxy Auth: `OPUS_BRIDGE_SECRET` + `opus_token` param |
| 2 | Cascade Delete: alle 8 FK-Tabellen |
| 3 | `cancel` Action im Override-Endpoint |
| 4 | `DELETE /api/builder/tasks/:id` Endpoint (fehlte) |
| 5 | Cancel + Delete Buttons in `/maya` + `/builder` |
| 6 | `/builder` Token-Validation via `/maya/context` |
| 7 | `/builder` Initial Load (Tasks + Files nach Auth) |
| 8 | `/builder` localStorage Token-Fallback + Save |
| 9 | Gemini → Maya Chat Umbenennung |
| 10 | Stale-Detector: 10 Statuse statt 3 |

## Autonome Systeme

| System | Status |
|--------|--------|
| Stale-Detector | Aktiv, 5-Min-Intervall, 10 Statuse |
| Cancel-System | Override-EP + Maya-Intent + UI-Buttons |
| Distiller Intent-Treue | Wortlaut-Anker + Duplikat-Check (S17) |
| Auto-Index-Regen | Problematisch — erzeugt Tasks die haengenbleiben |

## Aktive Entscheidungen

1. `/opus-task` = Schnellmodus, `/build` = Pipeline-Modus
2. Full-File JSON Overwrite als einziger Change-Contract
3. SEARCH/REPLACE in `/push` bleibt fuer >50KB Dateien
4. Keine Free-Modelle (OpenRouter `:free` verboten)
5. Preise/Specs: `docs/provider-specs.md` pruefen
6. TSC Verify ist Pflicht vor jedem Push
7. `/builder` ist die bevorzugte UI

## Offene Probleme (priorisiert)

### Hoch
1. **File-Reader → GitHub API:** @READ im Council schlaegt fehl auf Render (kein TS auf Disk)
2. **Auto-Index-Regen:** Erzeugt push_candidate-Tasks die haengenbleiben

### Mittel
3. Task-Detail-View: "undefined" in `/builder`
4. Ausfuehren-Button encoding
5. `/migrate` Runtime-Fix
6. orchestrateTask entfernen
7. Pipeline-Monitoring UI

### Perspektivisch
8. Nachdenker-Aggregation
9. `/builder` + `/maya` komplett konsolidieren
10. AICOS-Card-Integration

## Technische Details

- **Repo:** github.com/G-Dislioglu/soulmatch, Branch main
- **Live:** soulmatch-1.onrender.com
- **Auth:** token=builder-2026-geheim, opus_token=opus-bridge-2026-geheim
- **Push:** POST /api/builder/opus-bridge/push?opus_token=...
- **TS-Check:** `cd server && npx tsc --noEmit && cd ../client && npx tsc -b`
- **Sequential Push:** 60-75s Delay, 50KB per-file Limit
- **Task-DB nach S18:** ~50 Tasks, alle done
