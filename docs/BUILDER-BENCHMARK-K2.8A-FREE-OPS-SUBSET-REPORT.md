# Builder Benchmark K2.8a Free Ops Subset Report

## Scope

- corridor: `K2.8a`
- mode: `first free operational class_1 subset`
- live baseline commit: `4a40bb4`
- basis: released narrow docs/helper corridor only
- runner file: `server/scripts/builder-k28a-free-ops-runner.ts`
- package script: `pnpm --dir server builder:k28a`

## Tasks

### K28A-T01

- type: exact single-file docs append
- target: `docs/archive/push-test.md`
- expected action: append exactly one new line
- result: `blocked`

### K28A-T02

- type: non-governance single-file anchored replacement
- target: `docs/archive/k27a-free-class1-smoke.txt`
- expected action: replace one exact helper line only
- landed commit: `2dbab36ad4d19661c0ca7112dcab2f2ca25f67ca`
- result: `pass`

### K28A-T03

- type: exact single-file helper create-target
- target: `docs/archive/k28a-free-class1-ops-smoke.txt`
- expected action: create exactly one file with exactly three lines
- result: `blocked`

## Execution truth

`K2.8a` was intentionally the first operational free-corridor probe after the
earlier `K2.7*` evidence line.

The result was mixed but useful:

- `T02` landed cleanly on `main`
- `T01` failed closed as `dry_run_only`
- `T03` failed closed as `dry_run_only`

This did **not** show a corridor collapse. It showed a narrower operational
truth:

- free helper/doc anchored replacement is reliable
- append on a larger existing docs file is still brittle
- multi-line helper create-target is still brittle

## Why T01 stopped

`T01` did not widen scope or hit a protected path.

It stopped because the judge rejected all candidates as not proving an exact
append without touching other lines. The fail-closed outcome was therefore
correctly conservative.

## Why T03 stopped

`T03` also did not stop for class or scope reasons.

It stopped because the preview flattened the intended three-line helper file
into a single-line-looking result. For a corridor that demands exactness, that
must remain fail-closed.

## Verified landing

The one green task stayed exact and scope-clean:

- `2dbab36` changed only `docs/archive/k27a-free-class1-smoke.txt`
- the anchored helper replacement landed exactly as intended

## Outcome

- anchored helper replacement inside the free corridor: `green`
- docs append on a larger existing file: `not yet operationally reliable`
- multi-line helper create-target: `not yet operationally reliable`

## Meaning

`K2.8a` is the first operational boundary report for the free `class_1`
corridor.

It proves that the right next step is **not** broadening the corridor, but
narrowing the operational subset to the forms that actually stay repeatable
under free execution.
