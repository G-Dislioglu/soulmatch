import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderReviews,
  builderTasks,
  builderTestResults,
} from '../schema/builder.js';
import { buildBuilderTaskContract } from './builderTaskContract.js';

export interface EvidencePack {
  taskId: string;
  title: string;
  goal: string;
  intent_kind: string;
  requested_output_kind: string;
  requested_output_format: string;
  intent: {
    why: string;
    user_outcome: string;
    false_success: string;
  } | null;
  scope_files: string[];
  base_commit: string | null;
  head_commit: string | null;
  diff_stat: string | null;
  reuse_search: {
    patterns_found: number;
    reused: boolean;
    source: string | null;
  } | null;
  checks: {
    tsc: string;
    build: string;
  };
  runtime_results: Array<{
    test: string;
    result: string;
    details: string;
    durationMs: number | null;
  }>;
  counterexamples_tested: number;
  counterexamples_passed: number;
  reviews: Record<string, {
    verdict: string;
    notes: string | null;
  }>;
  contract_snapshot: {
    lifecycle_phase: string;
    attention_state: string;
    active_lanes: string[];
    team_instances: string[];
    output_kind: string;
    output_format: string;
    planned_artifacts: string[];
    code_lane_phase: string;
  };
  status_transitions: Array<{
    from_status: string | null;
    to_status: string;
    lifecycle_phase: string;
    lane: string;
    reason: string | null;
    at: string;
  }>;
  execution_summary: {
    channel: string;
    last_transition_reason: string | null;
    last_transition_lane: string | null;
    last_transition_at: string | null;
    transition_count: number;
    latest_status_source: string | null;
  };
  agreement_level: string | null;
  final_status: string;
  false_success_detected: boolean;
  total_tokens: number;
  total_rounds: number;
  created_at: string;
}

function parseIntent(body: unknown) {
  if (typeof body !== 'string' || body.trim().length === 0) {
    return null;
  }

  const why = body.match(/(?:^|\n)\s*why\s*:\s*"?([^\n"]+)"?/i)?.[1]?.trim() ?? '';
  const userOutcome = body.match(/(?:^|\n)\s*user_outcome\s*:\s*"?([^\n"]+)"?/i)?.[1]?.trim() ?? '';
  const falseSuccess = body.match(/(?:^|\n)\s*false_success\s*:\s*"?([^\n"]+)"?/i)?.[1]?.trim() ?? '';

  if (!why && !userOutcome && !falseSuccess) {
    return null;
  }

  return {
    why,
    user_outcome: userOutcome,
    false_success: falseSuccess,
  };
}

function parseActionResult(action: typeof builderActions.$inferSelect) {
  return (action.result ?? {}) as Record<string, unknown>;
}

function parseActionPayload(action: typeof builderActions.$inferSelect) {
  return action.payload as Record<string, unknown>;
}

function deriveChecks(actions: Array<typeof builderActions.$inferSelect>) {
  const checks = { tsc: 'skipped', build: 'skipped' };

  for (const action of actions.filter((entry) => entry.kind === 'CHECK')) {
    const result = parseActionResult(action);
    const type = typeof result.type === 'string' ? result.type : null;
    const ok = result.ok === true ? 'pass' : result.ok === false ? 'fail' : 'skipped';

    if (type === 'tsc') {
      checks.tsc = ok;
    }

    if (type === 'build') {
      checks.build = ok;
    }
  }

  return checks;
}

function deriveReuseSearch(actions: Array<typeof builderActions.$inferSelect>) {
  const findPatternActions = actions.filter((action) => action.kind === 'FIND_PATTERN');
  if (findPatternActions.length === 0) {
    return null;
  }

  let patternsFound = 0;
  let source: string | null = null;

  for (const action of findPatternActions) {
    const result = parseActionResult(action);
    const matches = Array.isArray(result.matches) ? result.matches as Array<Record<string, unknown>> : [];
    patternsFound += matches.length;
    if (!source && matches.length > 0 && typeof matches[0]?.file === 'string') {
      source = matches[0].file;
    }
  }

  return {
    patterns_found: patternsFound,
    reused: patternsFound > 0,
    source,
  };
}

function deriveDiffStat(actions: Array<typeof builderActions.$inferSelect>) {
  const diffAction = actions.find((action) => {
    if (action.kind !== 'CHECK') {
      return false;
    }
    const result = parseActionResult(action);
    return result.type === 'diff';
  });

  if (!diffAction) {
    return null;
  }

  const result = parseActionResult(diffAction);
  return typeof result.output === 'string' ? result.output : null;
}

