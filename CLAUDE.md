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

Organized as **numbered feature modules** `M00`–`M16` under `client/src/modules/`. Each module follows:
```
M##_name/
├── index.ts        # barrel exports (public API)
├── lib/            # business logic / services
├── ui/             # React components
└── hooks/          # custom hooks (when present)
```

Active modules: M00 (Home), M01 (App Shell/Sidebar/Topbar), M06 (Discuss/Chat), M08 (Studio Chat), M09 (Arcana Studio), M13 (Timeline/Soul Cards), M16 (Builder/Maya Dashboard). M10 and M12 may be vestigial.

**App.tsx** is the single global state container — no Redux, Zustand, or Context. All global state (`profile`, `scoreResult`, `matchResult`, `settings`, etc.) lives here as `useState` and is passed as props. Navigation is state-driven (`activePage` string), not URL-driven. `wouter` is used only for sub-routing within modules.

**Key path aliases** (configured in vite.config.ts):
- `@` → `client/src`
- `@modules` → `client/src/modules`
- `@shared` → `client/src/shared`

### Backend (`server/src/`)

Express with ESM (`"type": "module"`). Routes are mounted in `index.ts` at:
```
/api/health, /api/meta, /api/profile, /api/scoring, /api/numerology,
/api/astro, /api/match, /api/journey, /api/geo, /api/studio, /api/guide,
/api/arcana, /api/builder, /api/builder/opus-bridge
```

**Swiss Ephemeris (`sweph`)** is a native C addon loaded via `createRequire(import.meta.url)` for ESM compatibility. All astronomy routes fall back to pure-JS deterministic approximations when `sweph` is unavailable.

### Persistence

| Data | Storage |
|------|---------|
| User profiles | PostgreSQL (Neon) — `profiles` table, profile data as JSON blob |
| Session memories | PostgreSQL — `session_memories`, actively read/written by `memoryService.ts` |
| Persona memories | PostgreSQL — `persona_memories` (schema present, usage audit pending) |
| Voice profiles | PostgreSQL — `voice_profiles` (schema present, usage audit pending) |
| Arcana personas | PostgreSQL — `persona_definitions`, `persona_voice_overrides`, `persona_presets` |
| Builder tasks | PostgreSQL — `builder_tasks`, `builder_opus_log`, `builder_worker_scores`, `builder_error_cards`, `builder_agent_profiles`, `builder_chat_pool`, `builder_artifacts`, `builder_memory` |
| Chat history, timeline, soul cards, settings | `localStorage` only |

There is **no user authentication** — no login, no JWT, no sessions. The `DEV_TOKEN` header protects `/api/dev/*` routes. Builder routes use `BUILDER_SECRET` and `OPUS_BRIDGE_SECRET`.

### LLM Integration

Six providers are active: **OpenAI**, **DeepSeek**, **xAI (Grok)**, **Google (Gemini)**, **Zhipu (GLM)**, and **OpenRouter** (for MiniMax, Kimi, Qwen). Provider configuration is spread across `server/src/lib/providers.ts`, `server/src/lib/personaRouter.ts`, and `server/src/routes/studio.ts`.

The studio flow: `buildSystemPrompt()` + `buildUserPrompt()` → LLM call → JSON parse → `applyNarrativeGate()` quality check → response. If JSON parsing fails, a second "schema repair" LLM call is made automatically.

Discuss/Chat uses SSE streaming (text first, audio later) via `/api/discuss`. TTS falls back between Gemini Preview TTS and OpenAI TTS.

### Builder / Opus Bridge

The self-development engine with two execution paths:

| Path | Endpoint | When | Runtime |
|------|----------|------|---------|
| Quick Mode | `/opus-task` | Simple tasks, small changes | ~30-90s |
| Pipeline Mode | `/build` | Complex tasks, multi-file, architecture | ~2-7min |

Maya (in `builderFusionChat.ts`) routes automatically via `determineBuildMode()`.

Pipeline: Scout (Pool) → Distiller (Pool) → Council (Pool, Maya-moderated) → Worker (Pool, Memory-aware) → TSC Verify [Auto-Retry] → GitHub Push → Deploy → Nachdenker.

Key files: `opusBridgeController.ts`, `opusRoundtable.ts`, `opusScoutRunner.ts`, `opusDistiller.ts`, `opusWorkerSwarm.ts`, `agentHabitat.ts`, `builderFusionChat.ts`, `builderStaleDetector.ts`.

### Builder Team Awareness

Builder should be treated as a role-aware AI team, not as a rigid gate machine.

Canonical working policy: `docs/AI-TEAM-ANTI-BUREAUCRACY-CHARTER-v0.1.md`.

This charter applies across Maya, Builder, AICOS, Design-IQ, Worker/Council
flows, and future app-internal AI systems.

