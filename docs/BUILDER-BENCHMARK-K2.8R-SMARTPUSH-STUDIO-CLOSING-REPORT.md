# Builder Benchmark K2.8r - SmartPush Studio Closing

## Scope

- date: `2026-04-30`
- support commit: `bdfce38`
- rerun runner: `pnpm --dir server builder:k28q`
- support target: `server/src/lib/opusSmartPush.ts`
- landing target: `server/src/routes/studio.ts`
- route under test: `POST /api/oracle`
- rerun task: `K28Q-T01`

## Hardening truth

- previous failure mode: `patch-via-push failed for server/src/routes/studio.ts`
- measured cause:
  - `server/src/routes/studio.ts` file bytes: `73955`
  - deterministic overwrite payload bytes: `78159`
  - equivalent `replace` payload bytes: `901`
- support change:
  - small patch jobs still dispatch as deterministic full-file overwrites
  - oversize single-file patch jobs now stay as explicit `search/replace`
    payloads when that path fits under the `/push` single-patch ceiling
  - `/push` error text is now preserved in SmartPush failures

## Live rerun truth

- remote head before rerun: `bdfce383538c5149351edda8be9524d8a40ac1b0`
- invalid probe body: `{ "question": "   ", "provider": "openai" }`
- valid probe body: `{ "question": "purpose", "provider": "openai" }`
- invalid probe before rerun: `200`
- valid probe before rerun: `200`
- rerun result:
  - `taskClass`: `class_1`
  - `executionPolicy`: `allow_push`
  - `status`: `success`
  - `verifiedCommit`: `0d4316478e4b2f2d46512abf36dba925df973c93`
  - changed files: `server/src/routes/studio.ts`
- invalid probe after rerun: `400`
- valid probe after rerun: `200`
- runtime commit after rerun: `0d4316478e4b2f2d46512abf36dba925df973c93`

## Conclusion

The former `studio.ts` landing fragility was a SmartPush payload-shaping
problem, not a classing or review problem. Once the fallback stopped inflating
the exact oracle patch into an oversize overwrite payload, the same narrow
`class_1` rerun landed cleanly on `main` and on the live runtime. This closes
the last previously known meaningful Builder pipeline rest.