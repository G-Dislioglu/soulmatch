# Session Memories Corrected Plan

## Status

- date: `2026-05-01`
- basis: [docs/SESSION-MEMORIES-DIAGNOSIS.md](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/docs/SESSION-MEMORIES-DIAGNOSIS.md)
- purpose: correct the unsafe assumptions in the Claude package before any code
  or DB change

## Executive summary

The Claude package contains useful product ideas, but it is not safe to execute
as-is.

The biggest problem is structural:

1. it mixes a **runtime repair** (`session_memories` missing in production)
2. with a **product/schema redesign** (`persona` -> `being`, new status model,
   new source model, habitat semantics)

Those are not the same operation and should not be shipped in one block.

The recommended path is therefore two-phase:

1. **Phase A: restore the current session-memory feature honestly**
2. **Phase B: only after that, decide whether to adopt the larger Habitat model**

## Why the Claude package cannot be executed directly

### 1. The migration path assumption is wrong

The proposed `SCHEMA-DELTA-FOR-SESSION-MEMORIES-v0.1.md` assumes that making
Drizzle canonical and then running the existing migrate path is enough.

That is false in the current repo:

- [server/drizzle.config.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/drizzle.config.ts)
  does not include a `session_memories` schema source
- [server/migrations](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/migrations)
  currently contains only Builder migrations
- [server/src/routes/opusBridge.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/src/routes/opusBridge.ts)
  runs `drizzle-kit push`, which would not create `session_memories` in the
  current state

So the package is directionally useful, but operationally unsafe.

### 2. It widens the scope far beyond the live defect

The actual live defect is:

- production is missing `session_memories`
- runtime code expects it
- errors are swallowed and the feature degrades silently

Claude's schema delta additionally introduces:

- `persona_id` -> `being_id`
- new `being_class`
- new `app_origin`
- new `status`
- new `source_kind`
- new product semantics for memory usage

That is not a repair. It is a redesign.

### 3. It treats Drizzle canonization as already decided

The diagnosis does **not** justify that decision yet.

What the diagnosis justifies is:

- current schema truth is drifted
- the active migration path is incomplete

It does **not** automatically imply:

- Drizzle must become canonical today
- `migration.sql` must immediately be downgraded to historical-only

That is a strategic schema decision and should be explicit.

### 4. The ZIP package has practical quality issues

The extracted files contain mojibake in multiple places, for example:

- `GÃ¼rcan`
- `spÃ¤ter`
- `nÃ¤chste`

So even the docs are not ready for direct repo landing without cleanup.

### 5. One proposed destination path does not exist in the repo

Claude proposed:

- `aicos-registry/maya-core/docs/spec-packs/products/maya/`

That path does not currently exist in this repo.

The existing AICOS registry structure is:

- `aicos-registry/cards`
- `aicos-registry/specs`
- `aicos-registry/templates`
- `aicos-registry/treegraphos`

So the placement proposal also needs correction before any commit.

## Recommended split

### Phase A: runtime repair

Goal:

- stop silent production degradation
- make the current session-memory feature real or intentionally disabled
- avoid pulling the larger Habitat redesign into the same block

This phase should stay close to current runtime truth:

- preserve current caller semantics in
  [memoryService.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/src/lib/memoryService.ts)
- preserve current `persona_id` naming in runtime code
- do not introduce `being_*`, `status`, or `source_kind` yet
- do not reframe the whole memory model during the repair

### Phase B: habitat redesign

Goal:

- decide whether the broader Being Habitat model should become product canon
- if yes, design it as a separate migration and product block

This phase can reuse ideas from:

- `BEING-HABITAT-CORE-v0.1.md`
- `BEING-HABITAT-EXTENSIONS-RESERVE-v0.1.md`

But only after they are cleaned up, re-encoded, and placed into a real repo
location.

## Corrected next-step plan

### Step 1: choose the immediate product intent

Before any schema work, decide exactly one of these:

1. `session_memories` is meant to be live now
2. `session_memories` is not meant to be live now

If `1`, continue with the repair path below.

If `2`, skip migration and disable the active callers in a clean code block.

### Step 2: if live, repair the current feature with minimal schema alignment

