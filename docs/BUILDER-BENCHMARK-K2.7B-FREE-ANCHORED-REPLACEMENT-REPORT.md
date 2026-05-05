# Builder Benchmark K2.7b Free Anchored Replacement Report

## Scope

- corridor: `K2.7b`
- mode: `free class_1 anchored replacement`
- target: `docs/archive/k26c-helper-smoke.txt`
- expected change: replace exact line content only
- runner file: `server/scripts/builder-k27b-free-anchored-runner.ts`

## Intended task

- replace `K2.6c create-target tiny helper smoke`
- with `K2.7b anchored helper replacement smoke`
- do not modify any other file

## Repo-visible landing

- landed commit: `0b2b8c39d0a3a44a006773e8004d327302e1a7e7`
- changed files:
  - `docs/archive/k26c-helper-smoke.txt`

The landed repo state is exact and scope-clean.

## What went wrong in the lane

The first free-lane evidence for `K2.7b` did **not** come back as a clean
`success`.

The direct raw response returned:

- `taskClass=class_1`
- `executionPolicy=allow_push`
- `pushAllowed=true`
- `recommendedAction=allow_push`

but the push phase still reported:

- `status=error`
- `landed=false`
- `error=push did not land ... empty_staged_diff`

Despite that false-negative callback truth, `main` had already advanced and the
target file had landed exactly once with the requested replacement.

## Meaning

`K2.7b` is valid evidence that a non-governance free anchored replacement in
the docs/helper corridor can land on `main`.

It is **not** valid evidence that the lane was already repeatable or that the
callback/landing truth was healthy at that point.

## Follow-up fix

The narrow repo-visible hardening that followed was:

- `fab0d97` `fix(builder): harden patch fallback overwrite dispatch`
- `1ea46d7` `fix(builder): fetch patch fallback baseline from main`

These two commits are the explicit bridge from the noisy `K2.7b` landing truth
to the cleaner repeatability check in `K2.7c`.

## Outcome

- exact non-governance single-file anchored replacement: `green but noisy`
- callback/landing truth for this lane at the time: `not yet trustworthy`
- next required proof after K2.7b: `repeat the same corridor on matching live fix`
