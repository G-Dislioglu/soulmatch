# SESSION-STATE — Stand 12.04.2026, S14

## Kanonische Builder-Wahrheit

### Zwei Executor-Pfade (Maya routet automatisch)

| Pfad | Endpoint | Wann | Laufzeit | Kosten |
|------|----------|------|----------|--------|
| **Schnellmodus** | `/opus-task` | Einfache Tasks, kleine Änderungen | ~30-90s | ~$0.02 |
| **Pipeline-Modus** | `/build` | Komplexe Tasks, Multi-File, Architektur | ~2min | ~$0.15-0.30 |

Maya entscheidet via Intent-Classifier in `builderFusionChat.ts`:
- Einfacher Fix / kleine Änderung → `/opus-task`
- Multi-File / architektonisch / User sagt "deep mode" / "pipeline" → `/build`
- Maya kann während Task eskalieren wenn Komplexität steigt

### Pipeline-Modus: Volle Kette
```
Scout (Pool) → Destillierer (Pool) → Council (Pool, Maya-moderiert)
  → Worker (Pool, Memory-aware) → TSC Verify → GitHub Push → Deploy
```
- Implementiert in: `opusBridgeController.ts` → `executeTask()`
- Aufgerufen via: `opusBuildPipeline.ts`
- Live-getestet: 2× erfolgreich, Patches generiert, ~2min/Task

### Schnellmodus: Direkt
```
Instruction → Scope Resolver → Worker → JSON Overwrite → Push → Deploy
```
- Implementiert in: `opusTaskOrchestrator.ts`
- Deterministischer Scope via `builderScopeResolver.ts` + `server/data/builder-repo-index.json`
- Change Contract: JSON Full-File-Overwrite

---

## 5-Pool-Architektur

| Pool | Select | Frontend-Farbe | Backend-Verdrahtung |
|------|--------|----------------|---------------------|
| Maya | Single | Violett | Chat nutzt gewähltes Modell |
| Council | Multi | Gold | `buildCouncilParticipants()` |
| Destillierer | Multi | Orange #f59e0b | Pool-basiert (Extractor+Reasoner) |
| Worker | Multi | Cyan | `remapWorkersToPool()` |
| Scout | Multi | Grün | `getAllFromPool` round-robin |

- **localStorage:** `maya-pools-v2` (mit Migration für distiller)
- **Server:** `poolState.ts` activePools (in-memory)
- **Sync:** POST /maya/pools bei jeder Änderung

---

## TSC Verify

- `runTscCompileCheck()` in `opusBridgeController.ts` — läuft VOR GitHub-Push
- Patches temporär auf Disk → `tsc --noEmit` / `tsc -b`
- TS5107/TS5101 Deprecation-Warnings gefiltert (keine echten Fehler)
- Bei Fehler: `status=validation_failed`, kein Push
- Originals immer restauriert (finally-Block)
- ChatPool-Nachricht mit Fehlern für Transparenz

---

## Memory-Bus (memoryBus.ts)

| Rolle | Bekommt |
|-------|---------|
| Scouts | Project DNA + Graph + Error Cards + letzte Tasks |
| Destillierer | Error-Patterns + ähnliche Tasks für Crush |
| Council | Builder Memory + Worker-Ranking + Entscheidungshistorie |
| Worker | Council-Begründung + Error Cards |
| Maya | Gesamtüberblick |

---

## Aktive Entscheidungen

1. `/opus-task` = Schnellmodus, `/build` = Pipeline-Modus — Maya routet selbst
2. Full-File JSON Overwrite als einziger Change-Contract (beide Modi)
3. SEARCH/REPLACE in `/push` bleibt als Legacy-Modus, nicht kanonisch
4. MiniMax M2.7 (nicht M2.5)
5. Keine Free-Modelle (OpenRouter `:free` Suffix explizit verboten)
6. Preise/Specs: immer `docs/provider-specs.md` prüfen
7. TSC Verify ist Pflicht vor jedem Push (Pipeline-Modus)

---

## S14 Ergebnisse (12.04.2026)

