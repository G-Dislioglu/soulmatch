# Builder Benchmark K2.7e Free Runtime Subset Report

## Scope

- corridor: `K2.7e`
- mode: `free class_1 code-adjacent runtime subset`
- live baseline commit: `1512f95`
- target: `server/src/routes/match.ts`
- expected change: reject whitespace-only `aProfileId` or `bProfileId` in `/api/match/calc`
- runner file: `server/scripts/builder-k27e-free-runtime-runner.ts`
- package script: `pnpm --dir server builder:k27e`

## Intended task

- keep the existing `/calc` route shape
- add local trimmed `aProfileId` and `bProfileId`
- reject empty/whitespace-only ids with the existing `400` error:
  - `aProfileId and bProfileId are required`
- pass the trimmed ids into `calculateMatch(...)`
- do not modify any other file

## Preflight runtime truth

Before the Builder landing, live `/api/match/calc` still accepted a
whitespace-only `aProfileId`.

- invalid probe:
  - request `aProfileId="   "`
  - response `200`
- valid control probe:
  - request `aProfileId="a"`, `bProfileId="b"`
  - response `200`

That made this a second real runtime validation gap, not a style-only cleanup.

## Repo-visible landing

- landed commit: `b6b85d0140d16a6274535689bbdab5507a2d0d11`
- changed files:
  - `server/src/routes/match.ts`

The landed edit is scope-clean and stays in one existing public route file.

## Live verification

After deploy, live `/api/match/calc` changed exactly as intended:

- invalid probe:
  - request `aProfileId="   "`
  - response `400`
  - payload contains:
    - `aProfileId and bProfileId are required`
- valid control probe:
  - request `aProfileId="a"`, `bProfileId="b"`
  - response `200`

Live runtime moved to:

- `commit=b6b85d0140d16a6274535689bbdab5507a2d0d11`

## Outcome

- second free code-adjacent runtime case: `green`
- changed files: exactly one
- live proof: `green`
- free runtime category status after K2.7e:
  - `repeatability exists for a second public-route validation case`
  - `still not evidence for broad runtime autonomy`
