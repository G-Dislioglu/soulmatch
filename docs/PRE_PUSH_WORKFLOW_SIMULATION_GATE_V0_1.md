# Pre-Push Workflow Simulation Gate v0.1

## Status

This document defines a minimal builder-near spec for Workflow Simulator v0.1.

It is the first practical application of `AICOS_PIPELINE_HEALTH_CHARTER.md`.
It is not a new pipeline.
It is not a new council.
It is not a new build packet.
It is not a pre-execution simulator.

The gate does not replace the judge, auditor, claim gate, or final safety policy.
It consumes their outputs as signals for one final pre-push health check.

v0.1 is explicitly a **pre-push workflow simulation gate**.

## Purpose

The goal of v0.1 is to evaluate the selected builder outcome after judge resolution and before dry-run return or push.

It exists to answer one bounded question:

**Given the chosen winner, current scope, claim-gate outcome, and safety state, should this workflow continue unchanged, require review, downgrade to dry-run only, or be blocked?**

## Hook Position

Primary integration point:

- `server/src/lib/opusTaskOrchestrator.ts`

Required placement:

- after judge resolution
- after `finalSafety` is available
- before dry-run return
- before push dispatch

This keeps v0.1 minimal and allows it to consume the real winner plus the finalized safety context.

## Inputs

### Pipeline Inputs

- task instruction
- resolved scope files
- create targets if present
- claim-gate result
- judge winner (`EditEnvelope`)
- `finalSafety`
- `taskClass`
- `executionPolicy`
- `protectedPathsTouched`
- dry-run flag

### Architecture Inputs

- `architecture/trunks/soulmatch.json`
- `architecture/edges.json`
- graph-derived briefing from `server/src/lib/opusGraphIntegration.ts`

Relevant integration functions:

- `loadArchitectureGraph`
- `generateGraphBriefing`
- `findRelevantErrorCards`
- `loadProjectDna`

### Optional Future Inputs

- `asyncJobs`
- `builderTasks`
- `builderOpusLog`

These are structurally available for later use, but v0.1 must not present them as a statistically verified telemetry basis.

## Four Views

### 1. Scope Simulator

Purpose:

- estimate whether the chosen winner still fits the intended task boundary

Inputs:

- instruction
- scope files
- winner edits
- create targets
- protected paths

Checks:

- edits outside intended scope
- unexpected file creation
- mismatch between edited files and stated task focus
- protected path contact

Output:

- `scopeRisk`
- `expectedFiles`
- `forbiddenFiles`
- scope findings

### 2. Pipeline Failure Simulator

Purpose:

- estimate likely failure modes in the current builder path before push

Inputs:

- claim-gate result
- judge decision
- final safety decision
- dry-run flag
- task class

Checks:

- conflict between judge winner and safety posture
- evidence of likely review-needed downgrade
- likely dry-run-only situations
- high-risk claim-gate weakness

Output:

- `predictedPipelineOutcome`
- `recommendedAction`
- pipeline findings

### 3. Drift Simulator

Purpose:

- estimate architecture and governance drift before push

Inputs:

- architecture graph
- graph briefing
- relevant error cards
- winner edits
- protected paths

Checks:

- touch of forbidden or do-not-rebuild nodes
- likely deviation from graph-recommended entry or reuse path
- evidence/assumption weakness for meaningful claims
- repeat of known error-card patterns when detectable

Output:

- `driftRisk`
- `claimAnchoringRisk`
- drift findings

### 4. Acceptance Simulator

Purpose:

- estimate whether the workflow is acceptance-ready enough to proceed

Inputs:

- task class
- execution policy
- claim-gate detail
- judge winner summary
- final safety

Checks:

- whether current evidence is adequate for push
- whether review should be required first
- whether confidence must remain capped due to missing telemetry
- whether execution contract should tighten allowed continuation

Output:

- `confidence`
- `executionContract`
- acceptance findings

## Charter Mapping

Each of the four views operationalizes one or more principles from the AICOS Pipeline Health Charter v0.2:

- Scope Simulator → P2 (Clarify When Ambiguity Is Material), V4 (Forced Single-Pass Under Ambiguity)
- Pipeline Failure Simulator → P3 (Preserve Partial Progress), V5 (Binary Verdict Only)
- Drift Simulator → P4 (Evidence Before Candidate Promotion), V7 (Unanchored Candidate Promotion)
- Acceptance Simulator → P1 (Analysis Before Schema), V2 (Premature Schema Lock)

## Output Shape

The simulator should emit a single structured object:

```json
{
  "workflowSimulation": {
    "version": "0.1",
    "mode": "pre_push_gate",
    "basis": ["architecture_graph", "scope", "claim_gate", "judge_winner", "final_safety", "static_heuristics"],
    "missingEvidence": ["statistically_evaluated_historical_builder_runs"],
    "recommendedAction": "allow_push",
    "confidence": 0.0,
    "taskClass": "class_1",
    "scopeRisk": 0.0,
    "driftRisk": 0.0,
    "protectedPathRisk": 0.0,
    "ambiguityRisk": 0.0,
    "claimAnchoringRisk": 0.0,
    "expectedFiles": [],
    "forbiddenFiles": [],
    "predictedPipelineOutcome": {},
    "simulatedFindings": [],
    "executionContract": {}
  }
}
```

## Recommended Action Semantics

Allowed values:

- `allow_push`
- `require_review`
- `block_push`
- `dry_run_only`

Interpretation:

- `allow_push`: current signals are good enough to proceed
- `require_review`: continue only with explicit review posture
- `block_push`: hard stop due to scope, protected-path, forbidden-node, or anchoring failure
- `dry_run_only`: do not push yet, but keep the result visible for inspection

## Decision Policy for v0.1

v0.1 should be conservative and honest.

Default posture:

- observe and report first
- avoid high confidence when only graph plus heuristics are available
- hard-block only on clear bounded violations

Hard-block candidates for v0.1:

- protected path touched without the required approval posture
- winner edits materially outside scope
- forbidden architecture node touched
- high-impact candidate with failed anchoring posture

## Confidence Policy

Confidence must reflect evidence quality, not just internal neatness.

Rules:

- confidence must remain limited when based only on graph plus heuristics
- confidence may increase when claim-gate, safety, and graph signals converge cleanly
- confidence must decrease when telemetry is absent, anchoring is weak, or scope ambiguity remains high

v0.1 must not claim statistically validated confidence from historical builder telemetry.

## Telemetry Honesty

The following telemetry surfaces are structurally connectable:

- `asyncJobs`
- `builderTasks`
- `builderOpusLog`

But v0.1 must state clearly:

- graph + pipeline signals + heuristics are the real basis
- historical telemetry is future-enriching, not current proof

## Non-Scope

This spec does not include:

- UI work
- a new orchestration pipeline
- a new council stage
- a new build packet format
- Maya integration
- cross-repo orchestration
- MiroFish, OASIS, or Neo4j dependencies
- GitHub workflow changes
- `.env` access
- auth, billing, or product feature work

## Minimal Integration Expectation

v0.1 should be able to surface `workflowSimulation` in the orchestrator result, especially in dry-run mode.

It should reuse existing builder signals rather than inventing parallel truth.

## Closing Constraint

This document is intentionally narrower than the charter.

The charter defines health boundaries.
This spec defines one minimal, technically grounded pre-push gate that applies those boundaries inside the existing builder flow.