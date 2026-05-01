# SCHEMA DELTA FOR session_memories v0.2

**Status:** draft_for_review
**Date:** 2026-05-01
**Scope:** Soulmatch production DB and active server migration path
**Basis:** [SESSION-MEMORIES-DIAGNOSIS.md](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/docs/SESSION-MEMORIES-DIAGNOSIS.md)

---

## Purpose

This document defines the next implementation block for `session_memories`.

It is intentionally narrower than v0.1.

It separates:

1. **Phase A:** repair the live production gap
2. **Phase B:** later Habitat expansion work

Only **Phase A** is specified for implementation in this document.

---

## Fixed decisions

The following decisions are already treated as fixed for this v0.2 plan:

1. The active server-side **Drizzle schema path is canonical** for live schema changes.
2. The immediate goal is to repair the missing `session_memories` table in production.
3. This block must not widen into a Persona-to-Being refactor.

Implication:

- `migration.sql` is not the active production migration path for this block.
- The existing server Drizzle path must be extended so production migration can
  create `session_memories`.

---

## Why v0.1 is not safe to execute directly

v0.1 mixed a repair block with a redesign block.

The unsafe parts in v0.1 were:

- `persona_id` to `being_id`
- `source_kind` without current runtime support
- changes to `persona_memories`
- read-path semantics changes in `getUserMemoryContext(...)`
- broader Habitat semantics in the same block as the production repair

This v0.2 removes those wideners from Phase A.

---

## Current runtime truth

The current runtime code in
[memoryService.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/src/lib/memoryService.ts)
expects `session_memories` with these fields:

- `user_id`
- `persona_id`
- `topic_tags`
- `emotion_tone`
- `key_insight`
- `message_count`
- `session_date`

It inserts:

```sql
INSERT INTO session_memories
  (user_id, persona_id, topic_tags, emotion_tone, key_insight, message_count)
```

It reads:

```sql
SELECT topic_tags, emotion_tone, key_insight, session_date, persona_id
FROM session_memories
```

Therefore Phase A must stay compatible with that runtime shape.

---

## Phase A: repair block

### Goal

Create a production-safe `session_memories` table through the active Drizzle
path, while preparing a small amount of forward-compatible structure without
breaking current runtime code.

### Allowed scope

Phase A may:

1. add a new Drizzle schema file for `session_memories`
2. register it in
   [server/drizzle.config.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/drizzle.config.ts)
3. generate a migration
4. inspect the migration
5. if approved later, run the production migration

Phase A may also add a small number of **defaulted, non-breaking columns** to
`session_memories`.

### Forbidden scope

Phase A must not:

1. rename `persona_id` to `being_id`
2. add `source_kind`
3. modify `persona_memories`
4. change `getUserMemoryContext(...)` read semantics
5. change UI or prompts
6. rewrite `migration.sql`
7. perform a broader Habitat rollout

---

## Phase A target schema

`session_memories` should be created with the current runtime fields plus three
safe forward-compatible columns.

### Required compatibility fields

- `id`
- `user_id`
- `persona_id`
- `session_date`
- `topic_tags`
- `emotion_tone`
- `key_insight`
- `message_count`
- `created_at`

### Allowed forward-compatible fields

- `being_class` with default `'system'`
- `app_origin` with default `'soulmatch'`
- `status` with default `'proposal_only'`

### Why these three are allowed now

They satisfy all of the following:

1. they do not break current inserts if they have defaults
2. they do not require current runtime read-path changes
3. they prepare later Habitat work without forcing same-day refactors

### Why `source_kind` is excluded now

`source_kind` would require current write-path changes in `saveSessionMemory(...)`
or a schema default that would silently invent semantics.

That is Phase B work, not Phase A repair work.

---

## Recommended Drizzle shape for Phase A

The exact TypeScript can vary, but the Phase A schema should map to this DB
shape:

```sql
CREATE TABLE session_memories (
  id uuid primary key,
  user_id varchar(100) not null,
  persona_id varchar(50) not null,
  being_class varchar(20) not null default 'system',
  app_origin varchar(50) not null default 'soulmatch',
  status varchar(30) not null default 'proposal_only',
  session_date date not null default current_date,
  topic_tags text[],
  emotion_tone varchar(50),
  key_insight text,
  message_count integer default 0,
  created_at timestamp with time zone not null default now()
);
```

Notes:

- `persona_id` stays as-is in Phase A
- `user_id` should match active runtime conventions, not root `migration.sql`
- defaults must make current inserts succeed unchanged

---

## Implementation steps for Phase A

### Step 1: add `session_memories` Drizzle schema

Create:

- `server/src/schema/sessionMemories.ts`

The file should define only the Phase A fields listed above.

### Step 2: register schema in Drizzle config

Update:

- [server/drizzle.config.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/drizzle.config.ts)

Add:

- `./src/schema/sessionMemories.ts`

### Step 3: generate migration

From `server/` run:

```bash
pnpm drizzle-kit generate
```

### Step 4: inspect generated SQL

Review the generated migration before any production write.

It should:

1. create `session_memories`
2. include the three defaulted forward-compatible columns
3. avoid any destructive operations on unrelated tables
4. avoid edits to `persona_memories`

If it proposes unrelated drift repair, stop and trim the block.

### Step 5: stop for review

After schema and migration generation, stop before production execution.

Production write is a separate explicit go/no-go step.

---

## Phase B: later work only

Phase B is intentionally not specified for execution here.

It may later include:

- `persona_id` to `being_id`
- `source_kind`
- read filtering by `status`
- cross-app memory semantics
- Habitat prompt behavior such as the Holzweg rule

But none of that belongs in the current repair block.

---

## Acceptance criteria for v0.2 Phase A

Each criterion must be testable with a concrete command or file inspection.

### Repo criteria

1. The file
   [server/src/schema/sessionMemories.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/src/schema/sessionMemories.ts)
   exists.
2. [server/drizzle.config.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/drizzle.config.ts)
   includes that schema file.
3. The generated migration creates `session_memories` and does not modify
   `persona_memories`.

### Command-level checks

Suggested checks:

```bash
pnpm --dir server build
pnpm --dir server drizzle-kit generate
git diff -- server/drizzle.config.ts server/src/schema/sessionMemories.ts server/migrations
```

### SQL review criteria

The generated migration must visibly contain:

- `CREATE TABLE "session_memories"` or equivalent
- `persona_id`
- `being_class default 'system'`
- `app_origin default 'soulmatch'`
- `status default 'proposal_only'`

And must visibly not contain:

- `ALTER TABLE "persona_memories"`
- `DROP COLUMN`
- `RENAME COLUMN`

### Production verification criteria for the later execution step

If the migration is later executed, the checks are:

```sql
SELECT to_regclass('public.session_memories');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'session_memories'
ORDER BY ordinal_position;
```

Expected:

1. `to_regclass(...)` returns `session_memories`
2. the table contains the Phase A columns
3. Render logs no longer show `42P01` for `session_memories`

---

## Review checklist

This v0.2 is acceptable only if all of the following stay true:

1. ASCII or clean UTF-8, no mojibake
2. explicit Phase A / Phase B split
3. Drizzle canon stated as fixed for this block
4. no hidden `persona_memories` work
5. no read-path behavior changes
6. no `source_kind`
7. all repo paths in the document exist or are created by the block

---

## Next action after review

If this document is accepted, the next implementation move is:

1. create the Drizzle schema file
2. wire it into `drizzle.config.ts`
3. generate the migration
4. inspect it
5. stop before production write
