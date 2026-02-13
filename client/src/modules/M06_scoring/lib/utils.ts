export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

export function claimId(prefix: string, key: string | number): string {
  return `${prefix}_${String(key).toUpperCase()}`;
}
