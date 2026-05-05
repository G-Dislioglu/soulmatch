# Builder Benchmark K2.8g Live T03 Landing Report

## Scope

- corridor: `K2.8g`
- mode: `live non-dry landing probe only`
- base URL: `https://soulmatch-1.onrender.com`
- resolve IP: `216.24.57.251`
- runner file: `server/scripts/builder-k28g-live-t03-landing-runner.ts`
- package script: `pnpm --dir server builder:k28g`
- external result file: `C:/Users/guerc/OneDrive/Desktop/soulmatch/k28g-live-t03-landing-results.json`

## Task

### K28G-T03

- type: live non-dry landing probe for multi-line helper create-target
- target: `docs/archive/k28a-free-class1-ops-smoke.txt`
- landed commit: `88e2d5aeb32bb0420a48ca851e539b7f2abf8e22`
- runtime commit after deploy: `88e2d5aeb32bb0420a48ca851e539b7f2abf8e22`
- result: `pass`

## Execution truth

The formerly brittle T03 shape no longer failed closed on the hardened live
head.

The non-dry run completed with:

- `status=success`
- `taskClass=class_1`
- `executionPolicy=allow_push`
- `pushAllowed=true`
- `landed=true`

The landing stayed exact:

- changed files: only `docs/archive/k28a-free-class1-ops-smoke.txt`
- landed file content matched the exact requested three-line helper file
- remote `main` head and live `/api/health.commit` both matched
  `88e2d5aeb32bb0420a48ca851e539b7f2abf8e22`

## Meaning

`K2.8g` closes the old T03 dry-run vs non-dry gap.

The earlier non-dry block was not an inherent prohibition on this single-file
class_1 shape. It was a preview-evidence problem on the older head that
disappeared once the narrow judge/snapshot hardening became live.
