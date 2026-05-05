# Model Registry Refresh - 2026-05-01

Status: `proposal_for_review`

Purpose: diagnosis and decision document for a possible refresh of `server/src/lib/opusWorkerRegistry.ts`.

Scope constraints for this block:
- Documentation only.
- No code changes.
- No commit, no push.
- No truth-sync edits to `STATE.md`, `RADAR.md`, or `FEATURES.md`.

Primary local source:
- `server/src/lib/opusWorkerRegistry.ts`

Method note:
- This document checks the proposed refresh against current repo truth first, then against provider primary sources where available.
- For OpenRouter-routed slots, OpenRouter model pages are used as the official routing source for slug, context, and current routed price.
- Where a provider's own docs did not expose a stable, fetchable release or pricing page during this pass, the gap is stated explicitly instead of guessed.

## 1. Status Quo Of The Current Registry

| Slot | Current provider/model/context | Drift assessment |
| --- | --- | --- |
| `deepseek` | `deepseek` / `deepseek-chat` / `128K` | Drifted. DeepSeek now documents `deepseek-chat` as a compatibility alias for non-thinking mode of `deepseek-v4-flash`; current registry still points at the alias and still carries the old `128K` limit instead of `1M`. |
| `deepseek-reasoner` | `deepseek` / `deepseek-reasoner` / `128K` | Drifted. DeepSeek now documents `deepseek-reasoner` as a compatibility alias for thinking mode of `deepseek-v4-flash`; same alias/deprecation and context-limit issue as above. |
| `minimax` | `openrouter` / `minimax/minimax-m2.7` / `128K` | Candidate for removal by portfolio choice, not by hard break proven in this pass. No fresh 2026-first-party refresh evidence was gathered here, while the proposal prefers newer, more visible agent-oriented slots. |
| `kimi` | `openrouter` / `moonshotai/kimi-k2.5` / `256K` | Drifted. Current slot is one generation behind the OpenRouter-routed `moonshotai/kimi-k2.6`, which is listed as released on 2026-04-20 with `262,142` context. |
| `qwen` | `openrouter` / `qwen/qwen3.6-plus` / `128K` | Partially drifted. The current slug is valid on OpenRouter; the external brief was too strong in claiming it does not exist. The real decision is strategic: keep the proprietary `qwen3.6-plus`, or switch to the cheaper open-weight `qwen3.6-35b-a3b`. Current `128K` context is stale either way. |
| `glm` | `openrouter` / `z-ai/glm-5-turbo` / `203K` | Mostly current in model choice, but not aligned with the newer evidence style in the proposed registry. OpenRouter now lists `glm-5-turbo` with `202,752` context and a specific 2026-03-15 release stamp. |
| `glm51` | `openrouter` / `z-ai/glm-5.1` / `203K` | Current. This slot already points at the newer GLM 5.1 line and only needs confirmation in the refreshed registry, not a semantic repair. |
| `glm-flash` | `openrouter` / `z-ai/glm-4.7-flash` / `203K` | Drifted by portfolio direction. It is absent from the proposed target registry and looks superseded by the GLM 5.x pair in the current 2026 lineup. |
| `grok` | `xai` / `grok-4-1-fast` / `128K` | Drifted. xAI now clearly distinguishes `grok-4-1-fast-reasoning` and `grok-4-1-fast-non-reasoning`, both at `2M` context, while the current registry keeps the older unsuffixed fast slug and stale context. |
| `gemini` | `gemini` / `gemini-3-flash-preview` / `1000K` | Functionally usable, but strategically drifted. Google documents `latest` aliases as hot-swappable model-family pointers; the proposal prefers `gemini-flash-latest` for alias stability instead of pinning the current preview slug directly. |
| `opus` | `anthropic` / `claude-opus-4-6` / `200K` | Drifted. Anthropic now documents `claude-opus-4-7` as the current flagship with `1M` context and the same $5 / $25 base price. |
| `sonnet` | `anthropic` / `claude-sonnet-4-6` / `200K` | Partially drifted. The model itself is still current, but Anthropic documents `1M` context, not `200K`. |
| `gpt` | `openai` / `gpt-5.4` / `128K` | Drifted. OpenAI now documents `gpt-5.5` as the flagship coding/reasoning model with `1M` context and explicit `reasoning.effort` controls. |

