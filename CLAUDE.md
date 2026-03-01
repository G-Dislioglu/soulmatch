# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full-stack development (runs both client on :5173 and server on :3001)
pnpm dev

# Individual services
cd server && pnpm dev          # tsx watch — hot-reload Express server
cd client && pnpm dev          # Vite dev server

# Build for production
pnpm build                     # builds server then client

# Type checking
cd client && pnpm typecheck    # tsc --noEmit (client only)
cd server && pnpm build        # tsc (also acts as typecheck)

# Database
cd server && pnpm db:push      # push schema to Neon without migration files
cd server && pnpm db:generate  # generate Drizzle migration files
cd server && pnpm db:studio    # open Drizzle Studio GUI

# Server probe scripts (validate individual subsystems)
cd server && pnpm astro:probe
cd server && pnpm scoring:probe
cd server && pnpm match:probe
cd server && pnpm narrative:probe
```

Vite proxies `/api/*` to `http://localhost:3001` in dev, so the client always uses relative `/api` paths.

## Architecture

**Monorepo** with two pnpm workspaces: `client/` (React/Vite) and `server/` (Express/Node). In production, Express serves the compiled `client/dist` as static files and handles the SPA fallback.

### Frontend (`client/src/`)

Organized as **numbered feature modules** `M01`–`M15` under `client/src/modules/`. Each module follows:
```
M##_name/
├── index.ts        # barrel exports (public API)
├── lib/            # business logic / services
├── ui/             # React components
└── hooks/          # custom hooks (when present)
```

**App.tsx** is the single global state container — no Redux, Zustand, or Context. All global state (`profile`, `scoreResult`, `matchResult`, `settings`, etc.) lives here as `useState` and is passed as props. Navigation is state-driven (`activePage` string), not URL-driven. `wouter` is used only for sub-routing within modules.

**Key path aliases** (configured in vite.config.ts):
- `@` → `client/src`
- `@modules` → `client/src/modules`
- `@shared` → `client/src/shared`

### Backend (`server/src/`)

Express with ESM (`"type": "module"`). Routes are mounted in `index.ts` at:
```
/api/health, /api/meta, /api/profile, /api/scoring, /api/numerology,
/api/astro, /api/match, /api/journey, /api/geo, /api/studio, /api/guide
```

**Swiss Ephemeris (`sweph`)** is a native C addon loaded via `createRequire(import.meta.url)` for ESM compatibility. All astronomy routes fall back to pure-JS deterministic approximations when `sweph` is unavailable.

### Persistence

| Data | Storage |
|------|---------|
| User profiles | PostgreSQL (Neon) — single `profiles` table, profile data as JSON blob |
| Everything else | `localStorage` only — chat history, timeline, soul cards, user memory, settings |

There is **no authentication** — no login, no JWT, no sessions. The `DEV_TOKEN` header protects only `/api/dev/*` routes.

### LLM Integration

All AI calls go through `/api/studio` (structured JSON output) or `/api/guide` (freetext). Three providers are supported — OpenAI, DeepSeek, xAI — selected per-request. API keys can be client-supplied (sent in request body from `localStorage`) or fall back to server env vars. **No streaming** is implemented; all LLM calls are synchronous request/response.

The studio flow: `buildSystemPrompt()` + `buildUserPrompt()` → LLM call → JSON parse → `applyNarrativeGate()` quality check → response. If JSON parsing fails, a second "schema repair" LLM call is made automatically.

### Key Systems

**Scoring** (`server/src/shared/scoring.ts` is single source of truth):
- Individual score: `0.40 * numerology + 0.40 * astrology + 0.20 * fusion`
- Match score: `0.45 * numDiff + 0.45 * astroDiff + 0.10 * fusionDiff`

**Personas** (Maya, Luna, Orion, Lilith): Maya has a UI command system embedded in LLM output using `<<<{...}>>>` delimiters, parsed client-side by `commandParser.ts`. Soul Cards use `<<<SOUL_CARD>>>...<<<END_CARD>>>` blocks. Lilith has three intensity levels and a safety system: `sensitivityTracker.ts` (0–100 score, auto-downgrade) + `toxicityGuard.ts` (regex-based, 3 severity levels, strike/ban system).

**M06 vs M08**: M06 (`M06_discuss`) is the discussion/chat UI with persona routing and live-talk audio/STT hooks. M08 (`M08_studio-chat`) is the studio roundtable with command bus, insight extraction, and soul card management.

**Module numbering note**: M10 and M12 may be vestigial; M13 (`M13_timeline`) contains the active Timeline + Soul Cards system.

## Environment Variables

```bash
OPENAI_API_KEY=      # at least one LLM provider key required
DEEPSEEK_API_KEY=
XAI_API_KEY=
DATABASE_URL=        # Neon PostgreSQL connection string (required)
PORT=3001            # default; Render sets to 10000
DEV_TOKEN=           # optional, guards /api/dev/* routes
FAL_KEY=             # optional, for /api/zimage/* (image generation)
GIT_COMMIT_SHA=      # set by CI/CD for /api/meta
BUILD_TIMESTAMP=     # set by CI/CD for /api/meta
```

Copy `.env.example` to `.env` in the repo root before running locally.
