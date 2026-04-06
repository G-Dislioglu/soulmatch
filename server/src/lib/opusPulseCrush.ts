import { callProvider } from './providers.js';

export type CrushIntensity = 'ambient' | 'case' | 'heavy';

export interface AmbientCrushResult {
  reuseCandidates: string[];
  driftSuspects: string[];
  missingBranches: string[];
}

export interface CaseCrushResult {
  st: { heat: string; drain: string; resonance: string };
  dtt: { working: string; debt: string; debtRisk: string };
  mb: string[];
  recommendation: string;
  tokensUsed: number;
}

interface CaseCrushParsed {
  st?: { heat?: unknown; drain?: unknown; resonance?: unknown };
  dtt?: { working?: unknown; debt?: unknown; debtRisk?: unknown; debt_risk?: unknown };
  mb?: unknown;
  recommendation?: unknown;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

export function extractJsonFromText(text: string): Record<string, unknown> | null {
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace === -1) {
    return null;
  }

  let depth = 0;
  let start = -1;
  for (let index = lastBrace; index >= 0; index -= 1) {
    if (text[index] === '}') {
      depth += 1;
    }
    if (text[index] === '{') {
      depth -= 1;
    }
    if (depth === 0) {
      start = index;
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function determineCrushIntensity(
  task: {
    risk?: string;
    scope?: string[];
    instruction: string;
  },
  context: {
    hasBlocks: boolean;
    hasContradictions: boolean;
    isArchitectural: boolean;
    previousFailures: number;
  },
): CrushIntensity {
  if (context.isArchitectural && context.hasContradictions) {
    return 'heavy';
  }
  if (context.previousFailures >= 2) {
    return 'heavy';
  }
  if (task.risk === 'high') {
    return 'heavy';
  }

  if (context.hasBlocks) {
    return 'case';
  }
  if (task.risk === 'medium') {
    return 'case';
  }
  if (context.previousFailures >= 1) {
    return 'case';
  }

  return 'ambient';
}

export function runAmbientCrush(
  graphBriefing: string,
  errorCards: Array<{ title: string; category: string; affectedFiles: string[] }>,
  taskScope: string[],
): AmbientCrushResult {
  const reuseCandidates: string[] = [];
  const driftSuspects: string[] = [];
  const missingBranches: string[] = [];

  for (const card of errorCards) {
    if (card.affectedFiles.some((file) => taskScope.some((scope) => file.includes(scope) || scope.includes(file)))) {
      driftSuspects.push(`${card.title} (${card.category})`);
    }
  }

  if (graphBriefing.includes('REUSE-KANDIDATEN')) {
    reuseCandidates.push('Graph zeigt Reuse-Möglichkeiten — Scouts prüfen');
  }

  if (taskScope.length > 2) {
    missingBranches.push('Scope betrifft mehrere Dateien — Import-Ketten prüfen');
  }

  return { reuseCandidates, driftSuspects, missingBranches };
}

export async function runCaseCrush(
  task: { goal: string; scope?: string[] },
  chatPoolSummary: string,
  blockReason?: string,
): Promise<CaseCrushResult> {
  const response = await callProvider('deepseek', 'deepseek-reasoner', {
    system: `Du bist ein Crush-Analyst. Wende die Core Perception Triad an:
ST (Search Thermodynamics): heat, drain, resonance (jeweils high/medium/low)
DTT (Dual-Track Truth): working truth, debt, debt risk
MB (Missing Branches): Was wurde nicht diskutiert?

Schreibe deine Analyse als Fließtext. Am Ende, füge einen JSON-Block ein:
{"st":{"heat":"...","drain":"...","resonance":"..."},"dtt":{"working":"...","debt":"...","debtRisk":"..."},"mb":["..."],"recommendation":"..."}`,
    messages: [{
      role: 'user',
      content: `Task: ${task.goal}
Scope: ${(task.scope ?? []).join(', ') || 'nicht eingeschränkt'}
${blockReason ? `Block-Grund: ${blockReason}` : ''}

Team-Diskussion:
${chatPoolSummary}

Analysiere diesen Fall mit der Core Perception Triad.`,
    }],
    maxTokens: 1500,
    forceJsonObject: false,
  });

  const tokensUsed = Math.ceil(response.length / 4);
  const extracted = extractJsonFromText(response);

  if (extracted) {
    const parsed = extracted as CaseCrushParsed;
    return {
      st: {
        heat: normalizeText(parsed.st?.heat, 'medium'),
        drain: normalizeText(parsed.st?.drain, 'medium'),
        resonance: normalizeText(parsed.st?.resonance, 'medium'),
      },
      dtt: {
        working: normalizeText(parsed.dtt?.working, ''),
        debt: normalizeText(parsed.dtt?.debt, ''),
        debtRisk: normalizeText(parsed.dtt?.debtRisk ?? parsed.dtt?.debt_risk, 'medium'),
      },
      mb: normalizeStringArray(parsed.mb),
      recommendation: normalizeText(parsed.recommendation, ''),
      tokensUsed,
    };
  }

  return {
    st: { heat: 'medium', drain: 'medium', resonance: 'medium' },
    dtt: { working: '', debt: '', debtRisk: 'medium' },
    mb: [],
    recommendation: '',
    tokensUsed,
  };
}

export async function runHeavyCrush(
  _task: { goal: string; scope?: string[] },
  _chatPoolSummary: string,
): Promise<{ stub: true; message: string }> {
  return { stub: true, message: 'Heavy Crush not yet implemented — use Case Crush' };
}