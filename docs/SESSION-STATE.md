# SESSION-STATE — Stand 12.04.2026, S14 (Abend)

## Kanonische Builder-Wahrheit

### Zwei Executor-Pfade (Maya routet automatisch)

| Pfad | Endpoint | Wann | Laufzeit | Kosten |
|------|----------|------|----------|--------|
| **Schnellmodus** | `/opus-task` | Einfache Tasks, kleine Aenderungen | ~30-90s | ~$0.02 |
| **Pipeline-Modus** | `/build` | Komplexe Tasks, Multi-File, Architektur | ~2min | ~$0.15-0.30 |

Maya entscheidet via `determineBuildMode()` in `builderFusionChat.ts`:
- Einfacher Fix / kleine Aenderung / low risk → `/opus-task` (Quick)
- Multi-File / Architektur / high risk / taskType S oder C / User sagt "deep mode" → `/build` (Pipeline)
- 7 Routing-Kriterien, deterministisch, kein LLM-Call

### Pipeline-Modus: Volle Kette
```
Scout (Pool) → Destillierer (Pool) → Council (Pool, Maya-moderiert)
  → Worker (Pool, Memory-aware, Agent Brief) → TSC Verify [→ Auto-Retry] → GitHub Push → Deploy
```

### Schnellmodus: Direkt
```
Instruction → Scope Resolver → Worker → JSON Overwrite → Push → Deploy
```

---

## 5-Pool-Architektur

| Pool | Select | Frontend-Farbe | Backend-Verdrahtung |
|------|--------|----------------|---------------------|
| Maya | Single | Violett | Chat nutzt gewaehltes Modell |
| Council | Multi | Gold | `buildCouncilParticipants()` + Rollen |
| Destillierer | Multi | Orange #f59e0b | Pool-basiert (Extractor+Reasoner) |
| Worker | Multi | Cyan | `remapWorkersToPool()` |
| Scout | Multi | Gruen | `getAllFromPool` round-robin |

- **localStorage:** `maya-pools-v2` (mit Migration fuer distiller)
- **Server:** `poolState.ts` activePools (in-memory)
- **Sync:** POST /maya/pools bei jeder Aenderung

---

## Council-Rollen (NEU S14)

3 Denk-Perspektiven, round-robin auf Council-Members verteilt:

| Rolle | Fokus |
|-------|-------|
| **Architekt** | Struktur, Abstraktionen, Erweiterbarkeit |
| **Skeptiker** | Risiken, Edge-Cases, versteckte Abhaengigkeiten |
| **Pragmatiker** | Schnellste korrekte Loesung, Pattern-Wiederverwendung |

Definiert in `COUNCIL_ROLES` in `opusBridgeController.ts`.
Injiziert ueber `strengths`-Feld → `=== DEINE STAERKE ===` Prompt-Block.

---

## Agent Habitat (NEU S14)

### DB-Tabelle: `builder_agent_profiles`
- `agent_id` (PK), `role`, `strengths[]`, `weaknesses[]`, `failure_patterns[]`
- `file_experience` (JSON: pro Datei success/fail/lastUsed)
- `task_count`, `success_count`, `avg_quality`
- `last_reflection`, `created_at`, `updated_at`
- **ACHTUNG:** Tabelle muss via `npm run db:push` erstellt werden!

### Post-Task-Loop
- Nach jedem Worker-Task: `updateAgentProfiles()` aktualisiert Profil
- Quality >= 90 → Staerke notiert, < 60 → Schwaeche notiert
- Running Average fuer avg_quality, failure_patterns (max 10)
- Hook in `opusBridgeController.ts` nach `saveWorkerScores()`

### Agent Brief Compiler
- `buildAgentBrief(agentId, taskGoal, targetFiles)` → kompakter Kontext-String
- Injiziert in Worker-Prompt als `=== AGENT BRIEF ===` Block
- Enthaelt: Identity, Erfolgsrate, Staerken, Schwaechen, Datei-Erfahrung, Error Cards
- Bei erstem Einsatz (kein Profil): wird uebersprungen

### Modul: `server/src/lib/agentHabitat.ts` (281 Zeilen)
Exports: `updateAgentProfiles`, `buildAgentBrief`, `getAgentProfile`, `getAllAgentSummaries`

---

## TSC Verify + Auto-Retry

### TSC Verify
- `runTscCompileCheck()` in `opusBridgeController.ts` — VOR GitHub-Push
- Patches temporaer auf Disk → `tsc --noEmit` / `tsc -b`
- TS5107/TS5101 Deprecation-Warnings gefiltert
- Bei Fehler: Auto-Retry (1 Versuch), dann `status=validation_failed`

### Auto-Retry (NEU S14, in Deployment)
- Bei TSC-Fehler: Fehler + Patches an einen Worker senden
- Worker fixt nur die Compile-Fehler (keine neuen Features)
- Reparierte Patches werden gemerged, TSC nochmal geprueft
- Max 1 Retry-Versuch
- Status: Code geschrieben, wird gerade von Copilot TSC-gefixt

