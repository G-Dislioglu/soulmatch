# Builder Benchmark K2.9B Observer Runtime Report

## Scope

- corridor: `K2.9b`
- mode: `supervised observer runtime trial in a fresh public-route family`
- repo head before batch: `ce16473`
- live runtime head during probes: `52bdeac`
- target: `server/src/routes/zimage.ts`
- expected change: reject invalid `type` on `POST /api/zimage/generate` before
  prompt selection or the external fal.ai call
- runner file: `server/scripts/builder-k29b-observer-runtime-runner.ts`
- package script: `pnpm --dir server builder:k29b`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k29b-observer-runtime-results.json`

## Intended task

- keep scope to one existing public route file
- add one local allowlist guard for `type`
- reject anything except `room` or `persona`
- do not modify `/api/zimage/batch`
- do not modify `/api/zimage/prompts`
- do not touch any other file

## Preflight runtime truth

Before the Builder run, live `/api/zimage/generate` accepted a bogus `type`
value and still generated a real image:

- invalid probe:
  - request `{"type":"bogus","id":"maya"}`
  - response `200`
  - payload contained a real fal-hosted image URL
- family control:
  - `GET /api/zimage/prompts`
  - response `200`

That made this a real public-route contract defect with an external-service cost
surface, not a synthetic dry-run curiosity.

## Builder result

The task did not land.

- status: `partial`
- taskClass: `class_2`
- executionPolicy: `dry_run_only`
- pushAllowed: `false`
- landed: `null`
- verifiedCommit: none
- changedFiles: none

The workflow simulation summary was:

> `Workflow simulation gate requires review before push: class_2 requires approved plan + approvalId before live push.`

## Outcome

This batch is a useful deviation, not a failed experiment.

What it proved:

- Builder did not silently widen this external-service route fix into a free
  push
- the same narrow single-file public-route shape that was free in cheaper
  route families does not automatically stay free in a provider-backed
  image-generation family
- the current Builder reading is conservative around this external-cost and
  provider-coupled seam

What it did not prove:

- it did not prove that the route is safe
- it did not fix the bug
- it did not widen the free corridor

## Live state after run

Because no commit landed, the live route stayed unchanged on the same runtime
head:

- invalid probe after batch:
  - request `{"type":"bogus","id":"maya"}`
  - response `200`
  - payload still contained a real fal-hosted image URL
- family control after batch:
  - `GET /api/zimage/prompts`
  - response `200`

## Meaning

`K2.9b` tightens the Builder truth in a valuable way:

- Builder is already operational as a supervised free worker in the released
  narrow `class_1` lane
- but that lane does not currently generalize to fresh public-route families
  with direct external image-generation effects

In other words:

> supervised free Builder operation is real, but still lane-specific

## Recommended next step

There are now two honest next options:

1. if the goal is more Builder measurement:
   - run an explicitly approval-backed observer trial next, because `K2.9b`
     has already shown that this family widens to `class_2`
2. if the goal is product correctness:
   - treat `/api/zimage/generate` invalid-type handling as a normal direct repo
     hotfix decision, not as free Builder evidence
