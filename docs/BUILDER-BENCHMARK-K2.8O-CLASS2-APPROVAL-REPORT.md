# Builder Benchmark K2.8o - Class_2 Approval Landing

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28o`
- target: `server/src/routes/match.ts`
- route under test: `POST /api/match/single`
- task: `K28O-T01`

## Preflight truth

- invalid probe body: `{ "profileA": { "birthDate": "   " }, "profileB": { "birthDate": "2000-01-01" } }`
- valid probe body: `{ "profileA": { "birthDate": "1999-01-01" }, "profileB": { "birthDate": "2000-01-01" } }`
- invalid probe before run: `500 internal_server_error`
- valid probe before run: `200`

## Approval path

- local approval ticket issued into `builder_artifacts`
- `approval_kind`: `operator_gate_v1_3`
- live `/api/builder/opus-bridge/approval-validate`: `valid=true`
- request carried `approvalId` plus `hasApprovedPlan=true`

## Builder result

- `taskClass`: `class_2`
- `executionPolicy`: `allow_push`
- `status`: `success`
- `verifiedCommit`: `5784528118c43fccdbd1430d8b1eeb1efee69e97`
- `remote head before`: `2c39c1f5fc37a15cb3391facad4a9b825811ef29`
- `remote head after`: `5784528118c43fccdbd1430d8b1eeb1efee69e97`
- changed files: `server/src/routes/match.ts`

## Post-run truth

- invalid probe after run: `400`
- valid probe after run: `200`
- runtime commit matched verified commit: yes

## Conclusion

`K2.8o` is the first clean live proof that the `class_2` approval lane is not
just theoretically wired, but can actually issue a valid approval ticket, pass
the workflow simulation gate, land one exact route fix, and verify against the
matching runtime head.
