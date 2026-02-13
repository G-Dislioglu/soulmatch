import type { MatchRequest, MatchScoreResult } from '../../../shared/types/match';
import { computeScore } from '../../M06_scoring';
import { computeMatchSubscores } from './rules';
import { roundMatch } from './utils';

export interface MatchEngine {
  compute(req: MatchRequest): Promise<MatchScoreResult>;
}

class LocalMatchEngine implements MatchEngine {
  async compute(req: MatchRequest): Promise<MatchScoreResult> {
    const [scoreA, scoreB] = await Promise.all([
      computeScore({ profileId: req.aProfileId }),
      computeScore({ profileId: req.bProfileId }),
    ]);

    const { breakdown, claims } = computeMatchSubscores(scoreA, scoreB);

    const matchOverall = roundMatch(
      0.45 * breakdown.numerology + 0.45 * breakdown.astrology + 0.10 * breakdown.fusion,
    );

    return {
      aProfileId: req.aProfileId,
      bProfileId: req.bProfileId,
      meta: {
        engine: 'local',
        engineVersion: 'match-1.0',
        computedAt: new Date().toISOString(),
      },
      matchOverall,
      breakdown,
      claims,
    };
  }
}

const defaultEngine = new LocalMatchEngine();

export function computeMatch(req: MatchRequest): Promise<MatchScoreResult> {
  return defaultEngine.compute(req);
}
