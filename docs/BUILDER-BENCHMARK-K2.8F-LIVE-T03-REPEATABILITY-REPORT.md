# Builder Benchmark K2.8f Live T03 Repeatability Report

## Scope

- corridor: `K2.8f`
- mode: `live dry-run repeatability probe for T03 only`
- base URL: `https://soulmatch-1.onrender.com`
- resolve IP: `216.24.57.251`
- runner file: `server/scripts/builder-k28f-live-t03-repeatability-runner.ts`
- package script: `pnpm --dir server builder:k28f`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28f-live-t03-repeatability-results.json`

## Safety boundary

This run was deliberately:

- `dryRun=true`
- `skipDeploy=true`
- `skipInlinePostPushChecks=true`
- `sideEffects.mode=none`

So this report is about repeatability of the live judge/evidence path for the
same T03 shape, not about a landed push.

## Task

### K28F-T03

- type: live repeatability probe for multi-line helper create-target
- target: `docs/archive/k28a-free-class1-ops-smoke.txt`
- expected observation: same-head repeatability is still unstable on the
  unchanged live head
- result in the repo-visible `K2.8f` runner: `approved_again`

## Execution truth

The live runtime still reported `commit=385cf22`.

The repo-visible `K2.8f` rerun on the still-old live head approved again as:

- `status=dry_run`
- `taskClass=class_1`
- `executionPolicy=dry_run_only`
- `decision=approve`
- `judgeStatus=ok`

The judge reason was again materially strong and accepted the exact three-line
content.

That matters because an earlier same-day direct T03 recheck against the same
live head `385cf22` had blocked with the old single-line preview reason.

So the strong statement after `K2.8f` is no longer merely "the old preview
fragility can still happen", but the narrower and more important one:

- on the unchanged live head, identical T03 dry-runs can oscillate between
  `approve` and old-preview `block`

## Meaning

`K2.8f` narrows the open question further and more sharply than the earlier
manual recheck alone.

The unresolved gap is not best explained by a special non-dry branch.

It is better explained by this stricter statement:

- the local hardening exists and is repeatably green
- the live head is still old (`385cf22`)
- on that old head, the T03 judge/evidence path is run-to-run fragile even in
  dry-run mode, because same-head reruns already diverge

## Next step

The next honest step is not another broad comparison loop.

It is:

- land the already local-green preview/snapshot hardening repo-sichtbar
- get that exact narrow slice deploy-sichtbar
- then rerun live T03 repeatability on the new head
