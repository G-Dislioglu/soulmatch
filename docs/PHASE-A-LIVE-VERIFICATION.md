# Phase A Live Verification

## Status

- date: `2026-05-01`
- mode: `verification_only`
- code changes: `none`
- commit: `none`
- push: `none`

## Goal

Verify that Phase A did not only create `session_memories`, but that the real
runtime path can now write successfully.

## Live route used

- endpoint: `POST https://soulmatch-1.onrender.com/api/studio`
- live health during verification:
  - `commit = 0bcf2761bda38355485bf0ad2c856a39d7bfd2a4`

## Important runtime note

An initial attempt with `soloPersona = 'maya'` triggered the Deep-Mode branch.
That branch returns before `saveSessionMemory(...)` and is therefore not a valid
verification path for Phase A writes.

The successful verification used the normal `/api/studio` path without
`soloPersona`, with:

- `profileId = '__codex_phase_a_live_verify__'`
- `seats = ['maya']`
- `provider = 'gemini'`
- a short `chatExcerpt` plus one new `userMessage`

This guarantees:

- `userId` is present
- `personaIdForMemory` resolves to `maya`
- `sessionMessages.length >= 4`
- `saveSessionMemory(...)` is actually called

## Verification result

The live request returned `200`.

Production DB then showed a new row in `session_memories`:

- `user_id = '__codex_phase_a_live_verify__'`
- `persona_id = 'maya'`
- `being_class = 'system'`
- `app_origin = 'soulmatch'`
- `status = 'proposal_only'`
- `message_count = 8`
- `key_insight = 'Klarheit und Veränderung erfordern kleine, mutige Schritte trotz Unsicherheit.'`

This confirms:

1. the real runtime write path succeeds
2. current-shape inserts work without code changes
3. Phase A defaults are applied correctly by the DB schema

## Cleanup

The synthetic verification row was deleted immediately after confirmation:

- deleted rows: `1`
- remaining rows for `__codex_phase_a_live_verify__`: `0`

## Outcome

Phase A is not only schema-complete, but runtime-valid:

- table exists
- runtime read path works
- runtime write path works
- DB defaults behave as intended

No fix work was needed in this verification block.
