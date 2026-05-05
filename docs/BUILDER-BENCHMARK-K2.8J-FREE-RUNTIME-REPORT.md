# Builder Benchmark K2.8j Free Runtime Report

## Scope

- corridor: `K2.8j`
- mode: `new free operational runtime run inside the released narrow class_1 corridor`
- live baseline commit: `199e7ae`
- target: `server/src/routes/guide.ts`
- expected change: reject whitespace-only `systemPrompt` and `userMessage` in `POST /api/guide` by trimming both fields before the provider call
- runner file: `server/scripts/builder-k28j-free-runtime-runner.ts`
- package script: `pnpm --dir server builder:k28j`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28j-free-runtime-results.json`

## Intended task

- keep the existing `POST /guide` route shape
- add local trimmed `systemPrompt` and `userMessage`
- keep the existing `400` payload:
  - `error=Missing systemPrompt or userMessage`
- pass the trimmed prompt values into the provider request
- do not modify any other route, helper, provider table, type, or file

## Preflight runtime truth

Before the Builder landing, live `/api/guide` still accepted both whitespace-only
prompt forms.

- invalid probe A:
  - request `systemPrompt="   "`
  - response `200`
- invalid probe B:
  - request `userMessage="   "`
  - response `200`
- valid control probe:
  - request `systemPrompt="system"` and `userMessage="hello"`
  - response `200`

That made this a real runtime validation gap on a public route, not a docs-only
cleanup or a synthetic dry-run artifact.

## Repo-visible landing

- landed commit: `b2fcc3aa0f7253218537740f1a21a3600009c6b0`
- changed files:
  - `server/src/routes/guide.ts`

The landed edit is scope-clean and stays in one existing public route file.

## Live verification

After deploy, live `/api/guide` changed exactly as intended:

- invalid probe A:
  - request `systemPrompt="   "`
  - response `400`
  - payload contains `error=Missing systemPrompt or userMessage`
- invalid probe B:
  - request `userMessage="   "`
  - response `400`
  - payload contains `error=Missing systemPrompt or userMessage`
- valid control probe:
  - request `systemPrompt="system"` and `userMessage="hello"`
  - response `200`
  - payload still contains a normal `text` field

Live runtime moved to:

- `commit=b2fcc3aa0f7253218537740f1a21a3600009c6b0`

## Outcome

- new free runtime validation family: `green`
- changed files: exactly one
- live proof: `green`
- free runtime category status after `K2.8j`:
  - `operationally green across five public-route validation families`
  - `still not evidence for broad runtime autonomy, multi-file work, or builder-core freedom`

## Meaning

`K2.8j` extends the released corridor with one more exact single-file public-route
validation fix on a cheap live probe path.

It proves that the current free class_1 corridor is usable not only for the
already hardened `journey`, `astro`, `match`, and `scoring` validation seams,
but also for a provider-backed public route where whitespace-only prompt input
must fail closed before the external call.
