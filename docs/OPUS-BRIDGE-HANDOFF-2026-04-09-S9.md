# OPUS-BRIDGE HANDOFF — Stand 09. April 2026, Session 9

## Zusammenfassung

Session 9: Opus-Assist System gebaut (3 neue Endpoints), alle Widersprüche geklärt, Provider-Daten verifiziert, Kontext-Dateien im Repo.

Repo: github.com/G-Dislioglu/soulmatch | Live: soulmatch-1.onrender.com
Route-Prefix: `/api/builder/opus-bridge/`
Auth: `?opus_token=opus-bridge-2026-geheim`

---

## KRITISCH: Zuerst lesen

### Kontext-Dateien im Repo (am Anfang jeder Session lesen!)
- `docs/SESSION-STATE.md` — aktive Entscheidungen, offene Tasks
- `docs/provider-specs.md` — verifizierte Modell-Daten mit Prüfdatum

### Arbeitsregeln
- **Keine Preise/Specs aus Trainingsdaten.** Immer `docs/provider-specs.md` prüfen, bei Daten älter 2 Wochen → Web-Suche.
- **Claude = Obermeister.** Gibt Aufgaben an /opus-task, /benchmark, /worker-direct. Spart Tool-Calls durch Delegation.
- **Nie auf Render-Deploy warten** — weiter zum nächsten Task.
- **Bash-Calls bündeln** — alles in einen Call packen.

---

## Was in S9 gebaut/gefixt wurde

### Neue Endpoints (36 total)
| Endpoint | Was es tut |
|----------|-----------|
| POST /benchmark | N Worker parallel, auto-scored, 1 Call statt 10+ |
| POST /deploy-wait | Pollt Render intern bis live (max 6 Min) |
| POST /opus-task | Komplett-Autopilot: Scope→Swarm→Judge→Push, 1 Call = 1 Feature |

### Neue Dateien
| Datei | Funktion |
|-------|----------|
| opusWorkerRegistry.ts | Single Source of Truth für alle Worker/Meister/Judge |
| opusAssist.ts | Deploy-Wait + Benchmark Funktionen |
| opusTaskOrchestrator.ts | /opus-task Pipeline (7 Phasen) |
| docs/provider-specs.md | Verifizierte Modell-Daten |
| docs/SESSION-STATE.md | Persistenter Session-Kontext |

### Fixes
| Fix | Details |
|-----|---------|
| Token-Limits → 6000 | Alle Worker + Meister |
| ProviderMap Drift | opusBridge.ts nutzt jetzt zentrale Registry |
| Doppel-Swarm Bug | /opus-task nutzt /push direkt statt /build |
| Judge → Gemini 3 Flash | 1M Kontext, volle Worker-Outputs, JSON-Newline-Fix |
| DeepSeek Reasoner | Als 5. Meister im Council eingebaut |
| OPUS_BRIDGE_SECRET | Env-Var korrigiert (war _TOKEN) |
| Kimi K2.5 Kontext | 256K (nicht 128K wie fälschlich behauptet) |
| GLM-5-Turbo Kontext | 203K (nicht 32K) |
| DeepSeek Reasoner Preis | $0.28/$0.42 (gleich wie Chat, nicht $0.55/$2.19) |

---

## Meister-Council (5)

| Meister | Modell | Preis $/M In/Out |
|---------|--------|-----------------|
| Opus 4.6 | claude-opus-4-6 | $5/$25 |
| GPT-5.4 | gpt-5.4 | $2.50/$15 |
| GLM-5-Turbo | glm-5-turbo | $1.20/$4 |
| MiniMax M2.7 | minimax/minimax-m2.7 | $0.30/$1.20 |
| DeepSeek Reasoner | deepseek-reasoner | $0.28/$0.42 |

## Worker (DEFAULT_WORKERS)

| Worker | Modell | Preis $/M In/Out | Kontext |
|--------|--------|-----------------|---------|
| deepseek | deepseek-chat | $0.28/$0.42 | 128K |
| minimax | minimax/minimax-m2.7 | $0.30/$1.20 | 205K |
| glm | glm-5-turbo | $1.20/$4 | 203K |
| qwen | qwen/qwen3.6-plus | ~$0.40/$1.20 | 128K+ |
| grok | grok-4-1-fast | $0.20/$0.50 | 128K |

## Judge
Gemini 3 Flash | gemini-3-flash-preview | $0.50/$3 | **1M Kontext**

