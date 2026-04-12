import type { NumerologyCoreNumbers } from '../../../shared/types/numerology';
import type { AstrologyResult } from '../../../shared/types/astrology';
import type { ExplainClaim } from '../../../shared/types/scoring';
import { clamp, claimId } from './utils';

const MASTER = new Set([11, 22, 33]);

// --- Numerology Scoring ---

function lifePathPoints(v: number): { pts: number; level: ExplainClaim['level'] } {
  if (MASTER.has(v)) return { pts: 14, level: 'positive' };
  if ([1, 3, 5, 9].includes(v)) return { pts: 10, level: 'positive' };
  if (v === 7) return { pts: 8, level: 'info' };
  return { pts: 6, level: 'info' };
}

function expressionPoints(v: number): number {
  if (MASTER.has(v)) return 10;
  if ([1, 3, 5, 9].includes(v)) return 8;
  if (v === 7) return 6;
  return 5;
}

function soulUrgePoints(v: number): number {
  if (MASTER.has(v)) return 10;
  if ([2, 6, 9].includes(v)) return 8;
  if ([1, 3, 5, 8].includes(v)) return 6;
  return 5;
}

function personalityPoints(v: number): number {
  if (MASTER.has(v)) return 9;
  if ([3, 5, 9].includes(v)) return 7;
  if ([1, 2, 6, 8].includes(v)) return 5;
  return 4;
}

export function scoreNumerology(numbers: NumerologyCoreNumbers): {
  score: number;
  claims: ExplainClaim[];
} {
  const claims: ExplainClaim[] = [];
  let score = 50;

  const lp = lifePathPoints(numbers.lifePath);
  score += lp.pts;
  claims.push({
    id: claimId('NUM_LIFEPATH', numbers.lifePath),
    level: lp.level,
    title: `Life Path ${numbers.lifePath}`,
    detail: MASTER.has(numbers.lifePath)
      ? `Master Number ${numbers.lifePath} zeigt außergewöhnliches Potenzial.`
      : `Life Path ${numbers.lifePath} bringt ${lp.pts} Punkte zum Numerologie-Score.`,
    weight: MASTER.has(numbers.lifePath) ? 0.8 : 0.4,
    evidence: { source: 'numerology', refs: [`lifePath:${numbers.lifePath}`] },
  });

  score += expressionPoints(numbers.expression);
  claims.push({
    id: claimId('NUM_EXPRESSION', numbers.expression),
    level: MASTER.has(numbers.expression) ? 'positive' : 'info',
    title: `Expression ${numbers.expression}`,
    detail: `Expression Number ${numbers.expression} beeinflusst die äußere Wirkung.`,
    weight: MASTER.has(numbers.expression) ? 0.6 : 0.3,
    evidence: { source: 'numerology', refs: [`expression:${numbers.expression}`] },
  });

  score += soulUrgePoints(numbers.soulUrge);
  claims.push({
    id: claimId('NUM_SOULURGE', numbers.soulUrge),
    level: [2, 6, 9].includes(numbers.soulUrge) ? 'positive' : 'info',
    title: `Soul Urge ${numbers.soulUrge}`,
    detail: `Soul Urge ${numbers.soulUrge} spiegelt innere Motivation wider.`,
    weight: [2, 6, 9].includes(numbers.soulUrge) ? 0.5 : 0.3,
    evidence: { source: 'numerology', refs: [`soulUrge:${numbers.soulUrge}`] },
  });

  score += personalityPoints(numbers.personality);
  claims.push({
    id: claimId('NUM_PERSONALITY', numbers.personality),
    level: 'info',
    title: `Personality ${numbers.personality}`,
    detail: `Personality Number ${numbers.personality} prägt den ersten Eindruck.`,
    weight: 0.2,
    evidence: { source: 'numerology', refs: [`personality:${numbers.personality}`] },
  });

  return { score: clamp(score, 0, 100), claims };
}

// --- Astrology Scoring ---

