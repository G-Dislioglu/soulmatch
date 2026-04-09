# SESSION-STATE — Aktive Entscheidungen & offene Tasks

> Wird am Ende jeder Session aktualisiert. Claude liest diese Datei zu Beginn jeder Session.

Stand: **09. April 2026, Session 9**

## Aktive Entscheidungen (nicht ändern ohne Gürcan's OK)

1. **Minimax M2.7** — nicht M2.5. Gürcan hat Upgrade angeordnet.
2. **Keine Free-Modelle** — alle Worker bezahlt, kein Data Collection.
3. **GLM-4.7-Flash bezahlt** — über Zhipu API, $5 Guthaben.
4. **Gemini 3 Flash als Judge** — 1M Kontext, volle Outputs.
5. **DeepSeek Reasoner als Meister** — geplant, noch nicht eingebaut.
6. **6000 Token-Limit** — für alle Worker und Meister.
7. **`/opus-task` für Features** — nicht `/build` für Orchestrator-Tasks.
8. **Immer `/build` für einfache Code-Änderungen** — nie manuell clone→edit→push (Ausnahme: wenn `/build` Timeout hat → `/push` direkt, dokumentieren).

## Arbeitsregeln

1. **Keine Preise/Specs aus Trainingsdaten.** Provider-Docs prüfen → `docs/provider-specs.md`.
2. **Wenn Gürcan Agent-Output teilt → sofort weiterarbeiten**, kein "soll ich...?"
3. **Erklärungen in Alltagssprache mit Metaphern**, keine ungeklärten Fachbegriffe.
4. **Ideen bewerten auf 0-100 Skala**, Schwächen sofort benennen.
5. **Nie auf Render-Deploy warten** — weiter zum nächsten Task, Verifizierung später.
6. **Alles in einen Bash-Call packen** — nicht 5 einzelne Calls für 5 Checks.

## Offene Tasks (priorisiert)

### Sofort (nächste Session)
- [ ] Gemini Judge JSON-Newline-Fix testen (Deploy pending)
- [ ] `opusBridge.ts` providerMap/defaultModelMap → aus Registry importieren (letzter Drift)
- [ ] DeepSeek Reasoner als Meister in MEISTER_COUNCIL einbauen
- [ ] provider-specs.md und SESSION-STATE.md ins Repo pushen

### Danach
- [ ] Erstes echtes Soulmatch-Feature per `/opus-task` deployen
- [ ] 2 restliche tote Dateien löschen (healthCheck, pingTest)
- [ ] Worker-Timeout verifizieren (GLM + Qwen Timeouts bei 90s)

### Langfristig
- [ ] Maya Memory System (Thread-Digest, Memory Stratification)
- [ ] Crush Solver v2 (Multi-Provider Webapp)
- [ ] Bluepilot Phase 1

## Letzte Commits (Session 9)

| Commit | Was |
|--------|-----|
| `076d817` | Worker/Meister maxTokens → 6000 |
| `720d014` | ProviderMap + DefaultModelMap für /worker-direct |
| div. | opusAssist.ts, opusTaskOrchestrator.ts, opusWorkerRegistry.ts |
| Latest | Judge → Gemini 3 Flash, JSON-Newline-Fix, Timeout 150s |

## Widersprüche (geklärt)

| Was | Status |
|-----|--------|
| MiniMax M2.5 vs M2.7 | ✅ M2.7 — Gürcan's Entscheidung, Chat-Verlauf war weg |
| GLM-4.7-Flash gratis? | ✅ Nein — bezahlt über Zhipu-Guthaben |
| DeepSeek Reasoner Preis | ✅ $0.28/$0.42 — gleich wie Chat (Screenshot verifiziert) |
| Kimi Kontext 128K? | ✅ 256K — Kimi-Eigenrecherche bestätigt |
| GLM-5-turbo 32K? | ✅ 203K — OpenRouter + z.ai bestätigt |
