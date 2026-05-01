# Session Memories Diagnosis

## Scope

- date: `2026-04-30`
- mode: `read_only`
- no code changes
- no DB writes
- no edits to `STATE.md`, `RADAR.md`, or `FEATURES.md`

## Question

Why does production log `relation "session_memories" does not exist` while
`server/src/lib/memoryService.ts` actively reads and writes that table?

## Local code truth

### Active runtime callers

- `server/src/lib/memoryService.ts`
  - writes with `INSERT INTO session_memories` in `saveSessionMemory(...)`
  - reads with `SELECT ... FROM session_memories` in `getUserMemoryContext(...)`
  - both paths swallow errors and degrade to log-only / empty-context behavior
- `server/src/routes/studio.ts`
  - calls `getUserMemoryContext(userId)` in `/api/studio`
  - calls `saveSessionMemory(...)` after session handling
- `server/src/lib/builderContextAssembler.ts`
  - also calls `getUserMemoryContext(userId)`

### Root SQL truth

- `migration.sql` defines `session_memories` explicitly:
  - `id SERIAL PRIMARY KEY`
  - `user_id UUID REFERENCES profiles(id)`
  - `persona_id VARCHAR(50)`
  - `session_date DATE DEFAULT CURRENT_DATE`
  - `topic_tags TEXT[]`
  - `emotion_tone VARCHAR(50)`
  - `key_insight TEXT`
  - `message_count INTEGER DEFAULT 0`
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`

### Current Drizzle truth

- `server/drizzle.config.ts` includes:
  - `./src/db.ts`
  - `./src/schema/arcana.ts`
  - `./src/schema/builder.ts`
  - `./src/schema/personaMemories.ts`
- it does **not** include any `session_memories` schema file
- `server/migrations/` contains only:
  - `0001_builder_assumptions.sql`
  - `0002_builder_tasks_source_async_job_id.sql`

## Deploy / bootstrap truth

### Docker / Render path

- `Dockerfile` builds client and server, then starts `node dist/index.js`
- `Dockerfile` does **not** run:
  - `migration.sql`
  - `drizzle-kit migrate`
  - `drizzle-kit push`
- local `render.yaml` is absent
- `.github/workflows/render-deploy.yml` triggers Render deploys and waits for
  health, but does **not** run DB migration steps

### Runtime ops path

- `server/src/routes/opusBridge.ts` exposes `POST /api/builder/opus-bridge/migrate`
- that route runs `npx drizzle-kit push`
- with the current `server/drizzle.config.ts`, this push path would **not**
  create `session_memories`, because the table is not part of the active Drizzle
  schema set

## Production DB truth

Read-only DB checks were executed using `DATABASE_URL` loaded from
`server/.env`.

### `session_memories`

- `SELECT to_regclass('public.session_memories')` -> `null`
- `information_schema.columns` for `public.session_memories` -> empty
- `pg_indexes` for `public.session_memories` -> empty

Conclusion:

- `public.session_memories` does **not** exist in production

### `persona_memories`

- production table exists
- production columns are:
  - `id uuid`
  - `user_id varchar`
  - `persona_id varchar`
  - `category varchar`
  - `memory_text text`
  - `importance integer`
  - `created_at timestamp without time zone`

This matches neither side perfectly:

- `migration.sql` expects `user_id UUID REFERENCES profiles(id)`
- `server/src/schema/personaMemories.ts` expects `userId: varchar(100)`

So the drift is broader than one missing table:

- root SQL truth
- current Drizzle truth
- production DB truth

are already partially divergent from each other.

## Diagnosis

This is not just "missing table" and not just "dead code".

It is a three-layer schema drift:

1. raw SQL runtime code actively expects `session_memories`
2. root bootstrap SQL defines `session_memories`
3. the active Drizzle schema / migration path does not include it
4. production DB currently does not have it

Therefore the current runtime state is:

- the feature is partially implemented in code
- production silently degrades because errors are caught
- the visible migration path (`drizzle-kit push`) is currently insufficient to
  restore the missing table

## Implications

- This is a real product/runtime gap if session memory is intended to be live
- This cannot be resolved honestly by only running the currently exposed
  `/migrate` path
- A future fix must first choose one canonical schema truth:
  - root SQL bootstrap
  - Drizzle-managed schema
  - or deliberate feature removal / no-op

## Options for the next non-read-only step

### Option A: Make session memory a real live feature

- add `session_memories` to the canonical server schema path
- align schema definition with runtime expectations
- then run an approved production migration

### Option B: Keep graceful degradation intentionally

- remove or disable active callers of `getUserMemoryContext(...)` and
  `saveSessionMemory(...)`
- treat session memory as not-live

### Option C: Hybrid cleanup

- keep code paths but gate them behind an explicit capability check
- still requires one canonical source of schema truth later

## Recommended next decision

Before any migration or code removal:

1. decide whether session memory is meant to be a live product feature
2. decide which schema source becomes canonical
3. only then execute migration, cleanup, or graceful-disable work
