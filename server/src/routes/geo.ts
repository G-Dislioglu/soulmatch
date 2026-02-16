import { Router, type Request, type Response } from 'express';

interface GeoItem {
  label: string;
  lat: number;
  lon: number;
  countryCode: string;
  timezone?: string;
}

const CITIES: GeoItem[] = [
  { label: 'Berlin, DE', lat: 52.52, lon: 13.405, countryCode: 'DE', timezone: 'Europe/Berlin' },
  { label: 'Hamburg, DE', lat: 53.5511, lon: 9.9937, countryCode: 'DE', timezone: 'Europe/Berlin' },
  { label: 'Munich, DE', lat: 48.1351, lon: 11.582, countryCode: 'DE', timezone: 'Europe/Berlin' },
  { label: 'Cologne, DE', lat: 50.9375, lon: 6.9603, countryCode: 'DE', timezone: 'Europe/Berlin' },
  { label: 'Frankfurt, DE', lat: 50.1109, lon: 8.6821, countryCode: 'DE', timezone: 'Europe/Berlin' },
  { label: 'Stuttgart, DE', lat: 48.7758, lon: 9.1829, countryCode: 'DE', timezone: 'Europe/Berlin' },
  { label: 'Vienna, AT', lat: 48.2082, lon: 16.3738, countryCode: 'AT', timezone: 'Europe/Vienna' },
  { label: 'Zurich, CH', lat: 47.3769, lon: 8.5417, countryCode: 'CH', timezone: 'Europe/Zurich' },
  { label: 'Istanbul, TR', lat: 41.0082, lon: 28.9784, countryCode: 'TR', timezone: 'Europe/Istanbul' },
  { label: 'Ankara, TR', lat: 39.9334, lon: 32.8597, countryCode: 'TR', timezone: 'Europe/Istanbul' },
  { label: 'Izmir, TR', lat: 38.4237, lon: 27.1428, countryCode: 'TR', timezone: 'Europe/Istanbul' },
  { label: 'London, GB', lat: 51.5074, lon: -0.1278, countryCode: 'GB', timezone: 'Europe/London' },
  { label: 'Paris, FR', lat: 48.8566, lon: 2.3522, countryCode: 'FR', timezone: 'Europe/Paris' },
  { label: 'Madrid, ES', lat: 40.4168, lon: -3.7038, countryCode: 'ES', timezone: 'Europe/Madrid' },
  { label: 'Rome, IT', lat: 41.9028, lon: 12.4964, countryCode: 'IT', timezone: 'Europe/Rome' },
  { label: 'Amsterdam, NL', lat: 52.3676, lon: 4.9041, countryCode: 'NL', timezone: 'Europe/Amsterdam' },
  { label: 'Prague, CZ', lat: 50.0755, lon: 14.4378, countryCode: 'CZ', timezone: 'Europe/Prague' },
  { label: 'Warsaw, PL', lat: 52.2297, lon: 21.0122, countryCode: 'PL', timezone: 'Europe/Warsaw' },
  { label: 'Athens, GR', lat: 37.9838, lon: 23.7275, countryCode: 'GR', timezone: 'Europe/Athens' },
  { label: 'Moscow, RU', lat: 55.7558, lon: 37.6173, countryCode: 'RU', timezone: 'Europe/Moscow' },
  { label: 'New York, US', lat: 40.7128, lon: -74.006, countryCode: 'US', timezone: 'America/New_York' },
  { label: 'Los Angeles, US', lat: 34.0522, lon: -118.2437, countryCode: 'US', timezone: 'America/Los_Angeles' },
  { label: 'Chicago, US', lat: 41.8781, lon: -87.6298, countryCode: 'US', timezone: 'America/Chicago' },
  { label: 'Toronto, CA', lat: 43.6532, lon: -79.3832, countryCode: 'CA', timezone: 'America/Toronto' },
  { label: 'Sao Paulo, BR', lat: -23.5505, lon: -46.6333, countryCode: 'BR', timezone: 'America/Sao_Paulo' },
  { label: 'Tokyo, JP', lat: 35.6762, lon: 139.6503, countryCode: 'JP', timezone: 'Asia/Tokyo' },
  { label: 'Seoul, KR', lat: 37.5665, lon: 126.978, countryCode: 'KR', timezone: 'Asia/Seoul' },
  { label: 'Singapore, SG', lat: 1.3521, lon: 103.8198, countryCode: 'SG', timezone: 'Asia/Singapore' },
  { label: 'Bangkok, TH', lat: 13.7563, lon: 100.5018, countryCode: 'TH', timezone: 'Asia/Bangkok' },
  { label: 'Sydney, AU', lat: -33.8688, lon: 151.2093, countryCode: 'AU', timezone: 'Australia/Sydney' },
];

const CACHE_MAX = 100;
const cache = new Map<string, GeoItem[]>();
let nextLookupAt = 0;
let throttleQueue: Promise<void> = Promise.resolve();

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function takeFromCache(key: string): GeoItem[] | null {
  const value = cache.get(key);
  if (!value) return null;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function saveToCache(key: string, value: GeoItem[]): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

async function throttleLookup(): Promise<void> {
  const run = throttleQueue.then(async () => {
    const now = Date.now();
    if (now < nextLookupAt) {
      await new Promise((resolve) => setTimeout(resolve, nextLookupAt - now));
    }
    nextLookupAt = Date.now() + 1000;
  });

  throttleQueue = run.catch(() => undefined);
  await run;
}

function searchCities(query: string): GeoItem[] {
  const normalized = normalizeQuery(query);
  if (!normalized || normalized.length < 2) return [];

  const startsWith = CITIES.filter((city) => city.label.toLowerCase().startsWith(normalized));
  const includes = CITIES.filter(
    (city) => !startsWith.includes(city) && city.label.toLowerCase().includes(normalized),
  );

  return [...startsWith, ...includes].slice(0, 8);
}

export const geoRouter = Router();

geoRouter.get('/autocomplete', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const key = normalizeQuery(q);

  if (key.length < 2) {
    return res.json({ items: [] });
  }

  const cached = takeFromCache(key);
  if (cached) {
    return res.json({ items: cached });
  }

  await throttleLookup();
  const items = searchCities(key);
  saveToCache(key, items);

  return res.json({ items });
});
