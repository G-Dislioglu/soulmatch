# Builder UI vs Backend Drift

Date: 2026-05-01
Scope: read-first diagnosis after `K2.9c`, then one narrow frontend contract fix in `client/src/modules/M16_builder/ui/PatrolConsole.tsx`

## Summary

Claude's drift claim was directionally useful but overstated.

The real picture is:

1. A concrete frontend-backend contract bug existed in `PatrolConsole`.
2. The main Builder task surface is flatter than the backend truth, but not blind.
3. The "static models vs real swarm" critique is true for `PatrolConsole`, but not for the whole Builder UI.
4. Patrol findings currently behave more like triage cards than taskable units. That is partly a feature gap, not only a rendering bug.

## Confirmed drift

### 1. Deep Patrol button had a real request/response mismatch

Frontend before fix:

- file: `client/src/modules/M16_builder/ui/PatrolConsole.tsx`
- request body: `{ findingId }`
- expected response shape: `DeepResult[]`

Backend contract:

- file: `server/src/routes/opusBridge.ts`
- endpoint: `POST /api/builder/opus-bridge/patrol-trigger-deep`
- required request body: `{ models: string[], files: string[] }`
- actual response shape: `{ ok: true, results: [...] }`

Backend deep-patrol implementation:

- file: `server/src/lib/scoutPatrol.ts`
- `runDeepPatrol(modelIds, targetFiles)` returns summary rows like:
  - `model`
  - `scanned`
  - `found`
  - `inserted`

Meaning:

- the old UI button could not truthfully trigger the backend contract
- even a successful response would have been parsed into the wrong shape

### 2. Task status is flatter than backend evidence truth

Frontend primary task list:

- file: `client/src/modules/M16_builder/hooks/useBuilderApi.ts`
- `BuilderTask` exposes only the shallow task row:
  - `status`
  - `commitHash`
  - token counters
  - timestamps

Backend and evidence layers store more:

- file: `server/src/schema/builder.ts`
- plus evidence endpoint in `server/src/routes/builder.ts`

Notably richer backend truth exists for:

- reviews
- runtime results
- counterexamples
- final evidence status
- false-success detection
- action lane history
- chat-pool history

The Builder Studio does show the evidence pack if you open a task, but the primary task chips still compress most of that state down to `task.status`.

That is a real representational flattening, but not total blindness.

### 3. PatrolConsole model selection is locally static

`PatrolConsole` hardcodes its visible routine/deep slots and model labels in the client file.

Meanwhile the backend patrol stack has its own model registry in `server/src/lib/scoutPatrol.ts`.

This means:

- the visible PatrolConsole slots are not sourced from backend truth
- label drift is possible
- model-id mapping must be maintained deliberately

This was part of the deep-patrol bug, because the backend expects model ids while the UI offered labels.

## Qualified / overstated claims

### 1. "The whole Builder UI shows static model slots"

Overstated.

`BuilderStudioPage` and `BuilderConfigPanel` already contain pool configuration and server sync paths:

- `client/src/modules/M16_builder/ui/BuilderConfigPanel.tsx`
- `syncPoolsToServer(...)`
- `loadPools()` / `savePools()`

So the static-model criticism is accurate for the standalone `PatrolConsole`, but not for the whole Builder surface.

### 2. "The UI says done while backend says blocked"

Possible in spirit, but not proven as a universal bug from the code read alone.

What is true:

- the primary task strip renders `task.status` directly
- richer truth exists in evidence and observation views
- backend callback logic distinguishes states like `push_candidate` and `review_needed`

What was not proven in this pass:

- a single universal wrong mapping where every blocked or non-landed task is shown as `done`

So this remains a narrower truth:

- main task status is under-modeled relative to backend evidence
- not every alleged "DONE despite not landed" case is proven from code alone

### 3. "Patrol findings should already be tasks"

Only partly.

Current backend findings are emitted as patrol/error-card records, not task records.
The frontend also has no "create Builder task from finding" affordance.

That is better described as:

- a missing task-bridge feature
- not only a rendering mismatch

## Narrow fix landed in this block

File changed:

- `client/src/modules/M16_builder/ui/PatrolConsole.tsx`

Fix scope:

1. use relative Builder API base instead of a hardcoded production URL
2. trigger deep patrol with the backend's real contract:
   - `models[]`
   - `files[]`
3. normalize backend `{ ok, results }` response into the UI card format
4. disable deep patrol when a finding has no usable `affectedFiles`

This does not solve the broader status/evidence flattening or dynamic patrol registry question.
It only closes the clearest frontend-backend contract break.

## Recommended next steps

### High confidence next UI block

Lift one richer outcome signal from evidence into the main Builder task surface, e.g.:

- landed vs not-landed
- review-needed vs done
- false-success detected

### Separate feature block

Add "create task from patrol finding" as an explicit task-bridge flow instead of treating patrol cards as passive notes.

### Optional later cleanup

Source patrol model choices from backend registry instead of local hardcoded labels.
