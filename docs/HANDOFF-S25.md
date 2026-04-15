# S25 Handoff — Pipeline Stress-Test & GLM Migration

## Date: 2026-04-15

## Completed

- **GLM → OpenRouter Migration**: All 8 pipeline files updated (commit 8513e62)
  - opusWorkerSwarm.ts, providers.ts, poolState.ts, opusScoutRunner.ts
  - opusDistiller.ts, opusRoundtable.ts, opusBridgeController.ts, opusWorkerRegistry.ts
  - Model: `z-ai/glm-5-turbo` and `z-ai/glm-4.7-flash`
  - Reasoning disabled for OpenRouter GLM (conservative, like Qwen)

- **Pipeline Stress-Test** (3 runs, dryRun):
  - GLM: 3/3 success, avg 4.9s — **fastest and most reliable worker**
  - Kimi: 2/3, avg 67s — slow but delivers
  - DeepSeek: 1/3, 20s when working, else 90s timeout
  - Minimax: 1/3, 18s when working, else 90s timeout
  - Qwen: 1/3, 11s when working, else 90s timeout
  - Pipeline success: 3/3 (GLM alone carries it)

- **Confirmed**: $19.70 OpenRouter balance, ~1400 pipeline runs budget

## Open for S26

### Priority 1: Timeout + max_tokens Tuning
In `server/src/lib/providers.ts`:
- Increase timeout from 90s → 150s (Kimi needs ~80s)
- Reduce worker max_tokens from 100000 → 16000 (patches are ~500-3000 tokens)
- This should stabilize DeepSeek, Minimax, Qwen

### Priority 2: Async Job Pattern
The /opus-task endpoint times out at ~60s for real (non-dryRun) pushes.
Solution: Return job-ID immediately, workers run in background, poll via /opus-job-status.

### Priority 3: /read-file Endpoint
Currently 404. Needed so Claude can read repo files without Copilot.
~20 lines of code in opusBridge.ts.

### Priority 4: Visual Patrol (GLM-5V-Turbo)
Screenshots → Vision model → CSS bug detection.
GLM-5V available on OpenRouter at $1.20/1M tokens.

## Key Insight from Copilot
Claude had 2 wrong assumptions corrected by Copilot:
1. DeepSeek runs via DeepSeek direct API, NOT OpenRouter
2. Files are scope-trimmed to ~200 lines before sending to workers, not raw

## Worker Config (current)
| Worker | Provider | Model |
|--------|----------|-------|
| glm | openrouter | z-ai/glm-5-turbo |
| glm-flash | openrouter | z-ai/glm-4.7-flash |
| deepseek | deepseek | deepseek-chat |
| minimax | openrouter | minimax/minimax-m2.7 |
| qwen | openrouter | qwen/qwen3.6-plus |
| kimi | openrouter | moonshotai/kimi-k2.5 |
| sonnet | anthropic | claude-sonnet-4-6 |
| gpt | openai | gpt-5.4 |
| grok | xai | grok-4-1-fast |
| opus | anthropic | claude-opus-4-6 |
