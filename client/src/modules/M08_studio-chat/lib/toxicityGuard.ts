const BLOCK_KEY = 'soulmatch.lilith.blocked';
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const TOXIC_PATTERNS: readonly RegExp[] = [
  /\bhure\b/i,
  /\bfick\s*dich\b/i,
  /\bfuck\s*you\b/i,
  /\bschlampe\b/i,
  /\bhurensohn\b/i,
  /\bmissgeburt\b/i,
  /\bbehindert\b/i,
  /\bwichser\b/i,
  /\barschloch\b/i,
  /\bdu dumm/i,
  /\bdu bist.*scheisse\b/i,
  /\bdu bist.*scheiße\b/i,
  /\bhalt.*maul\b/i,
  /\bhalt.*fresse\b/i,
  /\bverpiss\b/i,
];

export function detectToxicity(text: string): boolean {
  return TOXIC_PATTERNS.some((p) => p.test(text));
}

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
  const blockedUntil = Date.now() + BLOCK_DURATION_MS;
  localStorage.setItem(BLOCK_KEY, String(blockedUntil));
}

export function clearBlock(): void {
  localStorage.removeItem(BLOCK_KEY);
}
