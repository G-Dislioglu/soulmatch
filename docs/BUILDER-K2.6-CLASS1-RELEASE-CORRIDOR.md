# Builder K2.6 Class_1 Release Corridor

## Status

- status: `free_class1_corridor_operational_single_file_green`
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
- first free docs/helper subset `K2.7a`
- first free non-governance anchored replacement landing `K2.7b`
- first clean repeatability proof for that lane `K2.7c`
- first free code-adjacent runtime validation proof `K2.7d`
- second free code-adjacent runtime validation proof `K2.7e`
- third free code-adjacent runtime validation proof `K2.7f`
- first operational free-corridor boundary probe `K2.8a`
- first narrowed operational free subset `K2.8b`
- first real operational free runtime run inside that subset `K2.8c`
- local builder-core hardening rerun for the two `K2.8a` fail-closed forms `K2.8d`
- live dry-run approve proof for those two former fail-closed forms `K2.8e`
- live T03 repeatability recheck on the hardened head `K2.8f`
- live non-dry landing for the former T03 create-target `K2.8g`
- live non-dry landing for the former T01 docs append `K2.8h`

Relevant verified commits:

- `0738700`
- `df13183`
- `3b0236a`
- `427235a`
- `52a7175`
- `adc593a`
- `abd1d3f`
- `7c3bce7`
- `21d7a3d`
- `0b2b8c3`
- `ef100dd`
- `1512f95`
- `b6b85d0`
- `0702adc`
- `2dbab36`
- `2ee184b`
- `10d4e13`
- `385cf22`
- `7f95aac`
- `88e2d5a`
- `6e1ea41`

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

Currently free only when all of these stay true:

- target stays inside docs/helper-style paths
- target is not itself a governance or policy document
- replacement is exact and local

### C. Single-file code-adjacent low-risk runtime edits

Allowed:

- one exact existing runtime file
- one small cleanup, validation, or guard improvement
- low-risk route or helper path
- no product-semantics expansion
- no additional touched files

Controlled-push examples so far:

- log cleanup in `server/src/routes/health.ts`
- root guard hardening in `server/src/routes/health.ts`
- whitespace validation hardening in `server/src/routes/numerology.ts`

Free adoption is currently narrower than the controlled examples above.

Currently free only when all of these stay true:

- one exact existing public route file
- one local validation or guard hardening only
- no route-shape expansion
- direct live probe exists before and after the landing

First free proof so far:

- whitespace-only `profileId` rejection in `server/src/routes/astro.ts`
- whitespace-only `aProfileId` rejection in `server/src/routes/match.ts`
- whitespace-only `profileId` rejection in `server/src/routes/scoring.ts`
- whitespace-only `startDate` rejection in `server/src/routes/journey.ts`

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

The currently adopted free Builder subset is:

1. exact single-file docs/helper edits
2. exact non-governance single-file anchored replacements inside docs/helper
   paths
3. exact single-file public-route validation/guard fixes with direct live proof
4. tiny or larger exact docs append inside docs/helper paths
5. explicit single-line or exact multi-line helper create-targets

Do **not** start free operation with:

- controller rewrites
- product-surface features
- builder-core
- secrets/deploy/auth
- multi-file consistency work
- governance/policy docs as anchored-replacement targets
- broader free code-adjacent runtime edits before a second narrow repeatability
  proof

## Decision output

The narrow credible statement after `K2.8c` is:

> Builder may freely execute a very narrow audited `class_1` corridor covering
> exact single-file docs/helper edits including larger-file append and explicit
> multi-line helper create-targets, exact non-governance anchored single-file
> replacements inside docs/helper paths, plus exact single-file public-route
> validation/guard fixes with direct live proof and repeatability across
> multiple route families including a real operational runtime run in
> `server/src/routes/journey.ts`, while multi-file work, broader runtime work
> and all other categories remain outside free autonomy.

Hardening and landing addendum after `K2.8d` to `K2.8h`:

> The earlier `K2.8a` fail-closed cases for larger docs append and multi-line
> helper create-target were in fact judge/snapshot evidence presentation
> problems on the old head. `7f95aac` landed the narrow preview hardening,
> `K2.8f` re-approved T03 on the hardened live head, and `K2.8g` plus
> `K2.8h` then landed both former rest cases non-dry, scope-clean and
> runtime-matching.
