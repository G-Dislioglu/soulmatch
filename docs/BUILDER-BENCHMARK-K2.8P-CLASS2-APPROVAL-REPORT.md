# Builder Benchmark K2.8p - Class_2 Approval Repeatability

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28p`
- target: `server/src/routes/journey.ts`
- route under test: `POST /api/journey/optimal-dates`
- task: `K28O-T02`

## Preflight truth

- invalid probe body: `{ "eventType": "   ", "startDate": "2026-05-01", "endDate": "2026-05-03", "birthDate": "2000-01-01" }`
- valid probe body: `{ "eventType": "travel", "startDate": "2026-05-01", "endDate": "2026-05-03", "birthDate": "2000-01-01" }`
- invalid probe before run: `500 calculation_failed`
- valid probe before run: `200`

## Approval path

- local approval ticket issued into `builder_artifacts`
- `approval_kind`: `operator_gate_v1_3`
- live `/api/builder/opus-bridge/approval-validate`: `valid=true`
- request carried `approvalId` plus `hasApprovedPlan=true`

## Intermediate note

The first approval-backed attempt on the same route stayed `class_2` and
`allow_push`, but failed with `checks_failed` before commit because the worker
produced a build-breaking patch. The rerun tightened the instruction to exact
target lines and then landed cleanly.

## Builder result

- `taskClass`: `class_2`
- `executionPolicy`: `allow_push`
- `status`: `success`
- `verifiedCommit`: `c737ba79025345902bae13438cded1eec2b32eda`
- `remote head before`: `5784528118c43fccdbd1430d8b1eeb1efee69e97`
- `remote head after`: `c737ba79025345902bae13438cded1eec2b32eda`
- changed files: `server/src/routes/journey.ts`

## Post-run truth

- invalid probe after run: `400 invalid_request`
- valid probe after run: `200`
- runtime commit matched verified commit: yes

## Conclusion

`K2.8p` turns the `class_2` approval proof into repeatability across a second
route family. The remaining lesson is not that approval fails, but that some
targets still need tighter worker instructions to avoid build-breaking patches.
