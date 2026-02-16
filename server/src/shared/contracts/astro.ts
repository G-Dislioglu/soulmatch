/**
 * API Contract: POST /api/astro/calc
 *
 * Response highlights (chart-v1):
 * - engine: 'swiss_ephemeris'
 * - engineVersion: Swiss ephemeris binding version
 * - chartVersion: 'chart-v1'
 * - unknownTime: boolean
 * - planets: [{ key, lon, sign, degreeInSign, ... }]
 */

export interface AstroCalcContractRequest {
  profileId?: string;
  birthDate: string;
  birthTime?: string | null;
  birthPlace?: string | null;
  timezone?: string | null;
  unknownTime?: boolean;
}

export interface AstroCalcContractResponse {
  status: 'ok';
  profileId: string;
  engine: 'swiss_ephemeris';
  engineVersion: string;
  chartVersion: 'chart-v1';
  computedAt: string;
  unknownTime: boolean;
  planets: Array<{
    key: string;
    lon: number;
    sign: string;
    degreeInSign: number;
  }>;
  bodies: {
    sun: { lon: number };
    pluto: { lon: number };
  };
}

export const ASTRO_CALC_RESPONSE_EXAMPLE: AstroCalcContractResponse = {
  status: 'ok',
  profileId: 'fixture-astro-v1',
  engine: 'swiss_ephemeris',
  engineVersion: '2.10.3-b-1',
  chartVersion: 'chart-v1',
  computedAt: '2026-02-16T21:20:00.000Z',
  unknownTime: true,
  planets: [
    { key: 'sun', lon: 280.12345678, sign: 'Capricorn', degreeInSign: 10.1234 },
    { key: 'pluto', lon: 230.87654321, sign: 'Scorpio', degreeInSign: 20.8765 },
  ],
  bodies: {
    sun: { lon: 280.12345678 },
    pluto: { lon: 230.87654321 },
  },
};
