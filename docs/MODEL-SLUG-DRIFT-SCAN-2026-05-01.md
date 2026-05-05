# Model Slug Drift Scan - 2026-05-01

Status: `proposal_for_review`

## 1. Scope

This is a read-only repo scan of hardcoded model slugs and model-coupled runtime mappings after the registry diagnosis in `docs/MODEL-REGISTRY-REFRESH-2026-05-01.md`.

Non-scope of this block:

- no code changes
- no commit or push
- no truth-sync edits to `STATE.md`, `RADAR.md`, or `FEATURES.md`
- no provider migration decision

Primary local truth anchors used for this scan:

- `server/src/lib/opusWorkerRegistry.ts`
- repo-wide grep over `server/src`, `client/src`, and docs
- targeted reads of the runtime surfaces that directly consume or override model slugs

## 2. Executive Finding

The registry is not the only controlling surface anymore. A future model refresh is at least a four-plane change:

1. builder/runtime worker topology
2. persona and studio runtime routing
3. provider-specific behavior branches keyed off model families
4. user-facing model catalogs and documentation

The strongest repo-visible drift is not merely that newer models exist. It is that different runtime seams already disagree on which slug family is canonical.

Most important examples:

- `thinker_opus` already uses `claude-opus-4-7` in `server/src/lib/personaRouter.ts`, while Builder core paths still default to `claude-opus-4-6`.
- GLM appears in two incompatible slug/provider forms: `z-ai/glm-*` via OpenRouter in Builder registry surfaces, but plain `glm-*` via Zhipu in persona, scout, and other direct-call surfaces.
- xAI already mixes unsuffixed `grok-4-1-fast`, explicit `grok-4-1-fast-reasoning`, and explicit `grok-4-1-fast-non-reasoning` across different paths.
- Gemini worker-registry drift is only one slice of the real runtime, because companion/persona flows are already centered on `gemini-2.5-flash` and `gemini-2.5-flash-lite`, not on `gemini-3-flash-preview`.

Conclusion: a later registry switch is not a safe single-file edit. It needs a grouped rollout by runtime seam.

## 3. Runtime-Critical Touchpoints

