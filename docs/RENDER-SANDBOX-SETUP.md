# Render Sandbox Setup

## Purpose

This file is the manual dashboard checklist for Phase 1 of the Builder sandbox.
It assumes the repo-side preparation already exists:

- `APP_ENV` / `APP_ENV_LABEL`
- sandbox health/meta visibility
- sandbox-safe `zimage` default
- synthetic Builder seed path

## Recommended branch

Prefer:

- `staging`

Temporary alternative:

- `codex-preview`

The long-term goal is a human-readable branch that is not tied to one agent name.

## Render dashboard steps

### 1. Create a second web service

In Render:

1. `New +`
2. `Web Service`
3. select the Soulmatch repo
4. create a second service, separate from the current production service

### 2. Point it at the sandbox branch

Set branch to one of:

- `staging`
- `codex-preview`

Do **not** point the sandbox service at `main`.

### 3. Use the same build/start commands as production

Build command:

```bash
cd client && npm install -g pnpm && pnpm install && pnpm build && cd ../server && pnpm install && pnpm build
```

Start command:

```bash
node server/dist/index.js
```

## Required environment variables

### Must be different from production

- `DATABASE_URL`
- `OPENAI_API_KEY` if available
- `GEMINI_API_KEY` if available
- `DEEPSEEK_API_KEY` if used
- `XAI_API_KEY` if used

### Must be set for sandbox identity

- `APP_ENV=sandbox`
- `APP_ENV_LABEL=Sandbox / Nicht live`

### Recommended sandbox safety defaults

- leave `FAL_KEY` unset at first
- do **not** set `SANDBOX_FAL_ENABLED`

Optional only when image-generation is explicitly under test:

- `FAL_KEY=<sandbox-or-limited-key>`
- `SANDBOX_FAL_ENABLED=true`

## Database recommendation

Create a separate Render Postgres instance for sandbox.

Do **not** reuse the production database.

Reason:

- no production profile pollution
- no production memory/session writes
- no accidental task contamination

## First verification

After deploy:

1. open the sandbox URL
2. confirm the visible banner: `Sandbox / Nicht live`
3. check:

```bash
curl https://<sandbox-url>/api/health
```

Expected:

- `status = "ok"`
- `env = "sandbox"`
- `envLabel = "Sandbox / Nicht live"`

Then check:

```bash
curl https://<sandbox-url>/api/meta
```

Expected:

- `appEnv = "sandbox"`
- `appEnvLabel = "Sandbox / Nicht live"`

## Builder-specific verification

On first sandbox boot with empty builder tables, the synthetic Builder seed should
create visible Tribune data automatically.

What you should see:

1. non-empty Builder task list
2. at least one waiting/review task
3. at least one landed/done task
4. visible Tribune states and drill-downs

## If the sandbox looks empty

Possible reasons:

1. builder tables already contain old rows
2. `DATABASE_URL` points to the wrong database
3. startup seed did not run

Manual fallback:

```bash
cd server
pnpm sandbox:seed-builder
```

## Promotion rule

Sandbox deploy is for review only.

Promotion stays:

1. validate on sandbox
2. merge to `main`
3. production deploy through the existing workflow

Sandbox must never become an alternate hidden production path.
