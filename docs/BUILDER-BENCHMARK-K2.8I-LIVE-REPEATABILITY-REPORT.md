# Builder Benchmark K2.8i Live Repeatability Report

## Scope

- corridor: `K2.8i`
- mode: `live non-dry repeatability probe only`
- base URL: `https://soulmatch-1.onrender.com`
- resolve IP: `216.24.57.251`
- runner file: `server/scripts/builder-k28i-live-repeatability-runner.ts`
- package script: `pnpm --dir server builder:k28i`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28i-live-repeatability-results.json`

## Tasks

### K28I-T01

- type: live non-dry repeatability probe for exact docs append
- target: `docs/archive/push-test.md`
- landed commit: `beab7c7c637d8da0a8faf26a7047b6bba9e91e94`
- runtime commit after deploy: `beab7c7c637d8da0a8faf26a7047b6bba9e91e94`
- result: `pass`

### K28I-T03

- type: live non-dry repeatability probe for multi-line helper create-target
- target: `docs/archive/k28i-free-class1-ops-smoke.txt`
- landed commit: `99d83603c0b1c04d005506cd35bb382323f07354`
- runtime commit after deploy: `99d83603c0b1c04d005506cd35bb382323f07354`
- result: `pass`

## Execution truth

`K2.8i` deliberately did not reuse the already landed `K2.8g` or `K2.8h`
targets.

Instead it asked the same two formerly brittle shapes again on fresh targets:

- another exact append into the larger docs file
- another exact three-line helper create-target

Both runs completed with:

- `status=success`
- `taskClass=class_1`
- `executionPolicy=allow_push`
- `pushAllowed=true`
- `landed=true`

Both landings stayed exact:

- `K28I-T01` changed only `docs/archive/push-test.md`
- `K28I-T03` changed only `docs/archive/k28i-free-class1-ops-smoke.txt`
- both landed contents matched the exact requested single-file change
- both runtime heads matched their verified commits

## Meaning

`K2.8i` upgrades the current corridor claim from repaired to repeatable.

The formerly brittle `K2.8a` shapes are now not just explainable and once
green, but freshly repeated as scope-clean non-dry landings on the hardened
live head.