---

## Aktive Entscheidungen

1. MiniMax **M2.7** (nicht M2.5) — Gürcan's Entscheidung
2. **Keine Free-Modelle** — bezahlt, kein Data Collection
3. GLM-4.7-Flash **bezahlt** über Zhipu-Guthaben
4. deepseek-reasoner Shortname über /worker-direct noch nicht direkt nutzbar (Dynamic Import Cache), aber mit `worker:"deepseek", model:"deepseek-reasoner"` funktioniert es

---

## Pipeline-Status (ehrliche Bewertung: 40/100)

### Funktioniert ✅
- Worker-Swarm (5-6 parallel)
- Judge (Gemini)
- /opus-task Orchestrator
- /push → GitHub → Render
- /build (alter Weg)
- Self-Test

### Existiert aber halb ⚠️
- Scout-Phase (nur in /build, nicht in /opus-task)
- Meister-Council (nur in /build, /opus-task hat separaten Judge)
- Architecture Graph (42 Nodes, passiv, wird nicht aktualisiert)
- Error Learning (generiert Cards, liest sie aber nicht zurück)

### Fehlt komplett ❌
- **Destiller** — kein Lernmechanismus über Tasks hinweg
- **Crush-Integration** — Spec existiert, aber kein Prompt nutzt Crush
- **AICOS-Feedback-Loop** — nicht verbunden
- **TypeScript-Check vor Push** — pusht blind auf Produktion
- **Sandbox/Staging** — kein Test vor Deploy

---

## Session 10 Plan (in dieser Reihenfolge!)

1. **TypeScript-Check vor Push** im Orchestrator einbauen — verhindert stuck Builds
2. **Erstes Soulmatch-Feature** per /opus-task deployen (formatCredits.ts)
3. **Error-Cards + Crush in Prompts** — 2 Prompt-Änderungen
4. **Graph auto-update** — nach erfolgreichem Push
5. **Zweites Feature** mit Crush+Error-Cards aktiv → Vergleich

---

## Render-Status

Letzter Deploy war stuck (build_in_progress 2h+). Gürcan hat Manual Deploy getriggert.
Bei zukünftigen Pushes: TypeScript-Check VOR dem Push einbauen (Session 10 Priorität 1).

---

## Dateien der Opus-Bridge (24 aktive)

```
server/src/routes/opusBridge.ts           — 36 Endpoints (nutzt jetzt Registry)
server/src/lib/opusWorkerRegistry.ts      — ⭐ Single Source of Truth
server/src/lib/opusAssist.ts              — ⭐ Deploy-Wait + Benchmark
server/src/lib/opusTaskOrchestrator.ts    — ⭐ /opus-task Pipeline
server/src/lib/opusBridgeAuth.ts          — Token-Auth
server/src/lib/opusBridgeController.ts    — executeTask()
server/src/lib/opusBuildPipeline.ts       — /build Pipeline
server/src/lib/opusSelfTest.ts            — Self-Test
server/src/lib/opusChainController.ts     — runChain()
server/src/lib/opusChatPool.ts            — ChatPool CRUD
server/src/lib/opusScoutRunner.ts         — 4 Scouts parallel
server/src/lib/opusRoundtable.ts          — Roundtable + Validator
server/src/lib/opusGraphIntegration.ts    — Graph lesen/schreiben
server/src/lib/opusPulseCrush.ts          — Pulse-Crush
server/src/lib/opusVerification.ts        — 10 STANDARD_TESTS
server/src/lib/opusErrorLearning.ts       — Error-Card Generierung
server/src/lib/opusBudgetGate.ts          — Session Budget
server/src/lib/opusDecomposer.ts          — 7-Stufen Pipeline
server/src/lib/opusDailyStandup.ts        — Worker-Performance
server/src/lib/opusRenderBridge.ts        — Render API Controller
server/src/lib/opusWorkerSwarm.ts         — Worker-Swarm + 5 Meister
server/src/lib/builderGithubBridge.ts     — GitHub + Chunking
server/src/lib/builderBdlParser.ts        — BDL Parser
server/src/lib/builderPatchExecutor.ts    — Patch SEARCH/REPLACE
server/src/lib/builderMemory.ts           — 3-Schichten Memory
docs/provider-specs.md                    — Verifizierte Provider-Daten
docs/SESSION-STATE.md                     — Persistenter Session-Kontext
```
