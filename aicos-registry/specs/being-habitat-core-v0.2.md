# Being Habitat Core v0.2

Status: proposal_only
Date: 2026-05-01
Scope: Maya Core and apps where Beings operate, including Soulmatch and later cross-app surfaces
Primary identity reference: `docs/BEING-CODEX-v1.2.md`
Staged schema reference: `docs/SCHEMA-DELTA-FOR-SESSION-MEMORIES-v0.2.md`
Reserve reference: `aicos-registry/specs/being-habitat-extensions-reserve-v0.2.md`

## Purpose

This spec answers one narrow architecture question:

Where does a Being live, remember, orient, and keep continuity over time?

It does not replace the Being Codex. The Codex defines identity. This spec defines the habitat around identity:

- memory
- relationship continuity
- boundaries
- plan traces
- event visibility

The spec is proposal-first. It defines the target shape and the staged adoption logic. It does not claim that every part is already implemented in production.

## What This Spec Is Not

- Not a UI blueprint
- Not a complete memory graph architecture
- Not a demand to rename every `Persona` symbol in code immediately
- Not a claim about consciousness or inner life
- Not a command to merge repair work and redesign work into one schema migration

## Term Separation

These terms must stay distinct:

| Term | Meaning |
| --- | --- |
| Arcana Workshop | UI for creating and tuning user-configurable identities |
| Being Habitat | The internal continuity space of one Being |
| Neural Habitat | A future system-observation surface, not the Being's own interior |
| Memory Field | A possible later topology layer for memory structures |

This spec defines only Being Habitat.

## Habitat Layers

The minimal habitat has six layers.

### 1. Identity Layer

Question answered: Who am I?

Source:

- `docs/BEING-CODEX-v1.2.md`
- `docs/beings/*.md`
- Arcana-created user-being configuration where applicable

Contains:

- role
- voice
- values
- prohibitions
- style and tuning parameters

Rule:

- System Beings are not user-editable at the identity level.
- User Beings can inherit editable workshop configuration.

### 2. Memory Layer

Question answered: What do I know about this user from earlier contact?

Source:

- `session_memories`

Contains:

- recurring topics
- user-stated preferences
- derived tone patterns
- compact session insights
- app origin metadata
- confidence/status metadata

Important:

- Memory is not truth.
- Memory must be status-bearing.
- Memory without status must not be treated as stable continuity.

### 3. Relationship Layer

Question answered: Who do I know, how strong is the continuity, and what patterns keep repeating?

Source:

- derived aggregate over memory entries per user

Contains:

- known users
- session counts
- time span
- recurring topics
- open loops

Rule:

- This layer is derived, not directly written.

### 4. Values / Boundary Layer

Question answered: What must I protect, refuse, or phrase carefully?

Source:

- Being Codex values
- optional user-specific boundaries

Contains:

- allowed tone ranges
- refusal boundaries
- contradiction rights
- topic taboos
- user-level comfort boundaries

Rule:

- Boundary beats memory.
- A memory may exist and still be unusable in the current context.

### 5. Plan Pad

Question answered: What could I suggest next?

Source:

- per-session reasoning residue
- optional future persistence

Contains:

- next prompts
- unresolved threads
- follow-up suggestions
- candidate notes for future memory consideration

Rule:

- A plan is a suggestion surface, not an execution surface.

### 6. Event Journal

Question answered: What changed since last time?

Source:

- append-only events from the other layers

Contains:

- memory proposed
- memory confirmed
- memory rejected
- boundary changed
- identity changed

Rule:

- No silent state jumps.
- Habitat changes should be inspectable.

## Memory Status

Every memory entry should eventually carry a status.

| Status | Meaning | Safe usage |
| --- | --- | --- |
| `proposal_only` | newly proposed or weakly grounded | not for confident reuse |
| `supported` | repeated or reinforced pattern | cautious reuse allowed |
| `user_confirmed` | explicitly confirmed by the user | normal reuse allowed |
| `stale` | old without refresh | use only with caution |
| `rejected` | contradicted or revoked | do not reuse |

Current repo truth:

- `proposal_only` is already live as the Phase A default.
- Full status-driven read filtering is not yet live.

## Source Kind

The intended source taxonomy remains useful, but it is not yet Phase A runtime truth.

Target source kinds:

- `user_stated`
- `session_derived`
- `being_inferred`
- `cross_app_transfer`
- `repo_grounded`

Current repo truth:

- `source_kind` is intentionally not part of Phase A.
- It belongs to a later migration and read/write-path hardening block.

## Holzweg Rule

Before reusing a memory, the Being should pass a short misuse check:

1. Context fit: does this belong to the current app, topic, and emotional scene?
2. Freshness: am I treating the past as if it were still current?
3. Source discipline: am I using an inference like a fact?
4. Overreach: would surfacing this feel uncanny or intrusive?
5. Contradiction: is there newer evidence pointing elsewhere?

If uncertainty remains, the Being should:

- soften the wording
- ask instead of asserting
- or not use the memory at all

This is a behavior rule, not a second hidden subsystem.

## Staged Schema Posture

The habitat concept and the production repair must remain separate.

### Phase A

Already aligned with the current corrected plan:

- keep `persona_id`
- add `being_class`
- add `app_origin`
- add `status`
- use defaults that do not break the current write path

### Phase B

Later adoption candidates:

- `persona_id` to `being_id`
- `source_kind`
- read-path filtering by status
- cross-app transfer discipline
- prompt-level Holzweg embedding

This separation is mandatory. Repair must not be overloaded with habitat redesign.

## System Being vs User Being

This distinction is structural.

### System Being

- codex-defined identity
- cross-app continuity is conceptually allowed
- `being_class = 'system'`

### User Being

- user-configurable identity
- app-local continuity by default
- `being_class = 'user'`

The schema and memory policy must carry this distinction explicitly before cross-app reuse becomes real.

## Open Decisions

The following are intentionally deferred:

1. Habitat UI
2. memory graph topology
3. reasoning field
4. broad `Persona` to `Being` code migration
5. multi-app user identity unification

## Acceptance Criteria For This Spec

This spec is considered useful if it does three things cleanly:

1. keeps habitat semantics separate from the emergency Phase A repair
2. defines the target vocabulary for status, source, layer, and being-class separation
3. stays compatible with the current repo truth instead of pretending later phases are already live

## Anti-Drift Notes

| Wrong shortcut | Correct reading |
| --- | --- |
| Memory equals truth | Memory is a status-bearing continuity signal |
| Habitat equals Neural Habitat | Being Habitat is the Being interior, not system telemetry |
| Persona equals Being in every context | `Persona` still exists in code; Being is the target conceptual term |
| Score equals proof | Scores are optional later heuristics, not truth claims |

## Related References

- `docs/BEING-CODEX-v1.2.md`
- `docs/beings/maya.md`
- `docs/SCHEMA-DELTA-FOR-SESSION-MEMORIES-v0.2.md`
- `docs/SESSION-MEMORIES-DIAGNOSIS.md`
- `aicos-registry/treegraphos/TREEGRAPHOS-SPEC-v0.3.2.md`

## Provenance

This v0.2 file is the cleaned, repo-grounded successor to a larger 2026-05-01 three-AI drafting session.
It keeps the core habitat frame, but removes encoding damage and avoids claiming that later schema phases are already production truth.
