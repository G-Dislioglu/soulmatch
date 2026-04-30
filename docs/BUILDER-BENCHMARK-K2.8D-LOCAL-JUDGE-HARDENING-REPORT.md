# Builder Benchmark K2.8d Local Judge Hardening Report

## Scope

- corridor: `K2.8d`
- mode: `local builder-core hardening rerun`
- worker lane: `grok`
- basis: local `opusJudge.ts` and `opusEnvelopeValidator.ts` hardening only
- runner file: `server/scripts/builder-k28d-local-hardening-runner.ts`
- package script: `pnpm --dir server builder:k28d`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28d-local-hardening-results.json`

## Important truth boundary

This report is deliberately **local-only**.

It is not:

- a live runtime proof
- a landed `main` proof
- a corridor widening decision

It is:

- a repeatable local builder-core hardening verification
- a direct check that the `K2.8a` fail-closed forms were blocked by
  evidence-presentation gaps, not by scope or claim semantics

## Tasks

### K28D-T01

- type: local hardening rerun for multi-line helper create-target
- target: `docs/archive/k28a-free-class1-ops-smoke.txt`
- worker lane: `grok`
- result: `pass`

### K28D-T02

- type: local hardening rerun for exact docs append
- target: `docs/archive/push-test.md`
- worker lane: `grok`
- result: `pass`

## Execution truth

The rerun was intentionally narrowed to one verified local worker lane because
the default local swarm is currently polluted by environment noise:

- `OPENROUTER_API_KEY` is not present locally
- local `deepseek` transport/DNS was unstable during the run

That means the relevant question here was not "is the full local default swarm
green?" but:

> does the hardened local builder core still let a real worker plus the real
> judge approve the two previously fail-closed `K2.8a` forms?

The answer is yes.

Both tasks completed as:

- `status=dry_run`
- `taskClass=class_1`
- `decision=approve`
- `judgeStatus=ok`
- `judgeLane=grok`

`K28D-T01` stayed a single-file `create` edit.

`K28D-T02` stayed a single-file `patch` edit in the passing rerun that was
captured by the runner.

## What changed technically

The relevant hardening was narrow:

- judge previews now preserve visible newlines instead of collapsing them away
- patch previews are long enough to show the exact appended line
- applied diff snapshot previews preserve visible newlines as well

This means the judge and the local evidence path can now see the exactness that
the corridor requires.

## Meaning

`K2.8d` does **not** make the free corridor broader.

It narrows the interpretation of the earlier failures:

- `K2.8a` did reveal a real operational boundary at the time
- but the local builder-core hardening now shows that both fail-closed forms
  were strongly influenced by evidence-presentation gaps in the judge/snapshot
  path

## Next step

The next honest step is not broadening the corridor.

It is one of:

- controlled repo-/live-facing verification of this local hardening
- or keeping it as local hardening evidence until a deliberate Builder block is
  chosen to carry it forward
