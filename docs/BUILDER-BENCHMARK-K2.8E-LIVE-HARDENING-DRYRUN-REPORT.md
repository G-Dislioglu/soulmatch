# Builder Benchmark K2.8e Live Hardening Dry-Run Report

## Scope

- corridor: `K2.8e`
- mode: `live dry-run probe only`
- base URL: `https://soulmatch-1.onrender.com`
- resolve IP: `216.24.57.251`
- runner file: `server/scripts/builder-k28e-live-hardening-dryrun-runner.ts`
- package script: `pnpm --dir server builder:k28e`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28e-live-hardening-dryrun-results.json`

## Safety boundary

This run was deliberately:

- `dryRun=true`
- `skipDeploy=true`
- `skipInlinePostPushChecks=true`
- `sideEffects.mode=none`

So this report is about live judge/orchestrator behaviour, not about a landed
push.

## Tasks

### K28E-T01

- type: live dry-run probe for multi-line helper create-target
- target: `docs/archive/k28a-free-class1-ops-smoke.txt`
- result: `dry_run`
- decision: `approve`
- judge lane: `grok`

### K28E-T02

- type: live dry-run probe for exact docs append
- target: `docs/archive/push-test.md`
- result: `dry_run`
- decision: `approve`
- judge lane: `grok`

## Execution truth

The current live builder accepted both previously brittle `K2.8a` shapes as
dry-run candidates:

- `taskClass=class_1`
- `executionPolicy=dry_run_only`
- `decision=approve`
- `pushAllowed=false` only because this was a dry-run
- `judgeStatus=ok`

The live judge reasons were materially stronger than the old `K2.8a` block:

- for the multi-line helper create-target, the judge explicitly accepted the
  exact file path and the exact three-line content
- for the exact docs append, the judge explicitly preferred a precise patch
  candidate

## Meaning

`K2.8e` does not prove a landed widening.

It does prove something narrower and useful:

- the current live pipeline can, at least in dry-run mode, approve both former
  `K2.8a` failure shapes

## Caution

This still needs repeatability discipline.

Dry-run approval is not the same as landed proof, and later reruns must still
check whether the same shape stays stable under non-dry execution.