### Current registry observations

The biggest hard drift is no longer just "some newer models exist". Several current slots are now either compatibility aliases (`deepseek-chat`, `deepseek-reasoner`), under-specified slugs (`grok-4-1-fast`), or stale context-window declarations (`opus`, `sonnet`, `gpt`, `qwen`).

The external proposal also needed correction in one key place: `qwen/qwen3.6-plus` is not a nonexistent slug. OpenRouter currently lists it as a valid proprietary Qwen slot, while `qwen/qwen3.6-35b-a3b` is a different, cheaper open-weight alternative.

## 2. New Models Per Provider (state checked 2026-05-01)

### Anthropic

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Opus 4.7 | `claude-opus-4-7` | $5 / $25 | 1M | Not stamped inline on fetched overview page | Current Anthropic flagship; same base price tier as Opus 4.6, higher capability. | [Anthropic models overview](https://platform.claude.com/docs/en/docs/about-claude/models/overview) |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | $3 / $15 | 1M | Not stamped inline on fetched overview page | Current speed/intelligence middle slot; current registry model remains valid, current context entry does not. | [Anthropic models overview](https://platform.claude.com/docs/en/docs/about-claude/models/overview) |

### OpenAI

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| GPT-5.5 | `gpt-5.5` | $5 / $30 | 1M | Official announcement linked from pricing/models pages; exact date not embedded in fetched page body | Official flagship for complex reasoning and coding; supports `reasoning.effort` values including `none`, `low`, `medium`, `high`, `xhigh`. | [OpenAI pricing](https://openai.com/api/pricing/), [OpenAI model docs](https://developers.openai.com/api/docs/models), [OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning) |
| GPT-5.4 | `gpt-5.4` | $2.50 / $15 | 1M | Listed as prior flagship on current docs | Still available, but displaced by `gpt-5.5` as the documented starting point for reasoning/coding. | [OpenAI pricing](https://openai.com/api/pricing/), [OpenAI model docs](https://developers.openai.com/api/docs/models) |

### DeepSeek

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| DeepSeek V4 Flash | `deepseek-v4-flash` | $0.14 / $0.28 | 1M | Current official pricing page, no separate release stamp in fetched content | Supports thinking and non-thinking modes; `deepseek-chat` and `deepseek-reasoner` are compatibility aliases to its two modes. | [DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing) |
| DeepSeek V4 Pro | `deepseek-v4-pro` | $0.435 / $0.87 promo, regular $1.74 / $3.48 | 1M | Promo explicitly extended until 2026-05-31 15:59 UTC | Proposed premium DeepSeek slot; promo expiry should be remembered in code comments if adopted. | [DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing) |

### xAI

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Grok 4.3 | `grok-4.3` | $1.25 / $2.50 | 1M | Listed on current xAI models page; page updated 2026-04-16 | xAI recommends this as the default chat choice. | [xAI models and pricing](https://docs.x.ai/developers/models) |
| Grok 4-1 Fast Reasoning | `grok-4-1-fast-reasoning` | $0.20 / $0.50 | 2M | Listed on current xAI models page | Cheap reasoning-capable fast slot; attractive default worker. | [xAI models and pricing](https://docs.x.ai/developers/models) |
| Grok 4-1 Fast Non-Reasoning | `grok-4-1-fast-non-reasoning` | $0.20 / $0.50 | 2M | Listed on current xAI models page | Same price/context as reasoning twin, simpler runtime behavior for low-latency slots. | [xAI models and pricing](https://docs.x.ai/developers/models) |
| Grok 4.20 Multi-Agent | `grok-4.20-multi-agent-0309` | $1.25 / $2.50 | 2M | Listed on current xAI models page | Not proposed into the registry, but part of the current xAI frontier lineup. | [xAI models and pricing](https://docs.x.ai/developers/models) |

### Moonshot Kimi

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Kimi K2.6 | `moonshotai/kimi-k2.6` | $0.74 / $3.49 | 262,142 | 2026-04-20 | OpenRouter-routed current Kimi slot. Moonshot official blog URL tested in this pass did not return usable content, so the routed provider page is the reliable source used here. | [OpenRouter Kimi K2.6](https://openrouter.ai/moonshotai/kimi-k2.6) |

### Z.ai GLM

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| GLM 5.1 | `z-ai/glm-5.1` | $1.05 / $3.50 | 202,752 | 2026-04-07 | Strong long-horizon coding/agent positioning; already present in the current registry. | [OpenRouter GLM 5.1](https://openrouter.ai/z-ai/glm-5.1) |
| GLM 5 Turbo | `z-ai/glm-5-turbo` | $1.20 / $4.00 | 202,752 | 2026-03-15 | Current fast GLM slot on OpenRouter; still valid, but now easier to compare directly against GLM 5.1. | [OpenRouter GLM 5 Turbo](https://openrouter.ai/z-ai/glm-5-turbo) |

### Qwen

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Qwen 3.6 Plus | `qwen/qwen3.6-plus` | $0.325 / $1.95 weighted average; provider tiering above 256K shown on page | 1M | 2026-04-02 | Important correction to the external brief: this slug exists on OpenRouter today. | [OpenRouter Qwen3.6 Plus](https://openrouter.ai/qwen/qwen3.6-plus), [Alibaba Model Studio recommended models](https://www.alibabacloud.com/help/en/model-studio/getting-started/models) |
| Qwen 3.6 35B A3B | `qwen/qwen3.6-35b-a3b` | $0.1612 / $0.9653 | 262,144 | 2026-04-27 | Open-weight cheaper alternative to `qwen3.6-plus`; strategic switch, not a slug repair. | [OpenRouter Qwen3.6 35B A3B](https://openrouter.ai/qwen/qwen3.6-35b-a3b), [Alibaba Model Studio recommended models](https://www.alibabacloud.com/help/en/model-studio/getting-started/models) |
| Qwen3 Coder Next | `qwen/qwen3-coder-next` | $0.12 / $0.80 | 262,144 | 2026-02-04 | Coding-specialized Qwen slot with explicit non-thinking mode. | [OpenRouter Qwen3 Coder Next](https://openrouter.ai/qwen/qwen3-coder-next) |

### Xiaomi MiMo

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| MiMo-V2.5 | `xiaomi/mimo-v2.5` | $0.40 / $2.00 | 1,048,576 | 2026-04-22 | Price/context are cleanly exposed on OpenRouter's routed model page. Xiaomi global pages tested in this pass were not a dependable AI model release source. | [OpenRouter MiMo-V2.5](https://openrouter.ai/xiaomi/mimo-v2.5) |
| MiMo-V2.5-Pro | `xiaomi/mimo-v2.5-pro` | $1.00 / $3.00 | 1,048,576 | 2026-04-22 | Flagship Xiaomi slot. OpenRouter provider breakdown shows tiered provider pricing above 256K even though the headline price is $1 / $3. | [OpenRouter MiMo-V2.5-Pro](https://openrouter.ai/xiaomi/mimo-v2.5-pro) |

### Google Gemini

| Model | Slug | Price in/out per 1M | Context | Release date | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Gemini Flash latest alias | `gemini-flash-latest` | Alias pricing was asserted in external briefing but not directly surfaced on the fetched pricing page | Alias | Not stated inline on fetched models page | Google explicitly documents `latest` aliases as hot-swappable family pointers. The fetched pricing page exposes direct preview SKUs, not explicit alias-price rows in the captured content. | [Google models](https://ai.google.dev/gemini-api/docs/models), [Google pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3 Flash Preview | `gemini-3-flash-preview` | $0.50 / $3.00 | Preview family, long-context Gemini 3 line | Not stated inline on fetched pricing page | This is the current direct model currently used in the registry. | [Google pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini Pro latest alias | `gemini-pro-latest` | Alias pricing was asserted in external briefing but not directly surfaced on the fetched pricing page | Alias | Not stated inline on fetched models page | Same alias caveat as above. | [Google models](https://ai.google.dev/gemini-api/docs/models), [Google pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | $2.00 / $12.00 at <=200K, $4.00 / $18.00 above 200K | Gemini 3.1 Pro Preview family | Not stated inline on fetched pricing page | Current direct premium preview price. | [Google pricing](https://ai.google.dev/gemini-api/docs/pricing) |

## 3. Proposed New Registry

The following code block reproduces the proposed target registry as requested for review. It is not applied in this block.

```typescript
export const WORKER_REGISTRY: Record<string, WorkerConfig> = {
  deepseek:        { provider: 'deepseek',   model: 'deepseek-v4-flash',          contextK: 1000 },
  'deepseek-pro':  { provider: 'deepseek',   model: 'deepseek-v4-pro',            contextK: 1000 },
  grok:            { provider: 'xai',        model: 'grok-4-1-fast-reasoning',    contextK: 2000 },
  'grok-fast':     { provider: 'xai',        model: 'grok-4-1-fast-non-reasoning',contextK: 2000 },
  'grok-premium':  { provider: 'xai',        model: 'grok-4.3',                   contextK: 1000 },
  mimo:            { provider: 'openrouter', model: 'xiaomi/mimo-v2.5',           contextK: 262 },
  'mimo-pro':      { provider: 'openrouter', model: 'xiaomi/mimo-v2.5-pro',       contextK: 1000 },
  kimi:            { provider: 'openrouter', model: 'moonshotai/kimi-k2.6',       contextK: 256 },
  qwen:            { provider: 'openrouter', model: 'qwen/qwen3.6-35b-a3b',       contextK: 262 },
  'qwen-coder':    { provider: 'openrouter', model: 'qwen/qwen3-coder-next',      contextK: 256 },
  glm:             { provider: 'openrouter', model: 'z-ai/glm-5-turbo',           contextK: 203 },
  glm51:           { provider: 'openrouter', model: 'z-ai/glm-5.1',               contextK: 203 },
  gemini:          { provider: 'gemini',     model: 'gemini-flash-latest',        contextK: 1000 },
  'gemini-pro':    { provider: 'gemini',     model: 'gemini-pro-latest',          contextK: 1000 },
  opus:            { provider: 'anthropic',  model: 'claude-opus-4-7',            contextK: 1000 },
  sonnet:          { provider: 'anthropic',  model: 'claude-sonnet-4-6',          contextK: 1000 },
  gpt:             { provider: 'openai',     model: 'gpt-5.5',                    contextK: 1050 },
};

export const DEFAULT_WORKERS = ['deepseek', 'grok-fast', 'mimo', 'kimi', 'qwen', 'glm51'];
export const JUDGE_WORKER = 'opus';
export const JUDGE_FALLBACK_WORKERS = ['gpt', 'sonnet'] as const;
```

### Review note on the proposed code block

The block above matches the requested target spec, but two lines deserve explicit review before implementation:

- `qwen/qwen3.6-35b-a3b` is a strategic switch, not a fix for a nonexistent `qwen3.6-plus` slug.
- `gemini-flash-latest` and `gemini-pro-latest` are good alias choices for hot-swap behavior, but this pass did not re-derive direct alias-price rows from the fetched Google pricing page itself.

## 4. Rationale Per Slot

### Why fix the DeepSeek aliases now?

DeepSeek's own pricing page now states that `deepseek-chat` and `deepseek-reasoner` are compatibility names for the two operating modes of `deepseek-v4-flash`. Even without a fully re-verified hard deprecation date in the fetched page body, that is enough evidence that the registry should stop encoding compatibility aliases as its primary canonical slots.

### Why use Opus 4.7 as Judge instead of GPT-5.4?

Anthropic now documents `claude-opus-4-7` as the current flagship with `1M` context and the same $5 / $25 base price tier as prior Opus. That makes the switch attractive for the judge role: more review headroom, stronger long-context handling, and no price penalty relative to the previous Opus generation.

### Why use GPT-5.5 instead of GPT-5.4?

OpenAI now explicitly positions `gpt-5.5` as the default starting point for complex reasoning and coding. It also exposes first-class `reasoning.effort` controls in the official reasoning guide, which makes it the more future-proof general premium slot if the user has already approved the migration.

### Why keep Grok fast in `DEFAULT_WORKERS`?

`grok-4-1-fast-non-reasoning` is now officially priced at $0.20 / $0.50 with `2M` context, which is unusually competitive for a US-provider slot with very long context. That combination gives provider diversification without paying flagship-premium rates for the default pool.

### Why add MiMo?

MiMo is the clearest new portfolio-expansion slot in this refresh. OpenRouter's official pages show both `xiaomi/mimo-v2.5` and `xiaomi/mimo-v2.5-pro` as released on 2026-04-22, with long context and agent-focused positioning. That gives the registry a new provider family oriented toward autonomous coding and tool-heavy tasks.

### Why remove Minimax?

This is the least hard-technical change in the proposal. The argument is not that the current Minimax slot is broken; it is that the refreshed pool already fills the low-cost and mid-cost bands with fresher, more visible 2026 slots from DeepSeek, xAI, Xiaomi, Qwen, and GLM, while the current Minimax evidence was not refreshed in this pass.

### Why keep `glm` but prefer `glm51` over older GLM lines?

`glm51` already exists in the current registry and now has clear OpenRouter evidence for price, release date, and long-horizon positioning. That makes `glm51` the stronger Z.ai anchor slot, while `glm` can remain as the cheaper or faster companion if the team still wants a two-slot GLM pair.

### Why change the Qwen slot?

Because the real issue is not slug invalidity. `qwen/qwen3.6-plus` is currently valid on OpenRouter, and Alibaba's own recommended-models page also lists `qwen3.6-plus`. The proposal's switch to `qwen/qwen3.6-35b-a3b` is therefore a cost/portfolio decision: cheaper open-weight model, native long context, still current, and better aligned with a coding-agent-heavy worker pool.

## 5. What Does Not Belong In This Block

- Grok Voice (TTS, STT, realtime). That is a separate product/runtime block and should be compared against Gemini audio paths in Soulmatch UI work, not mixed into a registry-only refresh document.
- Grok Imagine (image or video). The registry refresh here is about worker selection, not media-generation provider strategy. Z-Image Turbo can remain a separate cost/perf track.
- Implementation of a `reasoningEffort` or `reasoning.effort` bridge inside `callProvider()`. The official OpenAI guide clearly documents this control, but wiring it is a separate code change after a registry decision.

## 6. Risks And Open Questions

- Google alias pricing needs one more explicit pass if the implementation wants to rely on alias-specific price advantages. This research pass verified `latest` alias semantics from the models page, but the fetched pricing page body surfaced direct preview prices more clearly than alias rows.
- Xiaomi MiMo slugs are real on OpenRouter, so the risk is narrower than the external brief suggested. The remaining live risk is not slug existence but runtime routing and provider-header assumptions once code actually switches traffic.
- DeepSeek V4 Pro's promo price expires on 2026-05-31 15:59 UTC. If adopted, the implementation should carry a dated code comment or follow-up note so the cost profile does not silently drift.
- GPT-5.5 is officially more expensive than GPT-5.4 on nominal token price. If the migration goes through on the basis of quality plus token-efficiency expectations, that should be validated empirically after the switch rather than assumed.
- Moonshot official release documentation was not fetchable in a stable way during this pass. The Kimi K2.6 row is therefore grounded in OpenRouter's official routed model page.
- Z.ai official docs were not fetchable in a stable way during this pass. GLM pricing and release data in this document therefore rely on OpenRouter's official model pages.
- Qwen routing now has two valid candidates: `qwen/qwen3.6-plus` and `qwen/qwen3.6-35b-a3b`. The choice is architectural and economic, not a binary valid/invalid question.
- Exact auth-header needs for new OpenRouter-routed models are unchanged at the public API level, but any provider-specific routing constraints should still be smoke-tested before a live switch.

## 7. Acceptance Criteria

- Encoding is clean ASCII text; no mojibake introduced in this file.
- Prices and current model facts are cited to official provider or official routing sources, not third-party aggregator sites.
- The TypeScript code block is syntactically shaped as valid registry code for review.
- Status remains `proposal_for_review`.
- This diagnosis stops at decision support.

User options after review:

1. Approve the document as the basis for a later code change.
2. Request adjustments to the proposed target registry before any implementation block starts.
3. Reject the refresh proposal and keep the current registry for now.

## Observed Side Findings

- `qwen/qwen3.6-plus` is referenced outside `opusWorkerRegistry.ts` as well, including builder-facing config surfaces and several server-side mapping helpers. A later code switch would therefore be broader than a single-file registry edit.
- `claude-opus-4-7` already appears in other runtime files such as `server/src/lib/providers.ts` and `server/src/lib/personaRouter.ts`, which means parts of the repo have already moved further than the worker registry itself.
- Older docs still carry legacy or approximate provider facts, for example in `docs/provider-specs.md` and archived handoff docs. Those were intentionally not updated in this block.