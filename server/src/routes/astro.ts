import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

type PlanetKey =
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

interface AstroCalcRequest {
  birthDate: string;
  birthTime?: string | null;
  birthPlace?: {
    lat: number;
    lon: number;
  } | null;
  timezone?: string | null;
  unknownTime: boolean;
}

interface AstroCalcSuccess {
  status: 'ok';
  computedAt: string;
  meta: {
    engine: 'swiss_ephemeris';
    engineVersion: string;
    unknownTime: boolean;
    input: {
      birthDate: string;
      birthTime: string | null;
      timezone: string | null;
    };
  };
  planets: Record<PlanetKey, { lon: number }>;
}

interface AstroCalcError {
  status: 'error';
  computedAt: string;
  error: {
    message: string;
    code: string;
  };
}

interface PlanetDef {
  key: PlanetKey;
  constantName: string;
  fallbackId: number;
}

interface SwephLike {
  [key: string]: unknown;
}

const ENGINE_VERSION = '2.10.3-b-1';

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

function getSweph(): SwephLike {
  return require('sweph') as SwephLike;
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

function extractLongitude(result: unknown): number {
  if (typeof result === 'number') {
    return normalizeLongitude(result);
  }

  if (Array.isArray(result) && typeof result[0] === 'number') {
    return normalizeLongitude(result[0]);
  }

  if (result && typeof result === 'object') {
    const asObj = result as Record<string, unknown>;

    if (typeof asObj.longitude === 'number') {
      return normalizeLongitude(asObj.longitude);
    }

    if (typeof asObj.lon === 'number') {
      return normalizeLongitude(asObj.lon);
    }

    if (Array.isArray(asObj.data) && typeof asObj.data[0] === 'number') {
      return normalizeLongitude(asObj.data[0]);
    }

    if (Array.isArray(asObj.xx) && typeof asObj.xx[0] === 'number') {
      return normalizeLongitude(asObj.xx[0]);
    }
  }

  throw new Error(`Could not extract longitude from Swiss Ephemeris result: ${JSON.stringify(result)}`);
}

async function calculatePlanetLongitudes(request: AstroCalcRequest): Promise<Record<PlanetKey, { lon: number }>> {
  const sweph = getSweph();

  const juldayFn = sweph.swe_julday as ((...args: unknown[]) => unknown) | undefined;
  const calcUtFn = sweph.swe_calc_ut as ((...args: unknown[]) => unknown) | undefined;
  if (typeof juldayFn !== 'function' || typeof calcUtFn !== 'function') {
    throw new Error('Swiss Ephemeris API missing required functions');
  }

  const { year, month, day } = parseBirthDate(request.birthDate);
  const hourDecimal = parseBirthHourDecimal(request.birthTime ?? null, request.unknownTime);

  const gregCalendarFlag = typeof sweph.SE_GREG_CAL === 'number' ? sweph.SE_GREG_CAL : 1;
  const calcFlags = (typeof sweph.SEFLG_SWIEPH === 'number' ? sweph.SEFLG_SWIEPH : 0)
    | (typeof sweph.SEFLG_SPEED === 'number' ? sweph.SEFLG_SPEED : 0);

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

  const planets = {} as Record<PlanetKey, { lon: number }>;

  for (const planet of PLANETS) {
    const planetId = typeof sweph[planet.constantName] === 'number'
      ? (sweph[planet.constantName] as number)
      : planet.fallbackId;

    const rawResult = await callSweFunction<unknown>(
      calcUtFn,
      julianDay,
      planetId,
      calcFlags,
    );

    planets[planet.key] = {
      lon: extractLongitude(rawResult),
    };
  }

  return planets;
}

async function calculateAstrology(request: AstroCalcRequest): Promise<AstroCalcSuccess> {
  const planets = await calculatePlanetLongitudes(request);

  return {
    status: 'ok',
    computedAt: new Date().toISOString(),
    meta: {
      engine: 'swiss_ephemeris',
      engineVersion: ENGINE_VERSION,
      unknownTime: request.unknownTime || !request.birthTime,
      input: {
        birthDate: request.birthDate,
        birthTime: request.birthTime ?? null,
        timezone: request.timezone ?? null,
      },
    },
    planets,
  };
}

export const astrologyRouter = Router();

// POST /api/astro/calc
astrologyRouter.post('/calc', async (req: Request, res: Response) => {
  try {
    const request = req.body as AstroCalcRequest;

    if (!request || typeof request.birthDate !== 'string' || typeof request.unknownTime !== 'boolean') {
      return res.status(400).json(errorResponse('invalid_request', 'birthDate and unknownTime are required'));
    }

    const result = await calculateAstrology(request);
    devLogger.info('api', 'Astrology calculated', {
      birthDate: request.birthDate,
      unknownTime: result.meta.unknownTime,
      engine: result.meta.engine,
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.includes('birthDate') || message.includes('birthTime')
      ? 'invalid_request'
      : message.includes('Swiss Ephemeris') || message.includes('sweph')
        ? 'sweph_error'
        : 'calculation_failed';

    devLogger.error('api', 'Failed to calculate astrology', { error: message });
    res.status(code === 'invalid_request' ? 400 : 500).json(errorResponse(code, message));
  }
});

// Optional quick probe endpoint
astrologyRouter.get('/probe', async (req: Request, res: Response) => {
  try {
    const queryDate = typeof req.query.date === 'string' ? req.query.date : '1990-01-01';
    const result = await calculateAstrology({
      birthDate: queryDate,
      birthTime: null,
      birthPlace: null,
      timezone: null,
      unknownTime: true,
    });

    res.json({
      status: 'ok',
      computedAt: result.computedAt,
      sun: result.planets.sun,
      engine: result.meta.engine,
      engineVersion: result.meta.engineVersion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json(errorResponse('probe_failed', message));
  }
});
