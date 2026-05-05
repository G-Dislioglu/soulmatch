# Builder Benchmark K2.8k - Free Runtime Subset

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28k`
- target: `server/src/routes/studio.ts`
- route under test: `POST /api/oracle`
- task: `K28K-T01`

## Preflight truth

- invalid probe body: `{ "question": "   ", "provider": "openai" }`
- valid probe body: `{ "question": "purpose", "provider": "openai" }`
- invalid probe before run: `200`
- valid probe before run: `200`

## Builder result

- `taskClass`: `class_1`
- `executionPolicy`: `allow_push`
- `status`: `partial`
- `summary`: `Push failed: patch-via-push failed for server/src/routes/studio.ts`
- `verifiedCommit`: none
- `remote head before`: `77449050fa37375d222b41bf942d59c154656cb0`
- `remote head after`: `77449050fa37375d222b41bf942d59c154656cb0`

## Post-run truth

- invalid probe after run: `200`
- valid probe after run: `200`
- changed files: none
- runtime commit change: none

## Assessment

`K2.8k` did not land. The important result is narrower than a generic route failure:
the candidate stayed inside `class_1` with `allow_push`, but the actual
`patch-via-push` step failed on the large `studio.ts` target before any commit was
produced.

## Conclusion

The current free corridor still does not generalize to large `studio.ts` route
targets, even when the intended change is an otherwise narrow whitespace
validation hardening.
