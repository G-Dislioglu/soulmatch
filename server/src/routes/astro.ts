import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Request types from shared contract (copied from client/src/shared/types/astrology.ts)
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

interface AstroCalcRequest extends Partial<AstrologyRequest> {
  unknownTime?: boolean;
}

type BodyKey =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

interface BodyState {
  lon: number;
  lat: number;
  speedLon: number;
}

interface PlanetState extends BodyState {
  key: BodyKey;
  signKey: string;
  signDe: string;
  degreeInSign: number;
}

interface ElementSummary {
  fire: number;
  earth: number;
  air: number;
  water: number;
}

interface AstroMeta {
  engine: 'swiss_ephemeris' | 'unavailable';
  engineVersion: string;
  system: AstrologySystem;
  houseSystem: HouseSystem;
  computedAt: string;
  warnings?: string[];
}

interface AstroCalcSuccess {
  status: 'ok';
  profileId: string;
  engine: 'swiss_ephemeris';
  engineVersion: string;
  chartVersion: 'chart-v1';
  computedAt: string;
  unknownTime: boolean;
  meta: AstroMeta & { engine: 'swiss_ephemeris' };
  planets: PlanetState[];
  elements: ElementSummary;
  houses: null;
  ascendant: null;
  mc: null;
}

interface AstroCalcError {
  status: 'error';
  computedAt: string;
  meta?: AstroMeta;
  error: {
    message: string;
    code: string;
  };
}

interface PlanetDef {
  key: BodyKey;
  constantName: string;
  fallbackId: number;
}

interface SwephLike {
  [key: string]: unknown;
}

type SwephFn = (...args: unknown[]) => unknown;

const ENGINE_VERSION = '2.10.3-b-1';
const CHART_VERSION = 'chart-v1';

const ZODIAC_SIGNS = [
  { key: 'aries', de: 'Widder' },
  { key: 'taurus', de: 'Stier' },
  { key: 'gemini', de: 'Zwillinge' },
  { key: 'cancer', de: 'Krebs' },
  { key: 'leo', de: 'Löwe' },
  { key: 'virgo', de: 'Jungfrau' },
  { key: 'libra', de: 'Waage' },
  { key: 'scorpio', de: 'Skorpion' },
  { key: 'sagittarius', de: 'Schütze' },
  { key: 'capricorn', de: 'Steinbock' },
  { key: 'aquarius', de: 'Wassermann' },
  { key: 'pisces', de: 'Fische' },
] as const;

const SIGN_TO_ELEMENT: Record<string, keyof ElementSummary> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

const PLANETS: PlanetDef[] = [
  { key: 'sun', constantName: 'SE_SUN', fallbackId: 0 },
  { key: 'moon', constantName: 'SE_MOON', fallbackId: 1 },
  { key: 'mercury', constantName: 'SE_MERCURY', fallbackId: 2 },
  { key: 'venus', constantName: 'SE_VENUS', fallbackId: 3 },
  { key: 'mars', constantName: 'SE_MARS', fallbackId: 4 },
  { key: 'jupiter', constantName: 'SE_JUPITER', fallbackId: 5 },
  { key: 'saturn', constantName: 'SE_SATURN', fallbackId: 6 },
  { key: 'uranus', constantName: 'SE_URANUS', fallbackId: 7 },
  { key: 'neptune', constantName: 'SE_NEPTUNE', fallbackId: 8 },
  { key: 'pluto', constantName: 'SE_PLUTO', fallbackId: 9 },
];

const DEFAULT_INCLUDE: AstrologyRequest['include'] = {
  planets: true,
  houses: false,
  aspects: false,
  angles: false,
  points: false,
};

class SwephUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwephUnavailableError';
  }
}

function normalizeRequest(body: AstroCalcRequest): AstrologyRequest & { unknownTime: boolean } {
  const include = body.include ?? DEFAULT_INCLUDE;

  return {
    profileId: body.profileId ?? 'unknown-profile',
    name: body.name,
    birthDate: body.birthDate ?? '',
    birthTime: body.birthTime,
    birthPlace: body.birthPlace,
    location: body.location,
    timezone: body.timezone,
    system: body.system ?? 'tropical',
    houseSystem: body.houseSystem ?? 'placidus',
    include,
    unknownTime: Boolean(body.unknownTime) || !body.birthTime,
  };
}

