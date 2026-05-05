# Builder Vision v1.0

Status: proposal_for_review  
Date: 2026-05-02  
Scope: canonical product vision, no code changes, no truth-sync

## Purpose

This document is the canonical Builder vision anchor.

It exists to prevent one specific kind of drift:

- reducing Builder to an internal code-build pipeline

while also preventing the opposite mistake:

- "generalizing" Builder in a way that weakens or degrades its existing app-building and coding power

Builder must keep its full code and app-building strength.  
Everything else is additive.

## Core Statement

Builder is a Maya-centered cognitive studio for solving problems with a coordinated AI team.

Builder is already being used to build software. That remains true.  
But Builder is not only a software builder.

Builder must support at least these classes of work:

- app and code building
- debugging and technical review
- clarification of unclear situations
- structured analysis
- research and synthesis
- strategy and multi-perspective deliberation
- output generation in multiple formats

Code and app-building remain a full primary use case.  
Other use cases are added on top, not instead.

## Product Positioning

Builder has a staged identity:

### 1. Current Bootstrap Mode

Builder currently lives inside Soulmatch and helps build Soulmatch from within.

That is not a conceptual accident. It is the bootstrap phase:

- Builder proves itself by helping create the host product
- Builder matures before becoming a standalone public product

### 2. Transitional Mode

Once Soulmatch is sufficiently mature, Builder should either:

- be removed from the public Soulmatch surface
- or remain accessible only through a private or hidden operator path

This keeps Soulmatch user-facing and Builder operator-facing during the transition.

### 3. Standalone Mode

Once Builder is mature enough, it can be cloned or extracted as:

- a standalone Builder application
- a reusable app-building template
- or both

This standalone future is part of the vision, but not a blocker for the current phase.

## Maya's Role

Maya is the primary interface and orchestrator.

The user speaks to Maya. Maya:

- understands the request
- reframes or clarifies it when needed
- decides which instances to involve
- coordinates their work
- consolidates intermediate outputs
- presents the result back to the user

Maya is not merely "another model".  
She is the translation and orchestration layer between:

- the human request
- the internal AI team
- the final output

Maya may answer directly for simple tasks.  
For harder tasks, she routes to one or more instances and moderates the outcome.

## Instances As Cognitive And Operational Modes

The Builder instances are not fixed code-functions.  
They are reusable modes of work.

### Maya

Primary interface, orchestrator, planner, presenter.

Code example:

- interprets "build a todo app", turns it into a concrete code task, routes to worker and judge

Non-code example:

- interprets "help me understand this ambiguous situation", routes toward distillation and possibly council

### Council

Multi-perspective debate and deliberation.

Code example:

- compare multiple technical strategies before implementation

Non-code example:

- debate multiple hypotheses, market positions, or research approaches

### Distiller

Compression, clarification, synthesis, extraction of core structure.

Code example:

- compress scattered implementation notes into a clean engineering brief

Non-code example:

- turn a vague user concern into a precise problem statement

### Worker

Parallel execution or parallel candidate generation.

Code example:

- produce multiple implementation candidates

Non-code example:

- produce multiple analysis drafts, argument structures, or answer framings

### Judge

Evaluation, selection, ranking, justification.

Code example:

- choose the best patch, best implementation, or safest rollout candidate

Non-code example:

- choose the strongest explanation, recommendation, or synthesis

### Scout

Independent patrol and discovery.

Code example:

- find bugs, risks, regressions, or blind spots without explicit request

Non-code example:

- surface hidden assumptions, missing angles, relevant sources, or overlooked risks

Important:

Scout is not simply "the last stage".  
Scout is a parallel discovery capability that Maya may use before, during, or after another flow.

## Flexible Composition Instead Of Fixed Conveyor Logic

Builder is not a fixed left-to-right factory line.

There is no universal mandatory sequence such as:

- scout -> distiller -> council -> worker -> judge

Instead, Maya composes the active team per task.

Examples:

### Example A: Clear app-building task

User asks:

- "Create a todo app"

Possible composition:

- Maya -> Worker -> Judge

Optional additions:

- Scout for proactive bug/risk patrol
- Distiller for a clean handoff summary

### Example B: Large research or reasoning task

User asks:

- "How could one approach the quantum entanglement problem?"

Possible composition:

- Maya -> Council -> Distiller -> Judge -> Maya

The goal is not a code artifact.  
The goal is a synthesized, useful answer.

### Example C: Clarity task

User asks:

- "Bring order into this messy idea"

Possible composition:

- Maya -> Distiller

Optional:

- Council if multiple framings are useful

So the UI and backend must both stop implying that every task follows the same code-oriented lifecycle.

## Code And App-Building Remain A Full Primary Case

This is the most important guardrail in the vision.

Builder must not "move beyond code" by weakening code.

The following must remain strong:

- code generation
- app construction
- file-scoped execution
- evidence packs
- checks
- reviews
- approvals
- commit and deploy mechanics
- runtime verification
- patrol and hardening

These are not legacy leftovers.  
They are a major strength of Builder and remain central.

The correct move is:

- keep the code lane fully capable
- add further capabilities above and around it

Not:

- replace the code lane with a generic idea machine

## Lane Architecture

Builder should be modeled as:

1. a universal orchestration layer
2. one or more specialized lanes beneath it

### Universal Layer

The universal layer handles:

- user request intake via Maya
- task understanding
- routing and team composition
- output-format agreement
- high-level tribune visibility
- final presentation back to the user

