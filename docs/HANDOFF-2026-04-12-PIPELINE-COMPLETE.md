# HANDOFF — Builder Pipeline Complete + Agent Habitat Plan
# Stand: 12.04.2026, ~21:00

## WAS HEUTE GEBAUT WURDE (9 Dateien, ~750 neue Zeilen, 6 Commits)

### Pipeline komplett verdrahtet + verifiziert:
```
Scout (Pool) → Destillierer (Pool) → Council (Pool, Maya-moderiert)
  → Worker (Pool, Memory-aware) → TSC Verify → GitHub Push → Deploy
```

### Commits:
- `89e8a75` — TSC Compile Check vor GitHub-Push
- `569e186` — Frontend Destillierer-Pool-Button + Worker-Memory-Context
- `5e87b51` — Memory-Bus + Destillierer-Pool (Backend)
- `e99600e` — Phase 3: Worker-Pool-Verdrahtung
- `7a395ff` — Phase 2: Council-Pool-Verdrahtung + Maya-Moderation
- `814bc1b` — Phase 1: Scout-Pool-Verdrahtung + Destillierer

### Neue/geänderte Dateien:
- `server/src/lib/memoryBus.ts` (NEU, 244Z) — rollenspez. Kontexte
- `server/src/lib/opusBridgeController.ts` (831Z) — volle Pipeline + TSC Verify
- `server/src/lib/opusDistiller.ts` (221Z) — 2-KI Destillierer mit Crush
- `server/src/lib/opusScoutRunner.ts` (232Z) — Pool-basierte Scouts
- `server/src/lib/opusRoundtable.ts` (578Z) — Maya-Moderator-Hook
- `server/src/lib/opusWorkerSwarm.ts` (826Z) — Worker-Pool + Memory-Context
- `server/src/lib/poolState.ts` (78Z) — 5-Pool-State (inkl. distiller)
- `server/src/routes/builder.ts` — Distiller-Pool Endpoint
- `client/src/modules/M16_builder/ui/MayaDashboard.tsx` — 5. Pool-Button

### Live-Test: 2x erfolgreich, Patches generiert, ~2min/Task

---

## 5-POOL-ARCHITEKTUR

| Pool        | Select | Frontend-Farbe | Backend-Verdrahtung |
|-------------|--------|---------------|---------------------|
| Maya        | Single | Violett       | Chat nutzt Modell   |
| Council     | Multi  | Gold          | buildCouncilParticipants() |
| Destillierer| Multi  | Orange #f59e0b| Pool-basiert (Extractor+Reasoner) |
| Worker      | Multi  | Cyan          | remapWorkersToPool() |
| Scout       | Multi  | Gruen         | getAllFromPool round-robin |

localStorage: `maya-pools-v2` (mit Migration fuer distiller)
Server: `poolState.ts` activePools (in-memory)
Sync: POST /maya/pools bei jeder Aenderung

---

## ZWEI EXECUTOR-PFADE

### /opus-task (Schnellmodus)
- opusTaskOrchestrator.ts
- Deterministischer Scope, JSON Full-File Overwrite
- KEIN Scout, KEIN Destillierer, KEIN Council
- ~30-90s, ~$0.02/Task
- Fuer: einfache Tasks, kleine Aenderungen

### /build (Pipeline-Modus)
- opusBuildPipeline.ts → executeTask() in opusBridgeController.ts
- Scout→Destillierer→Council→Worker→TSC Verify
- Memory-Bus, Maya-Moderation, Crush-Operatoren
- ~2min, teurer, intelligenter
- Fuer: komplexe Tasks, multi-file, Architektur

### ENTSCHEIDUNG: Maya routet selbst
- Einfache Tasks → /opus-task (Schnellmodus)
- Komplexe Tasks → /build (Pipeline)
- User sagt "deep mode" / "pipeline" → /build
- Routing in builderFusionChat.ts, Intent-Classifier entscheidet

---

## TSC VERIFY (opusBridgeController.ts)

- runTscCompileCheck() — VOR GitHub-Push
- Patches temporaer auf Disk → tsc --noEmit / tsc -b
- TS5107/TS5101 Deprecation-Warnings gefiltert
- Bei Fehler: status=validation_failed, kein Push
- Originals immer restauriert (finally-Block)
- ChatPool-Nachricht mit Fehlern fuer Transparenz

---

## MEMORY-BUS (memoryBus.ts)

| Rolle       | Bekommt                                          |
|-------------|--------------------------------------------------|
| Scouts      | Project DNA + Graph + Error Cards + letzte Tasks  |
| Destillierer| Error-Patterns + aehnliche Tasks fuer Crush       |
| Council     | Builder Memory + Worker-Ranking + Entscheidungshist.|
| Worker      | Council-Begruendung + Error Cards (VERDRAHTET ✅)  |
| Maya        | Gesamtueberblick                                 |

---

## AGENT HABITAT KONZEPT (aus ChatGPT-Session)

Agent Habitat = persistenter, governter lokaler Operationsraum pro KI-Agent.
Vollstaendige Spec liegt als ChatGPT-Export vor (Dokument 2 im Handoff-Chat).

### Was davon JETZT gebaut werden soll:
- Agent Profiles DB-Tabelle (builder_agent_profiles)
- Post-Task-Loop der Profile automatisch aktualisiert
- buildAgentBrief() fuer kompakten Agent-Kontext im Prompt

### Was davon SPAETER kommt:
- Reflection Chamber
- Promotion Gate
- Governance/Containment
- Relationship Graph
- Active Brief Compiler (vollstaendig)

---

## AUFRAEUMEN — VERALTETE/STALE DOCS

