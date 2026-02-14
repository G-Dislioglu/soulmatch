/**
 * Simple static geocoder for birth place → coordinates.
 * Covers major German/European/world cities.
 * Falls back to null if city not found (houses will be skipped).
 */

export interface GeoResult {
  lat: number;
  lon: number;
  tzOffsetHours: number; // Standard time offset from UTC (no DST)
}

// City name (lowercase) → { lat, lon, tzOffsetHours }
const CITIES: Record<string, GeoResult> = {
  // Germany
  berlin: { lat: 52.52, lon: 13.405, tzOffsetHours: 1 },
  hamburg: { lat: 53.5511, lon: 9.9937, tzOffsetHours: 1 },
  münchen: { lat: 48.1351, lon: 11.582, tzOffsetHours: 1 },
  munich: { lat: 48.1351, lon: 11.582, tzOffsetHours: 1 },
  köln: { lat: 50.9375, lon: 6.9603, tzOffsetHours: 1 },
  cologne: { lat: 50.9375, lon: 6.9603, tzOffsetHours: 1 },
  frankfurt: { lat: 50.1109, lon: 8.6821, tzOffsetHours: 1 },
  stuttgart: { lat: 48.7758, lon: 9.1829, tzOffsetHours: 1 },
  düsseldorf: { lat: 51.2277, lon: 6.7735, tzOffsetHours: 1 },
  dortmund: { lat: 51.5136, lon: 7.4653, tzOffsetHours: 1 },
  essen: { lat: 51.4556, lon: 7.0116, tzOffsetHours: 1 },
  leipzig: { lat: 51.3397, lon: 12.3731, tzOffsetHours: 1 },
  bremen: { lat: 53.0793, lon: 8.8017, tzOffsetHours: 1 },
  dresden: { lat: 51.0504, lon: 13.7373, tzOffsetHours: 1 },
  hannover: { lat: 52.3759, lon: 9.732, tzOffsetHours: 1 },
  nürnberg: { lat: 49.4521, lon: 11.0767, tzOffsetHours: 1 },
  duisburg: { lat: 51.4344, lon: 6.7624, tzOffsetHours: 1 },
  bochum: { lat: 51.4818, lon: 7.2162, tzOffsetHours: 1 },
  wuppertal: { lat: 51.2562, lon: 7.1508, tzOffsetHours: 1 },
  bielefeld: { lat: 52.0302, lon: 8.5325, tzOffsetHours: 1 },
  bonn: { lat: 50.7374, lon: 7.0982, tzOffsetHours: 1 },
  mannheim: { lat: 49.4875, lon: 8.466, tzOffsetHours: 1 },
  karlsruhe: { lat: 49.0069, lon: 8.4037, tzOffsetHours: 1 },
  augsburg: { lat: 48.3706, lon: 10.8978, tzOffsetHours: 1 },
  wiesbaden: { lat: 50.0782, lon: 8.2398, tzOffsetHours: 1 },
  freiburg: { lat: 47.999, lon: 7.842, tzOffsetHours: 1 },
  regensburg: { lat: 49.0134, lon: 12.1016, tzOffsetHours: 1 },
  mainz: { lat: 49.9929, lon: 8.2473, tzOffsetHours: 1 },
  saarbrücken: { lat: 49.2402, lon: 6.9969, tzOffsetHours: 1 },
  kiel: { lat: 54.3213, lon: 10.1349, tzOffsetHours: 1 },
  rostock: { lat: 54.0887, lon: 12.1407, tzOffsetHours: 1 },

  // Austria
  wien: { lat: 48.2082, lon: 16.3738, tzOffsetHours: 1 },
  vienna: { lat: 48.2082, lon: 16.3738, tzOffsetHours: 1 },
  graz: { lat: 47.0707, lon: 15.4395, tzOffsetHours: 1 },
  salzburg: { lat: 47.8095, lon: 13.055, tzOffsetHours: 1 },
  innsbruck: { lat: 47.2692, lon: 11.4041, tzOffsetHours: 1 },
  linz: { lat: 48.3069, lon: 14.2858, tzOffsetHours: 1 },

  // Switzerland
  zürich: { lat: 47.3769, lon: 8.5417, tzOffsetHours: 1 },
  zurich: { lat: 47.3769, lon: 8.5417, tzOffsetHours: 1 },
  bern: { lat: 46.948, lon: 7.4474, tzOffsetHours: 1 },
  genf: { lat: 46.2044, lon: 6.1432, tzOffsetHours: 1 },
  geneva: { lat: 46.2044, lon: 6.1432, tzOffsetHours: 1 },
  basel: { lat: 47.5596, lon: 7.5886, tzOffsetHours: 1 },

  // Turkey
  istanbul: { lat: 41.0082, lon: 28.9784, tzOffsetHours: 3 },
  ankara: { lat: 39.9334, lon: 32.8597, tzOffsetHours: 3 },
  izmir: { lat: 38.4237, lon: 27.1428, tzOffsetHours: 3 },
  antalya: { lat: 36.8969, lon: 30.7133, tzOffsetHours: 3 },
  bursa: { lat: 40.1885, lon: 29.0610, tzOffsetHours: 3 },
  adana: { lat: 36.9914, lon: 35.3308, tzOffsetHours: 3 },
  gaziantep: { lat: 37.0662, lon: 37.3833, tzOffsetHours: 3 },
  konya: { lat: 37.8746, lon: 32.4932, tzOffsetHours: 3 },
  trabzon: { lat: 41.0027, lon: 39.7168, tzOffsetHours: 3 },
  diyarbakır: { lat: 37.9144, lon: 40.2306, tzOffsetHours: 3 },
  diyarbakir: { lat: 37.9144, lon: 40.2306, tzOffsetHours: 3 },

  // Europe
  london: { lat: 51.5074, lon: -0.1278, tzOffsetHours: 0 },
  paris: { lat: 48.8566, lon: 2.3522, tzOffsetHours: 1 },
  madrid: { lat: 40.4168, lon: -3.7038, tzOffsetHours: 1 },
  rom: { lat: 41.9028, lon: 12.4964, tzOffsetHours: 1 },
  rome: { lat: 41.9028, lon: 12.4964, tzOffsetHours: 1 },
  amsterdam: { lat: 52.3676, lon: 4.9041, tzOffsetHours: 1 },
  brüssel: { lat: 50.8503, lon: 4.3517, tzOffsetHours: 1 },
  brussels: { lat: 50.8503, lon: 4.3517, tzOffsetHours: 1 },
  prag: { lat: 50.0755, lon: 14.4378, tzOffsetHours: 1 },
  prague: { lat: 50.0755, lon: 14.4378, tzOffsetHours: 1 },
  warschau: { lat: 52.2297, lon: 21.0122, tzOffsetHours: 1 },
  warsaw: { lat: 52.2297, lon: 21.0122, tzOffsetHours: 1 },
  budapest: { lat: 47.4979, lon: 19.0402, tzOffsetHours: 1 },
  lissabon: { lat: 38.7223, lon: -9.1393, tzOffsetHours: 0 },
  lisbon: { lat: 38.7223, lon: -9.1393, tzOffsetHours: 0 },
  stockholm: { lat: 59.3293, lon: 18.0686, tzOffsetHours: 1 },
  kopenhagen: { lat: 55.6761, lon: 12.5683, tzOffsetHours: 1 },
  copenhagen: { lat: 55.6761, lon: 12.5683, tzOffsetHours: 1 },
  oslo: { lat: 59.9139, lon: 10.7522, tzOffsetHours: 1 },
  helsinki: { lat: 60.1699, lon: 24.9384, tzOffsetHours: 2 },
  athen: { lat: 37.9838, lon: 23.7275, tzOffsetHours: 2 },
  athens: { lat: 37.9838, lon: 23.7275, tzOffsetHours: 2 },
  moskau: { lat: 55.7558, lon: 37.6173, tzOffsetHours: 3 },
  moscow: { lat: 55.7558, lon: 37.6173, tzOffsetHours: 3 },
  bukarest: { lat: 44.4268, lon: 26.1025, tzOffsetHours: 2 },
  bucharest: { lat: 44.4268, lon: 26.1025, tzOffsetHours: 2 },
  dublin: { lat: 53.3498, lon: -6.2603, tzOffsetHours: 0 },
  barcelona: { lat: 41.3874, lon: 2.1686, tzOffsetHours: 1 },
  mailand: { lat: 45.4642, lon: 9.19, tzOffsetHours: 1 },
  milan: { lat: 45.4642, lon: 9.19, tzOffsetHours: 1 },

  // World
  'new york': { lat: 40.7128, lon: -74.006, tzOffsetHours: -5 },
  'los angeles': { lat: 34.0522, lon: -118.2437, tzOffsetHours: -8 },
  chicago: { lat: 41.8781, lon: -87.6298, tzOffsetHours: -6 },
  toronto: { lat: 43.6532, lon: -79.3832, tzOffsetHours: -5 },
  sydney: { lat: -33.8688, lon: 151.2093, tzOffsetHours: 10 },
  tokyo: { lat: 35.6762, lon: 139.6503, tzOffsetHours: 9 },
  peking: { lat: 39.9042, lon: 116.4074, tzOffsetHours: 8 },
  beijing: { lat: 39.9042, lon: 116.4074, tzOffsetHours: 8 },
  mumbai: { lat: 19.076, lon: 72.8777, tzOffsetHours: 5.5 },
  dubai: { lat: 25.2048, lon: 55.2708, tzOffsetHours: 4 },
  'são paulo': { lat: -23.5505, lon: -46.6333, tzOffsetHours: -3 },
  'sao paulo': { lat: -23.5505, lon: -46.6333, tzOffsetHours: -3 },
  mexiko: { lat: 19.4326, lon: -99.1332, tzOffsetHours: -6 },
  'mexico city': { lat: 19.4326, lon: -99.1332, tzOffsetHours: -6 },
  kairo: { lat: 30.0444, lon: 31.2357, tzOffsetHours: 2 },
  cairo: { lat: 30.0444, lon: 31.2357, tzOffsetHours: 2 },
  johannesburg: { lat: -26.2041, lon: 28.0473, tzOffsetHours: 2 },
  'buenos aires': { lat: -34.6037, lon: -58.3816, tzOffsetHours: -3 },
  bangkok: { lat: 13.7563, lon: 100.5018, tzOffsetHours: 7 },
  singapur: { lat: 1.3521, lon: 103.8198, tzOffsetHours: 8 },
  singapore: { lat: 1.3521, lon: 103.8198, tzOffsetHours: 8 },
  seoul: { lat: 37.5665, lon: 126.978, tzOffsetHours: 9 },
};

