import type { ScoreResult } from '../../../shared/types/scoring';
import type { ExplainClaim } from '../../../shared/types/scoring';
import type { MatchBreakdown } from '../../../shared/types/match';
import { clamp } from './utils';

export function computeMatchSubscores(
  scoreA: ScoreResult,
  scoreB: ScoreResult,
): { breakdown: MatchBreakdown; claims: ExplainClaim[] } {
  const claims: ExplainClaim[] = [];

  const numDiff = Math.abs(scoreA.breakdown.numerology - scoreB.breakdown.numerology);
  const astroDiff = Math.abs(scoreA.breakdown.astrology - scoreB.breakdown.astrology);
  const overallDiff = Math.abs(scoreA.scoreOverall - scoreB.scoreOverall);

  const numerology = clamp(100 - numDiff * 1.2, 0, 100);
  const astrology = clamp(100 - astroDiff * 1.2, 0, 100);
  const fusion = clamp(100 - overallDiff * 1.0, 0, 100);

  if (numDiff <= 10) {
    claims.push({
      id: 'MATCH_NUM_HIGH',
      level: 'positive',
      title: 'Hohe numerologische Übereinstimmung',
      detail: `Numerologie-Differenz nur ${Math.round(numDiff)} Punkte — starke Resonanz.`,
      weight: 0.7,
      evidence: {
        source: 'numerology',
        refs: [`A:numerology:${scoreA.breakdown.numerology}`, `B:numerology:${scoreB.breakdown.numerology}`],
      },
    });
  } else if (numDiff >= 25) {
    claims.push({
      id: 'MATCH_NUM_LOW',
      level: 'caution',
      title: 'Numerologische Divergenz',
      detail: `Numerologie-Differenz ${Math.round(numDiff)} Punkte — unterschiedliche Schwingungen.`,
      weight: -0.5,
      evidence: {
        source: 'numerology',
        refs: [`A:numerology:${scoreA.breakdown.numerology}`, `B:numerology:${scoreB.breakdown.numerology}`],
      },
    });
  }

  if (astroDiff <= 10) {
    claims.push({
      id: 'MATCH_ASTRO_HIGH',
      level: 'positive',
      title: 'Hohe astrologische Übereinstimmung',
      detail: `Astrologie-Differenz nur ${Math.round(astroDiff)} Punkte — harmonisches Zusammenspiel.`,
      weight: 0.7,
      evidence: {
        source: 'astrology',
        refs: [`A:astrology:${scoreA.breakdown.astrology}`, `B:astrology:${scoreB.breakdown.astrology}`],
      },
    });
  } else if (astroDiff >= 25) {
    claims.push({
      id: 'MATCH_ASTRO_LOW',
      level: 'caution',
      title: 'Astrologische Divergenz',
      detail: `Astrologie-Differenz ${Math.round(astroDiff)} Punkte — unterschiedliche Konstellationen.`,
      weight: -0.5,
      evidence: {
        source: 'astrology',
        refs: [`A:astrology:${scoreA.breakdown.astrology}`, `B:astrology:${scoreB.breakdown.astrology}`],
      },
    });
  }

  if (overallDiff <= 8) {
    claims.push({
      id: 'MATCH_FUSION_ALIGNED',
      level: 'positive',
      title: 'Gesamtharmonie',
      detail: 'Beide Profile zeigen sehr ähnliche Gesamtwerte — starke Verbindung.',
      weight: 0.6,
      evidence: {
        source: 'fusion',
        refs: [`A:overall:${scoreA.scoreOverall}`, `B:overall:${scoreB.scoreOverall}`],
      },
    });
  } else if (overallDiff >= 20) {
    claims.push({
      id: 'MATCH_FUSION_DIVERGENT',
      level: 'caution',
      title: 'Unterschiedliche Gesamtprofile',
      detail: 'Die Gesamtscores weichen deutlich ab — tiefere Analyse empfohlen.',
      weight: -0.3,
      evidence: {
        source: 'fusion',
        refs: [`A:overall:${scoreA.scoreOverall}`, `B:overall:${scoreB.scoreOverall}`],
      },
    });
  }

  return {
    breakdown: {
      numerology: Math.round(numerology),
      astrology: Math.round(astrology),
      fusion: Math.round(fusion),
    },
    claims,
  };
}
