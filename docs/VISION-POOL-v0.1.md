## Vision Pool v0.1

Status: proposal_for_review  
Date: 2026-05-03  
Scope: Builder visual perception lane, dynamic vision model pool, MVP-first

## Purpose

This document defines the first implementation path for giving Builder a real visual perception capability.

The goal is not only "take screenshots" and not only "call a vision model".

The goal is:

- capture Builder or app screenshots from the existing browser lane
- route them through a dynamic pool of vision-capable models
- let Maya and the existing Builder team work with the visual findings
- learn over time which models perform best for specific UI and UX task types

This spec explicitly avoids a parallel one-off architecture.

Visual perception must become a first-class Builder lane that fits the existing pool, routing, and evidence patterns.

## Current Reality

The repo already contains substantial browser automation and screenshot infrastructure:

- `server/src/lib/builderBrowserLane.ts`

That file already:

- runs Playwright-based UI flows
- captures screenshots
- stores screenshot artifacts as `artifactType: 'browser_screenshot'`
- writes artifacts into Builder storage

The missing layer is elsewhere:

1. provider transport is still text-only
2. no registry-level `vision_capable` model classification exists
3. no visual-perception lane or orchestration exists
4. no Builder UI surface exists for choosing vision models and running visual review
5. no scoring loop exists for learning which vision models actually perform well in this codebase

This means the correct move is not "build screenshotting from scratch".

The correct move is:

- reuse the browser lane
- add multimodal provider transport
- attach a new visual lane to the existing Builder architecture

## Product Decision

Builder should not ship a fixed hardcoded vision trio.

Builder should ship a dynamic Vision Pool:

- all approved vision-capable models are visible in the pool
- the user can choose 1..N models per visual task
- Maya can later choose automatically from the same pool
- the system logs which models were used and how they performed

This mirrors the broader Builder direction:

- pool-based selection instead of rigid model-slot truth
- human choice or Maya auto-pick
- evidence and scoring over time

## Initial Vision-Capable Pool

The initial pool should mark these models as vision-capable and available for Builder visual tasks:

- `claude-opus-4-7`
- `claude-sonnet-4-6`
- `gpt-5.5`
- `gemini-3-pro-preview`
- `qwen/qwen3-vl-32b-instruct`
- `glm-4.6v`
- `glm-5v-turbo`
- `kimi-k2.6`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`

Notes:

- `glm-5-turbo` is not the replacement for `glm-4.6v`; `glm-5v-turbo` is the relevant multimodal model.
- `glm-4.6v` stays in the pool because it remains a distinct screenshot-to-frontend candidate.
- the pool is intentionally broader than the default run set
- not every task needs every model

## Primary Use Cases

The first visual lane should support at least these task types:

1. `ui_review`
   Critique a Builder or app screen for hierarchy, clarity, consistency, layout, spacing, navigation, confusion, and operator burden.

2. `layout_drift`
   Compare current UI against intended structure, expected patterns, or a prior known-good state.

3. `ocr_and_label_check`
   Detect broken labels, mojibake, duplicated controls, missing text, or misleading UI copy.

4. `frontend_recreation_hint`
   Suggest implementation directions from screenshot plus available code context.

5. `multi_state_review`
   Compare several screenshots from different states or breakpoints and identify what changes, breaks, or remains inconsistent.

## Architecture Choice

The correct architecture is:

- a new `visual_perception` Builder lane
- driven by the existing screenshot artifacts from `builderBrowserLane.ts`
- using the current Builder orchestration patterns where possible
- optionally escalated into Council or Maya synthesis instead of inventing a completely separate debate stack on day one

This means the system separates:

- visual capture
- visual perception
- synthesis and decision

## MVP vs Phase 2

This feature should be built in two phases.

### MVP

The MVP must produce real value quickly:

- choose 1..N vision models
- choose one or more screenshot artifacts
- run the selected models
- capture structured findings
- let Maya synthesize those findings into a single recommendation

No full multi-round debate is required for MVP.

### Phase 2

After MVP validation:

- multi-round debate among selected visual models or through Council
- web research support
- model scoring feedback into Maya auto-pick
- action generation from findings into Builder tasks

## MVP Scope

### Block 1: Registry Foundation

Extend the central model catalog so models can be marked with visual capabilities.

Minimum metadata:

- `visionCapable: boolean`
- `supportsMultiImage: boolean`
- `supportsWebResearch: boolean`
- `provider`
- `label`
- `costTier`
- `recommendedVisualRoles: string[]`

This should live in the same canonical model truth path the Builder model catalog now uses, not in a separate visual-only hardcode list.

### Block 2: Multimodal Provider Transport

Extend:

- `server/src/lib/providers.ts`

Current reality:

- `CallProviderParams.messages` is typed as string-only message content

MVP requirement:

- support text plus image parts in provider-specific payloads

First-class support should be added for:

- Anthropic
- OpenAI-compatible / OpenRouter
- Gemini
- Z.ai
- Moonshot/Kimi if supported through the current transport path

If some providers need staged support, MVP may ship with:

- Anthropic
- OpenAI-compatible / OpenRouter
- Gemini

and keep Z.ai / Kimi / Xiaomi as Phase-1.5 or Phase-2 if their transport shape proves materially different.

But the registry must still be prepared for the full target pool.

### Block 3: Visual Perception Run Endpoint

Add a Builder endpoint such as:

- `POST /api/builder/visual-perception/run`

MVP input:

- task id or explicit ad hoc visual review scope
- screenshot artifact ids or capture instructions
- selected vision model ids
- task type such as `ui_review` or `layout_drift`
- optional review prompt

MVP output:

- one structured finding set per selected model
- one Maya synthesis block
- evidence references to the screenshot artifacts used

### Block 4: Structured Finding Contract

Each vision model response should be normalized into a stable schema.

Minimum finding fields:

- `modelId`
- `taskType`
- `severity`
- `category`
- `title`
- `description`
- `suggestedFix`
- `confidence`
- `screenshotRef`
- `regionHint` if available

Categories should start simple:

- `layout`
- `navigation`
- `copy`
- `consistency`
- `accessibility`
- `visual_noise`
- `operator_confusion`
- `implementation_hint`

### Block 5: Builder UI Surface

Add a dedicated Builder surface such as:

- `Visual Pool`
- or `Visual Review`

The UI must include:

- screenshot selection
- model multi-select
- model count visibility
- optional Maya auto-pick toggle
- task type selector
- results view with per-model findings and Maya synthesis

The UI must follow the existing Builder pool patterns where possible instead of inventing a totally different operator interaction.

## Maya Role

Maya should not be bypassed.

For MVP, Maya's job is:

- frame the visual review request
- optionally suggest which visual models to use
- synthesize the model findings into a recommended next step

For Phase 2, Maya may also:

- trigger Council discussion from the visual findings
- compare conflicting model reports
- create Builder tasks from accepted findings

## Council Integration

Council should not be the first implementation dependency.

MVP rule:

- selected vision models produce their own structured findings
- Maya synthesizes them

Phase 2 option:

- the structured findings become input to Council for deeper team debate

This keeps the first deliverable smaller and faster without blocking the broader vision.

## Scoring and Evaluation

The scoring system should be designed now and implemented at least minimally in Phase 1.

The purpose is to answer:

- which vision models are strongest for this codebase
- for which task types they are strongest
- whether Maya auto-pick should favor them later

MVP scoring data to store per run:

- selected models
- task type
- screenshots used
- findings emitted
- whether findings were cross-confirmed by other models
- optional manual true/false marking by operator

Preferred model score dimensions:

- `precision`
- `relativeRecall`
- `uniqueness`
- `costPerUsefulFinding`
- `scorePerTaskType`

Cold-start note:

- scores must be marked low-confidence until enough runs exist

## Manual Validation

The UI should eventually let the operator mark findings as:

- `confirmed`
- `false_positive`
- `unclear`

This should not block MVP delivery, but the data model should leave space for it from day one.

## Web Research

Web research is useful but should not block MVP.

Phase 2 optional capability:

- selected visual models or Maya can access web research for current UX patterns, accessibility references, and modern UI conventions

This must remain optional and explicit because:

- some tasks only need screenshot and code context
- web use introduces latency and noise

## Acceptance Criteria For MVP

The MVP is accepted when all of the following are true:

1. Builder can reuse an existing screenshot artifact from the browser lane.
2. Builder can send screenshot plus text context to at least three selected vision-capable models.
3. The selected models return normalized findings in a common schema.
4. Maya synthesizes those findings into a single recommendation.
5. The Builder UI lets the operator choose the visual models per run instead of using a hardcoded set.
6. The run stores enough metadata to support later model scoring.

## Explicit Non-Goals For MVP

These are intentionally postponed:

- full multi-round visual debate loop
- automatic task creation from every finding
- fully autonomous Maya visual governance
- production-grade benchmark dashboard
- broad provider parity for every edge-case multimodal payload on day one

## Recommended Implementation Order

1. Registry `visionCapable` metadata
2. Multimodal provider transport
3. Visual perception run endpoint
4. Structured finding normalization
5. Builder UI surface
6. Minimal scoring storage

## Review Questions

Before implementation, confirm these product choices:

1. Should the Builder surface be named `Visual Pool`, `Visual Review`, or `Visual Council`?
2. Should MVP include only Maya synthesis, or immediate optional Council escalation?
3. Should all ten initial models be visible immediately, or should some be marked `experimental` in the UI at launch?
4. Should Maya auto-pick be present but off by default for MVP?

## Recommendation

Approve this spec if the desired direction is:

- dynamic vision model pool
- screenshot reuse through the existing browser lane
- 1..N model selection per task
- Maya synthesis first
- scoring and evaluation built into the foundation

Do not approve this spec if the desired direction is instead:

- one hardcoded fixed vision trio
- no scoring
- no future Maya auto-pick
- a completely separate UI system outside the Builder pool architecture