### Pipeline komplett verdrahtet + verifiziert (9 Dateien, ~750 neue Zeilen, 6 Commits)

**Commits:**
- `89e8a75` — TSC Compile Check vor GitHub-Push
- `569e186` — Frontend Destillierer-Pool-Button + Worker-Memory-Context
- `5e87b51` — Memory-Bus + Destillierer-Pool (Backend)
- `e99600e` — Phase 3: Worker-Pool-Verdrahtung
- `7a395ff` — Phase 2: Council-Pool-Verdrahtung + Maya-Moderation
- `814bc1b` — Phase 1: Scout-Pool-Verdrahtung + Destillierer

**Neue/geänderte Dateien:**
- `server/src/lib/memoryBus.ts` (NEU, 244Z) — rollenspezifische Kontexte
- `server/src/lib/opusBridgeController.ts` (831Z) — volle Pipeline + TSC Verify
- `server/src/lib/opusDistiller.ts` (221Z) — 2-KI Destillierer mit Crush
- `server/src/lib/opusScoutRunner.ts` (232Z) — Pool-basierte Scouts
- `server/src/lib/opusRoundtable.ts` (578Z) — Maya-Moderator-Hook
- `server/src/lib/opusWorkerSwarm.ts` (826Z) — Worker-Pool + Memory-Context
- `server/src/lib/poolState.ts` (78Z) — 5-Pool-State (inkl. distiller)
- `server/src/routes/builder.ts` — Distiller-Pool Endpoint
- `client/src/modules/M16_builder/ui/MayaDashboard.tsx` — 5. Pool-Button

### DeepSeek Worker-Policy (seit S13)
- Code-Workers: GLM, MiniMax, Qwen, Kimi (DeepSeek entfernt)
- Scout/Review/Chat-Personas: DeepSeek bleibt

### Vorherige Sessions (S10–S13)
- S10: Pipeline v2 verifiziert (4/4 Tasks), 11-Modell-Benchmark, K2 Canonicalization
- S11: /repo-query, Builder-Chat, Memory Runtime-Guard
- S12–S13: Context-Assembler, Operational Context, Gap/Conflict Detection, DeepSeek-Policy

---

## Offene Probleme (ehrlich)

1. **Maya-Routing noch nicht implementiert** — Intent-Classifier fehlt, beide Modi existieren aber Routing ist manuell
2. **Council-Rollen undifferenziert** — alle Council-Members bekommen denselben Prompt
3. **Agent Profiles fehlen** — Worker haben kein Gedächtnis über ihre Stärken/Schwächen
4. **Auto-Retry bei TSC-Fehler fehlt** — bei Compile-Fehler wird abgebrochen statt nachgebessert
5. **Staging-Branch fehlt** — Pipeline pusht direkt auf main
6. **Repo-Index Auto-Update** — `opusIndexGenerator.ts` existiert, feuert nach jedem Push, aber Konsistenz nicht voll verifiziert

---

## Nächste Prioritäten (priorisiert)

1. **Maya-Routing** (30 Min) — Intent-Classifier: Schnell vs. Pipeline
2. **Council-Rollen** (15 Min) — Architekt / Skeptiker / Pragmatiker
3. **Agent Profiles + Post-Task-Loop** (1 Abend) — DB-Tabelle, automatisches Lernen
4. **Agent Brief Compiler** (30 Min) — jeder Agent weiß wer er ist
5. **Auto-Retry bei TSC-Fehler** (30 Min) — Pipeline wird selbstheilend
6. **Pipeline-Monitoring UI** (optional) — Live-Fortschritt im Chat

---

## Technische Details

- **Repo:** github.com/G-Dislioglu/soulmatch, Branch main
- **Live:** soulmatch-1.onrender.com/maya
- **Auth:** token=builder-2026-geheim, opus_token=opus-bridge-2026-geheim
- **Push:** POST /api/builder/opus-bridge/git-push?opus_token=...
- **TS-Check:** `cd server && npx tsc --noEmit && cd ../client && npx tsc -b`
- **Deprecation-Filter:** TS5107/TS5101 sind OK, keine echten Fehler
