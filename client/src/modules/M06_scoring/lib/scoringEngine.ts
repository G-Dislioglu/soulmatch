import type { ScoreRequest, ScoreResult, ExplainClaim } from '../../../shared/types/scoring';
import type { NumerologyCoreNumbers } from '../../../shared/types/numerology';
import type { AstrologyResult } from '../../../shared/types/astrology';
import type { UserProfile } from '../../../shared/types/profile';
import { getProfileById } from '../../M03_profile';
import { buildAstrologyRequestFromProfile, computeAstrology } from '../../M04_astrology-adapter';
import { buildNumerologyRequestFromProfile, computeNumerology } from '../../M05_numerology';
import { scoreNumerology, scoreAstrology, scoreFusion } from './rules';
import { roundScore } from './utils';

export interface ScoringEngine {
  compute(req: ScoreRequest): Promise<ScoreResult>;
}

const MASTER = new Set([11, 22, 33]);

function hasMaster(numbers: NumerologyCoreNumbers): boolean {
  return (
    MASTER.has(numbers.lifePath) ||
    MASTER.has(numbers.expression) ||
    MASTER.has(numbers.soulUrge) ||
    MASTER.has(numbers.personality)
  );
}

function countHarmonicAspects(astroResult: AstrologyResult): number {
  if (!astroResult.aspects) return 0;
  return astroResult.aspects.filter((a) => a.type === 'trine' || a.type === 'sextile').length;
}

export function buildScoreRequestFromProfile(profile: UserProfile): ScoreRequest {
  return { profileId: profile.id };
}

class LocalScoringEngine implements ScoringEngine {
  async compute(req: ScoreRequest): Promise<ScoreResult> {
    const profile = getProfileById(req.profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${req.profileId}`);
    }

    const astroReq = buildAstrologyRequestFromProfile(profile);
    const numReq = buildNumerologyRequestFromProfile(profile);

    const [astroResult, numResult] = await Promise.all([
      computeAstrology(astroReq),
      computeNumerology(numReq),
    ]);

    const num = scoreNumerology(numResult.numbers);
    const astro = scoreAstrology(astroResult);
    const fusion = scoreFusion(
      num.score,
      astro.score,
      hasMaster(numResult.numbers),
      countHarmonicAspects(astroResult),
    );

    const scoreOverall = roundScore(
      0.55 * num.score + 0.35 * astro.score + 0.10 * fusion.score,
    );

    const claims: ExplainClaim[] = [...num.claims, ...astro.claims, ...fusion.claims];

    return {
      profileId: req.profileId,
      meta: {
        engine: 'local',
        engineVersion: 'score-1.0',
        computedAt: new Date().toISOString(),
      },
      scoreOverall,
      breakdown: {
        numerology: num.score,
        astrology: astro.score,
        fusion: fusion.score,
      },
      claims,
    };
  }
}

const defaultEngine = new LocalScoringEngine();

export function computeScore(req: ScoreRequest): Promise<ScoreResult> {
  return defaultEngine.compute(req);
}