function errorResponse(code: string, message: string): AstroCalcError {
  return {
    status: 'error',
    computedAt: new Date().toISOString(),
    error: { code, message },
  };
}

function parseBirthDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error('birthDate must be YYYY-MM-DD');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('birthDate contains invalid month/day');
  }

  return { year, month, day };
}

function parseBirthHourDecimal(birthTime: string | null | undefined, unknownTime: boolean): number {
  if (unknownTime || !birthTime) {
    // Deterministic fallback for unknown time
    return 12;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(birthTime);
  if (!match) {
    throw new Error('birthTime must be HH:mm');
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('birthTime contains invalid hour/minute');
  }

  return hour + minute / 60;
}

function normalizeLongitude(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return Number(normalized.toFixed(8));
}

function normalizeLatitude(value: number): number {
  return Number(value.toFixed(8));
}

function normalizeSpeed(value: number): number {
  return Number(value.toFixed(8));
}

function formatDegreeInSign(lon: number): number {
  return Number((lon % 30).toFixed(4));
}

function signFromLongitude(lon: number): { key: string; de: string } {
  const normalized = normalizeLongitude(lon);
  const signIndex = Math.floor(normalized / 30) % 12;
  return ZODIAC_SIGNS[signIndex];
}

function toPlanets(bodies: Record<BodyKey, BodyState>): PlanetState[] {
  return PLANETS.map((planet) => {
    const state = bodies[planet.key];
    const sign = signFromLongitude(state.lon);

    return {
      key: planet.key,
      lon: state.lon,
      lat: state.lat,
      speedLon: state.speedLon,
      signKey: sign.key,
      signDe: sign.de,
      degreeInSign: formatDegreeInSign(state.lon),
    };
  });
}

function summarizeElements(planets: PlanetState[]): ElementSummary {
  const counts: ElementSummary = { fire: 0, earth: 0, air: 0, water: 0 };

  for (const planet of planets) {
    const element = SIGN_TO_ELEMENT[planet.signKey];
    if (element) counts[element] += 1;
  }

  return counts;
}

function getSweph(): SwephLike {
  let sweph: SwephLike;

  try {
    sweph = require('sweph') as SwephLike;
  } catch (error) {
    throw new SwephUnavailableError(`Failed to load sweph: ${String(error)}`);
  }

  // Some builds expose the binding under `default`.
  if (sweph.default && typeof sweph.default === 'object') {
    return sweph.default as SwephLike;
  }

  return sweph;
}

function resolveSwephFunction(sweph: SwephLike, candidates: string[]): SwephFn | null {
  for (const candidate of candidates) {
    const value = sweph[candidate];
    if (typeof value === 'function') {
      return value as SwephFn;
    }
  }

  if (sweph.constants && typeof sweph.constants === 'object') {
    const constantsObj = sweph.constants as Record<string, unknown>;
    for (const candidate of candidates) {
      const value = constantsObj[candidate];
      if (typeof value === 'function') {
        return value as SwephFn;
      }
    }
  }

  return null;
}

function resolveSwephNumber(sweph: SwephLike, key: string, fallback: number): number {
  const direct = sweph[key];
  if (typeof direct === 'number') {
    return direct;
  }

  if (sweph.constants && typeof sweph.constants === 'object') {
    const nested = (sweph.constants as Record<string, unknown>)[key];
    if (typeof nested === 'number') {
      return nested;
    }
  }

  return fallback;
}

function callSweFunction<T>(fn: (...args: unknown[]) => unknown, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const done = (value: unknown): void => {
      if (!settled) {
        settled = true;
        resolve(value as T);
      }
    };

    const fail = (error: unknown): void => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    try {
      const result = fn(...args, done);
      if (result !== undefined) {
        done(result);
      }
    } catch (error) {
      fail(error);
      return;
    }

    setTimeout(() => {
      if (!settled) {
        fail(new Error('Swiss Ephemeris call timed out'));
      }
    }, 5000);
  });
}

