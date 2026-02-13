// --- Config Types ---

export type AstrologySystem = 'tropical' | 'sidereal';

export type HouseSystem = 'placidus' | 'koch' | 'whole_sign' | 'equal';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// --- Request ---

export interface AstrologyRequest {
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

// --- Result Types ---

export type PlanetKey =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
  | 'chiron' | 'lilith';

export interface ZodiacPosition {
  lon: number;
  sign: string;
  deg: number;
}

export interface PlanetPosition {
  key: PlanetKey;
  pos: ZodiacPosition;
  house?: number;
  retro?: boolean;
}

export interface AnglePosition {
  key: 'asc' | 'mc';
  pos: ZodiacPosition;
}

export interface HouseCusp {
  house: number;
  pos: ZodiacPosition;
}

export type AspectType =
  | 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

export interface Aspect {
  a: PlanetKey | 'asc' | 'mc';
  b: PlanetKey | 'asc' | 'mc';
  type: AspectType;
  orb: number;
  exact?: boolean;
}

export interface AstrologyMeta {
  engine: 'stub' | 'swiss_ephemeris';
  engineVersion: string;
  system: AstrologySystem;
  houseSystem: HouseSystem;
  computedAt: string;
  warnings?: string[];
}

// --- Result ---

export interface AstrologyResult {
  profileId: string;
  meta: AstrologyMeta;
  planets?: PlanetPosition[];
  angles?: AnglePosition[];
  houses?: HouseCusp[];
  aspects?: Aspect[];
}
