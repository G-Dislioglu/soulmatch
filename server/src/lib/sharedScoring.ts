/**
 * Compatibility bridge.
 * Canonical implementation lives in ../shared/scoring.ts.
 */
export * from '../shared/scoring.js';

/**
 * Returns a color code based on the score value.
 * @param score - The score value (0-100)
 * @returns Hex color code string
 */
export function getScoreColor(score: number): string {
    if (score > 70) return '#22c55e';
    if (score >= 40) return '#eab308';
    return '#ef4444';
}