function deriveCommitBounds(actions: Array<typeof builderActions.$inferSelect>, taskCommitHash: string | null) {
  const commitHashes = actions
    .filter((action) => action.kind === 'COMMIT')
    .map((action) => parseActionResult(action).commitHash)
    .filter((hash): hash is string => typeof hash === 'string' && hash.length > 0);

  return {
    base_commit: commitHashes[0] ?? null,
    head_commit: taskCommitHash ?? commitHashes[commitHashes.length - 1] ?? null,
  };
}

function deriveCounterexamples(actions: Array<typeof builderActions.$inferSelect>) {
  const relevant = actions.filter((action) => action.kind === 'COUNTEREXAMPLE' || action.kind === 'FAILURE_PATH');
  const passed = relevant.filter((action) => parseActionResult(action).passed !== false).length;

  return {
    tested: relevant.length,
    passed,
  };
}

function deriveReviews(reviews: Array<typeof builderReviews.$inferSelect>) {
  const mapped: EvidencePack['reviews'] = {};
  let agreementLevel: string | null = null;
  let falseSuccessDetected = false;

  for (const review of reviews) {
    mapped[review.reviewer] = {
      verdict: review.verdict,
      notes: review.notes,
    };

    if (!agreementLevel && Array.isArray(review.dissentPoints) && review.dissentPoints.length > 0) {
      agreementLevel = review.dissentPoints.length > 4 ? 'low' : review.dissentPoints.length > 1 ? 'medium' : 'high';
    }

    const reuseCheck = (review.reuseCheck ?? {}) as Record<string, unknown>;
    const reuseForcedBlock = reuseCheck.forcedBlock === true || reuseCheck.searchedCodebase === false;
    const notesText = (review.notes ?? '').toLowerCase();
    const falseSuccessNotes = notesText.includes('false_success') || notesText.includes('appears_working') || notesText.includes('product_value=none');

    if (reuseForcedBlock || falseSuccessNotes) {
      falseSuccessDetected = true;
    }
  }

  return {
    reviews: mapped,
    agreement_level: agreementLevel,
    false_success_detected: falseSuccessDetected,
  };
}

function deriveContractSnapshot(
  task: typeof builderTasks.$inferSelect,
  actions: Array<typeof builderActions.$inferSelect>,
) {
  const latestTransition = [...actions].reverse().find((action) => action.kind === 'STATUS_TRANSITION');
  const latestPayload = latestTransition ? parseActionPayload(latestTransition) : null;
  const payloadContract = latestPayload?.contract as Record<string, unknown> | undefined;
  const fallbackContract = buildBuilderTaskContract(task);
  const routing = (payloadContract?.routing ?? fallbackContract.routing) as Record<string, unknown>;
  const team = (payloadContract?.team ?? fallbackContract.team) as Record<string, unknown>;
  const output = (payloadContract?.output ?? fallbackContract.output) as Record<string, unknown>;
  const lifecycle = (payloadContract?.lifecycle ?? fallbackContract.lifecycle) as Record<string, unknown>;
  const codeLane = (payloadContract?.codeLane ?? fallbackContract.codeLane) as Record<string, unknown>;

  return {
    lifecycle_phase: typeof lifecycle.phase === 'string' ? lifecycle.phase : fallbackContract.lifecycle.phase,
    attention_state: typeof lifecycle.attentionState === 'string' ? lifecycle.attentionState : fallbackContract.lifecycle.attentionState,
    active_lanes: Array.isArray(routing.activeLanes) ? routing.activeLanes.filter((lane): lane is string => typeof lane === 'string') : fallbackContract.routing.activeLanes,
    team_instances: Array.isArray(team.activeInstances) ? team.activeInstances.filter((entry): entry is string => typeof entry === 'string') : fallbackContract.team.activeInstances,
    output_kind: typeof output.kind === 'string' ? output.kind : fallbackContract.output.kind,
    output_format: typeof output.format === 'string' ? output.format : fallbackContract.output.format,
    planned_artifacts: Array.isArray(output.plannedArtifacts) ? output.plannedArtifacts.filter((entry): entry is string => typeof entry === 'string') : fallbackContract.output.plannedArtifacts,
    code_lane_phase: typeof codeLane.phase === 'string' ? codeLane.phase : fallbackContract.codeLane.phase,
  };
}

function deriveStatusTransitions(actions: Array<typeof builderActions.$inferSelect>): EvidencePack['status_transitions'] {
  return actions
    .filter((action) => action.kind === 'STATUS_TRANSITION')
    .map((action) => {
      const payload = parseActionPayload(action);
      const contract = payload.contract as Record<string, unknown> | undefined;
      const lifecycle = contract?.lifecycle as Record<string, unknown> | undefined;

      return {
        from_status: typeof payload.fromStatus === 'string' ? payload.fromStatus : null,
        to_status: typeof payload.toStatus === 'string' ? payload.toStatus : 'unknown',
        lifecycle_phase: typeof lifecycle?.phase === 'string' ? lifecycle.phase : 'unknown',
        lane: action.lane,
        reason: typeof payload.reason === 'string' ? payload.reason : null,
        at: action.createdAt.toISOString(),
      };
    });
}

