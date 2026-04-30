/**
 * Opus Judge — selects the best candidate via LLM
 */
import type { EditEnvelope } from './opusEnvelopeValidator.js';
import { extractExplicitPaths } from './opusAnchorPaths.js';
import { callProvider } from './providers.js';
import { WORKER_REGISTRY, JUDGE_FALLBACK_WORKERS, JUDGE_WORKER } from './opusWorkerRegistry.js';

// ─── Types ───

interface JudgeContext {
  scopeFiles: string[];
  createTargets: string[];
}

interface CandidateAssessment {
  envelope: EditEnvelope;
  worker: string;
  explicitPaths: string[];
  editedPaths: string[];
  outOfScopePaths: string[];
  missingExplicitPaths: string[];
  missingCreateTargets: string[];
  blockingIssues: string[];
  warnings: string[];
}

export interface JudgeDecision {
  decision: 'approve' | 'block' | 'uncertain';
  approved: boolean;
  reason: string;
  winner?: EditEnvelope;
  worker?: string;
  rejectedWorkers: string[];
  judgeLane?: string;
}

function estimateEditSize(envelope: EditEnvelope): number {
  return envelope.edits.reduce((sum, edit) => {
    if (edit.mode === 'patch') {
      return sum + (edit.patches?.reduce((patchSum, patch) => patchSum + patch.search.length + patch.replace.length, 0) ?? 0);
    }
    return sum + (edit.content?.length ?? 0);
  }, 0);
}

const CREATE_PREVIEW_MAX_LENGTH = 200;
const PATCH_PREVIEW_MAX_LENGTH = 240;

function formatPreviewSnippet(value: string, maxLength = 160): string {
  const visible = value
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n');
  return visible.length > maxLength
    ? `${visible.slice(0, Math.max(0, maxLength - 3))}...`
    : visible;
}

export function previewEditForJudge(envelope: EditEnvelope): string {
  return envelope.edits.slice(0, 3).map((edit) => {
    if (edit.mode === 'patch') {
      const patchPreview = (edit.patches ?? []).slice(0, 2)
        .map((patch) => `${formatPreviewSnippet(patch.search, PATCH_PREVIEW_MAX_LENGTH)} => ${formatPreviewSnippet(patch.replace, PATCH_PREVIEW_MAX_LENGTH)}`)
        .join(' | ');
      return `- ${edit.path} [patch] ${patchPreview}`;
    }
    const contentPreview = formatPreviewSnippet(edit.content ?? '', CREATE_PREVIEW_MAX_LENGTH);
    return `- ${edit.path} [${edit.mode}] ${contentPreview}`;
  }).join('\n');
}

function assessCandidate(
  instruction: string,
  candidate: { envelope: EditEnvelope; worker: string },
  context: JudgeContext,
): CandidateAssessment {
  const explicitPaths = extractExplicitPaths(instruction);
  const editedPaths = candidate.envelope.edits.map((edit) => edit.path);
  const outOfScopePaths = editedPaths.filter((path) => !context.scopeFiles.includes(path));
  const missingExplicitPaths = explicitPaths.filter((path) => !editedPaths.includes(path));
  const missingCreateTargets = context.createTargets.filter((path) =>
    !candidate.envelope.edits.some((edit) => edit.mode === 'create' && edit.path === path),
  );


  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (explicitPaths.length > 0 && editedPaths.every((path) => !explicitPaths.includes(path))) {
    blockingIssues.push(`touches none of the explicit instruction paths (${explicitPaths.join(', ')})`);
  } else if (missingExplicitPaths.length > 0) {
    warnings.push(`does not touch every explicit instruction path (${missingExplicitPaths.join(', ')})`);
  }

  if (missingCreateTargets.length > 0) {
    blockingIssues.push(`missing required create target(s): ${missingCreateTargets.join(', ')}`);
  }

  if (context.createTargets.length === 0 && candidate.envelope.edits.some((edit) => edit.mode === 'create')) {
    blockingIssues.push('create edit without a clear create target in scope');
  }

  if (outOfScopePaths.length > 0) {
    if (candidate.envelope.edits.length === 1 || context.scopeFiles.length > 0) {
      blockingIssues.push(`adds out-of-scope edits: ${outOfScopePaths.join(', ')}`);
    } else {
      warnings.push(`adds out-of-scope edits: ${outOfScopePaths.join(', ')}`);
    }
  }

  return {
    envelope: candidate.envelope,
    worker: candidate.worker,
    explicitPaths,
    editedPaths,
    outOfScopePaths,
    missingExplicitPaths,
    missingCreateTargets,
    blockingIssues,
    warnings,
  };
}

function buildHeuristicDecision(assessments: CandidateAssessment[]): JudgeDecision {
  const ranked = [...assessments].sort((a, b) => {
    if (a.blockingIssues.length !== b.blockingIssues.length) {
      return a.blockingIssues.length - b.blockingIssues.length;
    }
    if (a.outOfScopePaths.length !== b.outOfScopePaths.length) {
      return a.outOfScopePaths.length - b.outOfScopePaths.length;
    }
    return estimateEditSize(a.envelope) - estimateEditSize(b.envelope);
  });

  const best = ranked[0];
  if (!best) {
    return {
      decision: 'block',
      approved: false,
      reason: 'No valid candidates reached the judge.',
      rejectedWorkers: [],
    };
  }

  if (best.blockingIssues.length > 0) {
    return {
      decision: 'block',
      approved: false,
      reason: best.blockingIssues.join('; '),
      rejectedWorkers: assessments.map((assessment) => assessment.worker),
    };
  }

  if (best.warnings.length > 0) {
    return {
      decision: 'uncertain',
      approved: false,
      reason: best.warnings[0],
      winner: best.envelope,
      worker: best.worker,
      rejectedWorkers: assessments.filter((assessment) => assessment.worker !== best.worker).map((assessment) => assessment.worker),
    };
  }

  return {
    decision: 'approve',
    approved: true,
    reason: best.warnings[0] ?? 'Heuristic fallback selected the least risky candidate.',
    winner: best.envelope,
    worker: best.worker,
    rejectedWorkers: assessments.filter((assessment) => assessment.worker !== best.worker).map((assessment) => assessment.worker),
  };
}

