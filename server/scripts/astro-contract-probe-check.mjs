#!/usr/bin/env node

const baseUrl = process.env.ASTRO_BASE_URL ?? 'http://localhost:3001';
const url = `${baseUrl.replace(/\/$/, '')}/api/astro/calc`;

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profileId: 'contract-probe',
    birthDate: process.env.ASTRO_PROBE_DATE ?? '1990-01-01',
    birthTime: null,
    birthPlace: null,
    timezone: null,
    unknownTime: true,
  }),
});

let data;
try {
  data = await response.json();
} catch {
  console.error(`astro-contract-probe-check: non-JSON response from ${url}`);
  process.exit(1);
}

if (!response.ok) {
  console.error(`astro-contract-probe-check: HTTP ${response.status} ${response.statusText}`);
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.status !== 'ok') {
  console.error('astro-contract-probe-check: status must be "ok"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.engine !== 'swiss_ephemeris') {
  console.error('astro-contract-probe-check: engine must be "swiss_ephemeris"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.chartVersion !== 'chart-v1') {
  console.error('astro-contract-probe-check: chartVersion must be "chart-v1"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (typeof data?.unknownTime !== 'boolean') {
  console.error('astro-contract-probe-check: unknownTime must be boolean');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!Array.isArray(data?.planets) || data.planets.length < 10) {
  console.error('astro-contract-probe-check: planets must be array with at least 10 items');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const sun = data.planets.find((planet) => planet?.key === 'sun');
const pluto = data.planets.find((planet) => planet?.key === 'pluto');

if (!sun || typeof sun.lon !== 'number' || typeof sun.sign !== 'string') {
  console.error('astro-contract-probe-check: sun planet entry missing contract fields');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!pluto || typeof pluto.lon !== 'number' || typeof pluto.sign !== 'string') {
  console.error('astro-contract-probe-check: pluto planet entry missing contract fields');
  console.error(JSON.stringify(data));
  process.exit(1);
}

console.log(
  `astro-contract-probe-check: ok (${url}) chartVersion=${data.chartVersion} planets=${data.planets.length} sun=${sun.sign}@${sun.lon} pluto=${pluto.sign}@${pluto.lon}`,
);
