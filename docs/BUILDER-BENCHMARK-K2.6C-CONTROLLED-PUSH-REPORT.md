# Builder Benchmark K2.6c Controlled Push Report

## Scope

- corridor: `K2.6c`
- mode: `live controlled push`
- task: `K26C-T01`
- instruction shape: exact single-file docs append
- target file: `docs/archive/push-test.md`

## Runtime basis

- repo head that landed the task: `0738700`
- live code head during execution: `9f978e6`
- endpoint path: `/api/builder/opus-bridge/opus-task`
- request mode: `dryRun=false`, `sideEffects.mode=none`, `acceptanceSmoke=true`

## Outcome

- result: `pass`
- current repo head after the first three audited K2.6c families: `3b0236a`
- current live code head during the third family execution: `df13183`

### K26C-T01

- shape: exact single-file docs append
- status: `success`
- `taskClass`: `class_1`
- `executionPolicy`: `allow_push`
- `pushAllowed`: `true`
- `landed`: `true`
- `verifiedCommit`: `073870033853e7fcdd306efe4b6833a1959079b9`
- changed files: `docs/archive/push-test.md`
- follow-up drift after wait: none observed

### K26C-T02

- shape: exact single-file anchored replacement
- status: `success`
- `taskClass`: `class_1`
- `executionPolicy`: `allow_push`
- `pushAllowed`: `true`
- `landed`: `true`
- `verifiedCommit`: `df13183b2d05b421674d7c56806da9da1a8b27aa`
- changed files: `docs/archive/push-test.md`
- follow-up drift after wait: none observed

### K26C-T03

- shape: exact single create-target tiny helper file
- status: `success`
- `taskClass`: `class_1`
- `executionPolicy`: `allow_push`
- `pushAllowed`: `true`
- `landed`: `true`
- `verifiedCommit`: `3b0236a98f7ec1387b43dc34dda60dfb7bf6a420`
- changed files: `docs/archive/k26c-helper-smoke.txt`
- follow-up drift after wait: none observed

## What landed

K26C-T01 appended exactly one new line to `docs/archive/push-test.md`:

`K2.6c controlled class_1 push smoke marker`

K26C-T02 replaced exactly one anchored string in the same file:

`K2.5 class_1 smoke marker` -> `K2.5 class_1 smoke marker.`

No extra file was changed in either run, and both tasks remained inside the explicit single-file scope.

K26C-T03 created exactly one new file:

`docs/archive/k26c-helper-smoke.txt`

with exactly this content:

`K2.6c create-target tiny helper smoke`

## Judge / candidate signal

- K26C-T01
  - judge lane: `grok`
  - winning worker: `minimax`
  - winning edit mode: `patch`
  - winning reason: precise append at the file end without broad overwrite or extra scope
- K26C-T02
  - repo-visible winner: exact single-file anchored replacement on `docs/archive/push-test.md`
  - live runtime that executed the run was still on code head `0738700`
  - initial runner failure was a harness-only verification bug: the new remote commit was not fetched locally before `git show`
  - that verification gap is now closed in `server/scripts/builder-k26c-push-runner.ts`

## Meaning

This is now the first three repo-visible green K2.6c pushes inside the narrow audited free `class_1` corridor.

It does **not** mean:

- general Builder autonomy is now free
- `class_2` or `class_3` changed status
- multi-file or product-semantic work is now autonomous

It does mean:

- the current Builder line can complete at least one narrow live `class_1` push case end-to-end
- the next meaningful gate is another audited K2.6c family, not a broad autonomy claim

## Recommended next step

K2.6c itself is now complete as an audited narrow docs/helper corridor.

The next meaningful step is **not** to claim general free `class_1`.

The next meaningful step is:

1. one code-adjacent controlled `class_1` push family, still single-file and tightly scoped

Only after that should a broader free `class_1` release decision be reconsidered.
