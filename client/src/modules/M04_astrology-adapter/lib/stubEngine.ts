import type {
  AstrologyRequest,
  AstrologyResult,
  PlanetKey,
  PlanetPosition,
  AnglePosition,
  HouseCusp,
  Aspect,
  AspectType,
  ZodiacPosition,
} from '../../../shared/types/astrology';
import type { AstrologyEngine } from './astrologyEngine';

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

const PLANET_KEYS: PlanetKey[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'lilith',
];

const ASPECT_PAIRS: [PlanetKey, PlanetKey, AspectType][] = [
  ['sun', 'moon', 'conjunction'],
  ['sun', 'venus', 'sextile'],
  ['moon', 'mars', 'square'],
  ['mercury', 'jupiter', 'trine'],
  ['venus', 'saturn', 'opposition'],
  ['mars', 'neptune', 'sextile'],
  ['jupiter', 'pluto', 'trine'],
];

function simpleHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededValue(seed: number, index: number): number {
  const v = simpleHash(`${seed}-${index}`);
  return (v % 10000) / 10000;
}

function lonToPosition(lon: number): ZodiacPosition {
  const normalized = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  return {
    lon: normalized,
    sign: SIGNS[signIndex]!,
    deg: normalized % 30,
  };
}

function buildPlanets(seed: number): PlanetPosition[] {
  return PLANET_KEYS.map((key, i) => {
    const lon = seededValue(seed, i) * 360;
    return {
      key,
      pos: lonToPosition(lon),
      house: (Math.floor(seededValue(seed, i + 100) * 12) + 1),
      retro: seededValue(seed, i + 200) > 0.7,
    };
  });
}

function buildAngles(seed: number): AnglePosition[] {
  const ascLon = seededValue(seed, 50) * 360;
  const mcLon = (ascLon + 270 + seededValue(seed, 51) * 20 - 10) % 360;
  return [
    { key: 'asc', pos: lonToPosition(ascLon) },
    { key: 'mc', pos: lonToPosition(mcLon) },
  ];
}

function buildHouses(seed: number): HouseCusp[] {
  const ascLon = seededValue(seed, 50) * 360;
  return Array.from({ length: 12 }, (_, i) => {
    const offset = (i * 30) + seededValue(seed, 60 + i) * 10 - 5;
    const lon = (ascLon + offset) % 360;
    return { house: i + 1, pos: lonToPosition(lon) };
  });
}

function buildAspects(seed: number): Aspect[] {
  return ASPECT_PAIRS.map(([a, b, type], i) => ({
    a,
    b,
    type,
    orb: Math.round(seededValue(seed, 300 + i) * 50) / 10,
    exact: seededValue(seed, 400 + i) > 0.85,
  }));
}

export class StubAstrologyEngine implements AstrologyEngine {
  async compute(req: AstrologyRequest): Promise<AstrologyResult> {
    const seedInput = `${req.profileId}|${req.birthDate}|${req.birthTime ?? ''}`;
    const seed = simpleHash(seedInput);

    return {
      profileId: req.profileId,
      meta: {
        engine: 'stub',
        engineVersion: 'stub-1.0',
        system: req.system,
        houseSystem: req.houseSystem,
        computedAt: new Date().toISOString(),
        warnings: ['Stub engine: results are not astronomically accurate.'],
      },
      planets: req.include.planets ? buildPlanets(seed) : undefined,
      angles: req.include.angles ? buildAngles(seed) : undefined,
      houses: req.include.houses ? buildHouses(seed) : undefined,
      aspects: req.include.aspects ? buildAspects(seed) : undefined,
    };
  }
}
