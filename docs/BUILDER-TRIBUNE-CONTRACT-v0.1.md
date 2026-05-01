# Builder Tribune Contract v0.1

Status: proposal_for_review
Date: 2026-05-01
Branch target: `codex/k28j-truth-sync`
Audience: non-technical observers who need to understand what the Builder is doing, why it is doing it, and whether it is waiting for them

## Purpose

The Builder Tribune is the user-facing watch surface for the Builder workflow.

It must answer four questions quickly:

1. What is happening right now?
2. Why is it happening?
3. Is the workflow progressing, waiting, blocked, or landed?
4. Does the system need anything from me?

This contract defines the minimum phase model and signal model for the first Tribune timeline.
It does not claim that the current UI already satisfies this contract.

## 1. Primary visible phases

The Tribune should show the workflow as a short sequence of user-readable phases.
These are viewer-facing phases, not a 1:1 copy of every internal phase in `opusTaskOrchestrator.ts`.

### 1. Created

Meaning:

- a task exists
- no meaningful builder work is visible yet

Minimum source signals:

- `/api/builder/tasks/:id`
- task row exists
- status is still early or unchanged from initial creation

### 2. Planning

Meaning:

- the Builder is understanding the ask, cutting scope, or assembling the architect instruction

Primary backend sources:

- `task.status` from `/api/builder/tasks/:id`
- `classifying`
- observation and actions if present
- orchestrator phases that correspond to:
  - `hardening`
  - `safety-preflight`
  - `architect-assembly`
  - `scope`

User-facing interpretation:

- "The Builder is understanding the request and choosing the safe work path."

### 3. Building

Meaning:

- the system is actively generating or applying a candidate change

Primary backend sources:

- observation from `/api/builder/opus-bridge/observe/:taskId`
- action stream
- chat-pool stream
- orchestrator phases:
  - `fetch`
  - `swarm`
  - `applying`

User-facing interpretation:

- "Workers are producing and applying a candidate change."

### 4. Checking

Meaning:

- the Builder is validating the candidate rather than authoring it

Primary backend sources:

- evidence from `/api/builder/tasks/:id/evidence`
- observation actions/logs
- orchestrator phases:
  - `validate`
  - `claim-gate`
  - `judge`
  - `workflow-simulation`
  - `testing`
  - `reviewing`
  - `counterexampling`

User-facing interpretation:

- "The candidate is being checked, challenged, and scored."

### 5. Waiting for review

Meaning:

- the workflow is not freely progressing and a human decision or approval context matters

Primary backend sources:

- `task.status`
  - `prototype_review`
  - `review_needed`
  - `needs_human_review`
  - `push_candidate`
- evidence final status
- approval and workflow-simulation details when available

User-facing interpretation:

- "The Builder has reached a decision boundary and needs explicit review or approval."

### 6. Landed

Meaning:

- the code change has been committed or pushed successfully enough to count as landed repo work

Primary backend sources:

- `task.commitHash`
- task status `done`
- evidence final status when present
- execution-result callback effects in `/api/builder/tasks/:id/execution-result`

User-facing interpretation:

- "The code change has landed in repo terms."

### 7. Live verified

Meaning:

- the change is not only landed, but has also passed a live or post-push verification step

Primary backend sources:

- evidence runtime results
- deploy-wait / self-test related evidence when present
- external live verification surfaces such as health or route probes

User-facing interpretation:

- "The landed change has been confirmed against a running environment."

Note:

- this is currently a composed state, not a single clean backend task status

### 8. Stopped

Meaning:

- the workflow failed closed, was reverted, was discarded, or cannot proceed safely

Primary backend sources:

- `task.status`
  - `blocked`
  - `reverted`
  - `discarded`
- evidence false-success signal
- push blocked / recommendation / workflow simulation outcomes when present

User-facing interpretation:

- "The workflow did not continue and needs explanation before anything else."

## 2. Primary signals per phase

These are the things the user should see without clicking into drill-down detail.

### Created

- task title
- one-line goal
- created or updated time

### Planning

