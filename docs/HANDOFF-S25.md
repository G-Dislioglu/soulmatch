# S25 Handoff — Pipeline Dogfooding Session

## Datum: 2026-04-15

## Erfolge
- GLM erfolgreich von Zhipu-direkt auf OpenRouter umgeroutet (8 Dateien)
- Provider-Timeout von 90s auf 150s erhöht (providers.ts)
- read-file Endpoint deployed (health.ts) — ermöglicht Remote-Debugging
- Token-Konstanten in opusBridgeConfig.ts gesetzt
- Patrol: 247 Findings, 3 Critical, funktioniert
- Pipeline hat autonom ca. 8 Commits gepusht

## Erkenntnisse
- Kleine Dateien: 5/5 Worker, 40-70s total — zuverlässig
- Große Dateien (600+ Zeilen): Render-Timeout killt HTTP-Response
- Pipeline pusht trotzdem im Hintergrund weiter
- Semantische Präzision mangelhaft: Worker ignorieren Bedingungen wie "ändere nur X nicht Y"
- GLM-5-Turbo: 100% Erfolgsrate, 3-20s, bester Worker
- DeepSeek (direkte API): unzuverlässig (1/3)

## Offene Aufgaben für Copilot (S26)
1. MEISTER_COUNCIL maxTokens auf 100000 zurücksetzen (opusWorkerSwarm.ts)
2. WORKER_PRESETS inline maxTokens von 100000 auf 16000 ändern
3. Zhipu-Fallbacks in builder.ts Zeile 929/932 auf openrouter/z-ai ändern
4. Async Job Pattern für /opus-task implementieren
5. poolState.ts: prüfen ob pickFromPool noch zhipu-Referenzen hat

## Worker-Benchmark (3 Runs)
| Worker | Rate | Avg Latenz |
|--------|------|------------|
| GLM-5-Turbo | 3/3 | 4.9s |
| Kimi | 2/3 | 59s |
| DeepSeek | 1/3 | 20s* |
| Minimax | 1/3 | 18s* |
| Qwen | 1/3 | 11s* |

*wenn erfolgreich