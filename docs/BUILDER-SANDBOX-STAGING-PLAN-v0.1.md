# Builder Sandbox / Staging Plan v0.1

## Status

- type: proposal_for_review
- scope: repo + deploy strategy only
- branch target: `staging` or `codex-preview`
- not in this block: actual Render service creation, secret rotation, DB migration

## Why this exists

The current Builder Tribune work lives on a branch and is build-verified, but the
user cannot see it on a stable remote preview URL before merge. That makes UI work
too abstract and pushes too much trust onto text reports.

The goal is a **real sandbox**:

- branch work becomes visible before `main`
- sandbox traffic stays away from production data
- builder / provider / image-generation routes do not silently spend production money
- promotion from sandbox to live becomes a conscious step

## What this plan is not

This is **not** a full Render Preview Environments design.

Reason:

- the repo does not currently include a checked-in `render.yaml`
- the active deploy path is built around one existing Render service on `main`
- full preview environments would be a larger infra step than needed for the
  current visibility problem

Phase 1 should be a **fixed staging service**, not ephemeral per-PR environments.

## Recommended shape

### 1. One dedicated staging Render service

Create a second Render web service for this repo:

- production service: current `main` service
- staging service: dedicated sandbox service

Recommended branch model:

- `main` -> production
- `staging` -> sandbox

Alternative if you want Codex-driven previews first:

- `codex-preview` -> sandbox

`staging` is preferable long-term because it is human-readable and not tied to one
agent branch.

## Environment separation

Sandbox is only real if secrets and data are separated.

### Required separation

- `DATABASE_URL`: separate staging database
- `OPENAI_API_KEY`: separate staging/test key if possible
- `GEMINI_API_KEY`: separate staging/test key if possible
- `DEEPSEEK_API_KEY`: separate staging/test key if used
- `XAI_API_KEY`: separate staging/test key if used
- `FAL_KEY`: separate staging key, or unset in sandbox until explicitly needed

### Strong recommendation

Add a visible environment marker:

- `APP_ENV=sandbox`
- `APP_ENV_LABEL=Sandbox / Nicht live`

The UI should show this clearly in the shell/header so nobody confuses sandbox
with production.

## Safety defaults

Sandbox should fail safer than production, not looser.

Recommended defaults:

- disable or limit image-generation routes unless explicitly under test
- do not share production builder tokens
- do not reuse production approval shortcuts
- keep cost-backed integrations off until a test actually needs them

## Data strategy

A blank sandbox is not useful for Tribune review. It needs believable test data.

### Phase 1 recommendation: synthetic seed

Use a small seed set, not copied production data.

Seed categories:

1. builder tasks in different states
   - planning
   - building
   - review_needed
   - prototype_review
   - done / landed
2. matching evidence packs
3. matching observation rows
   - actions
   - chatPool
   - opus logs
4. a few profile / memory rows only if needed for specific flows

### Why not production snapshot first

- privacy risk
- cleanup burden
- higher chance of stale or misleading state
- unnecessary for Tribune validation

### Preferred implementation later

A dedicated seed script, e.g.:

- `server/scripts/seed-builder-sandbox.ts`

It should be idempotent and clearly marked synthetic.

## Promotion path

The sandbox only helps if promotion is explicit.

### Proposed path

1. branch work lands on `staging` branch
2. Render sandbox deploys from `staging`
3. UI / product / runtime validation happens on sandbox URL
4. after approval, changes merge into `main`
5. existing production deploy workflow handles live rollout

### Meaning

- sandbox answers: "Does this feel right?"
- production answers: "Is this ready for real users?"

## Builder-specific implications

The Builder UI is currently the best first candidate for sandbox validation because:

- it is branch-heavy
- it is UX-sensitive
- it benefits from real visual review
- it does not need production user traffic to validate structure

Priority review targets on sandbox:

1. Builder Tribune
2. Patrol Console / deep patrol wiring
3. task detail / review interactions
4. operator-vs-tribune hierarchy

## Render implementation notes

Current repo truth:

- no checked-in `render.yaml`
- deploy flow is GitHub Actions + existing Render service on `main`

That means Phase 1 implementation can be done without a blueprint:

1. create a second Render service in Dashboard
2. point it at the same repo
3. configure it to deploy from `staging` or `codex-preview`
4. set separate environment variables
5. verify `/api/health` on the sandbox URL

This is cheaper and lower-risk than first introducing full preview infrastructure.

## Acceptance criteria for Phase 1

Phase 1 is successful when all of the following are true:

1. a stable sandbox URL exists
2. sandbox deploys from a non-`main` branch
3. sandbox uses a separate database
4. sandbox uses separate or reduced-risk provider secrets
5. sandbox is visibly labeled as non-live
6. sandbox can show non-empty Builder Tribune data
7. promotion to live still requires merge into `main`

## Recommended next block

Do this in two steps:

1. approve this plan
2. implement a minimal Phase 1 sandbox:
   - branch choice
   - Render service setup
   - env separation
   - sandbox banner
   - first synthetic seed path

## Deliberate non-scope

- full Render Preview Environments
- per-PR disposable environments
- automated environment teardown
- production snapshot cloning
- multi-user sandbox governance

Those can come later if the fixed sandbox proves valuable.
