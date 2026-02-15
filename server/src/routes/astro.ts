import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';

// Types from shared contract (copied from client/src/shared/types/astrology.ts)
type AstrologySystem = 'tropical' | 'sidereal';
type HouseSystem = 'placidus' | 'koch' | 'whole_sign' | 'equal';

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface AstrologyRequest {
  profileId: string;
  name?: string;
  birthDate: string;
  birthTime?: string;
  birthPlace?: string;
  location?: GeoPoint;
  timezone?: string;
  system: AstrologySystem;
  houseSystem: HouseSystem;
  include: {
    planets: boolean;
    houses: boolean;
    aspects: boolean;
    angles: boolean;
    points: boolean;
  };
}

type PlanetKey =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
  | 'chiron' | 'lilith';

interface ZodiacPosition {
  lon: number;
  sign: string;
  deg: number;
}

interface PlanetPosition {
  key: PlanetKey;
  pos: ZodiacPosition;
  house?: number;
  retro?: boolean;
}

interface AnglePosition {
  key: 'asc' | 'mc';
  pos: ZodiacPosition;
}

interface HouseCusp {
  house: number;
  pos: ZodiacPosition;
}

type AspectType =
  | 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

interface Aspect {
  a: PlanetKey | 'asc' | 'mc';
  b: PlanetKey | 'asc' | 'mc';
  type: AspectType;
  orb: number;
  exact?: boolean;
}

interface AstrologyMeta {
  engine: 'stub' | 'swiss_ephemeris';
  engineVersion: string;
  system: AstrologySystem;
  houseSystem: HouseSystem;
  computedAt: string;
  warnings?: string[];
}

interface AstrologyResult {
  profileId: string;
  meta: AstrologyMeta;
  planets?: PlanetPosition[];
  angles?: AnglePosition[];
  houses?: HouseCusp[];
  aspects?: Aspect[];
}

// TODO: Integrate Swiss Ephemeris - This is a stub implementation
function calculateAstrology(request: AstrologyRequest): AstrologyResult {
  const now = new Date().toISOString();
  
  // Stub safety: return empty data when engine is stub
  const warnings: string[] = ['stub_data_not_real'];
  
  if (!request.birthTime) {
    warnings.push('Birth time unknown - houses and angles may be inaccurate');
  }
  if (!request.location && !request.birthPlace) {
    warnings.push('Location unknown - using default coordinates');
  }

  return {
    profileId: request.profileId,
    meta: {
      engine: 'stub', // TODO: Change to 'swiss_ephemeris' when integrated
      engineVersion: '0.0.0-stub', // Clearly marked as stub
      system: request.system,
      houseSystem: request.houseSystem,
      computedAt: now,
      warnings, // Always includes stub_data_not_real
    },
    planets: [], // No fake planet data
    // angles and houses omitted entirely when stub (JSON-safe)
    aspects: [], // No fake aspects
  };
}

export const astrologyRouter = Router();

// POST /api/astro/calc
astrologyRouter.post('/calc', (req: Request, res: Response) => {
  try {
    const request: AstrologyRequest = req.body;
    
    // Validation
    if (!request.profileId || !request.birthDate || !request.system || !request.houseSystem) {
      return res.status(400).json({ 
        error: 'profileId, birthDate, system, and houseSystem are required' 
      });
    }

    if (!['tropical', 'sidereal'].includes(request.system)) {
      return res.status(400).json({ error: 'system must be tropical or sidereal' });
    }

    if (!['placidus', 'koch', 'whole_sign', 'equal'].includes(request.houseSystem)) {
      return res.status(400).json({ error: 'houseSystem must be one of: placidus, koch, whole_sign, equal' });
    }

    const result = calculateAstrology(request);
    devLogger.info('api', 'Astrology calculated', { 
      profileId: request.profileId, 
      system: request.system,
      engine: result.meta.engine 
    });
    
    res.json(result);
  } catch (error) {
    devLogger.error('api', 'Failed to calculate astrology', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});