export function scoreAstrology(result: AstrologyResult): {
  score: number;
  claims: ExplainClaim[];
} {
  const claims: ExplainClaim[] = [];
  let score = 45;

  if (result.aspects) {
    let trineCount = 0;
    let sextileCount = 0;
    let conjunctionCount = 0;
    let squareCount = 0;
    let oppositionCount = 0;

    for (const asp of result.aspects) {
      switch (asp.type) {
        case 'trine': trineCount++; break;
        case 'sextile': sextileCount++; break;
        case 'conjunction': conjunctionCount++; break;
        case 'square': squareCount++; break;
        case 'opposition': oppositionCount++; break;
      }
    }

    score += Math.min(trineCount * 4, 12);
    score += Math.min(sextileCount * 3, 9);
    score += Math.min(conjunctionCount * 2, 6);
    score -= Math.min(squareCount * 4, 12);
    score -= Math.min(oppositionCount * 5, 10);

    const harmonic = trineCount + sextileCount;
    const hard = squareCount + oppositionCount;

    if (harmonic > 0) {
      claims.push({
        id: claimId('AST_HARMONIC', harmonic),
        level: 'positive',
        title: `${harmonic} harmonische Aspekte`,
        detail: `${trineCount} Trigone und ${sextileCount} Sextile stärken das Gesamtbild.`,
        weight: 0.5,
        evidence: { source: 'astrology', refs: [`aspects:trine:${trineCount}`, `aspects:sextile:${sextileCount}`] },
      });
    }

    if (hard > 0) {
      claims.push({
        id: claimId('AST_HARD_ASPECTS', hard),
        level: 'caution',
        title: `${hard} Spannungsaspekte`,
        detail: `${squareCount} Quadrate und ${oppositionCount} Oppositionen erzeugen Reibung.`,
        weight: -0.4,
        evidence: { source: 'astrology', refs: [`aspects:square:${squareCount}`, `aspects:opposition:${oppositionCount}`] },
      });
    }
  }

  if (result.angles && result.angles.length >= 2) {
    score += 6;
    claims.push({
      id: 'AST_ANGLES_PRESENT',
      level: 'positive',
      title: 'ASC & MC vorhanden',
      detail: 'Aszendent und Medium Coeli liefern zusätzliche Persönlichkeitsdaten.',
      weight: 0.3,
      evidence: { source: 'astrology', refs: ['angles:asc', 'angles:mc'] },
    });
  }

  if (result.planets && result.planets.length >= 10) {
    score += 6;
    claims.push({
      id: 'AST_PLANETS_FULL',
      level: 'info',
      title: 'Vollständiges Planetenbild',
      detail: `${result.planets.length} Planeten/Punkte berechnet — gute Datenbasis.`,
      weight: 0.2,
      evidence: { source: 'astrology', refs: [`planets:count:${result.planets.length}`] },
    });
  }

  return { score: clamp(score, 0, 100), claims };
}

// --- Fusion Scoring ---

export function scoreFusion(
  numScore: number,
  astroScore: number,
  hasMasterNumber: boolean,
  harmonicAspectCount: number,
): { score: number; claims: ExplainClaim[] } {
  const claims: ExplainClaim[] = [];
  let score = 50;

  if (numScore >= 70 && astroScore >= 65) {
    score += 20;
    claims.push({
      id: 'FUSION_HIGH_ALIGNMENT',
      level: 'positive',
      title: 'Hohe Übereinstimmung',
      detail: 'Numerologie und Astrologie zeigen beide starke Werte — Synergie-Bonus.',
      weight: 0.7,
      evidence: { source: 'fusion', refs: [`num:${numScore}`, `astro:${astroScore}`] },
    });
  }

  if (Math.abs(numScore - astroScore) >= 25 && astroScore > 10) {
    score -= 10;
    claims.push({
      id: 'FUSION_DIVERGENCE',
      level: 'caution',
      title: 'Divergenz zwischen Systemen',
      detail: 'Numerologie und Astrologie weichen stark ab — Interpretation nötig.',
      weight: -0.3,
      evidence: { source: 'fusion', refs: [`num:${numScore}`, `astro:${astroScore}`] },
    });
  }

  if (hasMasterNumber && harmonicAspectCount >= 2) {
    score += 10;
    claims.push({
      id: 'FUSION_MASTER_HARMONY',
      level: 'positive',
      title: 'Master Number + Harmonie',
      detail: 'Eine Master Number trifft auf harmonische Aspekte — verstärktes Potenzial.',
      weight: 0.5,
      evidence: { source: 'fusion', refs: ['master:true', `harmonic:${harmonicAspectCount}`] },
    });
  }

  return { score: clamp(score, 0, 100), claims };
}