function inferExecutionChannel(reason: string | null, lane: string | null) {
  if (reason?.startsWith('opus_')) {
    return 'bridge';
  }

  if (reason?.startsWith('retry_pipeline_') || reason?.startsWith('pipeline_')) {
    return 'pipeline';
  }

  if (reason?.startsWith('retry_quick_mode_') || reason?.startsWith('quick_mode_')) {
    return 'quick';
  }

  if (
    reason?.startsWith('human_')
    || reason?.startsWith('manual_')
    || reason?.startsWith('chat_')
  ) {
    return 'manual';
  }

  if (
    reason?.includes('prototype_')
    || reason === 'review_round_started'
    || reason === 'browser_lane_started'
    || reason === 'counterexample_lane_started'
    || reason === 'dialog_engine_completed'
    || reason === 'canary_gate_blocked'
    || lane === 'prototype'
    || lane === 'review'
    || lane === 'runtime'
  ) {
    return 'dialog';
  }

  return 'unknown';
}

function deriveExecutionSummary(
  transitions: EvidencePack['status_transitions'],
): EvidencePack['execution_summary'] {
  const latest = transitions[transitions.length - 1] ?? null;
  const channel = inferExecutionChannel(latest?.reason ?? null, latest?.lane ?? null);

  return {
    channel,
    last_transition_reason: latest?.reason ?? null,
    last_transition_lane: latest?.lane ?? null,
    last_transition_at: latest?.at ?? null,
    transition_count: transitions.length,
    latest_status_source: latest ? `${channel}:${latest.lane}` : null,
  };
}

export async function generateEvidencePack(taskId: string): Promise<EvidencePack> {
  const db = getDb();
  const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const actions = await db
    .select()
    .from(builderActions)
    .where(eq(builderActions.taskId, taskId))
    .orderBy(asc(builderActions.createdAt));

  const reviews = await db
    .select()
    .from(builderReviews)
    .where(eq(builderReviews.taskId, taskId))
    .orderBy(asc(builderReviews.createdAt));

  const testResults = await db
    .select()
    .from(builderTestResults)
    .where(eq(builderTestResults.taskId, taskId))
    .orderBy(asc(builderTestResults.createdAt));

  const planAction = actions.find((action) => action.kind === 'PLAN');
  const planPayload = planAction ? parseActionPayload(planAction) : null;
  const planBody = planPayload?.body;
  const checks = deriveChecks(actions);
  const reuseSearch = deriveReuseSearch(actions);
  const diffStat = deriveDiffStat(actions);
  const commitBounds = deriveCommitBounds(actions, task.commitHash ?? null);
  const counterexamples = deriveCounterexamples(actions);
  const reviewSummary = deriveReviews(reviews);
  const contractSnapshot = deriveContractSnapshot(task, actions);
  const statusTransitions = deriveStatusTransitions(actions);
  const executionSummary = deriveExecutionSummary(statusTransitions);

  return {
    taskId: task.id,
    title: task.title,
    goal: task.goal,
    intent_kind: task.intentKind,
    requested_output_kind: task.requestedOutputKind,
    requested_output_format: task.requestedOutputFormat,
    intent: parseIntent(planBody),
    scope_files: task.scope,
    base_commit: commitBounds.base_commit,
    head_commit: commitBounds.head_commit,
    diff_stat: diffStat,
    reuse_search: reuseSearch,
    checks,
    runtime_results: testResults.map((result) => ({
      test: result.testName,
      result: result.passed === 'true' ? 'pass' : 'fail',
      details: result.details ?? '',
      durationMs: result.duration ?? null,
    })),
    counterexamples_tested: counterexamples.tested,
    counterexamples_passed: counterexamples.passed,
    reviews: reviewSummary.reviews,
    contract_snapshot: contractSnapshot,
    status_transitions: statusTransitions,
    execution_summary: executionSummary,
    agreement_level: reviewSummary.agreement_level,
    final_status: task.status,
    false_success_detected: reviewSummary.false_success_detected,
    total_tokens: task.tokenCount ?? 0,
    total_rounds: actions.reduce((maxRound, action) => {
      const payload = parseActionPayload(action);
      const roundNumber = typeof payload.roundNumber === 'number' ? payload.roundNumber : 0;
      return Math.max(maxRound, roundNumber);
    }, 0),
    created_at: task.createdAt.toISOString(),
  };
}

export async function saveEvidencePack(taskId: string, pack: EvidencePack): Promise<void> {
  const db = getDb();
  await db.insert(builderArtifacts).values({
    taskId,
    artifactType: 'evidence_pack',
    lane: 'review',
    path: null,
    jsonPayload: pack as unknown as Record<string, unknown>,
  });
}
