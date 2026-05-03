import { getDb } from '../db.js';
import { builderReviews, builderTasks } from '../schema/builder.js';
import { parseBdl, type BdlCommand } from './builderBdlParser.js';
import { buildTeamAwarenessBrief } from './builderTeamAwareness.js';
import { callProvider } from './providers.js';

export type ReviewVerdict = 'ok' | 'issue' | 'block';
export type AgreementLevel = 'high' | 'medium' | 'low';

export interface ParsedReview {
  verdict: ReviewVerdict;
  lane: string;
  scopeOk: boolean;
  blocking: boolean;
  notes: string[];
  reuseCheck: {
    searchedCodebase: boolean;
    existingPatternFound?: boolean;
    patternReused?: 'true' | 'false' | 'adapted';
    justificationIfNew?: string;
    forcedBlock?: boolean;
  };
  uxHeuristic: {
    primaryActionVisible?: boolean;
    stateClarity?: 'good' | 'mixed' | 'poor';
    unnecessaryDominance?: boolean;
    waitTimeBridged?: boolean;
    userInterpretationNeeded?: 'low' | 'medium' | 'high';
  };
  falseSuccessCheck: {
    appearsWorking?: boolean;
    actuallyWorking?: boolean;
    productValue?: 'high' | 'medium' | 'low' | 'none';
    notes?: string;
  };
}

export interface ReviewAgreement {
  level: AgreementLevel;
  dissentPoints: string[];
}

export interface ObserverResult {
  rawResponse: string;
  commands: BdlCommand[];
  review: ParsedReview;
  tokensUsed: number;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function parseBoolean(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/,$/, '').replace(/^"|"$/g, '');
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return undefined;
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[]) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/,$/, '').replace(/^"|"$/g, '') as T;
  return allowed.includes(normalized) ? normalized : undefined;
}

function parseArray(value: string | undefined) {
  if (!value) {
    return [];
  }

  const trimmed = value.trim();
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;

  return inner
    .split(/,|\n/)
    .map((entry) => entry.trim())
    .map((entry) => entry.replace(/^"|"$/g, '').replace(/,$/, ''))
    .filter(Boolean);
}

function extractObjectBody(text: string, key: string) {
  const keyMatch = new RegExp(`${key}\\s*:\\s*\\{`, 'i').exec(text);
  if (!keyMatch || keyMatch.index < 0) {
    return undefined;
  }

  const openIndex = text.indexOf('{', keyMatch.index);
  if (openIndex < 0) {
    return undefined;
  }

  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openIndex + 1, index).trim();
      }
    }
  }

  return undefined;
}