---

## Memory-Bus (memoryBus.ts)

| Rolle | Bekommt |
|-------|---------|
| Scouts | Project DNA + Graph + Error Cards + letzte Tasks |
| Destillierer | Error-Patterns + aehnliche Tasks fuer Crush |
| Council | Builder Memory + Worker-Ranking + Entscheidungshistorie |
| Worker | Council-Begruendung + Error Cards + **Agent Brief** |
| Maya | Gesamtueberblick |

---

## Aktive Entscheidungen

1. `/opus-task` = Schnellmodus, `/build` = Pipeline-Modus — Maya routet selbst
2. Full-File JSON Overwrite als einziger Change-Contract (beide Modi)
3. SEARCH/REPLACE in `/push` bleibt als Legacy-Modus, nicht kanonisch
4. MiniMax M2.7 (nicht M2.5)
5. Keine Free-Modelle (OpenRouter `:free` Suffix explizit verboten)
6. Preise/Specs: immer `docs/provider-specs.md` pruefen
7. TSC Verify ist Pflicht vor jedem Push (Pipeline-Modus)
8. Council-Rollen: Architekt/Skeptiker/Pragmatiker (round-robin)
9. Agent Profiles: automatisches Lernen nach jedem Task

---

## S14 Ergebnisse (12.04.2026)

### Commits (chronologisch)
- Pipeline-Verdrahtung (6 Commits vom Vortag, im Handoff dokumentiert)
- Docs aufgeraeumt: SESSION-STATE S14, v4-Spec IMPLEMENTIERT, 10 Handoffs archiviert
- Maya-Routing: `determineBuildMode()`, Quick vs Pipeline, Retry umgebaut
- Council-Rollen: Architekt/Skeptiker/Pragmatiker round-robin
- Agent Profiles: Schema + agentHabitat.ts + Post-Task-Hooks
- Agent Brief: `buildAgentBrief()` in Worker-Prompt injiziert
- TSC Auto-Retry: Code fertig, Deployment in Arbeit

### Neue Dateien S14
- `server/src/lib/agentHabitat.ts` (NEU, 281Z)
- `docs/archive/` (10 archivierte Handoffs)

### Geaenderte Dateien S14
- `server/src/lib/builderFusionChat.ts` — Maya-Routing, Legacy runDialogEngine entfernt
- `server/src/lib/opusBridgeController.ts` — Council-Rollen + Agent-Hooks + TSC Auto-Retry
- `server/src/lib/opusWorkerSwarm.ts` — Agent Brief in Worker-Prompt
- `server/src/schema/builder.ts` — `builder_agent_profiles` Tabelle
- `docs/SESSION-STATE.md` — S14
- `docs/opus-bridge-v4-spec.md` — Status IMPLEMENTIERT + Terminologie-Mapping

---

## Offene Probleme (ehrlich)

1. **DB-Migration noetig** — `npm run db:push` fuer `builder_agent_profiles` Tabelle
2. **TSC Auto-Retry** — Code geschrieben, GitHub Action lehnt noch ab (TSC-Fehler in meinem Code, Copilot fixt)
3. **10 alte Handoffs** — Kopien in archive/, Originale noch nicht geloescht (`git rm` noetig)
4. **Pipeline-Monitoring UI fehlt** — kein Live-Fortschritt im Chat (naechster Schritt)
5. **Staging-Branch fehlt** — Pipeline pusht direkt auf main
6. **Nachdenker fehlt** — Post-Deploy Quality-Score + Learnings noch nicht implementiert

---

## Naechste Prioritaeten

1. **TSC Auto-Retry fixen** — Copilot arbeitet dran
2. **Pipeline-Monitoring UI** — Live-Fortschritt im Maya-Chat
3. **db:push** — Agent Profiles Tabelle in PostgreSQL erstellen
4. **git rm** — alte Handoff-Originale loeschen
5. **Nachdenker** — Post-Deploy Learnings + Index-Update

---

## Technische Details

- **Repo:** github.com/G-Dislioglu/soulmatch, Branch main
- **Live:** soulmatch-1.onrender.com/maya
- **Auth:** token=builder-2026-geheim, opus_token=opus-bridge-2026-geheim
- **Push:** POST /api/builder/opus-bridge/push?opus_token=...
- **TS-Check:** `cd server && npx tsc --noEmit && cd ../client && npx tsc -b`
- **Deprecation-Filter:** TS5107/TS5101 sind OK, keine echten Fehler
- **Sequential Push Rule:** 60-75s Delay zwischen Pushes (Race Conditions vermeiden)
- **Multi-Chunk Pushes:** Koennen Race Conditions verursachen — grosse Dateien als Single-Chunk pushen
