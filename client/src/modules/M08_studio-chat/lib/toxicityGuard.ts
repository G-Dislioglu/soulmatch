import { addStrike, getBanStatus } from './userMemory';

const BLOCK_KEY = 'soulmatch.lilith.blocked';

// ── Severity Levels ──
export type ToxicitySeverity = 'mild' | 'moderate' | 'severe';

interface ToxicPattern {
  pattern: RegExp;
  severity: ToxicitySeverity;
}

// Mild: rude but not deeply offensive — gets a warning
// Moderate: clearly offensive — triggers strike
// Severe: extreme hostility — immediate strike + escalation
const TOXIC_PATTERNS: readonly ToxicPattern[] = [
  // Severe
  { pattern: /\bhurensohn\b/i, severity: 'severe' },
  { pattern: /\bmissgeburt\b/i, severity: 'severe' },
  { pattern: /\bich.*(?:bring|töte|kill).*(?:dich|euch|mich)\b/i, severity: 'severe' },
  { pattern: /\b(?:droh|threat).*(?:gewalt|violence)\b/i, severity: 'severe' },
  // Moderate
  { pattern: /\bhure\b/i, severity: 'moderate' },
  { pattern: /\bfick\s*dich\b/i, severity: 'moderate' },
  { pattern: /\bfuck\s*you\b/i, severity: 'moderate' },
  { pattern: /\bschlampe\b/i, severity: 'moderate' },
  { pattern: /\bwichser\b/i, severity: 'moderate' },
  { pattern: /\barschloch\b/i, severity: 'moderate' },
  { pattern: /\bbehindert\b/i, severity: 'moderate' },
  // Mild
  { pattern: /\bdu dumm/i, severity: 'mild' },
  { pattern: /\bdu bist.*scheisse\b/i, severity: 'mild' },
  { pattern: /\bdu bist.*scheiße\b/i, severity: 'mild' },
  { pattern: /\bhalt.*maul\b/i, severity: 'mild' },
  { pattern: /\bhalt.*fresse\b/i, severity: 'mild' },
  { pattern: /\bverpiss\b/i, severity: 'mild' },
  { pattern: /\bidiot\b/i, severity: 'mild' },
  { pattern: /\bblöd(?:e|er|es)?\b/i, severity: 'mild' },
  { pattern: /\bnervig\b/i, severity: 'mild' },
  { pattern: /\bnutzlos\b/i, severity: 'mild' },
];

export function detectToxicity(text: string): boolean {
  return TOXIC_PATTERNS.some((p) => p.pattern.test(text));
}

export function detectToxicityLevel(text: string): ToxicitySeverity | null {
  let worst: ToxicitySeverity | null = null;
  for (const { pattern, severity } of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      if (severity === 'severe') return 'severe';
      if (severity === 'moderate') worst = 'moderate';
      if (severity === 'mild' && worst === null) worst = 'mild';
    }
  }
  return worst;
}

// ── Legacy block functions (backward compat) ──

export function isBlocked(): boolean {
  const raw = localStorage.getItem(BLOCK_KEY);
  if (!raw) return false;
  const blockedUntil = Number(raw);
  if (isNaN(blockedUntil)) return false;
  if (Date.now() >= blockedUntil) {
    localStorage.removeItem(BLOCK_KEY);
    return false;
  }
  return true;
}

export function getBlockRemainingMs(): number {
  const raw = localStorage.getItem(BLOCK_KEY);
  if (!raw) return 0;
  const blockedUntil = Number(raw);
  if (isNaN(blockedUntil)) return 0;
  const remaining = blockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function activateBlock(): void {
  // Legacy: simple 24h block (used as fallback)
  const blockedUntil = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(BLOCK_KEY, String(blockedUntil));
}

export function clearBlock(): void {
  localStorage.removeItem(BLOCK_KEY);
}

// ── Escalating Ban System ──
// Integrates with userMemory.ts strike system.
// Mild toxicity → warning (no strike). Moderate → strike. Severe → strike + immediate escalation.

export interface ModerationResult {
  action: 'allow' | 'warn' | 'block' | 'ban';
  message: string;
  severity: ToxicitySeverity | null;
  permanent: boolean;
}

export function evaluateMessage(text: string, profileId: string): ModerationResult {
  // Check existing ban first
  const banStatus = getBanStatus(profileId);
  if (banStatus.banned) {
    if (banStatus.permanent) {
      return {
        action: 'ban',
        message: 'Dein Zugang wurde dauerhaft gesperrt aufgrund wiederholter Verstöße.',
        severity: null,
        permanent: true,
      };
    }
    const hours = Math.ceil(banStatus.remainingMs / (1000 * 60 * 60));
    const unit = hours > 48 ? `${Math.ceil(hours / 24)} Tagen` : `${hours} Stunden`;
    return {
      action: 'block',
      message: `Chat gesperrt für noch ${unit}. Bitte respektiere den Umgang.`,
      severity: null,
      permanent: false,
    };
  }

  // Detect toxicity
  const level = detectToxicityLevel(text);
  if (!level) {
    return { action: 'allow', message: '', severity: null, permanent: false };
  }

  if (level === 'mild') {
    return {
      action: 'warn',
      message: 'Bitte achte auf deinen Ton. Respektvoller Umgang ist Voraussetzung für diesen Raum.',
      severity: 'mild',
      permanent: false,
    };
  }

  // Moderate or severe → strike
  const reason = level === 'severe' ? 'Schwere Beleidigung / Drohung' : 'Beleidigung';
  const strikes = addStrike(profileId, reason);

  // Also activate legacy block for backward compat
  activateBlock();

  if (strikes.permanent) {
    return {
      action: 'ban',
      message: 'Wiederholte Verstöße. Dein Zugang wurde dauerhaft gesperrt.',
      severity: level,
      permanent: true,
    };
  }

  const banCheck = getBanStatus(profileId);
  const hours = Math.ceil(banCheck.remainingMs / (1000 * 60 * 60));
  const duration = strikes.count === 1 ? '24 Stunden' : `${Math.ceil(hours / 24)} Tage`;

  return {
    action: 'block',
    message: `Strike ${strikes.count}/3. Chat gesperrt für ${duration}. ${strikes.count >= 2 ? 'Nächster Verstoß führt zur dauerhaften Sperrung.' : 'Bitte überdenke deinen Umgang.'}`,
    severity: level,
    permanent: false,
  };
}
