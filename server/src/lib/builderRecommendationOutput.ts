import type {
  BuilderWorkflowSimulation,
  WorkflowSimulationRecommendedAction,
} from './builderWorkflowSimulation.js';

export interface BuilderRecommendationOutput {
  kind: WorkflowSimulationRecommendedAction;
  userMessage: string;
  operatorSummary: string;
  nextBestAction:
    | 'proceed_with_push'
    | 'inspect_dry_run_result'
    | 'review_scope_and_claims'
    | 'stop_and_fix_blocker';
  requiresUserDecision: boolean;
  reviewReasons: string[];
  safeOptions: string[];
}

const NEXT_ACTION_MAP: Record<WorkflowSimulationRecommendedAction, BuilderRecommendationOutput['nextBestAction']> = {
  allow_push: 'proceed_with_push',
  dry_run_only: 'inspect_dry_run_result',
  require_review: 'review_scope_and_claims',
  block_push: 'stop_and_fix_blocker',
};

const SAFE_OPTIONS_MAP: Record<WorkflowSimulationRecommendedAction, string[]> = {
  allow_push: ['proceed_with_push', 'inspect_workflow_simulation'],
  dry_run_only: ['inspect_dry_run_result', 'review_workflow_simulation'],
  require_review: ['review_scope_and_claims', 'keep_as_dry_run', 'inspect_workflow_simulation'],
  block_push: ['inspect_blockers', 'narrow_scope', 'keep_as_dry_run'],
};

const REQUIRES_USER_DECISION_MAP: Record<WorkflowSimulationRecommendedAction, boolean> = {
  allow_push: false,
  dry_run_only: false,
  require_review: true,
  block_push: false,
};

const FALLBACK_REASON_MAP: Record<WorkflowSimulationRecommendedAction, string> = {
  allow_push: 'No blocker or review signal detected by workflow simulation.',
  dry_run_only: 'Workflow simulation kept the run in dry-run-only mode.',
  require_review: 'Workflow simulation requires review before push.',
  block_push: 'Workflow simulation found a blocking pre-push issue.',
};

function buildUserMessage(kind: WorkflowSimulationRecommendedAction, primaryReason: string): string {
  if (kind === 'allow_push') {
    return 'Der Kandidat ist fuer den Push freigegeben.';
  }
  if (kind === 'dry_run_only') {
    return `Kein Push. Das Ergebnis bleibt als Dry-Run zur Pruefung stehen: ${primaryReason}`;
  }
  if (kind === 'require_review') {
    return `Der Kandidat ist brauchbar, aber vor einem Push ist Review noetig: ${primaryReason}`;
  }
  return `Kein Push. Zuerst muss ein Blocker behoben werden: ${primaryReason}`;
}

export function buildRecommendationOutput(
  workflowSimulation: BuilderWorkflowSimulation,
): BuilderRecommendationOutput {
  const primaryReason = workflowSimulation.simulatedFindings[0]
    ?? FALLBACK_REASON_MAP[workflowSimulation.recommendedAction];
  const reviewReasons = workflowSimulation.simulatedFindings.length > 0
    ? workflowSimulation.simulatedFindings
    : [FALLBACK_REASON_MAP[workflowSimulation.recommendedAction]];

  return {
    kind: workflowSimulation.recommendedAction,
    userMessage: buildUserMessage(workflowSimulation.recommendedAction, primaryReason),
    operatorSummary: `Workflow simulation recommends ${workflowSimulation.recommendedAction} (taskClass=${workflowSimulation.taskClass}, executionPolicy=${workflowSimulation.executionContract.executionPolicy}): ${reviewReasons.join(' | ')}`,
    nextBestAction: NEXT_ACTION_MAP[workflowSimulation.recommendedAction],
    requiresUserDecision: REQUIRES_USER_DECISION_MAP[workflowSimulation.recommendedAction],
    reviewReasons,
    safeOptions: SAFE_OPTIONS_MAP[workflowSimulation.recommendedAction],
  };
}
