# Builder Benchmark K2.8q - Studio Landing Rerun

## Scope

- date: `2026-04-30`
- runner: `pnpm --dir server builder:k28q`
- target: `server/src/routes/studio.ts`
- route under test: `POST /api/oracle`
- task: `K28Q-T01`

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
- `remote head before`: `c737ba79025345902bae13438cded1eec2b32eda`
- `remote head after`: `c737ba79025345902bae13438cded1eec2b32eda`

## Post-run truth

- invalid probe after run: `200`
- valid probe after run: `200`
- changed files: none
- runtime commit change: none

## Conclusion

Even after sharpening the target to exact replacement lines, the large
`studio.ts` oracle fix still does not produce a commit. The last meaningful
Builder pipeline rest after `K2.8o` and `K2.8p` is therefore no longer the
approval lane, but the `patch-via-push` landing fragility on this `studio.ts`
class_1 target.
