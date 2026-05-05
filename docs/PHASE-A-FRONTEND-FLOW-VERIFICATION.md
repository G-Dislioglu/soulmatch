# Phase A Frontend Flow Verification

Date: 2026-05-01
Repo head during verification: `7c2bf7b`
Live head during verification: `373eb8262e6fa847d9f499db60f2ab5654389893`
Status: verified

## Purpose

Confirm that the Phase A `session_memories` repair works through the real frontend request shape, not only through a synthetic low-level smoke call.

## Verification Basis

Frontend source of truth:

- `client/src/modules/M09_settings/lib/providerRouter.ts`

The normal frontend path sends:

- `studioRequest`
- `provider`
- optional `chatExcerpt`
- optional `userMemory`
- optional `matchExcerpt`
- optional `soloPersona`

This verification used that request shape directly against live `/api/studio`.

## Important Caveat

`soloPersona='maya'` is not a reliable write-path verification for Phase A.
That branch can enter Deep Mode and return before `saveSessionMemory()` runs.

The verification therefore used the normal `/api/studio` path without `soloPersona`.

## Live Request Shape Used

```json
{
  "studioRequest": {
    "mode": "profile",
    "profileId": "__codex_frontend_flow_verify__",
    "userMessage": "Bitte gib mir einen kurzen orientierenden Impuls zu meinem heutigen Fokus.",
    "seats": ["maya"],
    "maxTurns": 1
  },
  "provider": "gemini",
  "lilithIntensity": "ehrlich",
  "freeMode": false,
  "chatExcerpt": "USER: Ich bin heute etwas zerstreut.\nPERSONA(maya): Wir sammeln zuerst den Kern ein.",
  "userMemory": "Der User arbeitet fokussiert an Stabilitaet und Klarheit."
}
```

## Result

- Live HTTP result: `200`
- A real `session_memories` row was written for `user_id='__codex_frontend_flow_verify__'`
- Observed values:
  - `persona_id='maya'`
  - `being_class='system'`
  - `app_origin='soulmatch'`
  - `status='proposal_only'`
  - `message_count=7`
- The synthetic verification row was deleted immediately after the check

## Conclusion

Phase A is not only schema-present.
It is live on the real frontend-shaped `/api/studio` write path and still respects the Phase A defaults introduced by the repaired schema.
