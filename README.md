# soulmatch

## Render staging deployment

This repo does not currently include a checked-in `render.yaml` blueprint.
The reliable deploy path is a GitHub Actions workflow that first waits briefly
for Render Auto Deploy to pick up the pushed commit and only triggers the
deploy hook as a fallback if the live commit does not advance.

### 1) Required Render environment variables

Set these in **Render → Service → Environment**:

- `DATABASE_URL` (required when profile/memory DB features are used)
- `GEMINI_API_KEY` (required for discuss/deep mode + memory extraction)
- `OPENAI_API_KEY` (required for OpenAI provider and deep mode)
- `DEEPSEEK_API_KEY` (optional, only if DeepSeek is used)
- `XAI_API_KEY` (optional, only if xAI/Grok is used)
- `FAL_KEY` (optional, only for `/api/zimage/*`)
- `DEV_TOKEN` (optional, protects `/api/dev/*`)

Recommended additional GitHub secret:

- `RENDER_DEPLOY_HOOK_URL` (Render Web Service deploy hook)

### 2) Deploy from GitHub

1. Push branch:

```bash
git add .
git commit -m "chore: prepare render staging + phase6a voice-memory changes"
git push origin <your-branch>
```

2. In Render:
   - Create/attach the Web Service from this repo
   - Select branch `main`
   - Create a Deploy Hook and store it as GitHub secret `RENDER_DEPLOY_HOOK_URL`
   - Render Auto Deploy may stay enabled; the workflow now waits for it first and only falls back to the deploy hook if needed

3. In GitHub:
   - The workflow `.github/workflows/render-deploy.yml` verifies each push to `main`, waits briefly for Render Auto Deploy, and uses the deploy hook only as fallback
   - The workflow fails if `/api/health` does not advance to the exact pushed commit

### 3) Staging smoke checks

After deploy is green:

- `GET https://<your-render-domain>/api/health` should return `200`
- `GET https://<your-render-domain>/api/meta` should return build metadata
- In app chat flow, send one message and verify `/api/discuss` responds

If chat shows `Failed to fetch`, check Render logs first (service crash/startup/env missing).