# Builder Benchmark K2.9C Class_2 Approved Runtime Report

## Scope

- corridor: `K2.9c`
- mode: `supervised approval-backed observer runtime trial`
- repo head before batch: `1f96674`
- live runtime head before probes: `1f96674`
- landed runtime head after batch: `2bbc232`
- target: `server/src/routes/zimage.ts`
- expected change: reject invalid `type` on `POST /api/zimage/generate` before
  prompt selection or the external fal.ai call
- runner file: `server/scripts/builder-k29c-class2-approved-runner.ts`
- package script: `pnpm --dir server builder:k29c`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k29c-class2-approved-results.json`

## Intended task

- keep scope to one existing public route file
- add one local allowlist guard for `type`
- reject anything except `room` or `persona`
- do not modify `/api/zimage/batch`
- do not modify `/api/zimage/prompts`
- do not touch any other file

## Approval lane

- approvalId: `a236893b-5e13-4adc-8a23-4ac4f1ee8013`
- live approval validation: `valid=true`
- instruction fingerprint:
  `sha256:6ec505ed74d0bd6bb4490497943673ca83e41964fbd45e1b634c2c795bdfa66f`
- scope fingerprint:
  `sha256:562c17ee2c4df6af156157f2de040dad6a963941c7c8a01821c4a03459a33e3b`

This batch was therefore not a direct repo hotfix bypass and not a free-lane
claim. It was an explicit approved `class_2` Builder run.

## Preflight runtime truth

Before the Builder run, live `/api/zimage/generate` accepted a bogus `type`
value and still generated a real image:

- invalid probe:
  - request `{"type":"bogus","id":"maya"}`
  - response `200`
  - payload snippet contained a real fal-hosted image URL
- family control:
  - `GET /api/zimage/prompts`
  - response `200`

That made this a real public-route contract bug with an external-service cost
surface.

## Builder result

The task landed cleanly through the approved `class_2` lane.

- status: `success`
- taskClass: `class_2`
- executionPolicy: `allow_push`
- pushAllowed: `true`
- landed: `true`
- verifiedCommit: `2bbc232`
- changedFiles: `server/src/routes/zimage.ts`
- scopeClean: `true`
- runtimeMatchedVerifiedCommit: `true`
- assessment: `pass`

The Builder summary was:

> `142s | deepseek | server/src/routes/zimage.ts`

## Live state after run

After deploy, the same invalid body failed closed and the cheap family control
stayed healthy:

- invalid probe after batch:
  - request `{"type":"bogus","id":"maya"}`
  - response `400`
  - payload snippet: `{"error":"Unknown type: bogus"}`
- family control after batch:
  - `GET /api/zimage/prompts`
  - response `200`

## Meaning

`K2.9c` closes the open `zimage` cost bug and also proves a more important
Builder point:

- the free Builder corridor still stays narrow and lane-specific
- but the approval-backed `class_2` path is now also live-proven on a fresh
  provider-/cost-backed public route family

In other words:

> Builder is not broadly free, but it is now operational both in the released
> narrow free `class_1` lane and in the approval-backed `class_2` lane.

## What this batch does not justify

- it does not widen the free corridor
- it does not prove multi-file autonomy
- it does not prove schema, auth, deploy, builder-core, or policy edits
- it does not prove that every fresh public route family will classify the same
  way

## Recommended next step

There is no immediate `zimage` repair rest anymore.

If Builder measurement continues, the next honest step is either:

1. a second approval-backed observer trial on a different fresh route family, or
2. a deliberate stop, with the current conclusion recorded as sufficient:
   free narrow `class_1` plus approved fresh-family `class_2` are both
   operational, but broad free autonomy remains unproven.
