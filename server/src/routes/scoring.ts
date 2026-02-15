import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';

// Types from shared contract (copied from client/src/shared/types/scoring.ts)
type ClaimLevel = 'info' | 'positive' | 'caution';

interface ExplainClaim {
  id: string;
  level: ClaimLevel;
  title: string;
  detail: string;
  weight: number;
  evidence: {
    source: 'numerology' | 'astrology' | 'fusion';
    refs: string[];
  };
}

interface ScoreBreakdown {
  numerology: number;
  astrology: number;
  fusion: number;
}

interface ScoreMeta {
  engine: 'local';
  engineVersion: string;
  computedAt: string;
  warnings?: string[];
}

interface ScoreRequest {
  profileId: string;
  numerologyProfileId?: string;
  astrologyProfileId?: string;
}

interface ScoreResult {
  profileId: string;
  meta: ScoreMeta;
  scoreOverall: number;
  breakdown: ScoreBreakdown;
  claims: ExplainClaim[];
}

// Additional types for scoring calculation
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

interface ScoringRequest {
  profileId: string;
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

// Helper: Calculate numerology similarity (0-100)
function calculateNumerologySimilarity(numA: NumerologyData['numbers'], numB: NumerologyData['numbers']): number {
  // Life Path compatibility (most important)
  const lifePathDiff = Math.abs(numA.lifePath - numB.lifePath);
  const lifePathScore = Math.max(0, 100 - (lifePathDiff * 20)); // 0-100

  // Expression compatibility
  const expressionDiff = Math.abs(numA.expression - numB.expression);
  const expressionScore = Math.max(0, 100 - (expressionDiff * 15));

  // Soul Urge compatibility
  const soulUrgeDiff = Math.abs(numA.soulUrge - numB.soulUrge);
  const soulUrgeScore = Math.max(0, 100 - (soulUrgeDiff * 15));

  // Personality compatibility
  const personalityDiff = Math.abs(numA.personality - numB.personality);
  const personalityScore = Math.max(0, 100 - (personalityDiff * 15));

  // Birthday compatibility (least important)
  const birthdayDiff = Math.abs(numA.birthday - numB.birthday);
  const birthdayScore = Math.max(0, 100 - (birthdayDiff * 10));

  // Weighted average
  const weightedScore = (
    lifePathScore * 0.4 +
    expressionScore * 0.2 +
    soulUrgeScore * 0.2 +
    personalityScore * 0.15 +
    birthdayScore * 0.05
  );

  return Math.round(weightedScore);
}

// Main scoring calculation
function calculateScore(request: ScoringRequest): ScoreResult {
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
    // For now, even if available, we'll use a simple placeholder
    astrologyScore = 75; // Placeholder
  }

  // Calculate fusion score (combination of both)
  let fusionScore = 0;
  if (astroAvailable) {
    // 60/40 weight when both available
    fusionScore = Math.round((numerologyScore * 0.4) + (astrologyScore * 0.6));
  } else {
    // 100% numerology when astrology unavailable
    fusionScore = numerologyScore;
  }

  // Generate claims based on scoring
  const claims: ExplainClaim[] = [];

  // Numerology claims
  if (numerologyScore >= 80) {
    claims.push({
      id: 'numerology-high',
      level: 'positive',
      title: 'Starke Numerologie-Übereinstimmung',
      detail: `Die Lebenswege (${request.numerologyA.numbers.lifePath} & ${request.numerologyB.numbers.lifePath}) harmonieren sehr gut.`,
      weight: 0.4,
      evidence: {
        source: 'numerology',
        refs: [`lifePath-${request.numerologyA.numbers.lifePath}-${request.numerologyB.numbers.lifePath}`]
      }
    });
  } else if (numerologyScore < 50) {
    claims.push({
      id: 'numerology-low',
      level: 'caution',
      title: 'Numerologische Herausforderungen',
      detail: `Unterschiedliche Lebenswege (${request.numerologyA.numbers.lifePath} & ${request.numerologyB.numbers.lifePath}) können zu Reibung führen.`,
      weight: 0.3,
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

  const breakdown: ScoreBreakdown = {
    numerology: numerologyScore,
    astrology: astroAvailable ? astrologyScore : 0,
    fusion: fusionScore
  };

  return {
    profileId: request.profileId,
    meta: {
      engine: 'local',
      engineVersion: '1.0.0',
      computedAt: now,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    scoreOverall: fusionScore,
    breakdown,
    claims,
  };
}

export const scoringRouter = Router();

// POST /api/scoring/calc
scoringRouter.post('/calc', (req: Request, res: Response) => {
  try {
    const request: ScoringRequest = req.body;
    
    // Validation
    if (!request.profileId || !request.numerologyA || !request.numerologyB) {
      return res.status(400).json({ 
        error: 'profileId, numerologyA, and numerologyB are required' 
      });
    }

    if (!request.numerologyA.numbers || !request.numerologyB.numbers) {
      return res.status(400).json({ 
        error: 'numerologyA.numbers and numerologyB.numbers are required' 
      });
    }

    const result = calculateScore(request);
    devLogger.info('api', 'Score calculated', { 
      profileId: request.profileId, 
      scoreOverall: result.scoreOverall,
      astroAvailable: !result.meta.warnings?.includes('astro_unavailable_using_numerology_only')
    });
    
    res.json(result);
  } catch (error) {
    devLogger.error('api', 'Failed to calculate score', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});
