#!/usr/bin/env node

const baseUrl = process.env.MATCH_BASE_URL ?? 'https://soulmatch-1.onrender.com';
const url = `${baseUrl.replace(/\/$/, '')}/api/match/single`;

const payload = {
  profileA: {
    id: 'probe-a',
    name: 'Ayla',
    birthDate: '1990-01-01',
    birthTime: null,
    birthLocation: {
      label: 'Berlin, DE',
      lat: 52.52,
      lon: 13.405,
      countryCode: 'DE',
      timezone: 'Europe/Berlin',
    },
  },
  profileB: {
    id: 'probe-b',
    name: 'Mete',
    birthDate: '1992-09-13',
    birthTime: null,
    birthLocation: {
      label: 'Istanbul, TR',
      lat: 41.0082,
      lon: 28.9784,
      countryCode: 'TR',
      timezone: 'Europe/Istanbul',
    },
  },
  relationshipType: 'romantic',
};

const CONNECTION_TYPES = new Set(['spiegel', 'katalysator', 'heiler', 'anker', 'lehrer', 'gefaehrte']);

function normalizeForDeterminism(data) {
  return {
    profileA: data?.profileA,
    profileB: data?.profileB,
    engine: data?.engine,
    engineVersion: data?.engineVersion,
    scoringEngineVersion: data?.scoringEngineVersion,
    matchOverall: data?.matchOverall,
    breakdown: data?.breakdown,
    connectionType: data?.connectionType,
    anchorsProvided: Array.isArray(data?.anchorsProvided) ? data.anchorsProvided : null,
    keyReasons: Array.isArray(data?.keyReasons) ? data.keyReasons : null,
    claimIds: Array.isArray(data?.claims) ? data.claims.map((c) => c?.id) : null,
    warnings: Array.isArray(data?.warnings) ? data.warnings : null,
  };
}

function isScore(value) {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0 && value <= 100;
}

async function postOnce() {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error(`match-probe-check: non-JSON response from ${url}`);
    console.error(`  status=${response.status} | content-type=${response.headers.get('content-type')}`);
    console.error(`  body: ${rawText.slice(0, 200)}`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`match-probe-check: HTTP ${response.status} ${response.statusText}`);
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  return data;
}

const first = await postOnce();
const second = await postOnce();

if (first?.engine !== 'unified_match') {
  console.error('match-probe-check: engine must be "unified_match"');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (first?.engineVersion !== 'v1') {
  console.error('match-probe-check: engineVersion must be "v1"');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (first?.scoringEngineVersion !== 'v3.1') {
  console.error('match-probe-check: scoringEngineVersion must be "v3.1"');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!isScore(first?.matchOverall)) {
  console.error('match-probe-check: matchOverall must be a score in [0,100]');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!isScore(first?.breakdown?.numerology) || !isScore(first?.breakdown?.astrology) || !isScore(first?.breakdown?.fusion)) {
  console.error('match-probe-check: breakdown scores must be in [0,100]');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!(first.breakdown.astrology > 0)) {
  console.error('match-probe-check: astrology must be active (breakdown.astrology > 0) for probe fixture');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!CONNECTION_TYPES.has(first?.connectionType)) {
  console.error('match-probe-check: connectionType must be one of spiegel|katalysator|heiler|anker|lehrer|gefaehrte');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.anchorsProvided) || first.anchorsProvided.length < 3) {
  console.error('match-probe-check: anchorsProvided must be array with at least 3 items');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!first.anchorsProvided.some((entry) => typeof entry === 'string' && entry.startsWith('numA:lifePath:'))
  || !first.anchorsProvided.some((entry) => typeof entry === 'string' && entry.startsWith('numB:lifePath:'))) {
  console.error('match-probe-check: anchorsProvided must contain numA/numB lifePath anchors');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!first.anchorsProvided.some((entry) => typeof entry === 'string' && entry.startsWith('astroA:sun:'))
  || !first.anchorsProvided.some((entry) => typeof entry === 'string' && entry.startsWith('astroB:sun:'))
  || !first.anchorsProvided.some((entry) => typeof entry === 'string' && entry.startsWith('astro:elements:'))) {
  console.error('match-probe-check: anchorsProvided must include astro sun and dominant element anchors');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.astroAspects) || first.astroAspects.length < 1 || first.astroAspects.length > 8) {
  console.error('match-probe-check: astroAspects must be array with 1..8 entries when astrology is active');
  console.error(JSON.stringify(first));
  process.exit(1);
}

