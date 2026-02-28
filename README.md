# soulmatch

## Render staging deployment

This repo includes a Render blueprint in `render.yaml`.

### 1) Required Render environment variables

Set these in **Render → Service → Environment**:

- `DATABASE_URL` (required when profile/memory DB features are used)
- `GEMINI_API_KEY` (required for discuss/deep mode + memory extraction)
- `OPENAI_API_KEY` (required for OpenAI provider and deep mode)
- `DEEPSEEK_API_KEY` (optional, only if DeepSeek is used)
- `XAI_API_KEY` (optional, only if xAI/Grok is used)
- `FAL_KEY` (optional, only for `/api/zimage/*`)
- `DEV_TOKEN` (optional, protects `/api/dev/*`)

Already configured in `render.yaml`:

- `NODE_VERSION=20.11.0`
- `BUILD_AT=render`

### 2) Deploy from GitHub

1. Push branch:

```bash
git add .
git commit -m "chore: prepare render staging + phase6a voice-memory changes"
git push origin <your-branch>
```

2. In Render:
   - Create/attach Web Service from this repo (Blueprint auto-detects `render.yaml`)
   - Select the branch
   - Trigger deploy (or rely on Auto Deploy)

### 3) Staging smoke checks

After deploy is green:

- `GET https://<your-render-domain>/api/health` should return `200`
- `GET https://<your-render-domain>/api/meta` should return build metadata
- In app chat flow, send one message and verify `/api/discuss` responds

If chat shows `Failed to fetch`, check Render logs first (service crash/startup/env missing).