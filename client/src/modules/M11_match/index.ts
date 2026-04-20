/** PURPOSE: Persona-Matching: welche Persona passt zur aktuellen User-Frage oder Stimmung */

// Public API for module M11. No deep imports allowed outside this module.
export type { MatchEngine } from './lib/matchEngine';
export { computeMatch, computeMatchNarrative } from './lib/matchEngine';
