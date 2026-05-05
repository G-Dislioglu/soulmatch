# Builder Benchmark K2.7c Free Anchored Replacement Report

## Scope

- corridor: `K2.7c`
- mode: `free class_1 anchored replacement`
- live baseline commit: `1ea46d7`
- target: `docs/archive/k27a-free-class1-smoke.txt`
- expected change: replace one exact anchored line only
- runner file: `server/scripts/builder-k27c-free-anchored-runner.ts`
- package script: `pnpm --dir server builder:k27c`

## Intended task

- replace `single-file create-target`
- with `single-file anchored replacement`
- do not modify any other file

## Result

- response `status=success`
- `taskClass=class_1`
- `executionPolicy=allow_push`
- `pushAllowed=true`
- `landed=true`
- `verifiedCommit=ef100dd1869db18f7efc306f2f8f5a0392233ebc`
- changed files:
  - `docs/archive/k27a-free-class1-smoke.txt`

## Why this matters

`K2.7c` is the first clean repeatability proof for the free anchored
replacement lane after the patch-fallback hardening.

Unlike `K2.7b`, this run did not need a raw replay or a post-hoc git
interpretation. The runner saw a normal green result and the remote head matched
the verified commit.

## Corridor reading after K2.7c

The docs/helper free `class_1` subset now has repo-visible proof for:

- exact single-file append
- exact single-file explicit create-target
- exact non-governance single-file anchored replacement

This does **not** widen free execution to:

- governance-document anchored replacements
- multi-file edits
- builder-core
- code-adjacent runtime edits
- `class_2` or `class_3`

## Outcome

- exact non-governance single-file anchored replacement: `green`
- repeatability on matching live fix: `green`
- next sensible widening step: `only if needed, first free code-adjacent low-risk runtime class_1 probe`
