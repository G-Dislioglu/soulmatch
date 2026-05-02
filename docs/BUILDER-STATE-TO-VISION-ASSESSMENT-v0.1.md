# Builder State To Vision Assessment v0.1

Status: proposal_for_review  
Date: 2026-05-02  
Scope: state assessment and rebuild direction, no truth-sync

## Purpose

This document answers four questions precisely:

1. Where Builder stands today in code and UI
2. Where Builder is supposed to go according to the product vision
3. Which gaps are merely visual and which are architectural
4. Which rebuild measures are required, in the right order

This is not a pixel mockup. It is a product and architecture assessment.

## Executive Summary

Builder is currently a hybrid:

- visually, it is starting to become a "tribune"
- structurally, it is still an internal operator cockpit
- architecturally, it is still a code-centric build pipeline

That means the current mismatch is deeper than layout.

The main problem is not "the tribune is in the wrong place".  
The main problem is:

- the frontend still assumes a code/build control surface
- the backend still models tasks primarily as code-edit / review / push work
- the task lifecycle, evidence pack, statuses, outputs, and policy language are all still biased toward repository work

So the correct direction is not:

- keep polishing the current Builder Studio until it "feels nicer"

The correct direction is:

- preserve useful pieces
- stop treating the current Builder as the final mental model
- deliberately split "universal problem-solving studio" from "code execution lane"

## Target Vision

Builder is a universal problem-solving studio.

The user speaks to Maya. Maya:

- understands the request
- clarifies or reframes if needed
- chooses which instances to involve
- coordinates the work
- consolidates the result
- presents the result in the appropriate format

Important consequences:

- Builder is not fundamentally a code builder
- code is one output class among several
- pipeline instances are not fixed stages in a factory line
- they are callable cognitive and operational modes
- Maya can use them flexibly per task

Examples:

- "Build a todo app" -> code lane may dominate
- "Bring clarity into a vague situation" -> distiller and council may dominate
- "How should one approach the quantum entanglement problem?" -> council, distiller, judge, and Maya synthesis may dominate

Scout remains important, but not as a mandatory final stage. Scout is an independent patrol / discovery capability Maya may use or absorb.

## Current Reality

### 1. Product Positioning

Current Builder in the repo is still positioned as an internal engineering module.

Evidence:

- page header still says `Builder Control Surface`
- token/login model is operator-facing
- panels are centered around tasks, files, evidence, patrol, config, approvals
- the strongest backend paths live under `/api/builder/...` and `/api/builder/opus-bridge/...`

This is still the shape of a controlled internal tool, not a user-first cognitive studio.

### 2. Frontend Information Architecture

The recent tribute refactor improved hierarchy, but it did not change the product model.

What is now better:

- the tribune is no longer buried as a tiny side attachment
- there is now a first-cognition hero area
- attention states are clearer
- raw evidence JSON is demoted behind a details toggle

What is still fundamentally true:

- the page is still organized around operator panels
- the task list, file explorer, task detail, context, checks, evidence, patrol, config, and tokenized backend access are still first-class citizens in the same screen
- the user still sees a system he is expected to supervise, not a studio that primarily thinks for him

This means the page is now better designed, but still conceptually too close to a control room.

### 3. Pipeline Semantics

The frontend still uses a fixed tribune timeline derived from code-ish phases:

- created
- planning
- building
- checking
- review
- landed
- live
- stopped

Even after visual improvements, these semantics remain too close to code/build work.

They do not fit a universal studio well:

- a research task does not "land"
- a clarity task does not need "live verification"
- a conceptual answer does not need the same lifecycle as a repository patch

So the current timeline is a useful temporary visualization, but it is not the final universal task model.

### 4. Backend Data Model

The current backend schema is strongly code-centric.

Examples from `server/src/schema/builder.ts`:

- `commitHash`
- `tokenBudget`
- `requiredLanes` defaulting to `['code', 'runtime', 'review']`
- statuses such as:
  - `prototyping`
  - `prototype_review`
  - `counterexampling`
  - `browser_testing`
  - `push_candidate`
  - `needs_human_review`

These are valid for code tasks, but not universal.

The task table currently assumes that a task is fundamentally a controlled software change process.

### 5. Evidence and Output Model

`BuilderEvidencePack` is explicitly built around code and runtime validation:

- `scope_files`
- `base_commit`
- `head_commit`
- `diff_stat`
- `checks.tsc`
- `checks.build`
- `runtime_results`
- `counterexamples`
- reviews and agreement around code-like outputs

This is a strong engineering evidence model. It is not a general result model.

Missing for universal Builder:

- synthesis result
- conclusion result
- recommendation result
- research result
- answer format metadata
- user-facing output artifact metadata

### 6. Orchestration Engine

`server/src/lib/opusTaskOrchestrator.ts` is still explicitly shaped as a code-change orchestrator.

Evidence:

- deterministic file scope
- fetch file contents
- change mode
- worker prompt for file edits
- edit envelope parsing
- syntax check
- push / deploy / approval machinery

This is not wrong. It is simply one lane.

But today that one lane still acts like the whole Builder.

### 7. Model Selection

You already have part of an important requirement:

- models are configurable by pool
- `maya`, `council`, `distiller`, `worker`, `scout` all have cataloged model options

This is good and should be kept.

But there is still a limitation:

