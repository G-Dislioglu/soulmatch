# Builder Benchmark K2.8h Live T01 Landing Report

## Scope

- corridor: `K2.8h`
- mode: `live non-dry landing probe only`
- base URL: `https://soulmatch-1.onrender.com`
- resolve IP: `216.24.57.251`
- runner file: `server/scripts/builder-k28h-live-t01-landing-runner.ts`
- package script: `pnpm --dir server builder:k28h`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28h-live-t01-landing-results.json`

## Task

### K28H-T01

- type: live non-dry landing probe for exact docs append
- target: `docs/archive/push-test.md`
- landed commit: `6e1ea41a326dec0234d76d3222ced950b5597d33`
- runtime commit after deploy: `6e1ea41a326dec0234d76d3222ced950b5597d33`
- result: `pass`

## Execution truth

The formerly brittle T01 shape also landed cleanly on the hardened live head.

The non-dry run completed with:

- `status=success`
- `taskClass=class_1`
- `executionPolicy=allow_push`
- `pushAllowed=true`
- `landed=true`

The landing stayed exact:

- changed files: only `docs/archive/push-test.md`
- all prior lines were preserved and exactly one target line was appended
- remote `main` head and live `/api/health.commit` both matched
  `6e1ea41a326dec0234d76d3222ced950b5597d33`

## Meaning

`K2.8h` closes the second old K2.8a rest case.

With `K2.8g`, this means the old fail-closed pair was not a real corridor
limit of these single-file class_1 shapes. The limiting factor was the old
preview evidence path, not append semantics or create-target semantics
themselves.
