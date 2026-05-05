# Universal Task Contract v0.1

Status: working_spec  
Date: 2026-05-02  
Scope: additive contract over the current Builder implementation

## Purpose

This document defines the first universal task contract for Builder.

It is deliberately additive.

It does not remove the current code-task machinery.
It places a universal Maya-centered roof above it.

## Contract Shape

Every Builder task should expose these five contract areas:

1. `intent`
2. `lifecycle`
3. `routing`
4. `team`
5. `output`

For code tasks, a sixth area is also exposed:

6. `codeLane`

## 1. Intent

Intent answers:

- what kind of problem Maya believes this is
- what user outcome is being pursued
- whether the code lane remains preserved

Required fields:

- `kind`
- `summary`
- `preservesCodeLane`

Initial `kind` values:

- `app_build`
- `code_change`
- `debug`
- `technical_review`
- `research`
- `analysis`
- `strategy`
- `clarification`
- `general`

## 2. Lifecycle

Lifecycle is the universal primary task state.

Required fields:

- `phase`
- `attentionState`
- `summary`

Canonical primary phases:

- `requested`
- `understood`
- `routed`
- `active`
- `synthesizing`
- `delivered`
- `confirmed`
- `stopped`

Initial attention states:

- `active`
- `waiting`
- `complete`
- `blocked`

Important:

- these phases are user-facing umbrella truth
- they do not replace code-lane drill-down phases

## 3. Routing

Routing describes how Maya frames the task under the universal roof.

Required fields:

- `primaryLane`
- `supportingLanes`
- `activeLanes`
- `summary`

Initial lanes:

- `code`
- `runtime`
- `review`
- `prototype`

This means:

- the current Builder remains fully code-capable
- but code-specific mechanics are no longer the only language the product speaks

## 4. Team

Team describes which instance modes are active or expected.

Required fields:

- `activeInstances`
- `summary`

Initial instance values:

- `maya`
- `council`
- `distiller`
- `worker`
- `judge`
- `scout`

This is not a fixed conveyor.
It is a task-specific composition signal.

## 5. Output

Output defines what Maya is preparing for the user.

Required fields:

- `kind`
- `format`
- `plannedArtifacts`
- `needsUserConfirmation`
- `summary`

Initial output kinds:

- `chat_answer`
- `structured_answer`
- `html_artifact`
- `markdown_artifact`
- `json_artifact`
- `code_artifact`
- `presentation_artifact`
- `visual_artifact`

Initial formats:

- `chat`
- `markdown`
- `html`
- `json`
- `code`
- `mixed`

## 6. Code Lane

When a task uses the code lane, Builder must expose explicit code-lane drill-down truth.

Required fields:

- `enabled`
- `status`
- `phase`
- `summary`
- `commitHash`

Initial code-lane phases:

- `idle`
- `scope_resolved`
- `prototype_building`
- `workers_editing`
- `checks_running`
- `review_pending`
- `push_candidate`
- `runtime_verified`
- `completed`
- `stopped`

Important:

- code-lane detail remains first-class
- but it now lives beneath the universal contract, not as the entire product truth

## Current Mapping Strategy

The existing Builder implementation is still overwhelmingly code-first.

So v0.1 maps current task records into the universal contract like this:

- current task status remains stored as-is
- universal lifecycle is derived from that status
- routing defaults to the code lane plus required supporting lanes
- output defaults to code artifacts unless the task is clearly in a prototype HTML state
- team composition is inferred conservatively from the current stage

This is acceptable for v0.1 because the goal is:

- to establish a stable contract surface now
- while preserving the existing code lane intact

## What v0.1 Does Not Do Yet

This contract does not yet:

- persist non-code task intents as first-class DB columns
- let users explicitly choose output format in the task form
- support non-code execution lanes in backend orchestration
- replace the evidence pack with a generalized artifact system

Those belong to later phases.

## Why This Is The Right First Step

Without this contract:

- UI work keeps drifting back into code-only semantics
- backend work keeps assuming every task is fundamentally a repo patch
- Builder cannot present itself truthfully as a universal Maya-centered studio

With this contract:

- Builder gets a universal primary language immediately
- the code lane stays fully operational
- future backend and UI refactors have a stable architectural spine
