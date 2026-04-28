import type { CandidateGateResult } from './opusClaimGate.js';
import type { BuilderSafetyDecision } from './builderSafetyPolicy.js';
import type { AppliedDiffSnapshot, EditEnvelope } from './opusEnvelopeValidator.js';

export type WorkflowSimulationRecommendedAction =
  | 'allow_push'
  | 'require_review'
  | 'dry_run_only'
  | 'block_push';

export interface BuilderWorkflowSimulation {
  version: '0.1';
  mode: 'pre_push_gate';
  recommendedAction: WorkflowSimulationRecommendedAction;
  confidence: number;
  basis: string[];
  missingEvidence: string[];
  taskClass: BuilderSafetyDecision['taskClass'];
  scopeRisk: number;
  driftRisk: number;
  protectedPathRisk: number;
  ambiguityRisk: number;
  claimAnchoringRisk: number;
  expectedFiles: string[];
  forbiddenFiles: string[];
  simulatedFindings: string[];
  executionContract: {
    taskClass: BuilderSafetyDecision['taskClass'];
    executionPolicy: BuilderSafetyDecision['executionPolicy'];
    pushAllowed: boolean;
    dryRun: boolean;
    sideEffectsMode: 'default' | 'none';
  };
}

interface BuildWorkflowSimulationInput {
  scopeFiles: string[];
  createTargets: string[];
  winner: EditEnvelope;
  winnerClaimGate?: CandidateGateResult;
  finalSafety: BuilderSafetyDecision;
  dryRun: boolean;
  appliedDiffSnapshot?: AppliedDiffSnapshot;
  sideEffectsMode?: 'default' | 'none';
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function buildWorkflowSimulation({
  scopeFiles,
  createTargets,
  winner,
  winnerClaimGate,
  finalSafety,
  dryRun,
  appliedDiffSnapshot,
  sideEffectsMode = 'default',
}: BuildWorkflowSimulationInput): BuilderWorkflowSimulation {
  const allowedFiles = new Set([...scopeFiles, ...createTargets]);
  const editedFiles = winner.edits.map((edit) => edit.path);
  const outOfScopeFiles = editedFiles.filter((path) => !allowedFiles.has(path));
  const protectedPaths = finalSafety.protectedPathsTouched;
  const claimMismatches = winnerClaimGate?.claims
    .filter((claim) => claim.scopeCompatibility === 'mismatch')
    .map((claim) => claim.text) ?? [];
  const claimNoAnchor = winnerClaimGate?.claims
    .filter((claim) => claim.anchorStatus === 'no_anchor')
    .map((claim) => claim.text) ?? [];
  const claimRejectCodes = winnerClaimGate?.rejectCodes ?? [];

  const simulatedFindings: string[] = [];
  let recommendedAction: WorkflowSimulationRecommendedAction = 'allow_push';

  const protectedPathRisk = protectedPaths.length > 0 ? 1 : 0;
  const scopeRisk = outOfScopeFiles.length > 0 ? 1 : 0;
  const ambiguityRisk = finalSafety.decision === 'uncertain' ? 0.7 : 0;
  const claimAnchoringRisk = claimMismatches.length > 0
    ? 0.9
    : claimNoAnchor.length > 0 || claimRejectCodes.length > 0
      ? 0.6
      : 0;
  const driftRisk = clamp(Math.max(protectedPathRisk, claimAnchoringRisk * 0.5));

  if (dryRun) {
    recommendedAction = 'dry_run_only';
    simulatedFindings.push('dryRun=true keeps the workflow in report-only mode before push.');
  }

  if (finalSafety.executionPolicy === 'manual_only') {
    recommendedAction = 'block_push';
    simulatedFindings.push('manual_only execution policy requires a hard pre-push stop.');
  }

  if (protectedPaths.length > 0) {
    recommendedAction = 'block_push';
    simulatedFindings.push(`Protected paths touched: ${protectedPaths.join(', ')}`);
  }

  if (outOfScopeFiles.length > 0) {
    recommendedAction = 'block_push';
    simulatedFindings.push(`Winner edits outside allowed scope/create targets: ${outOfScopeFiles.join(', ')}`);
  }

  if (claimMismatches.length > 0) {
    recommendedAction = 'block_push';
    simulatedFindings.push(`Claim gate flagged scope mismatches for winner claims (${claimMismatches.length}).`);
  } else if (recommendedAction === 'allow_push' && (claimNoAnchor.length > 0 || claimRejectCodes.length > 0)) {
    recommendedAction = 'require_review';
    simulatedFindings.push(`Claim anchoring is incomplete for winner claims (${claimNoAnchor.length || claimRejectCodes.length}).`);
  }

  if (!dryRun && recommendedAction === 'allow_push' && !finalSafety.pushAllowed) {
    recommendedAction = finalSafety.decision === 'block' ? 'block_push' : 'require_review';
    simulatedFindings.push(finalSafety.reasons[0] ?? 'Final safety does not allow an autonomous push.');
  }

  if (
    appliedDiffSnapshot
    && recommendedAction === 'allow_push'
    && appliedDiffSnapshot.actualChangedFiles.some((path) => !allowedFiles.has(path))
  ) {
    recommendedAction = 'require_review';
    simulatedFindings.push('Applied diff snapshot shows changed files outside the expected scope.');
  }

  let confidence = 0.55;
  if (recommendedAction === 'dry_run_only') confidence = 0.45;
  if (recommendedAction === 'require_review') confidence = 0.35;
  if (recommendedAction === 'block_push') confidence = 0.3;
  if (simulatedFindings.length > 1) confidence = Math.max(0.2, confidence - 0.05);

  return {
    version: '0.1',
    mode: 'pre_push_gate',
    recommendedAction,
    confidence,
    basis: [
      'scope',
      'claim_gate',
      'judge_winner',
      'final_safety',
      'applied_diff_snapshot',
      'static_heuristics',
    ],
    missingEvidence: [
      'historical_builder_run_telemetry',
      'callback_outcome_statistics',
      'architecture_drift_runtime_evidence',
    ],
    taskClass: finalSafety.taskClass,
    scopeRisk,
    driftRisk,
    protectedPathRisk,
    ambiguityRisk,
    claimAnchoringRisk,
    expectedFiles: uniqueSorted([...scopeFiles, ...createTargets]),
    forbiddenFiles: uniqueSorted([...outOfScopeFiles, ...protectedPaths]),
    simulatedFindings,
    executionContract: {
      taskClass: finalSafety.taskClass,
      executionPolicy: finalSafety.executionPolicy,
      pushAllowed: finalSafety.pushAllowed,
      dryRun,
      sideEffectsMode,
    },
  };
}
