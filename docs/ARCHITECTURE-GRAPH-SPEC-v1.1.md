# ARCHITECTURE GRAPH SPEC v1.1

**Status:** Proposed canonical repo spec  
**Audience:** Human builders, AI agents, maintainers  
**Purpose:** Living architecture map and reuse-first orientation system for multi-app ecosystems

## 1. Purpose

The Architecture Graph is a living system map for codebases and app ecosystems. It exists to prevent duplicate implementation, speed up orientation for humans and AIs, and make canonical paths, reuse candidates, risky seams, and legacy zones visible before work starts.

The UI may present tree-like or card-like views, but the canonical model is graph-based.

The system must serve three user classes:

1. Human builders who need fast project orientation and progress visibility.
2. AI agents that must inspect canonical paths, reuse candidates, forbidden rebuild zones, and risk seams before acting.
3. New apps or repos that want to fork the structure as an architecture template.

## 2. Core Problem

In complex repos, humans and AIs often rebuild logic that already exists elsewhere because there is no clear global map of:

- where a feature already exists
- which implementation is canonical
- which paths are legacy or deprecated
- which subsystems are risky or fragile
- which modules are similar enough to reuse or adapt

The Architecture Graph addresses this by making those relationships explicit.

## 3. Design Principles

### P1. Graph as truth, views as derivations
The source of truth is a semantic graph. UI views such as MAP, FOCUS, RADAR, COMPARE, and AI VIEW are derived from that graph.

### P2. Reuse first
Before creating new implementation, the system should help humans and AIs find:

- canonical entry points
- similar implementations
- reusable patterns
- forbidden rebuild zones

### P3. Semantic separation
The system must separate at least four semantic axes:

- lifecycle status
- authority or canonicality
- role or importance
- verification or truth source

These may not be collapsed into a single badge or field.

### P4. History without operational clutter
Old nodes should not disappear, but history must not drown active orientation. Archived or deprecated nodes stay in the graph but should be visually demoted by default.

### P5. AI-readable and AI-writable with guardrails
AI agents must be able to read and update parts of the system, but high-authority changes require proposal or human approval.

### P6. Evidence over decoration
Any score, warning, radar item, or similarity claim must be explainable through source, reason, and confidence.

## 4. Scope

The spec covers:

- canonical graph model
- file layout
- node and edge semantics
- lifecycle and canonicality rules
- verification model
- event and update workflow
- derived human views
- derived AI views
- compact DSL export
- UI information hierarchy
- mutation policy and conflict handling

The spec does not require full repo auto-indexing in v1.1.

## 5. Canonical File Layout

```txt
architecture/
  graph.meta.json
  trunks/
    soulmatch.json
    maya-core.json
    aicos.json
    bluepilot.json
  edges.json
  events/
    2026-04.jsonl
  derived/
    ui/
      architecture-graph.json
    ai/
      start-packs/
        soulmatch.md
      task-packs/
        soulmatch-mic-fix.md
      dsl/
        soulmatch.archdsl
      json/
        soulmatch.ai.json
```

## 6. Canonical Objects

### 6.1 Trunk
A trunk is the top-level app, product, or repo domain. Examples: Soulmatch, Maya Core, AICOS, Bluepilot.

#### Required fields
- `id`
- `name`
- `sub`
- `color`
- `owner`
- `status`
- `updated_at`

#### Optional fields
- `entry_nodes`
- `summary`
- `repo_url`
- `notes`

### 6.2 Section
Sections are organizational groupings inside a trunk. They are useful for navigation and UI grouping but are not the primary source of semantic truth.

Default sections:
1. CLIENT MODULES
2. SHARED
3. SERVER
4. DATABASE
5. SPECS & DOCS
6. AGENT & WORKFLOW
7. APIs & PROVIDER
8. FEATURES ACTIVE
9. ROADMAP
10. CONNECTIONS

### 6.3 Node
A node is the main semantic unit in the graph.

#### Node kinds
- `module`
- `file`
- `feature`
- `pattern`
- `seam`
- `spec`
- `api`
- `infra`
- `agent`
- `milestone`
- `task`

#### Required node fields
- `id`
- `section_id`
- `kind`
- `name`
- `status`
- `canonicality`
- `verification`
- `confidence`
- `roles`
- `updated_at`
- one of `path` or `virtual_ref`