- current phase label: planning
- visible scope summary when available
- risk level
- policy profile

### Building

- worker activity summary
- elapsed time
- active actor or latest worker/model when visible
- changed scope summary

### Checking

- latest check summary
- count of runtime checks
- pass/fail direction
- counterexample summary when available

### Waiting for review

- explicit waiting label
- why it is waiting
- whether this is prototype review, human review, or push/recommendation boundary
- commit hash only if one already exists

### Landed

- landed label
- commit hash
- brief repo result summary
- whether live verification is still pending

### Live verified

- live-verified label
- live head or probe reference when available
- runtime verification summary

### Stopped

- stopped label
- short reason
- whether the stop was a block, revert, discard, or false-success warning

## 3. Drill-down signals

These appear only after user expansion.

### Must be in v0.1 drill-down

- condensed worker outputs
- observation actions
- latest opus-log actions
- evidence summary
- runtime results list
- review verdict summary

### Can wait until later

- full pool-chat transcript in the main timeline
- token micro-counters everywhere
- complete raw evidence JSON in the primary flow
- complete action-lane history as a first-class default surface

Those later views can remain specialist surfaces.

## 4. Maya as narrative voice

Maya is not a raw log printer.
Maya is the narrative layer that helps normal users follow the work.

### When Maya speaks

- when a task enters a new primary Tribune phase
- when the workflow begins waiting for review
- when a workflow stops and the user needs to understand why
- when a landed task becomes live verified

### Tone

- warm, calm, informative
- not robotic
- not euphoric
- short enough to help, not to dominate the screen

Examples:

- "Ich plane gerade den sichersten Weg fuer diesen Fix."
- "Ich pruefe die Aenderung jetzt gegen Runtime- und Review-Signale."
- "Ich brauche kurz deine Entscheidung, bevor ich weitergehe."

### When Maya stays quiet

- for very short internal transitions
- for repeated low-value micro-events
- when the event changes nothing meaningful for the user

## 5. Known gaps between contract and current backend truth

### Gap 1: primary phases are not stored directly as one clean backend field

Current reality:

- `task.status` captures only part of the story
- deeper truth is split across evidence, actions, observation, and external verification

Workaround in v0.1:

- derive Tribune phases from multiple existing signals in the frontend

Cleaner vNext:

- expose a dedicated Tribune view-model or normalized execution-state endpoint

### Gap 2: live verified is not a single canonical backend event

Current reality:

- live verification may come from evidence, self-test, deploy-wait context, or separate route probes

Workaround in v0.1:

- treat live verified as a composed frontend state

Cleaner vNext:

- emit an explicit post-landing verification summary for each task

### Gap 3: worker activity is observable but fragmented

Current reality:

- useful activity lives in observation chat-pool, actions, and opus logs

Workaround in v0.1:

- merge these into a frontend timeline rail

Cleaner vNext:

- backend emits already-condensed timeline events

### Gap 4: Maya voice triggers are implicit

Current reality:

- the backend does not emit dedicated "Maya narration" events per Tribune phase

Workaround in v0.1:

- the frontend derives narration from phase transitions

Cleaner vNext:

- explicit narration hooks or event summaries from backend orchestration

## 6. What this contract is not

- not a pixel-perfect mockup
- not a full replacement for `opusTaskOrchestrator.ts`
- not a replacement for Patrol Console
- not a replacement for specialist pool-chat or evidence surfaces
- not a multi-user collaboration design

## 7. Acceptance criteria for this contract

- the Tribune phase list is explicit
- each phase has a backend source path or composed-source note
- each phase has at least two primary user-facing signals when applicable
- Maya narration rules are explicit
- backend gaps are named honestly
- the contract stays short enough to drive implementation rather than replace it

## Next action

Implement the first Tribune timeline slice on `codex/k28j-truth-sync` using:

- `/api/builder/tasks/:id`
- `/api/builder/tasks/:id/evidence`
- `/api/builder/opus-bridge/observe/:taskId`

Do not add new backend endpoints in that next slice unless the frontend derivation proves insufficient.