| Group | Files | Hardcoded model facts | Why this matters |
| --- | --- | --- | --- |
| Registry root | `server/src/lib/opusWorkerRegistry.ts:14-33` | Core worker slots still point to `deepseek-chat`, `deepseek-reasoner`, `moonshotai/kimi-k2.5`, `qwen/qwen3.6-plus`, `z-ai/glm-5-turbo`, `z-ai/glm-5.1`, `grok-4-1-fast`, `gemini-3-flash-preview`, `claude-opus-4-6`, `claude-sonnet-4-6`, `gpt-5.4`. | This is the stated registry source of truth, but other runtime seams have already drifted ahead or sideways. |
| Builder bridge presets | `server/src/lib/opusBridgeController.ts:54-94` | Council/code-writer presets repeat `claude-opus-4-6`, `claude-sonnet-4-6`, `gpt-5.4`, `z-ai/glm-5-turbo`, `grok-4-1-fast`, `deepseek-chat`, `qwen/qwen3.6-plus`, `moonshotai/kimi-k2.5`. | Registry edits alone would leave Builder controller defaults stale. |
| Builder route fallback maps | `server/src/routes/opusBridge.ts:710-739` | `defaultModelMap` and `providerMap` hardcode the same family again, including `glm-5.1`, `glm-5-turbo`, `glm-4.7-flashx`, `grok-4-1-fast`, `qwen/qwen3.6-plus`, `moonshotai/kimi-k2.5`. | Direct `/worker-direct` style calls can bypass registry intent and continue resolving old slugs. |
| Pool state source | `server/src/lib/poolState.ts:24-55` | `POOL_MODEL_MAP` repeats Builder pool IDs to slugs, including `claude-opus-4-6`, `gpt-5.4`, `grok-4-1-fast`, `deepseek-chat`, `glm-5-turbo`, `glm-5.1`, `moonshotai/kimi-k2.5`, `qwen/qwen3.6-plus`, `gemini-3-flash-preview`. | Pool persistence means stale IDs can survive server restarts even after a partial code edit. |
| Worker identity layer | `server/src/lib/workerProfiles.ts:20-100` | Worker capability metadata repeats `glm-4.7-flashx`, `minimax/minimax-m2.7`, `moonshotai/kimi-k2.5`, `qwen/qwen3.6-plus`, `gpt-5.4`, `deepseek-chat`. | A registry switch without profile sync would keep Maya's qualitative routing assumptions on old models. |
| Worker execution presets | `server/src/lib/opusWorkerSwarm.ts:68-90` | `WORKER_PRESETS` and `MEISTER_COUNCIL` repeat the same slugs, with token caps attached. | This is execution behavior, not just labeling; stale slugs here can break actual worker calls. |
| Builder/director routing | `server/src/routes/builder.ts:938-958`, `server/src/routes/builder.ts:1232-1238` | Director modes still resolve to `claude-opus-4-6`, `gpt-5.4`, `z-ai/glm-5.1`; fallback query routing still falls back to `glm-4.7-flashx` and `claude-opus-4-6`. | Later registry changes would not fully move Builder's top-level orchestration path. |
| Persona canonical routing | `server/src/lib/personaRouter.ts:32-52`, `server/src/lib/personaRouter.ts:213-312` | Companion/specialist paths center on `gemini-2.5-flash` and `deepseek-reasoner`; thinker paths mix `claude-opus-4-7`, `claude-sonnet-4-6`, `gpt-5.4`, `grok-4-1-fast`, `deepseek-chat`, `deepseek-reasoner`, `glm-5-turbo`, `moonshotai/kimi-k2.5`, `qwen/qwen3.6-plus`. | This is already a second canonical runtime map, and it materially disagrees with the Builder registry on Opus and GLM provider form. |
| Studio prompt/runtime labels | `server/src/studioPrompt.ts:12`, `server/src/studioPrompt.ts:930-946`, `server/src/routes/studio.ts:293-314`, `server/src/routes/studio.ts:1129-1139` | Studio uses `deepseek-reasoner`, `gemini-2.5-flash-lite`, `grok-4-1-fast-non-reasoning`, and human-readable label maps for persona/model display. | User-visible studio behavior and descriptions would drift if only backend registry slugs move. |
| Guide route defaults | `server/src/routes/guide.ts:18-23` | Guide defaults still use `gpt-4.1-nano`, `deepseek-chat`, `grok-4-1-fast-non-reasoning`. | Guide is outside the worker registry but shares provider/model assumptions; this matters for any repo-wide “current default model” story. |
| Focused helper callers | `server/src/lib/builderReviewLane.ts:288`, `server/src/lib/opusErrorLearning.ts:45`, `server/src/lib/opusRoundtable.ts:76-90`, `server/src/lib/opusMeisterPlan.ts:36-37`, `server/src/lib/councilDebate.ts:55-59`, `server/src/lib/scoutPatrol.ts:57-68`, `server/src/lib/councilScout.ts:80,127,155` | Several subsystems bypass shared registries and call provider/model pairs directly. | These are the most likely hidden breakpoints after a partial refresh. |

## 4. Model-Coupled Behavior, Not Just Data

The repo contains behavior branches that are keyed to model families, not just to providers.

### 4.1 Provider adapter branches

`server/src/lib/providers.ts` is the most important non-registry coupling surface.

- `model.startsWith('qwen/') || model.startsWith('z-ai/glm-')` disables OpenRouter reasoning by default.
- `model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4')` auto-normalizes OpenAI reasoning.
- Anthropics's request shape branches on `model.startsWith('claude-opus-4-7')`, `claude-opus-4-8`, and `claude-opus-5`.
- DeepSeek behavior also branches on whether `model.includes('reasoner')`.

Implication: some slug swaps are behavior changes, not mere string changes. A migration can silently alter reasoning flags, request body shape, and fallback behavior.

### 4.2 Provider-form drift inside the same logical family

GLM is the clearest example.

