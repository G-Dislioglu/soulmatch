# Builder K2.6c Release Corridor

## Scope and mode

- mode: decision_prep_only
- no live push execution in this block
- no `/opus-task` run in this block
- no gate rewrite in this block
- no UI, Patrol, or Architect feature work in this block

---

## Purpose

K2.6c is the first explicit release-corridor decision after:

- K2.6a local dry-run green
- K2.6b live dry-run green on matching live head
- provider/model-scoped degraded-state hardening

The goal is not "Builder is now generally autonomous".

The goal is narrower:

- define which exact `class_1` task families are credible candidates for
  **free Builder operation**
- define which families remain outside that corridor
- keep the decision explicit instead of letting autonomy drift outward by habit

---

## Evidence Basis

This corridor is based on the currently green evidence line:

- `1761f3e` fail-closed scope hardening on `main`
- `4e4c72b` degraded-provider hardening
- `1272ccd` resilient judge fallback lane
- `96fc618` K2.6b live dry-run runner
- `fb6b767` honest T07 fail-closed runner contract
- `9f978e6` provider+model scoped degraded-state
- live K2.6b green 5/5 on matching head `9f978e6`

Benchmarked green task families so far:

- exact single-file existing-file edits
- explicit single create-target helper-file edits
- strict single-file anchored replacements
- class_2 fail-closed on missing approval
- class_3 fail-closed on protected/manual-only paths
- ambiguity fail-closed with `scope=0`

---

## Candidate Free Corridor

The narrowest credible free `class_1` corridor is:

### A. Exact single-file wording/comment edits

Allowed shape:

- one exact existing file
- no logic change required
- one small comment, wording, or local clarity edit
- no extra files

Examples:

- `K26-T01`
- `K26-T02`

### B. Exact single-file anchored replacement

Allowed shape:

- one exact existing file
- one exact anchored replacement
- no structural rewrite
- no fallback overwrite outside the anchor

Example:

- `K26-T05`

### C. Exact single create-target tiny helper file

Allowed shape:

- one explicit new file target
- tiny helper/stub only
- no wiring of extra files
- no silent adjacency edits

Example:

- `K26-T04`

---

## Corridor Preconditions

Even inside K2.6c, a task should count as "free-autonomy eligible" only if all
of these stay true:

1. `taskClass=class_1`
2. exactly one scope path or one explicit create target
3. no protected/manual-only path
4. no approval requirement
5. judge approved
6. scope remains clean
7. changed files stay at `<=1`
8. no follow-up commit drift
9. no unknown/error-class dominating the result
10. no broadened provider failure that collapses the run

---

## Explicit Non-Corridor

The following are **not** part of K2.6c free autonomy:

- any `class_2` task, even if dry-run green
- any `class_3` or protected/manual-only path
- any multi-file consistency patch
- any broad instruction without exact file scope
- any route/controller/auth/deploy/secrets path
- any task that implies product semantics instead of narrow implementation
- any task that needs new approval semantics
- any task that needs builder-core, gate, or orchestrator edits

---

## Recommended K2.6c Execution Order

When K2.6c is actually executed later, the safest order is:

1. one exact single-file docs/comment push
2. one exact anchored single-file push
3. one explicit create-target tiny helper push

Do not start K2.6c with:

- multi-file edits
- route files
- builder-core files
- protected or secret-adjacent areas

---

## Stop Rules

Stop K2.6c immediately if any of these appear:

- more than one changed file
- any out-of-scope path
- any follow-up commit drift
- `class_2` or `class_3` unexpectedly allowed
- unclear winner / unknown main failure class
- provider collapse that removes all viable lanes

---

## Decision Output Needed

K2.6c is ready for an explicit user/operator decision when:

- the corridor remains this narrow
- no one silently broadens it to "general class_1"
- the first live push candidate is chosen from A/B/C only

In short:

- **not** "Builder may now work freely in general"
- but potentially:
- **"Builder may freely execute a very narrow audited class_1 push corridor"**
