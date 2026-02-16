import type { UnifiedScoringRequest, UnifiedScoringResult } from '../scoring.js';

/**
 * API Contract: POST /api/scoring/calc
 *
 * Request rules:
 * - profileId: required string
 * - numerologyA.numbers + numerologyB.numbers: required
 * - relationshipType: optional ('general' | 'romantic' | 'friendship' | 'family' | 'business')
 *
 * Response rules:
 * - engine: always 'unified_scoring'
 * - engineVersion: always 'v3.1'
 * - computedAt: ISO timestamp
 * - warnings: always string[] (can be empty)
 * - scoreOverall: number in [0, 100]
 * - breakdown.numerology|astrology|fusion: number in [0, 100]
 */

export type ScoringCalcRequest = UnifiedScoringRequest;
export type ScoringCalcResponse = UnifiedScoringResult;

export const SCORING_CALC_REQUEST_EXAMPLE: ScoringCalcRequest = {
  profileId: 'fixture-v31',
  relationshipType: 'romantic',
  numerologyA: {
    numbers: {
      lifePath: 11,
      expression: 7,
      soulUrge: 6,
      personality: 5,
      birthday: 19,
      lifePathIsMaster: true,
      karmicDebts: ['16/7'],
      personalYear: 8,
    },
  },
  numerologyB: {
    numbers: {
      lifePath: 2,
      expression: 7,
      soulUrge: 6,
      personality: 4,
      birthday: 13,
      karmicDebts: ['14/5'],
      personalYear: 4,
    },
  },
};

export const SCORING_CALC_RESPONSE_EXAMPLE: ScoringCalcResponse = {
  profileId: 'fixture-v31',
  engine: 'unified_scoring',
  engineVersion: 'v3.1',
  computedAt: '2026-02-16T18:28:53.772Z',
  warnings: ['astro_unavailable_using_numerology_only'],
  meta: {
    engine: 'unified_scoring',
    engineVersion: 'v3.1',
    computedAt: '2026-02-16T18:28:53.772Z',
    warnings: ['astro_unavailable_using_numerology_only'],
  },
  scoreOverall: 91.5,
  breakdown: {
    numerology: 91.5,
    astrology: 0,
    fusion: 91.5,
  },
  claims: [
    {
      id: 'numerology-core-v31',
      level: 'positive',
      title: 'Numerologie-Kernscore (v3.1)',
      detail: 'LifePath 11/2, SoulUrge 6/6, Expression 7/7.',
      weight: 0.5,
      evidence: {
        source: 'numerology',
        refs: ['lifePath:75', 'karmic:2', 'master:2'],
      },
    },
  ],
};
