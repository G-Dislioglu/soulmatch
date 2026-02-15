import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';

// Types from shared contract (copied from client/src/shared/types/match.ts)
interface ExplainClaim {
  id: string;
  level: 'info' | 'positive' | 'caution';
  title: string;
  detail: string;
  weight: number;
  evidence: {
    source: 'numerology' | 'astrology' | 'fusion';
    refs: string[];
  };
}

interface MatchRequest {
  aProfileId: string;
  bProfileId: string;
}

interface MatchMeta {
  engine: 'local';
  engineVersion: string;
  computedAt: string;
  warnings?: string[];
}

interface MatchBreakdown {
  numerology: number;
  astrology: number;
  fusion: number;
}

interface MatchScoreResult {
  aProfileId: string;
  bProfileId: string;
  meta: MatchMeta;
  matchOverall: number;
  breakdown: MatchBreakdown;
  claims: ExplainClaim[];
}

// Additional types for match calculation
interface NumerologyData {
  numbers: {
    lifePath: number;
    expression: number;
    soulUrge: number;
    personality: number;
    birthday: number;
  };
  meta: {
    engine: string;
    engineVersion: string;
  };
}

interface AstrologyData {
  meta: {
    engine: string;
    engineVersion: string;
  };
}

interface MatchCalculationRequest {
  aProfileId: string;
  bProfileId: string;
  numerologyA: NumerologyData;
  numerologyB: NumerologyData;
  astroA?: AstrologyData;
  astroB?: AstrologyData;
  relationshipType?: 'romantic' | 'friendship' | 'business';
}

// Helper: Check if astrology data is available (not stub)
function isAstroAvailable(astro?: AstrologyData): boolean {
  if (!astro) return false;
  return astro.meta.engine !== 'stub' && !astro.meta.engineVersion.includes('stub');
}

// Helper: Calculate numerology similarity (0-100) - same as scoring
function calculateNumerologySimilarity(numA: NumerologyData['numbers'], numB: NumerologyData['numbers']): number {
  const lifePathDiff = Math.abs(numA.lifePath - numB.lifePath);
  const lifePathScore = Math.max(0, 100 - (lifePathDiff * 20));

  const expressionDiff = Math.abs(numA.expression - numB.expression);
  const expressionScore = Math.max(0, 100 - (expressionDiff * 15));

  const soulUrgeDiff = Math.abs(numA.soulUrge - numB.soulUrge);
  const soulUrgeScore = Math.max(0, 100 - (soulUrgeDiff * 15));

  const personalityDiff = Math.abs(numA.personality - numB.personality);
  const personalityScore = Math.max(0, 100 - (personalityDiff * 15));

  const birthdayDiff = Math.abs(numA.birthday - numB.birthday);
  const birthdayScore = Math.max(0, 100 - (birthdayDiff * 10));

  const weightedScore = (
    lifePathScore * 0.4 +
    expressionScore * 0.2 +
    soulUrgeScore * 0.2 +
    personalityScore * 0.15 +
    birthdayScore * 0.05
  );

  return Math.round(weightedScore);
}

