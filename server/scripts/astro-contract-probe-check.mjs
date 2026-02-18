#!/usr/bin/env node

const baseUrl = process.env.ASTRO_BASE_URL ?? 'https://soulmatch-1.onrender.com';
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

const rawText = await response.text();
let data;
try {
  data = JSON.parse(rawText);
} catch {
  console.error(`astro-contract-probe-check: non-JSON response from ${url}`);
  console.error(`  status=${response.status} | content-type=${response.headers.get('content-type')}`);
  console.error(`  body: ${rawText.slice(0, 200)}`);
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

if (data?.unknownTime === true) {
  if (data?.houses !== null || data?.ascendant !== null || data?.mc !== null) {
    console.error('astro-contract-probe-check: unknownTime=true requires houses/ascendant/mc to be null');
    console.error(JSON.stringify(data));
    process.exit(1);
  }
}

for (const planet of data.planets) {
  if (typeof planet?.lon !== 'number' || Number.isNaN(planet.lon) || planet.lon < 0 || planet.lon >= 360) {
    console.error('astro-contract-probe-check: each planet.lon must be in [0, 360)');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (
    typeof planet?.degreeInSign !== 'number'
    || Number.isNaN(planet.degreeInSign)
    || planet.degreeInSign < 0
    || planet.degreeInSign >= 30
  ) {
    console.error('astro-contract-probe-check: each planet.degreeInSign must be in [0, 30)');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (typeof planet?.signKey !== 'string' || planet.signKey.length < 3) {
    console.error('astro-contract-probe-check: each planet.signKey must be slug string');
    console.error(JSON.stringify(data));
    process.exit(1);
  }
}

const elements = data?.elements;
if (
  !elements
  || typeof elements.fire !== 'number'
  || typeof elements.earth !== 'number'
  || typeof elements.air !== 'number'
  || typeof elements.water !== 'number'
) {
  console.error('astro-contract-probe-check: elements must contain fire/earth/air/water numbers');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const elementsTotal = elements.fire + elements.earth + elements.air + elements.water;
if (elementsTotal !== data.planets.length) {
  console.error('astro-contract-probe-check: elements sum must equal planets.length');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const sun = data.planets.find((planet) => planet?.key === 'sun');
const pluto = data.planets.find((planet) => planet?.key === 'pluto');

if (!sun || typeof sun.lon !== 'number' || typeof sun.signKey !== 'string') {
  console.error('astro-contract-probe-check: sun planet entry missing contract fields');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!pluto || typeof pluto.lon !== 'number' || typeof pluto.signKey !== 'string') {
  console.error('astro-contract-probe-check: pluto planet entry missing contract fields');
  console.error(JSON.stringify(data));
  process.exit(1);
}

console.log(
  `astro-contract-probe-check: ok (${url}) chartVersion=${data.chartVersion} planets=${data.planets.length} sun=${sun.signKey}@${sun.lon} pluto=${pluto.signKey}@${pluto.lon}`,
);