Working posture:

- Freedom in thinking, planning, context gathering, and local implementation is the default.
- Hard coordination is reserved for real risk transitions.
- Maya is Mission Control and the clarification hub for route, user intent, and mission conflicts.
- Ambiguity should first trigger clarification, consultation, or an explicit assumption when risk is low.
- New restrictions or tighter blocking rules must not be introduced silently.
- Small local implementation decisions, file discovery, narrow helper work, and ordinary type-fix loops should not fail-closed the whole run.

Preferred policy:

- Ask-first for ambiguity.
- Continue-with-assumption for low-risk uncertainty.
- Block-only for hard risk.

### Key Systems

**Scoring** (`server/src/shared/scoring.ts` is single source of truth):
- Individual score: `0.40 * numerology + 0.40 * astrology + 0.20 * fusion`
- Match score: `0.45 * numDiff + 0.45 * astroDiff + 0.10 * fusionDiff`

**Personas** (Maya, Stella, Kael, Lian, Sibyl, Amara, Lilith as Specialists; Maya, Luna, Orion, Lilith as Companions): Maya has a UI command system embedded in LLM output using `<<<{...}>>>` delimiters, parsed client-side by `commandParser.ts`. Soul Cards use `<<<SOUL_CARD>>>...<<<END_CARD>>>` blocks. Lilith has three intensity levels and a safety system: `sensitivityTracker.ts` (0–100 score, auto-downgrade) + `toxicityGuard.ts` (regex-based, 3 severity levels, strike/ban system).

**M06 vs M08**: M06 (`M06_discuss`) is the discussion/chat UI with persona routing and live-talk audio/STT hooks. M08 (`M08_studio-chat`) is the studio roundtable with command bus, insight extraction, and soul card management.

## Environment Variables

```bash
OPENAI_API_KEY=      # LLM + TTS
DEEPSEEK_API_KEY=    # LLM
XAI_API_KEY=         # Grok LLM
GEMINI_API_KEY=      # Gemini LLM + TTS
ZHIPU_API_KEY=       # GLM models (Scout, Roundtable)
OPENROUTER_API_KEY=  # MiniMax, Kimi, Qwen
DATABASE_URL=        # Neon PostgreSQL connection string (required)
PORT=3001            # default; Render sets to 10000
DEV_TOKEN=           # optional, guards /api/dev/* routes
BUILDER_SECRET=      # guards /api/builder/* mutation routes
OPUS_BRIDGE_SECRET=  # guards /api/builder/opus-bridge/* routes
GITHUB_PAT=          # GitHub Personal Access Token for code pushes
FAL_KEY=             # optional, for /api/zimage/* (image generation)
GIT_COMMIT_SHA=      # set by CI/CD for /api/meta
BUILD_TIMESTAMP=     # set by CI/CD for /api/meta
```

Copy `.env.example` to `.env` in the repo root before running locally.

## Working Rules

1. **After EVERY feature or fix, run `pnpm typecheck` — never skip this.** (`cd client && pnpm typecheck` for the client; `cd server && pnpm build` for the server.)
2. **If typecheck fails, fix it before committing — never commit broken types.**
3. **Never delete existing functionality to fix a bug.** Find the root cause and fix it directly.
4. **Commit messages must describe WHAT was fixed and WHY.** Follow the existing `type(scope): description` convention used in this repo.
5. **After building a feature, trace the logic by reading the relevant code** to verify it actually works end-to-end.
6. **Never say "done" without having run typecheck green.**
7. **If a fix requires changes in more than 3 files, pause and summarize what you are about to change before proceeding.**
8. **After every push to main, run `bash tools/wait-for-deploy.sh` to confirm the live Render deployment succeeded before marking a task done.** The GitHub workflow now waits for Render Auto Deploy first and only triggers the deploy hook as a fallback. Never assume a push == a successful deploy.
9. **For reuse questions, cross-system patterns, or structural decisions, inspect `aicos-registry/treegraphos/TREEGRAPHOS-SPEC-v0.3.2.md` first.** Treat it as cross-system reference, not as direct Soulmatch runtime truth.
10. **Builder code changes go through `/opus-feature` or `/push` endpoints.** Claude Opus directs (Regie), never edits files manually.
11. **TSC build check (`cd client && npx tsc -b`) must pass before `/git-push`.** Render enforces `noUnusedParameters` strictly.
12. **Sequential pushes require 60-75s delay** to avoid parallel GitHub Action race conditions.

## Testing Rules

1. **Voice/audio features:** always trace the full event chain (`start → silence → callback → send`) before considering the feature complete.
2. **API calls:** verify error handling exists for every `fetch` — no unhandled promise rejections.
3. **State changes:** check that loading states are set AND unset correctly — no stuck spinners.
