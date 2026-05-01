# Builder Tribune Audit v0.1

Date: 2026-05-01
Scope: current Builder frontend-backend relation for non-technical observability and user guidance

Inspected frontend files:

- `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx`
- `client/src/modules/M16_builder/ui/PatrolConsole.tsx`
- `client/src/modules/M16_builder/ui/PoolChatWindow.tsx`
- `client/src/modules/M16_builder/ui/BuilderConfigPanel.tsx`
- `client/src/modules/M16_builder/hooks/useBuilderApi.ts`
- `client/src/modules/M16_builder/hooks/useMayaApi.ts`

Inspected backend files:

- `server/src/routes/builder.ts`
- `server/src/routes/opusBridge.ts`
- `server/src/schema/builder.ts`
- `server/src/lib/scoutPatrol.ts`

## Executive verdict

For a technical operator, the Builder UI is usable.
For a non-technical observer, it is not yet a convincing "tribune" for the full workflow.

Current scores:

- User friendliness for non-technical users: 4/10
- Live observability while backend work is running: 3/10
- Backend truth availability: 8/10
- Frontend truth presentation: 5/10
- Frontend truth presentation in the primary task surface: 3/10

The core issue is not that the backend is silent.
The core issue is that the frontend scatters the truth across too many expert surfaces and does not elevate the most important live signals into one primary watchable flow.

## Main finding

The backend already knows much more than the primary Builder UI tells the user.

The frontend currently behaves like a mixed operator console:

- part task manager
- part Maya command center
- part evidence browser
- part patrol dashboard
- part hidden chat-pool monitor

That is workable for an engineer who already knows where to look.
It is not yet a spectator-friendly workflow surface for "what is happening right now, why, and what comes next?"

## Where the backend is already stronger than the UI

### 1. Rich task truth exists, but the main task strip shows mostly `status`

The shallow `BuilderTask` shape in `useBuilderApi.ts` exposes only:

- id
- title
- goal
- risk
- taskType
- policyProfile
- scope
- notScope
- requiredLanes
- status
- commitHash
- token counters
- timestamps

But backend truth is richer:

- evidence packs via `/api/builder/tasks/:id/evidence`
- canary/task audit via `/api/builder/tasks/:id/audit`
- live observation via `/api/builder/opus-bridge/observe/:taskId`
- actions, opus logs, chat pool, runtime results, counterexamples, false-success detection

The main Builder task strip in `BuilderStudioPage.tsx` still renders task chips as:

- `task.title`
- `task.status`

This is the largest observability gap.

### 2. Live activity exists, but is hidden behind specialist views

The system already has real live-ish signals:

- `PoolChatWindow.tsx` polls every 2 seconds
- `getTaskObservation(...)` exposes chat-pool entries, actions, and opus logs
- evidence and runtime results can be refreshed

But a normal user must already know that:

- pool chat exists
- which pool matters
- which task to select
- that observation is distributed across separate popups

So the data is there, but the experience is not centered around "watch the work happen".

### 3. Patrol is separated from the main decision flow

Patrol findings exist as cards and now the deep-patrol contract is aligned.
But patrol is still not integrated into the main task theatre:

- it does not naturally become a candidate task
- it is not shown as "finding -> triage -> builder action -> result"
- it still behaves like a side dashboard

For non-technical users, this feels like a separate tool, not part of one story.

## Why the current UI is not user-friendly enough

### 1. Too many metaphors at once

The page mixes:

- Maya character presence
- task CRUD
- approval controls
- pool configuration
- context memory
- patrol findings
- check results
- evidence JSON
- footer task chips

This creates cognitive overload.

A non-technical user does not see one main journey.
They see many expert instruments at once.

### 2. The currently running step is not staged clearly enough

When the backend works, the user needs one obvious answer:

"What is it doing right now?"

Today that answer is fragmented across:

- task `status`
- chat bubbles
- pool chat popups
- evidence pack after the fact
- patrol feed on demand

There is no single central "current phase / current actor / current file or scope / last meaningful event" rail.

### 3. Buttons are operator-centric, not audience-centric

Examples:

- `Run`
- `Approve`
- `Revert`
- `Approve Prototype`
- `Revise`
- `Discard`

These are valid operator controls, but they are not self-explaining to non-engineers.

The UI lacks surrounding human language such as:

- "Builder is ready for review"
- "No code was deployed yet"
- "This task passed tests but still needs human approval"
- "This task was blocked before push"

