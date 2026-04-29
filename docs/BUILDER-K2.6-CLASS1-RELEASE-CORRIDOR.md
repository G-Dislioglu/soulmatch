# Builder K2.6 Class_1 Release Corridor

## Status

- status: `decision_prep_ready`
- basis: `repo_visible_plus_runtime_probe`
- scope: `narrow_free_class_1_only`
- not included: `class_2`, `class_3`, multi-file, protected, builder-core

## Purpose

This document does **not** claim that Builder may now work freely in general.

It defines the narrowest credible subset of `class_1` work that now has enough
repo-visible and live-visible evidence to be considered for **free Builder
execution**.

## Evidence line

The current corridor is based on:

- local and live dry-run hardening through `K2.6a` and `K2.6b`
- controlled push corridor `K2.6c`
- first code-adjacent marker push `K2.6d`
- first runtime cleanup push `K2.6e`
- first runtime guard hardening push `K2.6f`
- first public-route validation hardening push `K2.6g`

Relevant verified commits:

- `0738700`
- `df13183`
- `3b0236a`
- `427235a`
- `52a7175`
- `adc593a`
- `abd1d3f`

## Candidate free corridor

### A. Exact single-file docs/helper edits

Allowed:

- one exact existing file or one explicit create-target helper file
- no extra files
- no product-surface logic change

### B. Exact single-file anchored replacements

Allowed:

- one exact existing file
- one local anchored replacement
- no structural rewrite
- no fallback overwrite outside the anchor

### C. Single-file code-adjacent low-risk runtime edits

Allowed:

- one exact existing runtime file
- one small cleanup, validation, or guard improvement
- low-risk route or helper path
- no product-semantics expansion
- no additional touched files

Proven examples so far:

- log cleanup in `server/src/routes/health.ts`
- root guard hardening in `server/src/routes/health.ts`
- whitespace validation hardening in `server/src/routes/numerology.ts`

## Corridor preconditions

A task should count as free-corridor eligible only if all of these stay true:

1. `taskClass=class_1`
2. exactly one scope path or one explicit create target
3. no protected/manual-only path
4. no approval requirement
5. judge approved
6. changed files stay at `<=1`
7. scope remains clean
8. no follow-up commit drift
9. server/client build lane stays green when applicable
10. direct runtime proof exists when the path is externally testable

## Explicit non-corridor

The following remain outside free Builder operation:

- any `class_2` task
- any `class_3` or protected/manual-only path
- any multi-file patch
- any builder-core or gate-policy change
- any auth, secrets, deploy, workflow, billing, or provider-core edit
- any DB schema or migration edit
- any instruction that implies broad product semantics
- any task without clear scope or verifiable acceptance

## Operational stop rules

Stop free-corridor use immediately if any of these appear:

- more than one changed file
- any out-of-scope file
- unexpected task-class widening
- provider collapse dominating the run
- no verifiable landed commit
- no verifiable runtime proof where proof should exist

## Recommended immediate use

If this corridor is adopted, the safest first free Builder subset is:

1. exact single-file docs/helper edits
2. exact single-file anchored replacements
3. single-file low-risk runtime cleanup/validation/guard fixes

Do **not** start free operation with:

- controller rewrites
- product-surface features
- builder-core
- secrets/deploy/auth
- multi-file consistency work

## Decision output

The narrow credible statement after `K2.6g` is:

> Builder may freely execute a very narrow audited `class_1` corridor covering
> exact single-file docs/helper edits, exact anchored single-file replacements,
> and single-file low-risk code-adjacent runtime cleanup/validation/guard fixes,
> while all broader work remains outside free autonomy.
