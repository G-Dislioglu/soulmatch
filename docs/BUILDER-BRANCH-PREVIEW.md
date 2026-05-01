# Builder Branch Preview

## Why this exists

The current Builder Tribune work lives on `codex/k28j-truth-sync`, not on `main`.
That is intentional: the UI should be seen and judged before it lands in production.

The cheapest honest preview path in this repo is local preview, not Render branch
preview infrastructure:

- the repo does **not** include a checked-in `render.yaml`
- the current deploy path is centered on the existing `main` Render service plus
  GitHub Action fallback
- adding real branch previews is possible later, but it is a separate infra block

## Fast path

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\start-builder-tribune-preview.ps1
```

This opens two terminals:

- server: `http://localhost:3001`
- client: `http://localhost:5173`

Open the client URL in your browser and navigate to the Builder UI.

## Manual path

Terminal 1:

```powershell
cd server
pnpm install
pnpm dev
```

Terminal 2:

```powershell
cd client
pnpm install
pnpm dev
```

## What to inspect first

The current Tribune branch work is centered on:

1. attention-first review card
2. visible task phase path
3. phase drill-down detail
4. Maya summary sentence

The point of this preview is not pixel polish first. It is to answer three user
questions fast:

- What is happening right now?
- Why is it happening?
- Is Maya waiting on me?

## Not in scope here

This file does **not** set up Render branch previews.
If branch previews are still wanted after local review, that should be handled as
a separate infra block with explicit Render service strategy.
