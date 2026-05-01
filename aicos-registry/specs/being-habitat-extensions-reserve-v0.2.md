# Being Habitat Extensions Reserve v0.2

Status: reserve_only
Date: 2026-05-01
Relation to core: `aicos-registry/specs/being-habitat-core-v0.2.md`

## Purpose

This file archives habitat-adjacent concepts that were intentionally not promoted into the core spec.

They are:

- potentially useful
- currently too large or too coupled
- worth preserving so they are not reinvented badly later

Reserve does not mean rejected. It means not active.

## Reserve 1: Memory Field Topology

Idea:

- memory as nodes and typed relations, not just a flat table

Useful for:

- semantic grouping
- contradiction links
- topic evolution over time
- cross-app cluster views

Not in core because:

- it needs graph-style modeling or equivalent relational emulation
- the current memory volume does not justify it
- it creates a false sense of semantic truth if activated too early

Activation condition:

- memory scale or retrieval miss-rate proves flat memory is no longer enough

## Reserve 2: Relation Field Scoring

Idea:

- attach multi-axis scoring to memory relations instead of one flat confidence signal

Possible dimensions:

- semantic fit
- context fit
- source confidence
- freshness
- strategic value
- holzweg risk
- overreach risk

Not in core because:

- status plus cautious prompting already cover most early needs
- numeric precision here can become performative rather than real

Activation condition:

- a habitat UI or reviewer surface needs inspectable relation judgments

## Reserve 3: Counter-Relation Field

Idea:

- an explicit negative pressure layer that argues against using a memory relation

Examples:

- false similarity risk
- context mismatch risk
- contradiction pressure
- stale-memory pressure
- causal overclaim risk

Not in core because:

- it only makes sense if relation scoring already exists
- the simple Holzweg rule already covers most of the protection value

Activation condition:

- only together with Relation Field Scoring

## Reserve 4: Reasoning Field

Idea:

- expose a structured internal reasoning shape around problem, evidence, hypotheses, risks, and decisions

Not in core because:

- it is token-heavy
- it risks making Maya rigid and mechanical
- it adds visible reasoning architecture before the simpler continuity system is mature

Activation condition:

- only if there is a future habitat UI that explicitly needs inspectable reasoning topology

## Reserve 5: Steward Roles

Idea:

- split care functions into explicit stewardship roles such as memory stewardship, evidence stewardship, drift checks, and decision governance

Not in core because:

- it is easy to overbuild this into an accidental multi-agent regime
- the present system does not need that organizational weight

Activation condition:

- when background maintenance jobs or explicit review surfaces need clear operational ownership

## Reserve 6: Drift Sentinel and Hallucination Guard

Idea:

- separate protection functions for terminology drift and unsupported claims

Useful for:

- concept discipline
- architecture language discipline
- memory misuse detection

Not in core because:

- prompt discipline and anti-drift tables are still the cheaper first line
- a second validation layer is only justified after repeated observed failures

Activation condition:

- repeated drift or hallucination patterns that prompt hardening cannot control

## Reserve 7: Cognitive Field Topology

Idea:

- a roof term for the combined memory, reasoning, relation, and counter-relation layers

Not in core because:

- it becomes a branding shell if the underlying subsystems are not active

Activation condition:

- only after multiple reserve concepts have been activated and need one umbrella term

## Governance Rule

This reserve should change rarely.

When a concept is activated:

1. create a dedicated spec for it
2. mark the reserve entry as activated by that spec
3. update the core habitat spec only if the concept truly graduates into the core

When a concept is rejected:

1. keep the entry
2. mark it as rejected with reason
3. do not silently delete the historical reasoning

## Provenance

This reserve is the cleaned successor to the broader 2026-05-01 drafting material.
It preserves the higher-order architecture ideas without forcing them into the current production repair path.
