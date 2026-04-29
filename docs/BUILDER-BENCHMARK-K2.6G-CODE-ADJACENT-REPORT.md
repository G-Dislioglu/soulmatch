# Builder Benchmark K2.6g Code-Adjacent Controlled Push Report

## Scope

- corridor: `K2.6g`
- mode: `live controlled push`
- task: `K26G-T01`
- instruction shape: exact single-file existing-file input-validation hardening
- target file: `server/src/routes/numerology.ts`

## Runtime basis

- repo head before task dispatch: `b9ab580`
- repo head that landed the task: `abd1d3f`
- live code head after verification: `abd1d3f`
- endpoint path: `/api/builder/opus-bridge/opus-task`
- request mode: `dryRun=false`, `sideEffects.mode=none`, `acceptanceSmoke=true`
- runner resolve override: `216.24.57.251`

## Outcome

- branch result: `pass`
- live result: `pass`
- status: `success`
- `taskClass`: `class_1`
- `executionPolicy`: `allow_push`
- `pushAllowed`: `true`
- `landed`: `true`
- `verifiedCommit`: `abd1d3f84fab8533baddfb076cf33f5d888c51ee`
- changed files: `server/src/routes/numerology.ts`
- scope drift: none observed
- follow-up commit drift after remote wait: none observed
- runtime matched verified commit: `true`

## What landed

The controlled push tightened `/api/numerology/calc` so whitespace-only
`profileId`, `name`, and `birthDate` no longer pass the existing required-field
validation.

The landed code now:

- trims the three input strings locally in the route handler
- uses the trimmed values for required-field validation
- uses the trimmed `birthDate` for the date-format check
- passes normalized values into `calculateNumerology(...)`
- keeps valid requests unchanged

No extra file was changed.

## Runtime proof

The preflight probe against the old live runtime showed the gap was real:

- `POST /api/numerology/calc`
- body: whitespace-only `profileId` and `name`
- status before task: `200`

After the Builder landing and live deploy:

- same invalid probe status after task: `400`
- response snippet: `{"error":"profileId, name, birthDate, and system are required"}`

Control probe stayed healthy:

- valid payload status before task: `200`
- valid payload status after task: `200`

## Why this is stronger than K2.6f

K2.6f proved that the corridor could carry a real runtime guard improvement in
a token-protected route.

K2.6g keeps the same narrow class_1 shape, but moves into a more public
product-adjacent path:

- same single-file discipline
- same non-protected scope
- same no-drift requirement
- but now on request validation in an externally callable numerology route

## Meaning

K2.6g still does **not** justify broad free Builder autonomy.

It does show that the current corridor can now carry:

- exact single-file docs/helper edits
- exact single create-target helper files
- exact code-adjacent smoke-marker edits
- exact code-adjacent operational cleanup in a runtime file
- exact code-adjacent runtime guard hardening in a token-protected route
- exact code-adjacent input-validation hardening in a public runtime route

while staying:

- `class_1`
- scope-clean
- landed
- live-verified

## Recommended next step

Do not widen to multi-file or protected work.

The next useful step is now less another blind narrow patch and more an
explicit **class_1 release-corridor decision**:

1. keep the free corridor single-file only
2. keep it non-protected
3. keep it code-adjacent or docs/helper exact
4. require direct runtime proof whenever the route is externally testable

Only after that decision should a wider `K2.6h` runtime-adjacent task be
considered.
