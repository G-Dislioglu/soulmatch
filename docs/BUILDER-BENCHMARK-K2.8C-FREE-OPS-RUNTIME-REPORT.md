# Builder Benchmark K2.8c Free Ops Runtime Report

## Scope

- corridor: `K2.8c`
- mode: `first real free operational runtime run inside the released narrow class_1 corridor`
- live baseline commit: `912c2e8`
- target: `server/src/routes/journey.ts`
- expected change: reject whitespace-only `startDate` in `/api/journey/optimal-dates` by trimming required date fields before calculation
- runner file: `server/scripts/builder-k28c-free-runtime-runner.ts`
- package script: `pnpm --dir server builder:k28c`

## Intended task

- keep the existing `/optimal-dates` route shape
- add local trimmed `startDate`, `endDate`, and `birthDate`
- keep the existing `400` payload:
  - `error=invalid_request`
  - `message=eventType, startDate, endDate, birthDate required`
- pass the trimmed dates into `calculate(...)`
- do not modify any other route, helper, type, or file

## Preflight runtime truth

Before the Builder landing, live `/api/journey/optimal-dates` still accepted a
whitespace-only `startDate`.

- invalid probe:
  - request `startDate="   "`
  - response `200`
- valid control probe:
  - request `startDate="2026-05-01"`
  - response `200`

That made this a real runtime validation gap inside a stateless public route,
not a docs-only or style-only cleanup.

## Repo-visible landing

- landed commit: `385cf2261a9dcfb35e5158c82dadb585a891d7c9`
- changed files:
  - `server/src/routes/journey.ts`

The landed edit is scope-clean and stays in one existing public route file.

## Live verification

After deploy, live `/api/journey/optimal-dates` changed exactly as intended:

- invalid probe:
  - request `startDate="   "`
  - response `400`
  - payload contains:
    - `error=invalid_request`
    - `message=eventType, startDate, endDate, birthDate required`
- valid control probe:
  - request `startDate="2026-05-01"`
  - response `200`

Live runtime moved to:

- `commit=385cf2261a9dcfb35e5158c82dadb585a891d7c9`

## Outcome

- first real free operational runtime run after the K2.8a/K2.8b split: `green`
- changed files: exactly one
- live proof: `green`
- free runtime category status after K2.8c:
  - `operationally green across four public-route validation families`
  - `still not evidence for broad runtime autonomy, multi-file work, or builder-core freedom`

## Meaning

`K2.8c` is the first true operational free runtime run inside the already
released narrow corridor, not just another benchmark repeat.

It proves that the current free class_1 corridor is usable not only for
docs/helper forms, but also for an additional exact single-file public-route
validation fix on a stateless runtime path.

It does **not** widen free execution to:

- multi-file runtime work
- builder-core or gate-policy changes
- provider, deploy, auth, or secrets targets
- broader helper/docs append forms
- multi-line create-targets
- `class_2` or `class_3`
