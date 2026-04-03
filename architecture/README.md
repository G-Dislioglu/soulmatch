# Architecture Graph v1.1

Living architecture map for the Soulmatch ecosystem.

## Structure
- `graph.meta.json` — schema, enums, mutation policy
- `trunks/` — one JSON per app (soulmatch, maya-core, aicos, bluepilot)
- `edges.json` — all connections between nodes
- `events/` — append-only change log
- `derived/` — generated views (UI, AI start packs, DSL)

## For KIs
Read `derived/ai/start-packs/soulmatch.md` before any task.

## Spec
See `docs/ARCHITECTURE-GRAPH-SPEC-v1.1-SUMMARY.md`
