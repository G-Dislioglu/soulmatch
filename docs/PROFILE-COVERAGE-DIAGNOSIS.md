# Profile Coverage Diagnosis

Date: 2026-05-01
Scope: `server/src/routes/profile.ts`
Status: verified

## Why This Route Was Reopened

The route-coverage map made `/api/profile/*` the next likely persistence boundary candidate:

- public product route
- DB-backed
- still minimally validated

Live probes confirmed this was not only a theoretical risk.

## Pre-Fix Live Findings

Live head during the failing probes: `373eb8262e6fa847d9f499db60f2ab5654389893`

Observed behavior before the fix:

1. `POST /api/profile` with `name="   "` and valid `birthDate`
   - result: `201`
   - bad effect: whitespace-only `name` persisted

2. `POST /api/profile` with valid `name` and `birthDate="   "`
   - result: `201`
   - bad effect: whitespace-only `birthDate` persisted

3. `PUT /api/profile/:id` with `name="   "` and `birthDate="   "`
   - result: `200`
   - bad effect: an existing profile could be degraded into empty required fields

These are real persistence defects, not cosmetic input issues.

## Narrow Fix Chosen

File touched:

- `server/src/routes/profile.ts`

Fix scope:

- trim required `name` and `birthDate` on create
- reject create when trimmed required fields are empty
- reject update when provided `name` or `birthDate` trims to empty
- persist normalized trimmed values instead of raw whitespace

Deliberately not included:

- birth date format validation
- broader profile-schema redesign
- DB or migration changes

## Commit

Repo commit for the fix:

- `7c2bf7b` — `fix(profile): reject empty trimmed required fields`

## Post-Fix Live Verification

Live head after deploy:

- `7c2bf7bab4e019a02722787230ebb7f3ab9e42a7`

Observed behavior after the fix:

1. `POST /api/profile` with `name="   "` and valid `birthDate`
   - result: `400`

2. `POST /api/profile` with valid `name` and `birthDate="   "`
   - result: `400`

3. `PUT /api/profile/:id` with `name="   "` and `birthDate="   "`
   - result: `400`

4. Valid control create
   - result: `201`
   - cleanup: deleted immediately after verification

## Cleanup

All synthetic failing test profiles created during diagnosis were removed from production after the probes.
Additional stray `Codex Verify` rows created during shell-level verification retries were also removed directly from production.
