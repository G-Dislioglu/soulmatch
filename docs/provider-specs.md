# Provider-Specs — Verifizierte Modell-Daten

> **Regel:** Keine Preise/Specs aus Trainingsdaten. Vor jeder Aussage zu einem Modell
> diese Datei prüfen. Wenn `Geprüft` älter als 2 Wochen → neu recherchieren.

Letzte Gesamtprüfung: **09. April 2026**

## Unsere Worker

| Modell | Provider | Model-ID | Kontext | Max Output | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|------------|---------------------|---------|
| DeepSeek Chat | deepseek | `deepseek-chat` | 128K | 8K (Default 4K) | $0.28 / $0.42 | 09.04.2026 (Screenshot api-docs.deepseek.com) |
| DeepSeek Reasoner | deepseek | `deepseek-reasoner` | 128K | 64K (Default 32K) | $0.28 / $0.42 | 09.04.2026 (Screenshot api-docs.deepseek.com) |
| MiniMax M2.7 | openrouter | `minimax/minimax-m2.7` | 205K | 131K | $0.30 / $1.20 | 09.04.2026 (openrouter.ai, artificialanalysis.ai) |
| Kimi K2.5 | openrouter | `moonshotai/kimi-k2.5` | 256K | ? | $0.60 / $3.00 | 09.04.2026 (Kimi-Eigenrecherche) |
| Qwen 3.6 Plus | openrouter | `qwen/qwen3.6-plus` | 128K+ | ? | ~$0.40 / $1.20 | 09.04.2026 (openrouter.ai) |
| GLM-5-Turbo | zhipu | `glm-5-turbo` | 203K | 131K | $1.20 / $4.00 | 09.04.2026 (openrouter.ai, z.ai) |
| GLM-4.7-Flash | zhipu | `glm-4.7-flash` | 203K | ? | $0.06 / $0.40 | 09.04.2026 (Kimi-Recherche, BEZAHLT über Zhipu-Guthaben) |
| Grok-4-1-fast | xai | `grok-4-1-fast` | 128K | ? | $0.20 / $0.50 | 09.04.2026 (Handoff S7) |

## Judge

| Modell | Provider | Model-ID | Kontext | Max Output | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|------------|---------------------|---------|
| Gemini 3 Flash | gemini | `gemini-3-flash-preview` | **1M** | 66K | $0.50 / $3.00 | 09.04.2026 (openrouter.ai, Google AI pricing page) |

## Meister (Roundtable)

| Modell | Provider | Model-ID | Kontext | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|---------------------|---------|
| Claude Opus 4.6 | anthropic | `claude-opus-4-6` | 200K | $5.00 / $25.00 | 09.04.2026 |
| GPT-5.4 | openai | `gpt-5.4` | 128K | $2.50 / $15.00 | 09.04.2026 (Handoff S7) |
| GLM-5-Turbo | zhipu | `glm-5-turbo` | 203K | $1.20 / $4.00 | s.o. |
| MiniMax M2.7 | openrouter | `minimax/minimax-m2.7` | 205K | $0.30 / $1.20 | s.o. |
| DeepSeek Reasoner | deepseek | `deepseek-reasoner` | 128K | $0.28 / $0.42 | **Geplant als neuer Meister** |

## Scouts

| Modell | Provider | Model-ID | Kontext | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|---------------------|---------|
| GLM-4.7-Flash | zhipu | `glm-4.7-flash` | 203K | $0.06 / $0.40 | 09.04.2026 |
| Gemini 3 Flash | gemini | `gemini-3-flash-preview` | 1M | $0.50 / $3.00 | 09.04.2026 |
| Grok-4-1-fast | xai | `grok-4-1-fast` | 128K | $0.20 / $0.50 | 09.04.2026 |

## Entscheidungen

- **Keine Free-Tier Modelle** — Free-Versionen sammeln Prompt-Daten (Data Collection). Wir nutzen ausschließlich bezahlte APIs.
- **GLM-4.7-Flash ist BEZAHLT** — läuft über Zhipu API mit Gürcan's $5 Guthaben, nicht über OpenRouter Free.
- **MiniMax M2.7 statt M2.5** — Gürcan hat explizit auf M2.7 upgraden lassen (M2.5 hatte besseren SWE-Bench, M2.7 ist neuer und für Agent-Workflows optimiert).
- **DeepSeek Reasoner als Meister geplant** — gleicher Preis wie Chat ($0.28/$0.42), aber Chain-of-Thought Thinking. Für Worker zu langsam, für Meister ideal.
- **Gemini 3 Flash als Judge** — 1M Kontext, kein Truncation nötig, volle Worker-Outputs.

## Quellen

- DeepSeek: api-docs.deepseek.com/quick_start/pricing (Screenshot vom User verifiziert)
- MiniMax: openrouter.ai/minimax/minimax-m2.7
- Kimi: Kimi-Eigenrecherche (256K bestätigt)
- GLM: openrouter.ai/z-ai/glm-5-turbo, z.ai docs
- Gemini: ai.google.dev/gemini-api/docs/pricing
- Grok/Qwen: openrouter.ai
