import type { BuilderWorkflowSimulation } from './builderWorkflowSimulation.js';

export interface BuilderAnalysisOutput {
  evidenceLevel: 'converged' | 'limited' | 'fragile';
  schemaLockRisk: 'low' | 'medium' | 'high';
  shouldDeferSchemaLock: boolean;
  openQuestions: string[];
  cautionReasons: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildAnalysisOutput(
  workflowSimulation: BuilderWorkflowSimulation,
): BuilderAnalysisOutput {
  const cautionReasons = workflowSimulation.simulatedFindings.length > 0
    ? workflowSimulation.simulatedFindings
    : ['Workflow simulation has no detailed findings yet.'];

  const openQuestions: string[] = [];

  if (workflowSimulation.ambiguityRisk > 0) {
    openQuestions.push('Judge outcome remains uncertain and needs stronger evidence before locking the path.');
  }

  if (workflowSimulation.claimAnchoringRisk > 0) {
    openQuestions.push('Claim anchoring is incomplete and should be strengthened before locking the result shape.');
  }

  if (workflowSimulation.missingEvidence.includes('historical_builder_run_telemetry')) {
    openQuestions.push('Historical builder telemetry is not available for confidence calibration.');
  }

  if (workflowSimulation.executionContract.dryRun) {
    openQuestions.push('Dry-run results still need inspection before any live push path is assumed.');
  }

  const evidenceLevel: BuilderAnalysisOutput['evidenceLevel'] =
    workflowSimulation.recommendedAction === 'allow_push'
      && workflowSimulation.confidence >= 0.5
      && workflowSimulation.ambiguityRisk === 0
      && workflowSimulation.claimAnchoringRisk === 0
      && workflowSimulation.scopeRisk === 0
      && workflowSimulation.protectedPathRisk === 0
      ? 'converged'
      : workflowSimulation.recommendedAction === 'block_push'
        || workflowSimulation.ambiguityRisk >= 0.7
        || workflowSimulation.claimAnchoringRisk >= 0.6
        ? 'fragile'
        : 'limited';

  const schemaLockRisk: BuilderAnalysisOutput['schemaLockRisk'] =
    workflowSimulation.recommendedAction === 'block_push'
      || workflowSimulation.scopeRisk > 0
      || workflowSimulation.protectedPathRisk > 0
      || workflowSimulation.claimAnchoringRisk >= 0.6
      ? 'high'
      : workflowSimulation.recommendedAction !== 'allow_push'
        || workflowSimulation.ambiguityRisk > 0
        || workflowSimulation.confidence < 0.5
        ? 'medium'
        : 'low';

  const shouldDeferSchemaLock =
    workflowSimulation.recommendedAction !== 'allow_push'
    || workflowSimulation.ambiguityRisk > 0
    || workflowSimulation.claimAnchoringRisk > 0
    || workflowSimulation.confidence < 0.5;

  return {
    evidenceLevel,
    schemaLockRisk,
    shouldDeferSchemaLock,
    openQuestions: unique(openQuestions),
    cautionReasons: unique(cautionReasons),
  };
}