/**
 * Approximate DST adjustment for European timezone.
 * DST runs roughly from last Sunday of March to last Sunday of October.
 */
function dstAdjust(month: number, tzBase: number): number {
  if (tzBase >= -1 && tzBase <= 3) {
    if (month >= 4 && month <= 9) return 1;
  }
  if (tzBase >= -8 && tzBase <= -5) {
    if (month >= 3 && month <= 10) return 1;
  }
  return 0;
}

export function geocodeCity(city: string | undefined): GeoResult | null {
  if (!city) return null;
  const key = city.trim().toLowerCase().replace(/[,.\-_]/g, '').replace(/\s+/g, ' ');
  return CITIES[key] ?? null;
}

export function birthToUT(
  birthDate: string,
  birthTime: string | undefined,
  geo: GeoResult | null,
): { year: number; month: number; day: number; hourUT: number; hasTime: boolean } {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];

  if (!birthTime) {
    return { year: y, month: m, day: d, hourUT: 12, hasTime: false };
  }

  const [hh, mm] = birthTime.split(':').map(Number) as [number, number];
  const localHour = hh + mm / 60;

  const tzBase = geo?.tzOffsetHours ?? 1;
  const dst = dstAdjust(m, tzBase);
  const utHour = localHour - (tzBase + dst);

  let day = d, month = m, year = y;
  let hourUT = utHour;
  if (hourUT < 0) { hourUT += 24; day--; if (day < 1) { month--; if (month < 1) { month = 12; year--; } day = new Date(year, month, 0).getDate(); } }
  if (hourUT >= 24) { hourUT -= 24; day++; }

  return { year, month, day, hourUT, hasTime: true };
}