const ASPECT_ANGLE = {
  conjunction: 0,
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
};

const ASPECT_MAX_ORB = {
  conjunction: 8,
  opposition: 8,
  trine: 6,
  square: 6,
  sextile: 4,
};

for (const aspect of first.astroAspects) {
  if (!aspect || typeof aspect !== 'object') {
    console.error('match-probe-check: every astroAspects item must be an object');
    console.error(JSON.stringify(first));
    process.exit(1);
  }

  if (!['sun', 'moon', 'venus', 'mars'].includes(aspect.aBody) || !['sun', 'moon', 'venus', 'mars'].includes(aspect.bBody)) {
    console.error('match-probe-check: aBody/bBody must be one of sun|moon|venus|mars');
    console.error(JSON.stringify(first));
    process.exit(1);
  }

  if (!(aspect.aspect in ASPECT_ANGLE)) {
    console.error('match-probe-check: aspect type must be conjunction|opposition|trine|square|sextile');
    console.error(JSON.stringify(first));
    process.exit(1);
  }

  if (typeof aspect.orbDeg !== 'number' || Number.isNaN(aspect.orbDeg) || aspect.orbDeg < 0 || aspect.orbDeg > ASPECT_MAX_ORB[aspect.aspect]) {
    console.error('match-probe-check: orbDeg must be within allowed range for aspect type');
    console.error(JSON.stringify(first));
    process.exit(1);
  }
}

if (!first.anchorsProvided.some((entry) => typeof entry === 'string' && entry.startsWith('astro:aspect:'))) {
  console.error('match-probe-check: anchorsProvided must include at least one astro aspect anchor');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.keyReasons) || first.keyReasons.length !== 3) {
  console.error('match-probe-check: keyReasons must contain exactly 3 items');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!first.keyReasons.every((reason) => typeof reason === 'string' && reason.trim().length > 0)) {
  console.error('match-probe-check: keyReasons must contain non-empty strings');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!first.keyReasons.every((reason) => !/nicht verf(ue|ü)gbar|unavailable/i.test(reason))) {
  console.error('match-probe-check: keyReasons must not contain warnings/unavailability text');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (Math.abs(first.breakdown.fusion - first.matchOverall) > 0.01) {
  console.error('match-probe-check: breakdown.fusion must equal matchOverall (plausibility invariant)');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.claims) || first.claims.length < 1) {
  console.error('match-probe-check: claims must be non-empty array');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.warnings) || !first.warnings.includes('astro_unknown_time_no_houses')) {
  console.error('match-probe-check: warnings must include astro_unknown_time_no_houses for null birthTime fixture');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!first.accuracy || typeof first.accuracy !== 'object') {
  console.error('match-probe-check: accuracy must be an object');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (typeof first.accuracy.astrologyActive !== 'boolean') {
  console.error('match-probe-check: accuracy.astrologyActive must be boolean');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first.accuracy.missing)) {
  console.error('match-probe-check: accuracy.missing must be an array');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (typeof first.accuracy.unknownTime !== 'boolean') {
  console.error('match-probe-check: accuracy.unknownTime must be boolean');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (first.accuracy.astrologyActive && first.breakdown.astrology === 0) {
  console.error('match-probe-check: accuracy.astrologyActive=true but breakdown.astrology=0 — inconsistent');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!first.accuracy.astrologyActive && !first.accuracy.missing.includes('birthLocation.timezone')) {
  console.error('match-probe-check: astrologyActive=false but missing does not include birthLocation.timezone');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (first.accuracy.unknownTime && !first.accuracy.missing.includes('birthTime')) {
  console.error('match-probe-check: unknownTime=true but missing does not include birthTime');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (Array.isArray(first.warnings) && first.warnings.includes('astro_unknown_time_no_houses') && !first.accuracy.unknownTime) {
  console.error('match-probe-check: warnings includes astro_unknown_time_no_houses but accuracy.unknownTime=false');
  console.error(JSON.stringify(first));
  process.exit(1);
}

const n1 = JSON.stringify(normalizeForDeterminism(first));
const n2 = JSON.stringify(normalizeForDeterminism(second));
if (n1 !== n2) {
  console.error('match-probe-check: deterministic payload yielded different outputs');
  console.error(JSON.stringify({ first: normalizeForDeterminism(first), second: normalizeForDeterminism(second) }));
  process.exit(1);
}

console.log(
  `match-probe-check: ok (${url}) matchOverall=${first.matchOverall} connectionType=${first.connectionType} reasons=${first.keyReasons.length}`,
);