function extractField(text: string, key: string) {
  const match = text.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*:\\s*([^\\n]+)`, 'i'));
  return match?.[1]?.trim();
}

function extractNotes(text: string) {
  const arrayField = extractField(text, 'notes');
  if (arrayField) {
    const parsedArray = parseArray(arrayField);
    if (parsedArray.length > 0) {
      return parsedArray;
    }
  }

  const quoted = text.match(/(?:^|\n)\s*notes\s*:\s*"([^"]+)"/i)?.[1];
  return quoted ? [quoted.trim()] : [];
}

function normalizeVerdict(raw: string | undefined): 'ok' | 'issue' | 'block' {
  if (!raw) return 'issue';
  const value = raw.trim().toLowerCase().replace(/[",]/g, '');
  if (value === 'ok' || value === 'approve' || value === 'approved' || value === 'pass' || value === 'passed') return 'ok';
  if (value === 'block' || value === 'reject' || value === 'rejected' || value === 'fail' || value === 'failed') return 'block';
  return 'issue';
}

function parseReviewBodyBlock(body: string) {
  return {
    verdict: normalizeVerdict(extractField(body, 'verdict')),
    lane: extractField(body, 'lane')?.replace(/,$/, '') ?? 'overall',
    scopeOk: parseBoolean(extractField(body, 'scope_ok')) ?? true,
    blocking: parseBoolean(extractField(body, 'blocking')) ?? false,
    notes: extractNotes(body),
    reuseScalar: parseBoolean(extractField(body, 'reuse_check')),
    reuseBody: extractObjectBody(body, 'reuse_check') ?? '',
    uxBody: extractObjectBody(body, 'ux_heuristic') ?? '',
    falseSuccessBody: extractObjectBody(body, 'false_success_check') ?? '',
  };
}

export function parseReviewBody(body: string, options: { requireReuseSearch?: boolean } = {}): ParsedReview {
  const requireReuseSearch = options.requireReuseSearch ?? true;
  const parsed = parseReviewBodyBlock(body);

  const review: ParsedReview = {
    verdict: parsed.verdict,
    lane: parsed.lane,
    scopeOk: parsed.scopeOk,
    blocking: parsed.blocking,
    notes: parsed.notes,
    reuseCheck: {
      searchedCodebase: parseBoolean(extractField(parsed.reuseBody, 'searched_codebase')) ?? parsed.reuseScalar ?? false,
      existingPatternFound: parseBoolean(extractField(parsed.reuseBody, 'existing_pattern_found')),
      patternReused: parseEnum(extractField(parsed.reuseBody, 'pattern_reused'), ['true', 'false', 'adapted'] as const),
      justificationIfNew: extractField(parsed.reuseBody, 'justification_if_new')?.replace(/^"|"$/g, ''),
    },
    uxHeuristic: {
      primaryActionVisible: parseBoolean(extractField(parsed.uxBody, 'primary_action_visible')),
      stateClarity: parseEnum(extractField(parsed.uxBody, 'state_clarity'), ['good', 'mixed', 'poor'] as const),
      unnecessaryDominance: parseBoolean(extractField(parsed.uxBody, 'unnecessary_dominance')),
      waitTimeBridged: parseBoolean(extractField(parsed.uxBody, 'wait_time_bridged')),
      userInterpretationNeeded: parseEnum(extractField(parsed.uxBody, 'user_interpretation_needed'), ['low', 'medium', 'high'] as const),
    },
    falseSuccessCheck: {
      appearsWorking: parseBoolean(extractField(parsed.falseSuccessBody, 'appears_working')),
      actuallyWorking: parseBoolean(extractField(parsed.falseSuccessBody, 'actually_working')),
      productValue: parseEnum(extractField(parsed.falseSuccessBody, 'product_value'), ['high', 'medium', 'low', 'none'] as const),
      notes: extractField(parsed.falseSuccessBody, 'notes')?.replace(/^"|"$/g, ''),
    },
  };

  if (requireReuseSearch && review.reuseCheck.searchedCodebase === false) {
    review.verdict = 'block';
    review.blocking = true;
    review.reuseCheck.forcedBlock = true;
    review.notes = ['Reuse gate failed: searched_codebase=false', ...review.notes];
  }

  if (review.scopeOk === false) {
    review.verdict = 'block';
    review.blocking = true;
  }

  return review;
}

export function computeAgreement(primary: ParsedReview, secondary: ParsedReview): ReviewAgreement {
  const dissentPoints: string[] = [];
  let score = 0;

  if (primary.verdict !== secondary.verdict) {
    score += 3;
    dissentPoints.push(`verdict:${primary.verdict}->${secondary.verdict}`);
  }

  if (primary.scopeOk !== secondary.scopeOk) {
    score += 2;
    dissentPoints.push('scope_ok');
  }

  if (primary.reuseCheck.searchedCodebase !== secondary.reuseCheck.searchedCodebase) {
    score += 3;
    dissentPoints.push('reuse_check.searched_codebase');
  }

  if (primary.reuseCheck.patternReused !== secondary.reuseCheck.patternReused) {
    score += 1;
    dissentPoints.push('reuse_check.pattern_reused');
  }

  if (primary.uxHeuristic.stateClarity !== secondary.uxHeuristic.stateClarity) {
    score += 1;
    dissentPoints.push('ux_heuristic.state_clarity');
  }

  if (primary.uxHeuristic.userInterpretationNeeded !== secondary.uxHeuristic.userInterpretationNeeded) {
    score += 1;
    dissentPoints.push('ux_heuristic.user_interpretation_needed');
  }

  if (primary.falseSuccessCheck.actuallyWorking !== secondary.falseSuccessCheck.actuallyWorking) {
    score += 2;
    dissentPoints.push('false_success_check.actually_working');
  }

  if (primary.falseSuccessCheck.productValue !== secondary.falseSuccessCheck.productValue) {
    score += 1;
    dissentPoints.push('false_success_check.product_value');
  }

  const level: AgreementLevel = score <= 1 ? 'high' : score <= 4 ? 'medium' : 'low';
  return { level, dissentPoints };
}

export async function saveReview(
  taskId: string,
  reviewer: string,
  review: ParsedReview,
  agreement?: ReviewAgreement,
) {
  const db = getDb();
  await db.insert(builderReviews).values({
    taskId,
    reviewer,
    verdict: review.verdict,
    scopeOk: review.scopeOk ? 'true' : 'false',
    reuseCheck: review.reuseCheck as Record<string, unknown>,
    evidenceRefs: [],
    dissentPoints: agreement?.dissentPoints ?? [],
    notes: [
      ...review.notes,
      `ux.state_clarity=${review.uxHeuristic.stateClarity ?? 'unknown'}`,
      `ux.user_interpretation_needed=${review.uxHeuristic.userInterpretationNeeded ?? 'unknown'}`,
      `false_success.product_value=${review.falseSuccessCheck.productValue ?? 'unknown'}`,
      review.falseSuccessCheck.notes ?? '',
    ].filter(Boolean).join(' | '),
    patches: null,
  });
}

export async function runObserver(
  task: typeof builderTasks.$inferSelect,
  agreement: ReviewAgreement,
  latestContext: string,
): Promise<ObserverResult | null> {
  if (agreement.level !== 'low') {
    return null;
  }

  const rawResponse = await callProvider('deepseek', 'deepseek-v4-flash', {
    system: [
      'Du bist der Builder-Observer fuer Soulmatch.',
      buildTeamAwarenessBrief(task, 'observer'),
      '',
      'Du bist nur Tie-Breaker bei Dissens.',
      'Antworte NUR in BDL.',
      'Gib genau einen @REVIEW Block mit verdict, scope_ok, blocking, notes, reuse_check, ux_heuristic, false_success_check.',
      'reuse_check muss ein Objekt sein: reuse_check: { searched_codebase: true|false, existing_pattern_found: true|false, pattern_reused: true|false|adapted, justification_if_new: "..." }.',
      'Danach genau eine Entscheidung: @APPROVE, @REQUEST_CHANGE oder @BLOCK.',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: [
          `Task goal: ${task.goal}`,
          `Task scope: ${task.scope.join(', ') || '(leer)'}`,
          `Agreement level: ${agreement.level}`,
          `Dissent points: ${agreement.dissentPoints.join(', ') || '(none)'}`,
          latestContext,
        ].join('\n\n'),
      },
    ],
    maxTokens: 1800,
    temperature: 0.4,
    forceJsonObject: false,
  });

  const commands = parseBdl(rawResponse);
  const reviewCommand = commands.find((command) => command.kind === 'REVIEW');
  const review = parseReviewBody(reviewCommand?.body ?? rawResponse, {
    requireReuseSearch: task.goalKind !== 'visual_fix',
  });

  return {
    rawResponse,
    commands,
    review,
    tokensUsed: estimateTokens(rawResponse),
  };
}
