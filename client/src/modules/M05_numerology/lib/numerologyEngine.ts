import type { NumerologyRequest, NumerologyResult } from '../../../shared/types/numerology';
import type { UserProfile } from '../../../shared/types/profile';
import { calcLifePath, calcBirthday, calcExpression, calcSoulUrge, calcPersonality } from './calc';

export interface NumerologyEngine {
  compute(req: NumerologyRequest): Promise<NumerologyResult>;
}

export function buildNumerologyRequestFromProfile(
  profile: UserProfile,
  overrides?: Partial<NumerologyRequest>,
): NumerologyRequest {
  return {
    profileId: profile.id,
    name: profile.name,
    birthDate: profile.birthDate,
    system: 'pythagorean',
    ...overrides,
  };
}

class LocalNumerologyEngine implements NumerologyEngine {
  async compute(req: NumerologyRequest): Promise<NumerologyResult> {
    const lifePath = calcLifePath(req.birthDate);
    const birthday = calcBirthday(req.birthDate);
    const expression = calcExpression(req.name);
    const soulUrge = calcSoulUrge(req.name);
    const personality = calcPersonality(req.name);

    return {
      profileId: req.profileId,
      meta: {
        engine: 'local',
        engineVersion: 'num-1.0',
        system: req.system,
        computedAt: new Date().toISOString(),
      },
      numbers: {
        lifePath: lifePath.value,
        expression: expression.value,
        soulUrge: soulUrge.value,
        personality: personality.value,
        birthday,
      },
      breakdown: {
        lifePath: lifePath.trace,
        expression: expression.trace,
        soulUrge: soulUrge.trace,
        personality: personality.trace,
      },
    };
  }
}

const defaultEngine = new LocalNumerologyEngine();

export function computeNumerology(req: NumerologyRequest): Promise<NumerologyResult> {
  return defaultEngine.compute(req);
}