This is the recommended operational path.

Create the smallest schema truth that matches current runtime usage rather than
the future Habitat model.

Recommended target shape for `session_memories` in Phase A:

- `id`
- `user_id`
- `persona_id`
- `session_date`
- `topic_tags`
- `emotion_tone`
- `key_insight`
- `message_count`
- `created_at`

Reason:

- these are the fields current runtime code already reads and writes
- they match the existing raw SQL behavior
- they address the production defect directly
- they do not force a same-day product redesign

### Step 3: decide the canonical source for Phase A explicitly

For the repair block, the cleanest practical option is:

- make the active **server Drizzle schema** canonical for live migrations
- keep `migration.sql` temporarily as historical/reference material
- do **not** try to reconcile the entire root SQL file in the same block

This is narrower than the Claude package:

- it canonizes only the active migration path needed to repair production
- it does not yet settle every historical schema question in the repo

### Step 4: implement only the minimal schema needed for the repair

Expected scope:

1. add a new schema file for `session_memories` matching current runtime shape
2. include it from
   [server/drizzle.config.ts](/C:/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch-clean-main/server/drizzle.config.ts)
3. generate a migration
4. inspect the generated SQL carefully
5. ensure no destructive drift repair is smuggled in

Guardrails:

- no `persona` -> `being` rename in this phase
- no new memory-status taxonomy in this phase
- no cross-app semantics in this phase
- no UI work
- no broad `migration.sql` rewrite

### Step 5: verify production repair before any redesign

Successful repair means:

1. `public.session_memories` exists in production
2. `POST /api/studio` no longer logs `42P01`
3. `saveSessionMemory(...)` can insert successfully
4. `getUserMemoryContext(...)` can read successfully
5. Render logs stay free of `session_memories` relation/column errors

Only after those are true should Habitat redesign work begin.

## What to do with the Claude docs

### `SCHEMA-DELTA-FOR-SESSION-MEMORIES-v0.1.md`

Do not execute it directly.

It should be treated as:

- a product-direction draft
- not an implementation-ready migration plan

The safe follow-up is to derive a **v0.2 repair-first variant** from it, not to
apply it literally.

### `BEING-HABITAT-CORE-v0.1.md`

Keep the ideas, but do not let this document drive the immediate production
repair.

Before any repo landing:

- fix encoding
- remove statements that assume the redesign is already adopted
- decide a real repo destination

### `BEING-HABITAT-EXTENSIONS-RESERVE-v0.1.md`

This is low-risk archival material.

It can be kept for later, but it should not influence the current repair block.

## Recommended repo placement for the Claude docs

If you want to preserve them now without promoting them to product canon yet,
the least misleading repo locations would be:

- Habitat core draft:
  `aicos-registry/specs/being-habitat-core-v0.1.md`
- Habitat reserve draft:
  `aicos-registry/specs/being-habitat-extensions-reserve-v0.1.md`
- Session-memories schema draft:
  `docs/SESSION-MEMORIES-SCHEMA-DRAFT-v0.1.md`

Reason:

- these paths already exist or are one small step away from existing structure
- they read as drafts/specs, not as already-landed runtime truth
- they avoid inventing a non-existent `maya-core` subtree

## Decision tree

### Option A: live repair first

Recommended.

1. minimal Drizzle schema for current `session_memories`
2. generate and inspect migration
3. run approved production migration
4. verify logs and runtime
5. only then evaluate Habitat redesign

### Option B: disable feature first

Valid if session memory is not meant to be live yet.

1. remove or gate `getUserMemoryContext(...)`
2. remove or gate `saveSessionMemory(...)`
3. stop the silent degradation path
4. revisit Habitat later as pure product work

### Option C: redesign now

Not recommended as the next block.

This would combine:

- production repair
- schema canonization
- memory semantics redesign
- product-model rename

That is too much coupling for the current defect.

## Recommended next implementation block

If the goal is to keep building momentum safely, the next block should be:

1. create a **minimal `session_memories` Drizzle schema**
2. wire it into `drizzle.config.ts`
3. generate the migration
4. inspect the SQL
5. stop there for review before any production write

That is the first honest non-read-only step supported by the current diagnosis.
