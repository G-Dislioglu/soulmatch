# SESSION-STATE — Aktive Entscheidungen & offene Tasks

> Claude liest diese Datei zu Beginn jeder Session. Wird am Ende jeder Session aktualisiert.

Stand: **09. April 2026, Ende Session 9**

## Aktive Entscheidungen

1. **Minimax M2.7** — nicht M2.5. Gürcan's Entscheidung.
2. **Keine Free-Modelle** — alle Worker bezahlt, kein Data Collection.
3. **GLM-4.7-Flash bezahlt** — über Zhipu API, $5 Guthaben.
4. **Gemini 3 Flash als Judge** — 1M Kontext, volle Worker-Outputs.
5. **DeepSeek Reasoner als 5. Meister** — eingebaut, über provider/model verdrahtet.
6. **6000 Token-Limit** — für alle Worker und Meister.
7. **Claude = Obermeister** — gibt Aufgaben, prüft, entscheidet. Worker/Builder arbeiten. Tool-Calls sparen durch Delegation an /opus-task, /benchmark, /worker-direct.

## Arbeitsregeln

1. **Keine Preise/Specs aus Trainingsdaten.** → `docs/provider-specs.md` prüfen.
2. **Agent-Output → sofort weiterarbeiten**, kein "soll ich...?"
3. **Alltagssprache mit Metaphern**, keine ungeklärten Fachbegriffe.
4. **Ideen 0-100 Skala**, Schwächen sofort benennen.
5. **Nie auf Render-Deploy warten** — weiter zum nächsten Task.
6. **Bash-Calls bündeln** — nicht 5 einzelne für 5 Checks.
7. **Builder als Assistent nutzen** — /opus-task, /benchmark, /worker-direct statt manuelle Arbeit.

## Stabilisierung S9 — abgeschlossen ✅

| Fix | Status |
|-----|--------|
| Token-Limits → 6000 | ✅ |
| ProviderMap + DefaultModelMap → Registry | ✅ |
| opusBridge.ts → zentrale Registry | ✅ |
| Gemini Judge (1M Kontext, volle Outputs) | ✅ |
| DeepSeek Reasoner als 5. Meister | ✅ |
| OPUS_BRIDGE_SECRET statt hardcoded | ✅ |
| provider-specs.md (verifiziert) | ✅ |
| SESSION-STATE.md | ✅ |
| Alle Widersprüche geklärt | ✅ |

## Nächste Phasen

### Phase 1: Erstes echtes Soulmatch-Feature per /opus-task
- Credits-Display oder ähnliches Feature komplett autonom deployen
- Test ob /opus-task end-to-end funktioniert (inkl. Push + Deploy)

### Phase 2: Maya Memory System
- Thread-Digest Pipeline
- Memory Stratification (global/soulmatch/aicos/maya-app)
- Erster Test: Opus-Bridge Worker bauen die Dateien

### Phase 3: Bluepilot Phase 1
- Maya (Opus) als Architektin
- Multi-Provider Worker-Swarm
- Kill-Switch + Budget Gate

## Endpoints (36 total)

Route-Prefix: `/api/builder/opus-bridge/`
Auth: `?opus_token=opus-bridge-2026-geheim`

Neue S9: /benchmark, /deploy-wait, /opus-task
Neue Dateien S9: opusAssist.ts, opusTaskOrchestrator.ts, opusWorkerRegistry.ts

## Meister-Council (5)

| Meister | Modell | Rolle |
|---------|--------|-------|
| Opus 4.6 | claude-opus-4-6 | Architektur |
| GPT-5.4 | gpt-5.4 | Edge-Cases |
| GLM-5-Turbo | glm-5-turbo | Bug-Finder |
| MiniMax M2.7 | minimax/minimax-m2.7 | Agent-Workflows |
| DeepSeek Reasoner | deepseek-reasoner | Chain-of-Thought, tiefes Nachdenken |
