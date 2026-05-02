# Universal Task Contract Delta v0.1

Status: proposal_for_review  
Date: 2026-05-02  
Scope: minimal UI-driven delta to the existing Universal Task Contract

## Purpose

The existing `UNIVERSAL-TASK-CONTRACT-v0.1.md` is directionally correct and should not be replaced.

However, the planned UI reconstruction introduces one real requirement that is not yet cleanly represented:

- the shell must distinguish between `single_specialist` and `pipeline` experiences without relying on brittle UI heuristics

This delta only adds what is genuinely missing for the UI shell.

## Existing Contract Strengths

The current contract already gives strong foundational truth for:

- intent
- lifecycle
- routing
- team
- output
- code lane drilldown

That remains valid.

No restart from zero is needed.

## Missing UI Signal

The current contract does not cleanly expose a canonical surface-mode signal.

Today the UI would otherwise need to infer too much from combinations like:

- `team.activeInstances`
- `routing.activeLanes`
- evidence execution summaries
- raw task status

That is possible, but too fragile for the rebuilt shell.

## Proposed Minimal Addition

Add a new derived contract area:

- `experience`

This is a presentation-facing contract area, not a replacement for backend truth.

## Experience

`experience` answers:

- which user-facing Builder mode is active
- what the primary surface should be
- what transparency label Maya should expose

Required fields:

- `mode`
- `primarySurface`
- `transparencyLabel`
- `summary`

### `mode`

Initial canonical values:

- `default`
- `single_specialist`
- `pipeline`

Interpretation:

- `default`: no active task shell, Maya is waiting for the next clear request
- `single_specialist`: Maya is solving the task with one narrow specialist path, not a full team reveal
- `pipeline`: Maya is orchestrating a visibly multi-instance coordinated flow

### `primarySurface`

Initial values:

- `chat`
- `tribune`
- `artifact`

Interpretation:

- `chat`: user should mainly see the Maya conversation surface
- `tribune`: user should mainly see the orchestration stage
- `artifact`: user should mainly see the produced result surface

### `transparencyLabel`

Short user-facing text such as:

- `Pipeline bereit`
- `Maya nutzt Gemini Pro Latest fuer Bildanalyse`
- `Pipeline aktiv · Phase 4 von 7`

This field exists so the shell does not invent presentation text ad hoc in multiple places.

### `summary`

One sentence describing why this experience mode is active.

## Why This Delta Is Needed

Without `experience`, the reconstructed UI would still depend on front-end heuristics to decide:

- when the tribune appears
- when the team strip appears
- when the shell remains chat-first
- when a small specialist banner is enough

That would recreate drift quickly.

## What This Delta Does Not Change

This delta does not alter:

- existing lifecycle phases
- existing output kinds
- code lane preservation
- evidence pack semantics
- routing lanes

It only gives the UI shell a stable experience-level truth.

## Mapping Guidance

Initial derivation can remain conservative:

- no active task -> `default`
- active task with narrow routing / specialist use -> `single_specialist`
- active task with visible multi-instance orchestration -> `pipeline`

This can be refined later without rebuilding the shell model.

## Acceptance Criteria

This delta is acceptable if it:

- preserves the current contract
- avoids a full restart
- adds only the minimum missing UI truth
- gives the rebuilt shell a canonical mode signal