#### Recommended node fields
- `summary`
- `tags`
- `ai_note`
- `commit_last_seen`
- `metrics`
- `hotspot`
- `do_not_rebuild`
- `created_at`
- `last_verified_at`

### 6.4 Edge
Edges express relationships between nodes.

#### Edge types
- `depends_on`
- `reuse_candidate`
- `canonical_source_for`
- `related_to`
- `blocked_by`
- `uses`
- `cross_trunk_link`
- `duplicates`
- `derived_from`

#### Required edge fields
- `id`
- `from`
- `to`
- `type`
- `verification`
- `confidence`
- `reason`

#### Recommended edge fields
- `status`
- `strength`
- `recommended_action`
- `created_at`
- `task_ref`

### 6.5 Event
Events provide a chronological ledger of changes. They are append-only and used for history, change tracking, and conflict inspection.

#### Required fields
- `ts`
- `actor`
- `type`
- `target`
- `reason`

#### Optional fields
- `before`
- `after`
- `task_ref`
- `confidence`
- `source`

## 7. Semantic Axes

### 7.1 Lifecycle Status
Lifecycle status describes the current work state.

Allowed values:
- `planned`
- `active`
- `blocked`
- `done`
- `archived`

### 7.2 Canonicality
Canonicality describes how strongly the path should be treated as preferred or avoided.

Allowed values:
- `canonical`
- `supported`
- `legacy`
- `deprecated`
- `forbidden`

Definitions:
- `canonical`: preferred source, reference, or implementation
- `supported`: valid and in use, but not necessarily preferred as a reference source
- `legacy`: still present, still possibly used, but should not be the default basis for new work
- `deprecated`: intentionally superseded and not recommended for new work
- `forbidden`: should not be used, extended, or rebuilt into, except under explicit override

### 7.3 Verification
Verification describes how trustworthy the node or edge claim is.

Allowed values:
- `repo_verified`
- `runtime_verified`
- `human_asserted`
- `ai_inferred`
- `stale`
- `conflict`

Definitions:
- `repo_verified`: confirmed against repo-visible code or files
- `runtime_verified`: confirmed through runtime or deployed behavior
- `human_asserted`: stated by a human maintainer and accepted as intentional truth
- `ai_inferred`: suggested by AI based on pattern or similarity, but not yet confirmed
- `stale`: known to be outdated or insufficiently recent
- `conflict`: contradictory signals exist and need review

### 7.4 Roles
Roles explain why the node matters.

Allowed values:
- `entry`
- `hotspot`
- `pattern`
- `seam`
- `spec`
- `infra`
- `risk`
- `task_target`

Definitions:
- `entry`: key starting point for orientation or implementation
- `hotspot`: area with concentrated activity, churn, or attention
- `pattern`: reusable solution pattern
- `seam`: fragile or important junction between systems, layers, or behaviors
- `spec`: documentation or design authority node
- `infra`: infrastructure-related node
- `risk`: high-risk or fragile node
- `task_target`: directly relevant to the current task overlay

## 8. Confidence Rules

Confidence is a numeric value from `0.0` to `1.0`.

Suggested defaults:
- `repo_verified`: `0.90` or higher
- `runtime_verified`: `0.95` or higher
- `human_asserted`: around `0.75`
- `ai_inferred`: around `0.55`
- `stale`: at most `0.40`

Rules:
- every edge with reuse, duplication, drift, or risk claims must include `confidence`
- `forbidden` should not be set with low confidence
- `recommended_action` should not be emitted without a reason and confidence

## 9. Mutation Policy

### 9.1 AI may write directly
AI agents may directly update:
- `status`
- `task_overlay`
- `ai_note`
- `risk_flag`
- proposed or low-authority edges
- event ledger entries

### 9.2 AI must propose only
AI agents must not silently change:
- `canonicality`
- `forbidden`
- `deprecated`
- `archived`
- new trunk creation
- global rule creation
- deletion of canonical nodes

These changes require human approval or a separate proposal workflow.

## 10. Conflict Handling

The system must not rely on a single root file as the only shared write target.

### 10.1 Conflict reduction strategy
- trunk data is split by file
- edges are centralized but independent from trunk content
- events are append-only
- derived outputs are generated, not manually curated first

### 10.2 Conflict detection
Conflicts should be surfaced when:
- two actors assign incompatible canonicality to the same node
- two actors set contradictory `forbidden` or `deprecated` states
- runtime verification contradicts repo or human assertions
- similarity or duplication claims materially disagree