### Code Lane

The code lane is the first and deepest specialized lane.

It keeps:

- scope resolution
- file reading and editing
- worker patch generation
- judge selection
- checks
- evidence packs
- approval logic
- push / deploy logic
- runtime verification

This lane should not be removed or hidden.  
It should be formalized as the first full lane under the universal roof.

### Future Additive Lanes

Possible later lanes:

- research lane
- synthesis lane
- strategy lane
- planning lane
- content lane
- presentation lane

Not every lane needs to exist immediately.  
But the architecture should stop pretending the code lane is the whole product.

## Output Formats

Builder must support multiple output formats.

Maya should either:

- infer the right output format and propose it
- or ask the user briefly when the output form is ambiguous

### Supported Output Classes

- direct chat answer
- structured text answer
- markdown
- HTML
- JSON
- code artifacts
- diagrams or visual structures
- presentations
- other domain-specific artifacts later

### Why HTML Matters

HTML should be treated as a prominent output format for structured longer answers.

Why:

- it is immediately viewable
- it supports interaction
- it can embed multiple content forms
- it is stronger than plain markdown for navigable research, synthesis, and comparison outputs

HTML is not always the default.  
But for medium-to-long structured answers, it is often the strongest default candidate.

### Format Agreement

Maya should handle output agreement pragmatically:

- obvious code task -> code lane output
- obvious short question -> direct answer
- larger structured analysis -> likely HTML or structured text

This agreement can be:

- explicit
- inferred
- or inferred first and corrected by the user if needed

The exact interaction style is a later design detail.  
The requirement itself belongs in the vision now.

## Tribune Model

The tribune is the user's observable view into the ongoing work.

Its primary job is not to expose internals first.  
Its primary job is to answer:

- What is Maya doing right now?
- Which team members are involved?
- Why are they involved?
- Is Maya waiting on me?
- What kind of result is being prepared?

### Universal Primary Phases

The primary tribune should use universal task phases, not code-only language.

Recommended universal phase set:

- requested
- understood
- routed
- active
- synthesizing
- delivered
- confirmed
- stopped

These are primary, user-facing umbrella phases.

### Code-Lane Drill-Down Phases

Code-specific phases must still exist, but in code-lane detail views.

Examples:

- scope resolved
- worker edits prepared
- checks running
- review pending
- push candidate
- deployed
- runtime verified

So the correct model is:

- universal primary tribune phase
- lane-specific drill-down phase beneath it

This preserves code rigor without forcing code language onto every task.

## UI Consequences

The Builder UI must be redesigned around hierarchy, not around accumulated operator widgets.

### Primary Surfaces

Primary surfaces should be:

- Maya conversation
- active tribune
- active team composition
- current output-in-progress

### Secondary Surfaces

Secondary or drill-down surfaces should be:

- raw technical evidence
- file explorer
- detailed checks
- patrol internals
- config
- tokenized operator details

### Important Clarification

Whether the tribune is above, below, beside, or over another surface is not the main decision.

The main decision is:

- it must no longer be treated like a sidecar to an operator cockpit

Placement is a design choice. Hierarchy is the product requirement.

## Backend Consequences

The backend does not need to abandon code structures.  
It needs a broader roof above them.

### What Stays

The following remain valuable and should stay:

- existing code-task machinery
- evidence pack logic
- approval artifacts
- guarded push / deploy mechanisms
- builder safety policy
- patrol / scout mechanisms
- model pool configuration

### What Must Be Added

The backend needs additive structures for universal Builder work, such as:

- universal task intent
- requested output type
- active lane or lane mix
- generalized result artifacts
- universal lifecycle state
- synthesis / answer artifact metadata

### What Must Be Reframed

Current code-centric assumptions such as:

- `requiredLanes` defaulting to `code`, `runtime`, `review`
- heavily code-specific statuses
- evidence structures assuming commits and diffs

should not be deleted immediately.  
They should be re-scoped as code-lane structures rather than universal Builder truth.

## Development Phases

The correct sequence is:

### Phase 1 — Vision Anchor

Lock the canonical product vision.

### Phase 2 — Universal Task Contract

Define the universal task model and the relation between:

- universal layer
- specialized lanes

### Phase 3 — Information Architecture Reset

Refactor the Builder UI around:

- Maya
- tribune
- team activity
- outputs

with operator surfaces consciously secondary.

### Phase 4 — Formalize The Code Lane Under The Universal Roof

Important wording:

This is not "code-lane isolation" in the sense of weakening or hiding code.

It means:

- code becomes the first fully formalized lane under the universal Builder roof

That preserves all coding power while removing the mistake that code is the whole product.

### Phase 5 — Add Output And Additional Lanes

Gradually add:

- generalized outputs
- HTML and other output forms
- additional non-code lanes as needed

## What This Document Does Not Specify

This document does not define:

- final pixel layout
- final sidebar arrangement
- precise chat-versus-tribune placement
- pricing or go-to-market
- exact standalone deployment architecture

Those are downstream decisions.

## Acceptance Criteria

This document is correct if:

- Builder is clearly defined as a universal Maya-centered studio
- code/app-building is explicitly preserved as a full primary case
- instances are described as reusable modes, not fixed code-functions
- Maya is clearly the orchestrator
- lane architecture is explicit
- HTML and other outputs are recognized as first-class
- tribune phases are universalized without deleting code-lane detail
- backend consequences are acknowledged instead of hand-waved

