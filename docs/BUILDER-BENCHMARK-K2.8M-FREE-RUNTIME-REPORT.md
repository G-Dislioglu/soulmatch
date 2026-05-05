# Builder Benchmark K2.8m - Free Runtime Subset

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28m`
- target: `server/src/routes/match.ts`
- route under test: `POST /api/match/single`
- task: `K28M-T01`

## Preflight truth

- invalid probe body: `{ "profileA": { "birthDate": "   " }, "profileB": { "birthDate": "2000-01-01" } }`
- valid probe body: `{ "profileA": { "birthDate": "1999-01-01" }, "profileB": { "birthDate": "2000-01-01" } }`
- invalid probe before run: `500 internal_server_error`
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

- invalid probe after run: `500 internal_server_error`
- valid probe after run: `200`
- changed files: none
- runtime commit change: none

## Assessment

`K2.8m` looked like a narrow stateless validation fix, but the builder classified
the route as `class_2` and stopped at the workflow simulation gate. No push was
attempted.

## Conclusion

The current free corridor does not yet include this deeper `match.ts` computation
route family, even for one-file input hardening that converts a `500` into the
obvious `400`.
