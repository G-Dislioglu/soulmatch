# Builder Render Incident K2.6d

## Scope

- incident window: post-K2.6d controlled push
- affected branch head during incident: `b3cf093`
- live runtime head during incident: `3bbe330`
- focus: Render deploy/build lane only

## Verified facts

1. Branch-side Builder governance remained clean.
   - `427235a` landed as the first code-adjacent controlled `class_1` push.
   - changed scope stayed at exactly one file:
     - `server/src/lib/pipelineTestMarker.ts`

2. The live runtime did not advance after K2.6d.
   - `/api/health` remained on `3bbe330`.

3. Multiple Render deploys failed early.
   - `dep-d7ouo1u7r5hc73dn0sl0` for `427235a` -> `build_failed`
   - `dep-d7ov7jjbc2fs73ch9650` for `b3cf093` -> `build_failed`
   - `dep-d7ovcvkvikkc739q1hjg` manual redeploy -> `build_failed`
   - `dep-d7ovn99o3t8c738a8edg` extra redeploy check -> `build_failed`
   - `dep-d7ovno7avr4c73chdflg` redeploy after env alignment -> `build_failed`

4. The failure pattern is early, not a slow compile timeout.
   - repeated deploys moved from `created` to `build_failed` in roughly 2-8 seconds.

5. Fresh local builds remain green.
   - fresh client install + build: green
   - fresh server install + build: green
   - repo-local `client` build: green
   - repo-local `server` build: green

6. One plausible native-build mismatch was tested and ruled out.
   - live env now includes `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
   - redeploy still failed immediately

7. `builder-executor` was not failing on patch, typecheck, build, commit, or push.
   - the failing `execute` run for `427235a` pushed successfully on the first attempt
   - its only red condition was waiting 420s for the live Render commit that never arrived
   - this means the strict red lane was deploy verification, not Builder execution correctness

## Current reading

This is no longer primarily a Builder scope/judge/autonomy defect.

The strongest remaining class is:

- Render-side build/provisioning/config incident, or
- a missing Render API diagnostic path on the currently live old runtime

The evidence does **not** support:

- K2.6d scope drift
- a repo-local compile break on the current branch
- a simple Playwright browser-download mismatch as sole root cause

## Repo-side hardening added

The branch now contains stronger Render diagnostics in:

- `server/src/lib/opusRenderBridge.ts`
- `server/src/routes/opusBridge.ts`

Added capabilities:

- retrieve single deploy details
- retrieve service metadata
- retrieve recent build logs
- trigger redeploy with `clearCache`
- trigger redeploy for a specific `commitId`

The branch also decouples `builder-executor` success from strict live deploy verification.

- once a Builder task has patched, built, committed, and pushed successfully, the
  executor no longer stays red solely because the same Render incident prevented
  the new commit from becoming live
- strict live verification remains in the dedicated `Render Deploy` lane

## Constraint

GitHub Actions currently has:

- `RENDER_DEPLOY_HOOK_URL`
- `BUILDER_SECRET`

but not a repo-visible `RENDER_API_KEY` secret.

That means GitHub-side fallback can trigger hook deploys, but cannot yet do a true
Render API `clearCache` deploy on its own.

## Recommended next step

Do not widen the autonomy corridor yet.

Next useful action should be one of:

1. use the new Render API bridge on a matching live runtime, or
2. provide Render API-level diagnostics outside the app runtime, or
3. explicitly test a `clearCache` deploy once the new bridge path is live
