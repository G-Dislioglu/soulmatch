#!/usr/bin/env node

const baseUrl = process.env.MATCH_BASE_URL ?? 'http://localhost:3001';
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

function normalizeForDeterminism(data) {
  return {
    profileA: data?.profileA,
    profileB: data?.profileB,
    engine: data?.engine,
    engineVersion: data?.engineVersion,
    scoreOverall: data?.scoreOverall,
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

  let data;
  try {
    data = await response.json();
  } catch {
    console.error(`match-probe-check: non-JSON response from ${url}`);
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

if (!isScore(first?.scoreOverall) || !isScore(first?.matchOverall)) {
  console.error('match-probe-check: scoreOverall and matchOverall must be scores in [0,100]');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!isScore(first?.breakdown?.numerology) || !isScore(first?.breakdown?.astrology) || !isScore(first?.breakdown?.fusion)) {
  console.error('match-probe-check: breakdown scores must be in [0,100]');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (typeof first?.connectionType !== 'string' || first.connectionType.length < 3) {
  console.error('match-probe-check: connectionType must be non-empty string');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.anchorsProvided) || first.anchorsProvided.length < 3) {
  console.error('match-probe-check: anchorsProvided must be array with at least 3 items');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.keyReasons) || first.keyReasons.length < 1) {
  console.error('match-probe-check: keyReasons must be non-empty array');
  console.error(JSON.stringify(first));
  process.exit(1);
}

if (!Array.isArray(first?.claims) || first.claims.length < 1) {
  console.error('match-probe-check: claims must be non-empty array');
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
  `match-probe-check: ok (${url}) scoreOverall=${first.scoreOverall} connectionType=${first.connectionType} reasons=${first.keyReasons.length}`,
);
