# Builder Benchmark K2.7d Free Runtime Subset Report

## Scope

- corridor: `K2.7d`
- mode: `free class_1 code-adjacent runtime subset`
- live baseline commit: `ef100dd`
- target: `server/src/routes/astro.ts`
- expected change: reject whitespace-only `profileId` in `/api/astro/calc`
- runner file: `server/scripts/builder-k27d-free-runtime-runner.ts`
- package script: `pnpm --dir server builder:k27d`

## Intended task

- keep the existing `/calc` route shape
- add a local trimmed `profileId`
- reject empty/whitespace-only `profileId`
- return `400` with:
  - `code=invalid_profile_id`
  - `message=profileId is required`
- do not modify any other file

## Preflight runtime truth

Before the Builder landing, live `/api/astro/calc` still accepted a
whitespace-only `profileId`.

- invalid probe:
  - request `profileId="   "`
  - response `200`
- valid control probe:
  - request `profileId="abc"`
  - response `200`

That made this a real runtime validation gap, not a style-only cleanup.

## Repo-visible landing

- landed commit: `1512f95f0049a8b2f3e624d1e3e43338f2a595d7`
- changed files:
  - `server/src/routes/astro.ts`

The landed edit is scope-clean and stays in one existing public route file.

## Live verification

After deploy, live `/api/astro/calc` changed exactly as intended:

- invalid probe:
  - request `profileId="   "`
  - response `400`
  - payload contains:
    - `code=invalid_profile_id`
    - `message=profileId is required`
- valid control probe:
  - request `profileId="abc"`
  - response `200`

Live runtime moved to:

- `commit=1512f95f0049a8b2f3e624d1e3e43338f2a595d7`

## Execution note

The local runner call itself timed out at the shell level before it could write
its final JSON report, but the remote branch and the live runtime both later
confirmed the exact single-file landing.

This is not a scope or governance failure. It is a runner-observation gap after
an otherwise successful free push.

## Outcome

- first free code-adjacent runtime case: `green`
- changed files: exactly one
- live proof: `green`
- free runtime category status after K2.7d:
  - `first proof exists`
  - `repeatability still deserves one more narrow follow-up before broadening`