### 10.3 Conflict resolution output
If unresolved, affected nodes or edges should be marked:
- `verification=conflict`
- optional `needs_review=true`

## 11. Derived Human Views

The graph must generate at least four human views.

### 11.1 MAP
Purpose: fast ecosystem orientation.

Should show per trunk:
- name and subtitle
- active count
- risk count
- legacy/deprecated count
- top canonical entries
- top hotspots
- warning count
- cross-trunk connection count

MAP should not dump every node by default.

### 11.2 FOCUS
Purpose: detailed work on one trunk or subsystem.

Recommended layout:
- left: trunk and section navigation
- center: hierarchy and node list
- right: detail inspector

Inspector should show:
- path or virtual ref
- status
- canonicality
- verification
- confidence
- roles
- ai note
- related nodes
- recommended actions
- raw DSL snippet
- recent events

### 11.3 RADAR
Purpose: surface non-obvious maintenance and architecture risks.

Required radar panels:
- Cold Radar
- Risk Radar
- Duplication Radar
- Drift Radar

Every radar item must include:
- score or level
- reason
- source
- confidence
- last updated
- recommended action

### 11.4 COMPARE
Purpose: enable reuse decisions.

COMPARE should show:
- candidate side
- canonical or comparison side
- overlap areas
- divergence areas
- extraction potential
- recommended action
- confidence
- evidence summary

Recommended action enum:
- `copy_exact`
- `adapt_pattern`
- `extract_shared_util`
- `keep_separate`
- `review_required`

## 12. Derived AI Views

The graph must generate at least four AI-facing views.

### 12.1 Start Pack
A compact orientation artifact for a trunk.

Must contain:
- canonical entry points
- active hotspots
- reuse candidates
- forbidden or do-not-rebuild zones
- high-risk seams
- current task context if available

### 12.2 Task Pack
A more specific artifact for an active task.

Must contain:
- target nodes
- related nodes
- blocked nodes
- recommended entry order
- compare suggestions
- rules to obey
- exact reuse sources

### 12.3 DSL Export
Two forms are recommended:
- verbose authoring or review mode
- compact prompt mode

### 12.4 JSON Export
A machine-readable slice for one trunk or task. It should not default to a full graph dump when a smaller task slice is enough.

## 13. DSL Rules

### 13.1 Goals
The DSL exists to be:
- token-efficient
- diffable
- readable by humans
- writable by AI
- serializable from the canonical graph

### 13.2 Structure
Recommended statements:
- `@graph`
- `@trunk`
- `@section`
- `@node`
- `@edge`
- `@rule`
- `@task`

### 13.3 Authoring rules
- one declarative block per object
- no implicit defaults for `status`, `canon`, or `verify`
- every edge must have a `type`
- every risky assertion must carry `verify` and `conf`
- `forbidden` requires a reason
- `do_not_rebuild=true` requires either a reuse source or a rule reference

### 13.4 Compact mode
Compact mode may use shortened keys for prompt exports, but verbose mode remains the repo-readable reference form.

## 14. Rule Objects

Rules are first-class semantic objects. They capture architecture or workflow constraints that AIs and humans must obey.

Examples:
- no new audio/mic system in Soulmatch when a canonical pattern already exists
- inspect M08 before implementing similar chat behavior elsewhere
- legacy prompt files may not be used as current working truth

Rules should be represented either as nodes with `kind=agent` or a dedicated `rule` object in future versions.

## 15. Pattern and Seam Objects

### 15.1 Pattern
A pattern represents reusable implementation logic abstracted from one or more nodes.

Examples:
- audio/mic pause-resume behavior
- SSE handling pattern
- provider dispatch shape

### 15.2 Seam
A seam marks a fragile or important boundary.

Examples:
- provider dispatch between UI and model layer
- SSE parsing to UI update chain
- speech hook to playback interaction
- backend timeout and keepalive boundary

These should be visible in FOCUS, RADAR, and AI VIEW.

## 16. Update Workflow

### 16.1 During work
AI or human adds event entries and low-authority updates such as:
- touched nodes
- risk flags
- task overlays
- proposed edges

### 16.2 After task or block completion
The graph is updated with:
- node status changes
- commit or verification updates
- new nodes discovered during work
- updated recommended actions or radar items

### 16.3 After human review
Higher-authority changes may be accepted:
- canonicality shifts
- deprecations
- forbidden rules
- archival changes
- structural trunk changes