- Builder registry surfaces commonly use OpenRouter-style slugs such as `z-ai/glm-5.1` and `z-ai/glm-5-turbo`.
- Persona, scout, and some helper callers use Zhipu-style direct slugs such as `glm-5.1`, `glm-5-turbo`, and `glm-4.7-flashx`.

This means there is no single repo-wide GLM slug namespace today. A future refresh must decide whether Builder and persona/runtime are intentionally on different providers, or whether this is unplanned drift.

### 4.3 Already split model families

- Opus: `claude-opus-4-7` is already live in thinker routing, while Builder core remains on `claude-opus-4-6`.
- Grok: repo uses unsuffixed `grok-4-1-fast` in several Builder and thinker paths, but explicit `grok-4-1-fast-reasoning` and `grok-4-1-fast-non-reasoning` in others.
- Gemini: worker registry uses `gemini-3-flash-preview`, while broad app/runtime seams use `gemini-2.5-flash`, `gemini-2.5-flash-lite`, and `gemini-2.5-flash-preview-tts`.

## 5. Client and Operator Surfaces

| Surface | Files | Drift relevance |
| --- | --- | --- |
| Builder UI model catalogs | `client/src/modules/M16_builder/ui/BuilderConfigPanel.tsx:11-71` | Builder UI still exposes `claude-opus-4-6`, `gpt-5.4`, `grok-4-1-fast`, `deepseek-chat`, `moonshotai/kimi-k2.5`, `qwen/qwen3.6-plus`, `gemini-3-flash-preview`, `glm-4.7-flashx`, `z-ai/glm-5.1`. This is operator-facing config truth, not just presentation fluff. |
| General app settings | `client/src/modules/M09_settings/lib/settingsStorage.ts:5-31` | The consumer settings UI has its own model catalogs, including `gpt-5-nano`, `gpt-5-mini`, `gpt-5`, `deepseek-chat`, `deepseek-reasoner`, and several Grok 3 variants. This is a separate product axis and should not be accidentally “registry-synced” with Builder assumptions. |

## 6. Docs-Only and Historical Surfaces

The scan also surfaced many documentation references, including `docs/provider-specs.md`, `docs/SESSION-STATE.md`, archived Opus Bridge specs and handoffs, and briefing files.

These are important for later truth-sync, but they are not the first implementation blockers. The runtime-critical files above should be treated as the controlling migration surface.

Practical rule:

- runtime files define implementation scope
- UI/config files define operator-facing consistency scope
- docs define communication and truth-sync scope

## 7. Recommended Implementation Grouping for a Later Approved Refresh

If a registry switch is approved later, the narrowest honest slicing is not “edit the registry”. It is something like this:

### Group A - Builder core synchronization

- `server/src/lib/opusWorkerRegistry.ts`
- `server/src/lib/opusBridgeController.ts`
- `server/src/routes/opusBridge.ts`
- `server/src/lib/poolState.ts`
- `server/src/lib/workerProfiles.ts`
- `server/src/lib/opusWorkerSwarm.ts`
- `server/src/routes/builder.ts`

### Group B - Persona and studio runtime synchronization

- `server/src/lib/personaRouter.ts`
- `server/src/studioPrompt.ts`
- `server/src/routes/studio.ts`
- adjacent direct helper callers that still embed old slugs

### Group C - Provider behavior compatibility pass

- `server/src/lib/providers.ts`
- any route/helper that depends on provider-specific slug form or reasoning mode semantics

### Group D - UI/operator and docs truth sync

- `client/src/modules/M16_builder/ui/BuilderConfigPanel.tsx`
- only the docs that are meant to reflect the new runtime truth

## 8. Decision Summary

Repo-visible answer to the follow-up question:

The real scope of a future model refresh is broader than `server/src/lib/opusWorkerRegistry.ts`, but it is still sliceable. The controlling implementation seam is Builder core first, not docs first. Persona/studio routing is the second major seam, and provider adapter logic is the risk seam that can turn a slug rename into a behavior regression.

That means the next good implementation block, if approved, should be a bounded Builder-core sync rather than a repo-wide search-and-replace.