function extractBodyState(result: unknown): BodyState {
  if (Array.isArray(result) && typeof result[0] === 'number') {
    return {
      lon: normalizeLongitude(result[0]),
      lat: normalizeLatitude(typeof result[1] === 'number' ? result[1] : 0),
      speedLon: normalizeSpeed(typeof result[3] === 'number' ? result[3] : 0),
    };
  }

  if (typeof result === 'number') {
    return {
      lon: normalizeLongitude(result),
      lat: 0,
      speedLon: 0,
    };
  }

  if (result && typeof result === 'object') {
    const asObj = result as Record<string, unknown>;

    if (Array.isArray(asObj.xx) && typeof asObj.xx[0] === 'number') {
      return {
        lon: normalizeLongitude(asObj.xx[0]),
        lat: normalizeLatitude(typeof asObj.xx[1] === 'number' ? asObj.xx[1] : 0),
        speedLon: normalizeSpeed(typeof asObj.xx[3] === 'number' ? asObj.xx[3] : 0),
      };
    }

    if (Array.isArray(asObj.data) && typeof asObj.data[0] === 'number') {
      return {
        lon: normalizeLongitude(asObj.data[0]),
        lat: normalizeLatitude(typeof asObj.data[1] === 'number' ? asObj.data[1] : 0),
        speedLon: normalizeSpeed(typeof asObj.data[3] === 'number' ? asObj.data[3] : 0),
      };
    }

    if (typeof asObj.lon === 'number') {
      return {
        lon: normalizeLongitude(asObj.lon),
        lat: normalizeLatitude(typeof asObj.lat === 'number' ? asObj.lat : 0),
        speedLon: normalizeSpeed(typeof asObj.speedLon === 'number' ? asObj.speedLon : 0),
      };
    }

    if (typeof asObj.longitude === 'number') {
      return {
        lon: normalizeLongitude(asObj.longitude),
        lat: normalizeLatitude(typeof asObj.latitude === 'number' ? asObj.latitude : 0),
        speedLon: normalizeSpeed(typeof asObj.speedLongitude === 'number' ? asObj.speedLongitude : 0),
      };
    }
  }

  throw new Error(`Could not extract body state from Swiss Ephemeris result: ${JSON.stringify(result)}`);
}

async function calculateBodies(request: AstrologyRequest & { unknownTime: boolean }): Promise<Record<BodyKey, BodyState>> {
  const sweph = getSweph();

  const juldayFn = resolveSwephFunction(sweph, ['swe_julday', 'julday']);
  const calcUtFn = resolveSwephFunction(sweph, ['swe_calc_ut', 'calc_ut', 'swe_calc']);
  if (!juldayFn || !calcUtFn) {
    throw new SwephUnavailableError('Swiss Ephemeris API missing required functions');
  }

  const { year, month, day } = parseBirthDate(request.birthDate);
  const hourDecimal = parseBirthHourDecimal(request.birthTime ?? null, request.unknownTime);

  const gregCalendarFlag = resolveSwephNumber(sweph, 'SE_GREG_CAL', 1);
  const calcFlags = resolveSwephNumber(sweph, 'SEFLG_SWIEPH', 0)
    | resolveSwephNumber(sweph, 'SEFLG_SPEED', 0);

  const julianDay = await callSweFunction<number>(
    juldayFn,
    year,
    month,
    day,
    hourDecimal,
    gregCalendarFlag,
  );

  if (typeof julianDay !== 'number' || Number.isNaN(julianDay)) {
    throw new Error('Failed to compute julian day');
  }

  const bodies = {} as Record<BodyKey, BodyState>;

  for (const planet of PLANETS) {
    const planetId = resolveSwephNumber(sweph, planet.constantName, planet.fallbackId);

    const rawResult = await callSweFunction<unknown>(
      calcUtFn,
      julianDay,
      planetId,
      calcFlags,
    );

    bodies[planet.key] = extractBodyState(rawResult);
  }

  return bodies;
}

