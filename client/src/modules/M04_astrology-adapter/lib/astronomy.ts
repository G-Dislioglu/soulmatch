/**
 * Core astronomical calculations based on:
 * - JPL "Approximate Positions of the Major Planets" (Standish, 1992)
 * - Jean Meeus "Astronomical Algorithms" (2nd ed.)
 * Accuracy: Sun ~0.01°, Moon ~0.3°, Planets ~1° (sufficient for astrology)
 * Valid range: 1800–2050 AD
 */

// ── Math Helpers ──────────────────────────────────────────

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function norm360(d: number): number { return ((d % 360) + 360) % 360; }
function sinD(d: number): number { return Math.sin(d * DEG); }
function cosD(d: number): number { return Math.cos(d * DEG); }
function tanD(d: number): number { return Math.tan(d * DEG); }
function atan2D(y: number, x: number): number { return Math.atan2(y, x) * RAD; }

// ── Julian Day ────────────────────────────────────────────

export function julianDay(year: number, month: number, day: number, hour: number = 0): number {
  let y = year, m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + B - 1524.5;
}

function T(jd: number): number { return (jd - 2451545.0) / 36525.0; }

// ── Obliquity of Ecliptic ─────────────────────────────────

export function obliquity(jd: number): number {
  const t = T(jd);
  return 23.439291 - 0.0130042 * t - 1.64e-7 * t * t + 5.04e-7 * t * t * t;
}

// ── Orbital Elements (JPL DE405 approximate) ──────────────

interface OE {
  a: number; e: number; I: number; L: number; lp: number; node: number;
  da: number; de: number; dI: number; dL: number; dlp: number; dnode: number;
  b?: number; c?: number; s?: number; f?: number;
}

const ELEMENTS: Record<string, OE> = {
  mercury: { a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350, lp: 77.45779628, node: 48.33076593, da: 0.00000037, de: 0.00001906, dI: -0.00594749, dL: 149472.67411175, dlp: 0.16047689, dnode: -0.12534081 },
  venus: { a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950, lp: 131.60246718, node: 76.67984255, da: 0.00000390, de: -0.00004107, dI: -0.00078890, dL: 58517.81538729, dlp: 0.00268329, dnode: -0.27769418 },
  earth: { a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, lp: 102.93768193, node: 0.0, da: 0.00000562, de: -0.00004392, dI: -0.01294668, dL: 35999.37244981, dlp: 0.32327364, dnode: 0.0 },
  mars: { a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205, lp: -23.94362959, node: 49.55953891, da: 0.00001847, de: 0.00007882, dI: -0.00813131, dL: 19140.30268499, dlp: 0.44441088, dnode: -0.29257343 },
  jupiter: { a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051, lp: 14.72847983, node: 100.47390909, da: -0.00011607, de: -0.00013253, dI: -0.00183714, dL: 3034.74612775, dlp: 0.21252668, dnode: 0.20469106, b: -0.00012452, c: 0.06064060, s: -0.35635438, f: 38.35125000 },
  saturn: { a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, lp: 92.59887831, node: 113.66242448, da: -0.00125060, de: -0.00050991, dI: 0.00193609, dL: 1222.49362201, dlp: -0.41897216, dnode: -0.28867794, b: 0.00025899, c: -0.13434469, s: 0.87320147, f: 38.35125000 },
  uranus: { a: 19.18916464, e: 0.04725744, I: 0.77263783, L: 313.23810451, lp: 170.95427630, node: 74.01692503, da: -0.00196176, de: -0.00004397, dI: -0.00242939, dL: 428.48202785, dlp: 0.40805281, dnode: 0.04240589, b: 0.00058331, c: -0.97731848, s: 0.17689245, f: 7.67025000 },
  neptune: { a: 30.06992276, e: 0.00859048, I: 1.77004347, L: -55.12002969, lp: 44.96476227, node: 131.78422574, da: 0.00026291, de: 0.00005105, dI: 0.00035372, dL: 218.45945325, dlp: -0.32241464, dnode: -0.00508664, b: -0.00041348, c: 0.68346318, s: -0.10162547, f: 7.67025000 },
  pluto: { a: 39.48211675, e: 0.24882730, I: 17.14001206, L: 238.92903833, lp: 224.06891629, node: 110.30393684, da: -0.00031596, de: 0.00005170, dI: 0.00004818, dL: 145.20780515, dlp: -0.04062942, dnode: -0.01183482, b: -0.01262724 },
};

