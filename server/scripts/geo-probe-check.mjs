#!/usr/bin/env node

const baseUrl = process.env.GEO_BASE_URL ?? 'http://localhost:3001';
const url = `${baseUrl.replace(/\/$/, '')}/api/geo/autocomplete`;

const queries = [
  'ber', 'berl', 'berlin', 'ham', 'mun',
  'ist', 'ank', 'par', 'lon', 'new',
  'tok', 'seo', 'sin', 'ban', 'zur',
  'vie', 'rom', 'mad', 'pra', 'war',
];

function validateItem(item) {
  return (
    item
    && typeof item.label === 'string'
    && typeof item.lat === 'number'
    && Number.isFinite(item.lat)
    && typeof item.lon === 'number'
    && Number.isFinite(item.lon)
    && typeof item.countryCode === 'string'
  );
}

async function probeQuery(q) {
  const response = await fetch(`${url}?q=${encodeURIComponent(q)}`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for query=${q}: ${JSON.stringify(data)}`);
  }

  if (!data || !Array.isArray(data.items)) {
    throw new Error(`Invalid payload shape for query=${q}: ${JSON.stringify(data)}`);
  }

  for (const item of data.items) {
    if (!validateItem(item)) {
      throw new Error(`Invalid item for query=${q}: ${JSON.stringify(item)}`);
    }
  }

  return data.items.length;
}

let totalItems = 0;
try {
  const results = await Promise.all(queries.map((q) => probeQuery(q)));
  totalItems = results.reduce((sum, count) => sum + count, 0);
} catch (error) {
  console.error(`geo-probe-check: failed ${String(error)}`);
  process.exit(1);
}

console.log(`geo-probe-check: ok (${url}) queries=${queries.length} totalItems=${totalItems}`);
