#!/usr/bin/env node

const baseUrl = process.env.ASTRO_BASE_URL ?? 'http://localhost:3001';
const date = process.env.ASTRO_PROBE_DATE ?? '1990-01-01';
const url = `${baseUrl.replace(/\/$/, '')}/api/astro/probe?date=${encodeURIComponent(date)}`;

const response = await fetch(url);
let data;

try {
  data = await response.json();
} catch {
  console.error(`astro-probe-check: non-JSON response from ${url}`);
  process.exit(1);
}

if (!response.ok) {
  console.error(`astro-probe-check: HTTP ${response.status} ${response.statusText}`);
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.status !== 'ok') {
  console.error('astro-probe-check: status must be "ok"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.chartVersion !== 'chart-v1') {
  console.error('astro-probe-check: chartVersion must be "chart-v1"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (typeof data?.unknownTime !== 'boolean') {
  console.error('astro-probe-check: unknownTime must be boolean');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!Array.isArray(data?.planets) || data.planets.length < 10) {
  console.error('astro-probe-check: planets must be an array with at least 10 entries');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const sun = Array.isArray(data?.planets) ? data.planets.find((planet) => planet?.key === 'sun') : null;
const pluto = Array.isArray(data?.planets) ? data.planets.find((planet) => planet?.key === 'pluto') : null;

if (typeof sun?.lon !== 'number' || Number.isNaN(sun.lon)) {
  console.error('astro-probe-check: planets.sun.lon must be a number');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (typeof pluto?.lon !== 'number' || Number.isNaN(pluto.lon)) {
  console.error('astro-probe-check: planets.pluto.lon must be a number');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const planetCount = Array.isArray(data?.planets) ? data.planets.length : 0;

if (planetCount < 10) {
  console.error('astro-probe-check: expected at least 10 planets (sun..pluto)');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.engine !== 'swiss_ephemeris') {
  console.error('astro-probe-check: engine must be "swiss_ephemeris"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

console.log(`astro-probe-check: ok (${url}) engine=${data.engine} planets=${planetCount} sun.lon=${sun.lon} pluto.lon=${pluto.lon}`);
