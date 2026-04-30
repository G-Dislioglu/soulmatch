# Builder Benchmark K2.8l - Free Runtime Subset

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28l`
- target: `server/src/routes/profile.ts`
- route under test: `POST /api/profile`
- task: `K28L-T01`

## Preflight truth

- invalid probe body: `{ "name": "   ", "birthDate": "2000-01-01" }`
- valid probe body: `{ "name": "K28L Probe", "birthDate": "2000-01-01" }`
- invalid probe before run: `201`
- valid probe before run: `201`
- cleanup: both created probe profiles were deleted immediately

## Builder result

- `taskClass`: `class_2`
- `executionPolicy`: `dry_run_only`
- `status`: `partial`
- `summary`: `Workflow simulation gate requires review before push: class_2 requires approved plan + approvalId before live push.`
- `verifiedCommit`: none
- `remote head before`: `77449050fa37375d222b41bf942d59c154656cb0`
- `remote head after`: `77449050fa37375d222b41bf942d59c154656cb0`

## Post-run truth

- invalid probe after run: `201`
- valid probe after run: `201`
- cleanup: both post-run probe profiles were deleted immediately
- changed files: none
- runtime commit change: none

## Assessment

`K2.8l` is a clean boundary result. A one-file whitespace validation hardening on
the DB-backed profile create route is not treated as free `class_1` work by the
current builder lane. The run failed closed before push.

## Conclusion

The free corridor does not currently include DB-backed create-route validation
hardening, even when the requested edit is local and scope-clean.