function parseJudgeResponse(raw: string, candidateCount: number): { approved: boolean; pick: number; reason: string; decision?: 'approve' | 'block' | 'uncertain' } | null {
  const cleaned = raw.trim();
  const jsonText = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;

  try {
    const parsed = JSON.parse(jsonText) as { approved?: unknown; pick?: unknown; reason?: unknown; decision?: unknown };
    const approved = parsed.approved === true;
    const pick = typeof parsed.pick === 'number'
      ? Math.max(0, Math.min(parsed.pick, candidateCount))
      : 0;
    const reason = typeof parsed.reason === 'string' ? parsed.reason : '';
    const decision = parsed.decision === 'approve' || parsed.decision === 'block' || parsed.decision === 'uncertain'
      ? parsed.decision
      : undefined;
    return { approved, pick, reason, decision };
  } catch {
    return null;
  }
}

// ─── Judge ───

/**
 * Select the best candidate from valid options via LLM.
 * Falls back to a heuristic selection and can reject all candidates on semantic drift.
 */
export async function judgeValidCandidates(
  instruction: string,
  candidates: Array<{ envelope: EditEnvelope; worker: string }>,
  context: JudgeContext,
): Promise<JudgeDecision> {
  const assessments = candidates.map((candidate) => assessCandidate(instruction, candidate, context));
  const heuristic = buildHeuristicDecision(assessments);

  const judgeWorkers = [JUDGE_WORKER, ...JUDGE_FALLBACK_WORKERS].filter(
    (worker, index, all) => all.indexOf(worker) === index,
  );

  const comparison = assessments.map((assessment, i) =>
    `=== Candidate ${i + 1}: ${assessment.worker} ===\nFiles: ${assessment.editedPaths.join(', ')}\nSummary: ${assessment.envelope.summary}\nChars: ${estimateEditSize(assessment.envelope)}\nBlocking: ${assessment.blockingIssues.length > 0 ? assessment.blockingIssues.join('; ') : 'none'}\nWarnings: ${assessment.warnings.length > 0 ? assessment.warnings.join('; ') : 'none'}\nPreview:\n${previewEditForJudge(assessment.envelope)}`
  ).join('\n\n');

  for (const judgeWorker of judgeWorkers) {
    const judgeConfig = WORKER_REGISTRY[judgeWorker];
    if (!judgeConfig) {
      continue;
    }

    try {
      const response = await callProvider(judgeConfig.provider, judgeConfig.model, {
        system: 'You are the final code judge. Approve only candidates that solve the task directly, respect explicit file paths, satisfy required create targets, and avoid unnecessary extra scope. Respond ONLY JSON: {"approved": true|false, "pick": 0|1|2, "reason": "..."}. Use pick 0 when every candidate should be rejected.',
        messages: [{ role: 'user', content: `Task: ${instruction}\nScope files: ${context.scopeFiles.join(', ') || 'none'}\nRequired create targets: ${context.createTargets.join(', ') || 'none'}\n\n${comparison}` }],
        maxTokens: 400,
        temperature: 0.1,
        forceJsonObject: false,
        reasoning: { effort: 'high' },
      });
      const parsed = parseJudgeResponse(response, candidates.length);
      if (!parsed) {
        continue;
      }
      if (parsed.decision === 'uncertain') {
        const idx = Math.max(0, Math.min((parsed.pick || 1) - 1, candidates.length - 1));
        const winner = assessments[idx];
        return {
          decision: 'uncertain',
          approved: false,
          reason: parsed.reason || 'Judge uncertain. Requires external approval.',
          winner: winner?.envelope,
          worker: winner?.worker,
          rejectedWorkers: assessments.filter((assessment) => assessment.worker !== winner?.worker).map((assessment) => assessment.worker),
          judgeLane: judgeWorker,
        };
      }

      if (!parsed.approved || parsed.pick === 0 || parsed.decision === 'block') {
        return {
          decision: 'block',
          approved: false,
          reason: parsed.reason || 'Judge rejected all candidates.',
          rejectedWorkers: candidates.map((candidate) => candidate.worker),
          judgeLane: judgeWorker,
        };
      }

      const idx = Math.max(0, Math.min(parsed.pick - 1, candidates.length - 1));
      const winner = assessments[idx];
      if (winner.blockingIssues.length > 0) {
        return {
          decision: 'block',
          approved: false,
          reason: winner.blockingIssues.join('; '),
          rejectedWorkers: candidates.map((candidate) => candidate.worker),
          judgeLane: judgeWorker,
        };
      }

      return {
        decision: parsed.decision === 'approve' ? 'approve' : 'approve',
        approved: true,
        reason: parsed.reason || 'Judge approved the selected candidate.',
        winner: winner.envelope,
        worker: winner.worker,
        rejectedWorkers: assessments.filter((assessment) => assessment.worker !== winner.worker).map((assessment) => assessment.worker),
        judgeLane: judgeWorker,
      };
    } catch {
      continue;
    }
  }

  return heuristic;
}
