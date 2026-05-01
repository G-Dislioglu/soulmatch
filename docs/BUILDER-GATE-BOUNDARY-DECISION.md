# Builder Gate Boundary Decision

Last updated: 2026-05-01
Decision scope: Soulmatch operating policy for Builder-vs-direct-repo work

## Question

What should happen when the Builder workflow previously classified a narrow fix
as `class_2` or otherwise blocked it, but a later direct repo hotfix lands the
same product issue cleanly as a small, verifiable change?

This became concrete around:

- `K2.8l`, where `POST /api/profile` whitespace validation was builder-blocked
  as `class_2` / `dry_run_only`
- direct repo fix `7c2bf7b`, where the same route family was later hardened as
  a narrow single-file persistence fix and live-verified

## Decision

Builder gate outputs are **binding for Builder-executed runs**.

They are **not a universal ban on all direct repo work**.

Direct repo hotfixes remain a separate operating lane, but only under explicit,
narrow conditions.

## Why this is the right boundary

The Builder lane and the direct repo lane do not optimize for the same thing:

- Builder must classify and constrain autonomous write behavior before push
- direct repo work can use tighter human-scoped judgment, explicit code reading,
  and immediate route-specific verification

Treating Builder decisions as globally binding would overstate Builder policy as
the only legitimate source of operational judgment.

Treating direct repo fixes as silent overrides of Builder would create a hidden
backdoor and would make the Builder corridor documentation dishonest.

The correct boundary is therefore:

- Builder remains authoritative about what Builder may push
- direct repo work may still proceed separately when it is narrower and
  independently justified
- a direct repo fix does **not** widen the Builder corridor by itself

## Allowed direct repo hotfix path

A direct repo hotfix may proceed after a prior Builder block only when **all**
of the following are true:

1. The active workstream is ordinary product/runtime repair, not a Builder
   benchmark or Builder capability claim.
2. The fix is a narrow single-file change.
3. The target is not Builder-core, policy/governance, workflow/deploy, auth,
   protected paths, or schema/migration work.
4. The defect is repo-visible or live-visible as a real product/runtime issue.
5. The change can be verified directly before and after, ideally with live
   probes or another concrete runtime check.
6. The report explicitly names the earlier Builder classification as a boundary
   datum instead of pretending it never existed.

## Not allowed

The direct repo lane must **not** be used to do any of the following:

- claim that Builder is now allowed to do the same class of task freely
- bypass Builder review on multi-file, protected, policy, schema, workflow, or
  similarly widened work
- retroactively relabel a prior Builder `class_2` or `class_3` result as
  "really class_1 all along" without new Builder evidence
- accumulate several adjacent narrow fixes into a de facto corridor widening
  without making that widening explicit

## Practical reading of the profile case

`K2.8l` remains valid Builder evidence:

- the Builder workflow treated the DB-backed profile create route as
  `class_2`
- it failed closed before push

`7c2bf7b` also remains valid direct repo evidence:

- the actual landed fix was one narrow single-file change in
  `server/src/routes/profile.ts`
- it was verified directly on live behavior
- it improved product correctness without touching Builder-core or schema

These two truths do not cancel each other out.

They mean:

- Builder still did **not** prove that this route family belongs in the free
  Builder corridor
- direct repo work did prove that this exact product bug could be repaired
  safely outside the Builder benchmark lane

## Operating rule going forward

When a similar case appears again:

1. First ask which lane is active:
   - Builder capability/benchmark lane
   - direct product/runtime repair lane
2. If it is the Builder lane, Builder gate output governs the push decision.
3. If it is the direct repair lane, a narrow fix may still proceed under the
   constraints above.
4. Any such divergence must be documented as "direct repo hotfix after prior
   Builder boundary" rather than as free Builder proof.

## Consequence for corridor docs

Builder corridor documents such as
`docs/BUILDER-K2.6-CLASS1-RELEASE-CORRIDOR.md` should only widen when Builder
itself produces the relevant evidence.

Direct repo hotfixes may inform future Builder hypotheses, but they are not by
themselves corridor evidence.

## Immediate result

The `Builder Gate Boundary vs Direct Repo Hotfix` question is resolved as an
operating distinction, not as a Builder-freeing decision.

The next meaningful block is therefore no longer this policy ambiguity, but a
new route family or degradation candidate with genuine product/runtime value.