### 4. The evidence is present, but too late and too dense

The evidence panel is useful, but it is mostly a dense inspector surface.
For non-technical users, the first thing they need is not the raw evidence pack.
They need a summary like:

- planned
- building
- checking
- waiting for approval
- landed
- live pending
- blocked

Then, only if needed:

- files changed
- tests run
- runtime result
- reviews
- counterexamples

## Concrete frontend-backend relation today

### Relationship strengths

- Backend already produces enough truth for a strong live tribune.
- Frontend already has access to:
  - task status
  - evidence
  - observation
  - patrol status
  - patrol findings
  - pool state
  - Maya context

### Relationship weaknesses

- The primary UI surface promotes shallow task status over richer execution truth.
- Observation is distributed instead of staged.
- Patrol is visually and conceptually detached from the main task flow.
- `PatrolConsole` was historically contract-drifted from the backend and still uses a more local/static model vocabulary than the backend.
- The Builder page tries to be both cockpit and theatre, but currently prioritizes cockpit density over theatre clarity.

## Redesign recommendation

Do not redesign the Builder as "more panels".
Redesign it as a tribune with one primary narrative lane.

## Proposed target concept: Builder Tribune

### Primary layout

#### 1. Top "Now" rail

Always visible, single most important truth:

- selected task title
- plain-language current phase
- branch / commit relevance
- "landed" vs "not landed"
- "live" vs "live pending"
- last meaningful event timestamp

Example:

- "Checking runtime probes"
- "Waiting for human approval"
- "Blocked before push"
- "Landed on main, deploy pending"

#### 2. Center live timeline

Main theatre of the workflow.
This should combine existing backend truth into a chronological stream:

- task created
- classifying
- planning
- worker round
- review
- tests
- push candidate
- approval needed
- landed
- deploy/live verification

Each event should be rendered as a compact human-readable card, not raw JSON.

#### 3. Right decision rail

Only the active decision and action controls:

- current risk
- current scope
- current required decision
- buttons only when contextually valid

This avoids showing every control all the time.

#### 4. Lower inspector tabs

Secondary depth, not primary story:

- evidence
- files / diff
- checks
- patrol
- pool chat
- raw logs

These stay available for experts without being the first thing everyone sees.

## What can be improved without backend changes

This is important: the first strong redesign slice does not need major backend work.

Using existing endpoints, the frontend can already surface:

- task observation from `/opus-bridge/observe/:taskId`
- evidence from `/tasks/:id/evidence`
- task audit from `/tasks/:id/audit`
- live task row updates from `/tasks/:id`

So the first redesign step should be a view-model consolidation, not a backend rewrite.

## Recommended staged redesign plan

### Phase 1: Tribune view-model consolidation

Goal: one understandable live story from existing signals.

Frontend work:

- derive a display state from:
  - `task.status`
  - evidence final status
  - commit presence
  - runtime results
  - observation actions/logs
- introduce explicit viewer-facing labels like:
  - preparing
  - building
  - validating
  - needs approval
  - landed
  - live pending
  - blocked
  - reverted

This is the highest-value next block.

### Phase 2: Live timeline

Goal: let users watch the work happen without opening hidden pool windows.

Frontend work:

- convert observation + actions + logs into one merged timeline
- show actor, phase, short summary, timestamp
- allow expansion into details

### Phase 3: Patrol-to-task bridge

Goal: findings become actionable, not just visible.

Needed behavior:

- "Create Builder task from finding"
- prefill scope from `affectedFiles`
- carry the finding id into the task narrative

### Phase 4: Dynamic patrol registry

Goal: stop maintaining separate client patrol model vocabulary by hand.

Either:

- expose backend patrol model registry to the UI
- or define one shared model registry contract

## Critical design principle going forward

For non-technical users, the Builder must answer four questions at all times:

1. What is it doing right now?
2. Why is it doing that?
3. Is it safe, blocked, landed, or waiting for me?
4. What changed in the last minute?

If the page cannot answer those four questions in under five seconds, it is still an operator console, not a tribune.

## Recommended next concrete build block

Not another patrol-specific fix.

The next highest-value implementation block is:

- add a user-facing "execution state rail" to `BuilderStudioPage.tsx`
- driven by existing task + evidence + observation data
- with plain-language states instead of raw backend status only

That would be the first real step from cockpit to tribune.