- the system thinks in fixed pools more than in dynamic capability assignment
- the user can configure pool composition, but Maya does not yet visibly "compose a team per task" in a universal way

## What Is Already Valuable And Should Be Kept

The following should not be thrown away:

### Keep

- Maya as the primary conversational interface
- the tribune idea itself
- live pool chat windows behind "Live" buttons
- free model choice per instance pool
- attention-card logic for explicit human decisions
- patrol as parallel background discovery
- the current evidence machinery for code tasks
- approval / gate / safety machinery for code tasks

### Keep, But Reposition

- task list
- context memory
- operator diagnostics
- checks and technical evidence
- file explorer

These are still useful, but should not define the primary user experience.

## What Must Change

## A. Product Model Split

The biggest structural change required:

Builder must be modeled as:

1. a universal studio layer
2. one or more specialized execution lanes beneath it

At minimum:

- universal task orchestration layer
- code/build lane

Later possibly:

- research lane
- synthesis / briefing lane
- planning lane
- content lane

Without this split, Builder will always snap back into code-pipeline semantics.

## B. Task Lifecycle Split

The current single timeline should be split into two layers:

### Universal task state

Examples:

- requested
- understood
- routed
- active
- synthesizing
- delivered
- confirmed
- stopped

### Lane-specific execution state

Examples for code lane:

- scope resolved
- workers editing
- checks running
- review pending
- push candidate
- deployed
- runtime verified

This lets Builder represent both:

- a conceptual answer
- a code patch

without lying in either direction.

## C. Output System Generalization

Output can no longer be treated as "evidence pack plus maybe commit".

Builder needs an explicit output contract:

- output kind
- output format
- output artifact(s)
- whether user confirmation is needed

Suggested output kinds:

- chat answer
- structured answer
- html artifact
- markdown artifact
- json artifact
- code artifact
- presentation artifact
- visual artifact

The code evidence pack should remain, but as a code-lane artifact, not as the universal result model.

## D. UI Surface Reframing

The main Builder surface should be reframed around four questions:

1. What did the user ask Maya to do?
2. What is Maya doing with the team right now?
3. Which instances are currently involved, and why?
4. What output is being assembled for the user?

That means:

- the current tribune should become the center of the screen
- the chat with Maya should remain highly prominent
- operator surfaces should move into secondary drawers, sidebars, collapses, or modes

Placement details are secondary. The hierarchy is not.

## E. Terminology Neutralization

The app needs a terminology cleanup.

Current terms that are too narrow:

- build
- landed
- live verified
- evidence pack as universal term
- check results as central concept

Suggested direction:

- use neutral task language in the primary UI
- keep technical words only inside technical drill-downs

Example:

- primary: "Maya verdichtet gerade die drei besten Antworten"
- drill-down: "judge verdict", "runtime check", "commit hash", "diff stat"

## F. Instance Presentation

The instance row should not pretend to be a fixed conveyor belt.

It should communicate:

- which instances are available
- which models are selected per instance
- which instances are active for this task
- what they are currently contributing

This can still be shown horizontally or in cards.  
But the meaning must shift from "fixed pipeline order" to "active team composition".

## Required Rebuild Measures

The rebuild should not happen as random UI slices.

It should happen in this order:

### Phase 1 — Vision Anchor

Write and adopt a canonical Builder vision document that states clearly:

- Builder is a universal studio
- code is one lane, not the whole product
- Maya is orchestrator
- instances are cognitive modes
- outputs are multi-format

Without this, future UI or backend work will drift back.

### Phase 2 — Universal Task Contract

Define a new universal task model:

- task intent
- requested output type
- routing plan
- active instances
- universal lifecycle state
- optional specialized execution lane

This is the most important backend-facing design step.

### Phase 3 — UI Information Architecture Reset

Refactor Builder Studio into:

- primary Maya conversation
- primary tribune / active team view
- secondary operator tools

At this phase, placement can be decided pragmatically.  
The key is that the primary surface stops looking like an engineering dashboard.

### Phase 4 — Code Lane Isolation

Move code-specific mechanics conceptually behind a code lane:

- scope
- file explorer
- evidence pack
- checks
- push / deploy / runtime verification

These remain available, but only when the task is actually a code task.

### Phase 5 — Output System

Implement output negotiation and artifact rendering:

- short chat outputs
- HTML for long structured answers
- Markdown / JSON / code / visual formats as needed

This is what makes Builder feel like a true studio instead of a coded task machine.

## What Should Not Happen Next

The following would be the wrong next steps:

- more CSS polish on the current code-centric semantics
- more work on the fixed 8-phase build timeline as if it were universal
- more operator panels becoming prettier without changing their role
- adding more code-only widgets and calling Builder "general"

That would improve the shell while preserving the wrong product model.

## Recommended Immediate Next Step

The next best move is not another UI patch.

The next best move is:

1. lock the vision in a canonical repo document
2. define the universal task contract
3. only then continue with Builder UI and orchestration refactors

If this order is ignored, the implementation will keep drifting back into "internal code pipeline with nicer visuals".

## Bottom Line

Where Builder stands now:

- useful
- increasingly readable
- operationally real
- but still architecturally code-first

Where Builder should go:

- Maya-centered universal problem-solving studio
- dynamic team orchestration
- multi-format outputs
- code lane as one specialized capability among others

What that means:

- the current tribune refactor is not wasted
- but it is only a provisional shell
- the real rebuild is conceptual, architectural, and then visual

