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

if (typeof data?.bodies?.sun?.lon !== 'number' || Number.isNaN(data.bodies.sun.lon)) {
  console.error('astro-probe-check: bodies.sun.lon must be a number');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (typeof data?.bodies?.pluto?.lon !== 'number' || Number.isNaN(data.bodies.pluto.lon)) {
  console.error('astro-probe-check: bodies.pluto.lon must be a number');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const bodyCount = data?.bodies && typeof data.bodies === 'object'
  ? Object.keys(data.bodies).length
  : 0;

if (bodyCount < 10 && !(data?.bodies?.sun && data?.bodies?.pluto)) {
  console.error('astro-probe-check: expected 10 bodies (sun..pluto) or at least sun+pluto');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.engine !== 'swiss_ephemeris') {
  console.error('astro-probe-check: engine must be "swiss_ephemeris"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

console.log(`astro-probe-check: ok (${url}) engine=${data.engine} bodies=${bodyCount} sun.lon=${data.bodies.sun.lon} pluto.lon=${data.bodies.pluto.lon}`);
