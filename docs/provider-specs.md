# Provider-Specs — Verifizierte Modell-Daten

> **Regel:** Keine Preise/Specs aus Trainingsdaten. Vor jeder Aussage zu einem Modell
> diese Datei prüfen. Wenn `Geprüft` älter als 2 Wochen → neu recherchieren.

Letzte Gesamtprüfung: **09. April 2026**
Letzte Teilprüfung (Gemini 3.1 Flash-Lite): **19. April 2026**
Letzte Teilprüfung (Zhipu-Pool-Konsolidierung): **19. April 2026**

## Unsere Worker

| Modell | Provider | Model-ID | Kontext | Max Output | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|------------|---------------------|---------|
| DeepSeek Chat | deepseek | `deepseek-chat` | 128K | 8K (Default 4K) | $0.28 / $0.42 | 09.04.2026 (Screenshot api-docs.deepseek.com) |
| DeepSeek Reasoner | deepseek | `deepseek-reasoner` | 128K | 64K (Default 32K) | $0.28 / $0.42 | 09.04.2026 (Screenshot api-docs.deepseek.com) |
| MiniMax M2.7 | openrouter | `minimax/minimax-m2.7` | 205K | 131K | $0.30 / $1.20 | 09.04.2026 (openrouter.ai, artificialanalysis.ai) |
| Kimi K2.5 | openrouter | `moonshotai/kimi-k2.5` | 256K | ? | $0.60 / $3.00 | 09.04.2026 (Kimi-Eigenrecherche) |
| Qwen 3.6 Plus | openrouter | `qwen/qwen3.6-plus` | 128K+ | ? | ~$0.40 / $1.20 | 09.04.2026 (openrouter.ai) |
| GLM-5-Turbo | zhipu | `glm-5-turbo` | 203K | 131K | $1.20 / $4.00 | 09.04.2026 (openrouter.ai, z.ai) |
| GLM-4.7-FlashX | zhipu | `glm-4.7-flashx` | 203K | ? | $0.07 / $0.40 | 19.04.2026 (z.ai docs, BEZAHLT über Zhipu-Guthaben) |
| Grok-4-1-fast | xai | `grok-4-1-fast` | 128K | ? | $0.20 / $0.50 | 09.04.2026 (Handoff S7) |

## Judge

| Modell | Provider | Model-ID | Kontext | Max Output | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|------------|---------------------|---------|
| Gemini 3 Flash | gemini | `gemini-3-flash-preview` | **1M** | 66K | $0.50 / $3.00 | 09.04.2026 (openrouter.ai, Google AI pricing page) |

## Meister (Roundtable)

| Modell | Provider | Model-ID | Kontext | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|---------------------|---------|
| Claude Opus 4.6 | anthropic | `claude-opus-4-6` | 200K | $5.00 / $25.00 | 09.04.2026 |
| Claude Opus 4.7 | anthropic | `claude-opus-4-7` | 1M (API), 200K (standard) | $5.00 / $25.00 | 22.04.2026 (Anthropic Release 16.04.2026) |
| GPT-5.4 | openai | `gpt-5.4` | 128K | $2.50 / $15.00 | 09.04.2026 (Handoff S7) |
| GLM-5-Turbo | zhipu | `glm-5-turbo` | 203K | $1.20 / $4.00 | s.o. |
| MiniMax M2.7 | openrouter | `minimax/minimax-m2.7` | 205K | $0.30 / $1.20 | s.o. |
| DeepSeek Reasoner | deepseek | `deepseek-reasoner` | 128K | $0.28 / $0.42 | **Geplant als neuer Meister** |

## Scouts

| Modell | Provider | Model-ID | Kontext | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|---------------------|---------|
| GLM-4.7-FlashX | zhipu | `glm-4.7-flashx` | 203K | $0.07 / $0.40 | 19.04.2026 |
| Gemini 3 Flash | gemini | `gemini-3-flash-preview` | 1M | $0.50 / $3.00 | 09.04.2026 |
| Grok-4-1-fast | xai | `grok-4-1-fast` | 128K | $0.20 / $0.50 | 09.04.2026 |