async function calculateAstrology(request: AstrologyRequest & { unknownTime: boolean }): Promise<AstroCalcSuccess> {
  const computedAt = new Date().toISOString();
  const warnings: string[] = [];

  const wantsHousesOrAngles = request.include.houses || request.include.angles;
  const hasLocation = Boolean(request.location);
  const canComputeHousesOrAngles = !request.unknownTime && Boolean(request.birthTime) && hasLocation;

  if (wantsHousesOrAngles && !hasLocation) {
    warnings.push('location_missing_no_houses');
  }
  if (wantsHousesOrAngles && !canComputeHousesOrAngles) {
    warnings.push('time_or_location_missing_no_houses');
  }

  const bodies = await calculateBodies(request);
  const planets = toPlanets(bodies);
  const elements = summarizeElements(planets);

  const meta: AstroCalcSuccess['meta'] = {
    engine: 'swiss_ephemeris',
    engineVersion: ENGINE_VERSION,
    system: request.system,
    houseSystem: request.houseSystem,
    computedAt,
  };

  if (warnings.length > 0) {
    meta.warnings = warnings;
  }

  return {
    status: 'ok',
    profileId: request.profileId,
    engine: 'swiss_ephemeris',
    engineVersion: ENGINE_VERSION,
    chartVersion: CHART_VERSION,
    computedAt,
    unknownTime: request.unknownTime,
    meta,
    planets,
    elements,
    houses: null,
    ascendant: null,
    mc: null,
  };
}

export const astrologyRouter = Router();

// POST /api/astro/calc
astrologyRouter.post('/calc', async (req: Request, res: Response) => {
  const rawBody = (req.body ?? {}) as AstroCalcRequest;
  const request = normalizeRequest(rawBody);

  if (!request.birthDate || typeof request.birthDate !== 'string') {
    return res.status(400).json(errorResponse('invalid_birth_date', 'birthDate is required (YYYY-MM-DD)'));
  }

  try {
    const result = await calculateAstrology(request);
    devLogger.info('api', 'Astrology calculated', {
      profileId: result.profileId,
      birthDate: request.birthDate,
      unknownTime: request.unknownTime,
      engine: result.meta.engine,
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof SwephUnavailableError) {
      const computedAt = new Date().toISOString();
      return res.status(500).json({
        status: 'error',
        computedAt,
        meta: {
          engine: 'unavailable',
          engineVersion: ENGINE_VERSION,
          system: request.system,
          houseSystem: request.houseSystem,
          computedAt,
          warnings: ['sweph_load_failed'],
        },
        error: {
          code: 'sweph_load_failed',
          message,
        },
      } satisfies AstroCalcError);
    }

    const code = message.includes('birthDate') || message.includes('birthTime')
      ? 'invalid_request'
      : 'calculation_failed';

    devLogger.error('api', 'Failed to calculate astrology', { error: message });
    res.status(code === 'invalid_request' ? 400 : 500).json(errorResponse(code, message));
  }
});

// Optional quick probe endpoint
astrologyRouter.get('/probe', async (req: Request, res: Response) => {
  try {
    const queryDate = typeof req.query.date === 'string' ? req.query.date : '1990-01-01';
    const result = await calculateAstrology(normalizeRequest({
      profileId: 'probe',
      birthDate: queryDate,
      birthTime: undefined,
      timezone: 'UTC',
      include: DEFAULT_INCLUDE,
      unknownTime: true,
    }));

    res.json({
      status: 'ok',
      computedAt: result.computedAt,
      chartVersion: result.chartVersion,
      unknownTime: result.unknownTime,
      planets: result.planets,
      elements: result.elements,
      houses: result.houses,
      ascendant: result.ascendant,
      mc: result.mc,
      engine: result.meta.engine,
      engineVersion: result.meta.engineVersion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json(errorResponse('probe_failed', message));
  }
});
