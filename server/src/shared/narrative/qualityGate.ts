import type { GateContext, GateResult } from './types.js';

const GATE_VERSION = 'gate-v1';
const MIN_TEXT_LEN = 16;
const MAX_TEXT_LEN = 600;

const DISALLOWED_PATTERNS: Array<{ reason: string; regex: RegExp }> = [
  { reason: 'empty_text', regex: /^\s*$/ },
  { reason: 'contains_code_fence', regex: /```/ },
  { reason: 'contains_placeholder', regex: /\b(lorem ipsum|todo|placeholder)\b/i },
  { reason: 'contains_raw_json_hint', regex: /\{\s*"turns"\s*:/i },
  { reason: 'contains_insult', regex: /\b(idiot|dumm|stupid|hate you)\b/i },
  { reason: 'contains_role_leak', regex: /\b(as an ai|ich bin ein ki-modell)\b/i },
];

function scoreText(text: string): number {
  let score = 1.0;
  const len = text.trim().length;

  if (len < MIN_TEXT_LEN) score -= 0.45;
  if (len > MAX_TEXT_LEN) score -= 0.25;
  if ((text.match(/!/g) ?? []).length >= 5) score -= 0.15;
  if ((text.match(/\?\?/g) ?? []).length > 0) score -= 0.1;

  for (const rule of DISALLOWED_PATTERNS) {
    if (rule.regex.test(text)) score -= 0.4;
  }

  return Math.max(0, Math.min(1, score));
}

function collectReasons(text: string, ctx?: GateContext): string[] {
  const reasons: string[] = [];
  const trimmed = text.trim();

  if (trimmed.length < MIN_TEXT_LEN) reasons.push('too_short');
  if (trimmed.length > MAX_TEXT_LEN) reasons.push('too_long');

  for (const rule of DISALLOWED_PATTERNS) {
    if (rule.regex.test(text)) reasons.push(rule.reason);
  }

  if (ctx?.source === 'studio_next_step' && !/[a-zA-ZäöüÄÖÜ]/.test(text)) {
    reasons.push('next_step_not_actionable');
  }

  return Array.from(new Set(reasons));
}

export function evaluateNarrative(text: string, ctx?: GateContext): GateResult {
  const reasons = collectReasons(text, ctx);
  const score = scoreText(text);

  return {
    pass: reasons.length === 0 && score >= 0.55,
    reasons,
    score,
    version: GATE_VERSION,
  };
}

export { GATE_VERSION };
