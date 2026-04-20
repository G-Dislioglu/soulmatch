/** PURPOSE: Kompatibilitaets-Berechnung zwischen zwei Profilen nach mehreren Methoden (Astro/Numero/BaZi/Vedic) */

// Public API for module M06. No deep imports allowed outside this module.
export type { ScoringEngine } from './lib/scoringEngine';
export { computeScore, buildScoreRequestFromProfile } from './lib/scoringEngine';
export { scoreNumerology, scoreAstrology, scoreFusion } from './lib/rules';