// Main match calculation (wrapper over scoring logic)
function calculateMatch(request: MatchCalculationRequest): MatchScoreResult {
  const now = new Date().toISOString();
  const warnings: string[] = [];

  // Check astrology availability
  const astroAvailable = isAstroAvailable(request.astroA) && isAstroAvailable(request.astroB);
  
  if (!astroAvailable) {
    warnings.push('astro_unavailable_using_numerology_only');
  }

  // Calculate numerology score
  const numerologyScore = calculateNumerologySimilarity(
    request.numerologyA.numbers,
    request.numerologyB.numbers
  );

  // Calculate astrology score (stub-safe)
  let astrologyScore = 0;
  if (astroAvailable) {
    // TODO: Implement real astrology compatibility when Swiss Ephemeris is integrated
    astrologyScore = 75; // Placeholder
  }

  // Calculate fusion/match score
  let matchScore = 0;
  if (astroAvailable) {
    // 60/40 weight when both available
    matchScore = Math.round((numerologyScore * 0.4) + (astrologyScore * 0.6));
  } else {
    // 100% numerology when astrology unavailable
    matchScore = numerologyScore;
  }

  // Generate match-specific claims
  const claims: ExplainClaim[] = [];

  // Match level assessment
  if (matchScore >= 80) {
    claims.push({
      id: 'match-high',
      level: 'positive',
      title: 'Starke Verbindung',
      detail: `Die Kompatibilität zwischen ${request.aProfileId} und ${request.bProfileId} ist sehr hoch (${matchScore}%).`,
      weight: 0.5,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  } else if (matchScore >= 60) {
    claims.push({
      id: 'match-good',
      level: 'positive',
      title: 'Gute Übereinstimmung',
      detail: `Es besteht eine solide Basis für eine Beziehung (${matchScore}%).`,
      weight: 0.4,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  } else if (matchScore >= 40) {
    claims.push({
      id: 'match-moderate',
      level: 'info',
      title: 'Moderate Kompatibilität',
      detail: `Die Verbindung potenziell vielversprechend, erfordert aber Arbeit (${matchScore}%).`,
      weight: 0.3,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  } else {
    claims.push({
      id: 'match-low',
      level: 'caution',
      title: 'Herausfordernde Verbindung',
      detail: `Die Unterschiede überwiegen (${matchScore}%). Klare Kommunikation ist wichtig.`,
      weight: 0.3,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  }

  // Life Path compatibility claim
  const lifePathDiff = Math.abs(request.numerologyA.numbers.lifePath - request.numerologyB.numbers.lifePath);
  if (lifePathDiff === 0) {
    claims.push({
      id: 'lifePath-same',
      level: 'positive',
      title: 'Gleicher Lebensweg',
      detail: `Beide haben Lebensweg ${request.numerologyA.numbers.lifePath} - tiefe Verständnisbasis.`,
      weight: 0.3,
      evidence: {
        source: 'numerology',
        refs: [`lifePath-${request.numerologyA.numbers.lifePath}`]
      }
    });
  } else if (lifePathDiff <= 2) {
    claims.push({
      id: 'lifePath-compatible',
      level: 'positive',
      title: 'Kompatible Lebenswege',
      detail: `Lebenswege ${request.numerologyA.numbers.lifePath} und ${request.numerologyB.numbers.lifePath} ergänzen sich gut.`,
      weight: 0.2,
      evidence: {
        source: 'numerology',
        refs: [`lifePath-${request.numerologyA.numbers.lifePath}-${request.numerologyB.numbers.lifePath}`]
      }
    });
  }

  // Astrology availability claim
  if (!astroAvailable) {
    claims.push({
      id: 'astro-unavailable',
      level: 'info',
      title: 'Astrologie nicht verfügbar',
      detail: 'Astrologische Analyse steht derzeit nicht zur Verfügung - basiert auf Numerologie.',
      weight: 0.1,
      evidence: {
        source: 'astrology',
        refs: ['stub-engine']
      }
    });
  }

  const breakdown: MatchBreakdown = {
    numerology: numerologyScore,
    astrology: astroAvailable ? astrologyScore : 0,
    fusion: matchScore
  };

  return {
    aProfileId: request.aProfileId,
    bProfileId: request.bProfileId,
    meta: {
      engine: 'local',
      engineVersion: '1.0.0',
      computedAt: now,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    matchOverall: matchScore,
    breakdown,
    claims,
  };
}

export const matchRouter = Router();

// POST /api/match/calc
matchRouter.post('/calc', (req: Request, res: Response) => {
  try {
    const request: MatchCalculationRequest = req.body;
    
    // Validation
    if (!request.aProfileId || !request.bProfileId) {
      return res.status(400).json({ 
        error: 'aProfileId and bProfileId are required' 
      });
    }

    if (!request.numerologyA || !request.numerologyB) {
      return res.status(400).json({ 
        error: 'numerologyA and numerologyB are required' 
      });
    }

    if (!request.numerologyA.numbers || !request.numerologyB.numbers) {
      return res.status(400).json({ 
        error: 'numerologyA.numbers and numerologyB.numbers are required' 
      });
    }

    const result = calculateMatch(request);
    devLogger.info('api', 'Match calculated', { 
      aProfileId: request.aProfileId,
      bProfileId: request.bProfileId,
      matchOverall: result.matchOverall,
      astroAvailable: !result.meta.warnings?.includes('astro_unavailable_using_numerology_only')
    });
    
    res.json(result);
  } catch (error) {
    devLogger.error('api', 'Failed to calculate match', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});
