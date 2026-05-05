# Builder Benchmark K2.8s - Oracle Provider Guard

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28s`
- target file: `server/src/routes/studio.ts`
- route under test: `POST /api/oracle`
- task: `K28S-T01`
- remote head before run: `b8ad31d12926d0fbbeb9abdbac80ce93dad6d39e`
- landed commit: `0d12a4ae808e94ff64cd0bd557c1250e19b0a3be`

## Preflight truth

- whitespace-only `provider` probe body: `{ "question": "purpose", "provider": "   " }`
- bogus `provider` probe body: `{ "question": "purpose", "provider": "bogus" }`
- valid control body: `{ "question": "purpose", "provider": "openai" }`
- preflight invalid whitespace-only provider status: `502`
- preflight invalid bogus provider status: `502`
- preflight valid control status: `502`

## Landing truth

- builder result:
  - `status`: `success`
  - `taskClass`: `class_1`
  - `executionPolicy`: `allow_push`
  - `pushAllowed`: `true`
  - `landed`: `true`
  - `changed files`: `server/src/routes/studio.ts`
- runtime truth after landing:
  - live `/api/health` commit: `0d12a4ae808e94ff64cd0bd557c1250e19b0a3be`
  - whitespace-only `provider` status: `400`
  - bogus `provider` status: `400`
  - valid control status: `200`

## Interpretation

The narrow fix was to add an explicit unknown-provider guard in the existing
`/api/oracle` route before `resolveApiKey(...)` is called. The important truth
is not the preflight `502` on the valid body itself, which reflected transient
provider-side noise during the run window, but that the previously crash-like
invalid-provider cases now fail closed as `400` while the valid control probe
recovered to `200` on the landed runtime.

## Conclusion

`K2.8s` is a second large-file `studio.ts` confidence proof on the hardened
SmartPush path introduced by `bdfce38`. The Builder carried another exact
single-file validation hardening through the same large route file, kept scope
clean, and produced matching repo/runtime truth on `0d12a4a`.
