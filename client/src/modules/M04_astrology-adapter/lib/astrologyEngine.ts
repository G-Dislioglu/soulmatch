import type { AstrologyRequest, AstrologyResult } from '../../../shared/types/astrology';
import type { UserProfile } from '../../../shared/types/profile';

export interface AstrologyEngine {
  compute(req: AstrologyRequest): Promise<AstrologyResult>;
}

export function buildAstrologyRequestFromProfile(
  profile: UserProfile,
  overrides?: Partial<AstrologyRequest>,
): AstrologyRequest {
  return {
    profileId: profile.id,
    name: profile.name,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    birthPlace: profile.birthPlace,
    timezone: profile.timezone,
    system: 'tropical',
    houseSystem: 'placidus',
    include: {
      planets: true,
      houses: true,
      aspects: true,
      angles: true,
      points: true,
    },
    ...overrides,
  };
}