// ── Kepler Equation ───────────────────────────────────────

function solveKepler(M_deg: number, e: number): number {
  const M = norm360(M_deg) * DEG;
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

// ── Heliocentric XYZ ──────────────────────────────────────

function helioXYZ(oe: OE, t: number): [number, number, number] {
  const a = oe.a + oe.da * t;
  const e = oe.e + oe.de * t;
  const I = oe.I + oe.dI * t;
  let L = oe.L + oe.dL * t;
  const lp = oe.lp + oe.dlp * t;
  const node = oe.node + oe.dnode * t;

  if (oe.b !== undefined) L += oe.b * t * t;
  if (oe.c !== undefined && oe.f !== undefined) L += oe.c * cosD(oe.f * t);
  if (oe.s !== undefined && oe.f !== undefined) L += oe.s * sinD(oe.f * t);

  const omega = lp - node;
  const M = L - lp;
  const E = solveKepler(M, e);

  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = atan2D(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);

  const cosN = cosD(node), sinN = sinD(node);
  const cosI = cosD(I), sinI = sinD(I);
  const cosA = cosD(v + omega), sinA = sinD(v + omega);

  return [
    r * (cosN * cosA - sinN * sinA * cosI),
    r * (sinN * cosA + cosN * sinA * cosI),
    r * sinA * sinI,
  ];
}

// ── Geocentric Planet Longitude ───────────────────────────

export function planetGeocentricLon(planet: string, jd: number): number {
  const t = T(jd);
  const earthXYZ = helioXYZ(ELEMENTS.earth!, t);

  if (planet === 'sun') {
    return norm360(atan2D(-earthXYZ[1], -earthXYZ[0]));
  }

  const oe = ELEMENTS[planet];
  if (!oe) return 0;
  const pXYZ = helioXYZ(oe, t);
  return norm360(atan2D(pXYZ[1] - earthXYZ[1], pXYZ[0] - earthXYZ[0]));
}

// ── Lunar Longitude (Meeus Ch. 47, main terms) ───────────

export function lunarLongitude(jd: number): number {
  const t = T(jd);
  const Lp = norm360(218.3164477 + 481267.88123421 * t);
  const D = norm360(297.8501921 + 445267.1114034 * t);
  const M = norm360(357.5291092 + 35999.0502909 * t);
  const Mp = norm360(134.9633964 + 477198.8675055 * t);
  const F = norm360(93.2720950 + 483202.0175233 * t);

  let lon = Lp
    + 6.288774 * sinD(Mp)
    + 1.274027 * sinD(2 * D - Mp)
    + 0.658314 * sinD(2 * D)
    + 0.213618 * sinD(2 * Mp)
    - 0.185116 * sinD(M)
    - 0.114332 * sinD(2 * F)
    + 0.058793 * sinD(2 * D - 2 * Mp)
    + 0.057066 * sinD(2 * D - M - Mp)
    + 0.053322 * sinD(2 * D + Mp)
    + 0.045758 * sinD(2 * D - M)
    - 0.040923 * sinD(M - Mp)
    - 0.034720 * sinD(D)
    - 0.030383 * sinD(M + Mp)
    + 0.015327 * sinD(2 * D - 2 * F)
    - 0.012528 * sinD(Mp + 2 * F)
    + 0.010980 * sinD(Mp - 2 * F);

  return norm360(lon);
}

// ── Mean Black Moon Lilith ────────────────────────────────

export function blackMoonLilithLon(jd: number): number {
  const t = T(jd);
  return norm360(83.353243 + 4069.0137 * t);
}

// ── Chiron (approximate orbital elements) ─────────────────

export function chironLon(jd: number): number {
  const t = T(jd);
  const oe: OE = {
    a: 13.648, e: 0.3832, I: 6.93, L: 209.36, lp: 339.24, node: 209.21,
    da: 0, de: 0, dI: 0, dL: 2591.67, dlp: 1.42, dnode: -0.36,
  };
  const earthXYZ = helioXYZ(ELEMENTS.earth!, t);
  const cXYZ = helioXYZ(oe, t);
  return norm360(atan2D(cXYZ[1] - earthXYZ[1], cXYZ[0] - earthXYZ[0]));
}

// ── Retrograde Check ──────────────────────────────────────

export function isRetrograde(planet: string, jd: number): boolean {
  const lon1 = planet === 'moon' ? lunarLongitude(jd - 0.5) :
               planet === 'lilith' ? blackMoonLilithLon(jd - 0.5) :
               planet === 'chiron' ? chironLon(jd - 0.5) :
               planetGeocentricLon(planet, jd - 0.5);
  const lon2 = planet === 'moon' ? lunarLongitude(jd + 0.5) :
               planet === 'lilith' ? blackMoonLilithLon(jd + 0.5) :
               planet === 'chiron' ? chironLon(jd + 0.5) :
               planetGeocentricLon(planet, jd + 0.5);
  let delta = lon2 - lon1;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

// ── Greenwich Sidereal Time ───────────────────────────────

export function gmst(jd: number): number {
  const t = T(jd);
  return norm360(
    280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * t * t
    - t * t * t / 38710000,
  );
}

// ── ASC & MC ──────────────────────────────────────────────

export function computeAscMc(jd: number, lat: number, lon: number): { asc: number; mc: number } {
  const lst = norm360(gmst(jd) + lon);
  const eps = obliquity(jd);

  const mc = norm360(atan2D(sinD(lst), cosD(eps) * cosD(lst)));

  const asc = norm360(atan2D(
    cosD(lst),
    -(sinD(eps) * tanD(lat) + cosD(eps) * sinD(lst)),
  ));

  return { asc, mc };
}

// ── House Cusps (Equal House system) ──────────────────────

export function equalHouseCusps(asc: number): number[] {
  return Array.from({ length: 12 }, (_, i) => norm360(asc + i * 30));
}

export function wholeSignCusps(asc: number): number[] {
  const signStart = Math.floor(asc / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(signStart + i * 30));
}

// ── Find House for a Longitude ────────────────────────────

export function findHouse(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]!;
    const end = cusps[(i + 1) % 12]!;
    if (start < end) {
      if (lon >= start && lon < end) return i + 1;
    } else {
      if (lon >= start || lon < end) return i + 1;
    }
  }
  return 1;
}

// ── Aspect Detection ──────────────────────────────────────

export interface AspectInfo {
  type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
  angle: number;
  orb: number;
}

const ASPECT_ANGLES: [string, number, number][] = [
  ['conjunction', 0, 8],
  ['opposition', 180, 8],
  ['trine', 120, 8],
  ['square', 90, 7],
  ['sextile', 60, 6],
];

export function detectAspect(lon1: number, lon2: number): AspectInfo | null {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;

  for (const [type, angle, maxOrb] of ASPECT_ANGLES) {
    const orb = Math.abs(diff - (angle as number));
    if (orb <= (maxOrb as number)) {
      return {
        type: type as AspectInfo['type'],
        angle: angle as number,
        orb: Math.round(orb * 10) / 10,
      };
    }
  }
  return null;
}

// ── Zodiac Position from Longitude ────────────────────────

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export function lonToZodiac(lon: number): { lon: number; sign: string; deg: number } {
  const normalized = norm360(lon);
  const signIndex = Math.floor(normalized / 30);
  return {
    lon: normalized,
    sign: SIGNS[signIndex]!,
    deg: Math.round((normalized % 30) * 100) / 100,
  };
}