### Zu aktualisieren:
1. `docs/SESSION-STATE.md` — steht auf S13/11.04, kennt Pipeline nicht
2. `docs/opus-bridge-v4-spec.md` — Status "ENTWURF", Terminologie weicht ab
3. `docs/provider-specs.md` — letzte Pruefung 09.04, evtl. refresh noetig

### Zu archivieren (in docs/archive/ verschieben):
- `docs/OPUS-BRIDGE-HANDOFF-2026-04-06.md`
- `docs/OPUS-BRIDGE-HANDOFF-2026-04-06-S2.md`
- `docs/OPUS-BRIDGE-HANDOFF-2026-04-08-S4.md`
- `docs/OPUS-BRIDGE-HANDOFF-2026-04-08-S5.md`
- `docs/OPUS-BRIDGE-HANDOFF-2026-04-08-S6.md`
- `docs/OPUS-BRIDGE-HANDOFF-2026-04-08-S7.md`
- `docs/OPUS-BRIDGE-HANDOFF-2026-04-09-S9.md`
- `docs/S2-STATUS.md`
- `docs/handoff-2026-04-05-builder.md`
- `docs/DECOMPOSER-TEST.md`

### Zu pruefen ob noch aktuell:
- `docs/MAYA-BUILDER-AUSBAU-BLUEPRINT-v2.md` (11.04)
- `docs/MAYA-BUILDER-CONTRACT.md` (11.04, "Entwurf, noch nicht im Runtime")
- `docs/BUILDER-STUDIO-SPEC-v3.3.md`
- `docs/FUSION-ENGINE-SPEC.md`
- `docs/WORKER-SWARM-SPEC-v1.0.md`

---

## PRIORISIERTER PLAN — REIHENFOLGE

### Schritt 1: Aufraeumen + Docs (30 Min)
- SESSION-STATE.md aktualisieren (Pipeline, 5 Pools, TSC Verify, zwei Modi)
- opus-bridge-v4-spec.md Status auf "IMPLEMENTIERT" + Mapping zur Realitaet
- Alte Handoffs in docs/archive/ verschieben
- Diesen Handoff als docs/HANDOFF-2026-04-12-PIPELINE-COMPLETE.md committen

### Schritt 2: Maya-Routing Schnell vs. Pipeline (30 Min)
- In builderFusionChat.ts: Intent-Classifier entscheidet Modus
- multi-file / architektonisch / "deep mode" → /build (Pipeline)
- einfacher Fix / kleine Aenderung → /opus-task (Schnellmodus)
- Maya kann waehrend Task eskalieren wenn es komplex wird
- Datei: server/src/lib/builderFusionChat.ts

### Schritt 3: Council-Rollen (15 Min)
- 3 Denk-Rollen round-robin auf Council-Members:
  Architekt (Struktur), Skeptiker (Risiken), Pragmatiker (schnellste Loesung)
- 20 Zeilen in buildCouncilParticipants() in opusBridgeController.ts
- Kostet fast nichts an Tokens, bessere Diskussionen

### Schritt 4: Agent Profiles + Post-Task-Loop (1 Abend)
- DB-Tabelle builder_agent_profiles:
  agent_id, role, strengths, weaknesses, failure_patterns,
  file_experience, task_count, avg_quality, last_reflection
- Post-Task-Loop: nach jedem Worker-Task Profil updaten
  (Erfolg/Fehler, Datei-Erfahrung, Qualitaet)
- Gespeist aus builder_worker_scores + Error Cards
- Datei: server/src/lib/agentHabitat.ts (NEU)
- Schema: server/src/schema/builder.ts (neue Tabelle)

### Schritt 5: Agent Brief Compiler (30 Min)
- buildAgentBrief(agentId, taskGoal, files) → kompakter Kontext
- Liest Agent-Profil + Error Cards + file_experience
- Output: "Du bist GLM-Turbo. Staerke: X. Schwaeche: Y.
  An providers.ts 3x gearbeitet, 2x OK. Bekannter Fehler: Z."
- In Worker-Prompt und Council-Prompt injizieren
- Datei: server/src/lib/agentHabitat.ts

### Schritt 6: Auto-Retry bei TSC-Fehler (30 Min)
- Wenn TSC Verify fehlschlaegt: Fehlermeldung + Patches an Worker
- "Fix diesen Kompilierungsfehler" — max 1 Retry
- Pattern existiert in opusBuildPipeline.ts (retryOnFailure)
- An neuen TSC-Check anbinden

### Schritt 7: Pipeline-Monitoring im UI (1 Abend, optional)
- Live-Fortschritt im Maya-Chat: Scout laeuft... Council Runde 1/3...
- ChatPool-Messages live pollen oder SSE-Stream
- Nicht kritisch, aber gute UX

---

## TECHNISCHE DETAILS

Repo: github.com/G-Dislioglu/soulmatch, Branch main
Live: soulmatch-1.onrender.com/maya
Auth: token=builder-2026-geheim, opus_token=opus-bridge-2026-geheim
Push: POST /api/builder/opus-bridge/git-push?opus_token=...
TS-Check: cd server && npx tsc --noEmit && cd ../client && npx tsc -b
(TS5107/TS5101 Deprecation-Warnings sind OK, keine echten Fehler)

---

## IM NAECHSTEN CHAT

Handoff pasten, dann in dieser Reihenfolge:
1. Docs aufraeumen + SESSION-STATE.md updaten + alte Handoffs archivieren
2. Maya-Routing (Schnell vs. Pipeline)
3. Council-Rollen
4. Agent Profiles + Post-Task-Loop
5. Agent Brief Compiler
