# ARCHITECTURE GRAPH SPEC v1.1 — Summary

**Full spec:** ChatGPT-generated `ARCHITECTURE-GRAPH-SPEC-v1.1.md` (25 sections, ~600 lines)
**Status:** Proposed canonical repo spec
**Authors:** ChatGPT 5.4 + Claude Opus 4.6 + Gürcan Dişlioğlu

## Core Principle
Graph as truth, views as derivations. UI looks like trees, data model is a graph.

## File Layout
```
architecture/
  graph.meta.json          — schema + mutation policy
  trunks/                  — one JSON per app
    soulmatch.json
    maya-core.json
    aicos.json
    bluepilot.json
  edges.json               — all connections
  events/                  — append-only change log
    2026-04.jsonl
  derived/
    ui/architecture-graph.html
    ai/start-packs/*.md
    ai/task-packs/*.md
    dsl/*.archdsl
    json/*.ai.json
```

## 4 Semantic Axes (never collapse into one badge)
1. **Lifecycle:** planned | active | blocked | done | archived
2. **Canonicality:** canonical | supported | legacy | deprecated | forbidden
3. **Verification:** repo_verified | runtime_verified | human_asserted | ai_inferred | stale | conflict
4. **Roles:** entry | hotspot | pattern | seam | spec | infra | risk | task_target

## 5 Derived Views
- **MAP** — 10-second ecosystem orientation
- **FOCUS** — detailed work with inspector panel
- **RADAR** — cold / risk / duplication / drift
- **COMPARE** — reuse decision matrix
- **AI VIEW** — start pack, task pack, DSL, JSON

## Mutation Policy
- AI may write: status, task_overlay, ai_note, risk_flag, proposed edges
- AI must propose: canonicality, forbidden, deprecated, archived, new trunks, rules

## Key Node Types
module, file, feature, pattern, seam, spec, api, infra, agent, milestone, task

## Key Edge Types
depends_on, reuse_candidate, canonical_source_for, related_to, blocked_by,
uses, cross_trunk_link, duplicates, derived_from

*Full spec with all 25 sections available as separate download.*