## Maya-Kandidaten (Chat-Entscheider im Builder)

| Modell | Provider | Model-ID | Kontext | Max Output | Preis In/Out ($/1M) | Geprüft |
|--------|----------|----------|---------|------------|---------------------|---------|
| Claude Opus 4.6 | anthropic | `claude-opus-4-6` | 200K | — | $5.00 / $25.00 | 09.04.2026 (aktueller Maya-Motor) |
| Claude Opus 4.7 | anthropic | `claude-opus-4-7` | 1M (API), 200K (standard) | 128K | $5.00 / $25.00 | 22.04.2026 (Anthropic Release 16.04.2026) |
| Gemini 3 Flash | gemini | `gemini-3-flash-preview` | 1M | 66K | $0.50 / $3.00 | 09.04.2026 |
| Gemini 3.1 Flash-Lite | gemini | `gemini-3.1-flash-lite-preview` | 1M | 65K | $0.25 / $1.50 | **19.04.2026** (ai.google.dev/gemini-api/docs/gemini-3, Vertex AI Docs, Google AI Blog) |

## Entscheidungen

- **Keine Free-Tier Modelle** — Free-Versionen sammeln Prompt-Daten (Data Collection). Wir nutzen ausschließlich bezahlte APIs.
- **GLM-4.7-FlashX ist BEZAHLT** — läuft über Zhipu API mit Gürcan's Guthaben. GLM-4.7-Flash (ohne X) ist Z.ai Free-Tier mit Data-Collection und wird bewusst NICHT genutzt.
- **MiniMax M2.7 statt M2.5** — Gürcan hat explizit auf M2.7 upgraden lassen (M2.5 hatte besseren SWE-Bench, M2.7 ist neuer und für Agent-Workflows optimiert).
- **DeepSeek Reasoner als Meister geplant** — gleicher Preis wie Chat ($0.28/$0.42), aber Chain-of-Thought Thinking. Für Worker zu langsam, für Meister ideal.
- **Gemini 3 Flash als Judge** — 1M Kontext, kein Truncation nötig, volle Worker-Outputs.
- **Gemini 3.1 Flash-Lite als Maya-Kandidat (19.04.2026)** — Qualität laut Google "matches 2.5 Flash", Preis $0.25/$1.50 (Faktor ~16 günstiger als Opus). Thinking-Level steuerbar (minimal/low/medium/high). Test geplant: Flash-Lite als Maya-Stimme mit Scout-Unterstützung vs. Opus-Baseline auf identischem Task.
- **Claude Opus 4.7 (22.04.2026)** — Released 16.04.2026. Breaking changes gegenüber 4.6: nur thinking.type='adaptive' unterstützt (kein 'enabled' mit budget_tokens mehr), und temperature/top_p/top_k werden ignoriert. providers.ts wurde in S36-F00 entsprechend angepasst (Model-Version-Sniffing via model.startsWith('claude-opus-4-7')). Preis identisch zu 4.6 ($5/$25). xhigh-Effort-Level neu verfügbar.

## Quellen

- DeepSeek: api-docs.deepseek.com/quick_start/pricing (Screenshot vom User verifiziert)
- MiniMax: openrouter.ai/minimax/minimax-m2.7
- Kimi: Kimi-Eigenrecherche (256K bestätigt)
- GLM: openrouter.ai/z-ai/glm-5-turbo, z.ai docs
- Gemini: ai.google.dev/gemini-api/docs/pricing, ai.google.dev/gemini-api/docs/gemini-3
- Grok/Qwen: openrouter.ai
- Gemini 3.1 Flash-Lite (19.04.2026): Google AI Blog, Vertex AI Docs, OpenRouter
