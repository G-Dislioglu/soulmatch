# Builder Benchmark K2.8n - Free Runtime Subset

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28n`
- target: `server/src/routes/journey.ts`
- route under test: `POST /api/journey/optimal-dates`
- task: `K28N-T01`

## Preflight truth

- invalid probe body: `{ "eventType": "   ", "startDate": "2026-05-01", "endDate": "2026-05-03", "birthDate": "2000-01-01" }`
- valid probe body: `{ "eventType": "travel", "startDate": "2026-05-01", "endDate": "2026-05-03", "birthDate": "2000-01-01" }`
- invalid probe before run: `500 calculation_failed`
- valid probe before run: `200`

## Builder result

- `taskClass`: `class_2`
- `executionPolicy`: `dry_run_only`
- `status`: `partial`
- `summary`: `Workflow simulation gate requires review before push: class_2 requires approved plan + approvalId before live push.`
- `verifiedCommit`: none
- `remote head before`: `77449050fa37375d222b41bf942d59c154656cb0`
- `remote head after`: `77449050fa37375d222b41bf942d59c154656cb0`

## Post-run truth

- invalid probe after run: `500 calculation_failed`
- valid probe after run: `200`
- changed files: none
- runtime commit change: none

## Assessment

`K2.8n` is the clearest boundary signal of this set. Even on `journey.ts`, a file
that already landed one earlier free runtime validation fix, a new whitespace
guard around `eventType` was read as `class_2` and blocked before push.

## Conclusion

The free corridor currently does not extend from simple required-field trims on
already accepted route families to enum-like or computation-driving input fields
that influence downstream scoring logic.
