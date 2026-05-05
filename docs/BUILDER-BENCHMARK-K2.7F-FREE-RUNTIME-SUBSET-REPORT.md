# Builder Benchmark K2.7f Free Runtime Subset Report

## Scope

- corridor: `K2.7f`
- mode: `free class_1 code-adjacent runtime subset`
- live baseline commit: `b6b85d0`
- target: `server/src/routes/scoring.ts`
- expected change: reject whitespace-only `profileId` in `/api/scoring/calc`
- runner file: `server/scripts/builder-k27f-free-runtime-runner.ts`
- package script: `pnpm --dir server builder:k27f`

## Intended task

- keep the existing `/calc` route shape
- add a local trimmed `profileId`
- reject empty/whitespace-only `profileId` with the existing `400` error:
  - `profileId, numerologyA, and numerologyB are required`
- pass the trimmed `profileId` into `calculateScore(...)`
- do not modify any other file

## Preflight runtime truth

Before the Builder landing, live `/api/scoring/calc` still accepted a
whitespace-only `profileId`.

- invalid probe:
  - request `profileId="   "`
  - response `200`
- valid control probe:
  - request `profileId="abc"`
  - response `200`

That made this a third real runtime validation gap, not a style-only cleanup.

## Repo-visible landing

- landed commit: `0702adc175f4b2bdb07240084e0f1ce9cb239cca`
- changed files:
  - `server/src/routes/scoring.ts`

The landed edit is scope-clean and stays in one existing public route file.

## Live verification

After deploy, live `/api/scoring/calc` changed exactly as intended:

- invalid probe:
  - request `profileId="   "`
  - response `400`
  - payload contains:
    - `profileId, numerologyA, and numerologyB are required`
- valid control probe:
  - request `profileId="abc"`
  - response `200`

Live runtime moved to:

- `commit=0702adc175f4b2bdb07240084e0f1ce9cb239cca`

## Outcome

- third free code-adjacent runtime case: `green`
- changed files: exactly one
- live proof: `green`
- free runtime category status after K2.7f:
  - `repeatability exists across three distinct public-route validation cases`
  - `still not evidence for broad runtime autonomy or multi-file freedom`
