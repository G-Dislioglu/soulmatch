import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderReviews,
  builderTasks,
  builderTestResults,
} from '../schema/builder.js';

export interface EvidencePack {
  taskId: string;
  title: string;
  goal: string;
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

  return {
    taskId: task.id,
    title: task.title,
    goal: task.goal,
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