## 17. Radar Generation Guidelines

### 17.1 Cold Radar
Use inactivity and relevance to surface neglected areas.

Suggested inputs:
- days since touch
- active dependency count
- importance weight

### 17.2 Risk Radar
Use multiple sources rather than single size-based heuristics.

Suggested inputs:
- churn
- complexity
- bug frequency
- seam count
- dependency density
- test weakness

### 17.3 Duplication Radar
Use similarity and reuse risk.

Suggested inputs:
- shared function names
- matching behavior markers
- overlapping hooks or routes
- known copied logic without shared extraction

### 17.4 Drift Radar
Show spec versus code versus runtime tension.

Suggested inputs:
- outdated spec claims
- legacy prompts mistaken for current truth
- runtime behavior contradicting documentation

Radar outputs must always expose their reasoning.

## 18. UI Information Hierarchy

### 18.1 Priority order
The UI should always prioritize:
1. current relevance
2. canonicality
3. risk and hotspots
4. reuse hints
5. historical and archived context

### 18.2 Visual rules
- do not rely on color alone for meaning
- archived and deprecated items should be visually demoted by default
- truth or verification should be visible but lightweight in overview views
- MAP should be compressed; detail belongs in FOCUS and inspector
- AI guidance should be clearly separated from general description text

## 19. Badge System

There are four badge axes.

### A. Lifecycle badges
- planned
- active
- blocked
- done
- archived

### B. Authority badges
- canonical
- supported
- legacy
- deprecated
- forbidden

### C. Role badges
- entry
- hotspot
- pattern
- seam
- risk
- spec

### D. Truth badges
- repo
- runtime
- human
- inferred
- stale
- conflict

### Display rules
- MAP: one lifecycle badge, one authority badge, max one role badge
- FOCUS inspector: all axes available
- AI VIEW: semantic text markers instead of visual badge clutter

## 20. Minimal Acceptance Criteria for v1.1

A repo can claim Architecture Graph v1.1 only if:

1. `graph.meta.json` exists and matches v1.1 schema intent.
2. At least one trunk file exists under `architecture/trunks/`.
3. `edges.json` exists.
4. Nodes separate `status`, `canonicality`, `verification`, and `roles`.
5. At least one derived AI Start Pack can be generated.
6. At least one derived COMPARE output can be generated.
7. RADAR items include reason and confidence.
8. Mutation policy is documented.

## 21. Non-Goals for v1.1

v1.1 does not require:
- full automatic repo crawling
- function-level graphing of the entire codebase
- perfect similarity detection
- real-time multi-agent synchronization
- visual graph physics or heavy animation

## 22. Recommended Example Node Shape

```json
{
  "id": "discussion-chat-file",
  "section_id": "client-modules",
  "kind": "file",
  "name": "DiscussionChat.tsx",
  "path": "client/src/modules/M08_studio-chat/DiscussionChat.tsx",
  "summary": "Audio/mic handling reference file",
  "status": "done",
  "canonicality": "canonical",
  "verification": "repo_verified",
  "confidence": 0.97,
  "roles": ["entry", "pattern", "seam"],
  "tags": ["audio", "mic", "pause-resume"],
  "do_not_rebuild": true,
  "ai_note": "Source for pauseSpeechForAudio and scheduleResumeSpeechAfterAudio.",
  "updated_at": "2026-04-03T21:00:00Z"
}
```

## 23. Recommended Example Edge Shape

```json
{
  "id": "edge-arcana-chat-reuse-discussion-chat",
  "from": "arcana-creator-chat",
  "to": "discussion-chat-file",
  "type": "reuse_candidate",
  "verification": "human_asserted",
  "confidence": 0.88,
  "strength": 0.91,
  "recommended_action": "copy_exact",
  "reason": "pauseSpeechForAudio + scheduleResumeSpeech overlap"
}
```

## 24. Future Extensions Beyond v1.1

Possible later additions:
- dedicated rule schema
- automated similarity extraction
- auto-generated task packs from issue or prompt context
- code-to-graph verification tooling
- graph-aware agent runtime integration
- confidence calibration based on repo checks and test outputs

## 25. Final Operating Principle

The Architecture Graph is not just documentation.

It is a living orientation and decision system that helps humans and AIs answer, before they build:

- where should I start
- what already exists
- what must not be rebuilt
- what is risky
- what is canonical
- what should be reused or adapted

That is the standard for v1.1.


