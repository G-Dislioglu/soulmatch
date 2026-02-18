#!/usr/bin/env node

const baseUrl = process.env.SCORING_BASE_URL ?? 'https://soulmatch-1.onrender.com';
const url = `${baseUrl.replace(/\/$/, '')}/api/scoring/calc`;

const payload = {
  profileId: 'probe-score-v31',
  relationshipType: 'romantic',
  numerologyA: {
    numbers: {
      lifePath: 11,
      expression: 7,
      soulUrge: 6,
      personality: 5,
      birthday: 19,
      lifePathIsMaster: true,
      karmicDebts: ['16/7'],
      personalYear: 8,
    },
  },
  numerologyB: {
    numbers: {
      lifePath: 2,
      expression: 7,
      soulUrge: 6,
      personality: 4,
      birthday: 13,
      karmicDebts: ['14/5'],
      personalYear: 4,
    },
  },
};

function isNumberInRange(value, min, max) {
  return typeof value === 'number' && !Number.isNaN(value) && value >= min && value <= max;
}

function normalizeForDeterminism(data) {
  return {
    profileId: data?.profileId,
    engine: data?.engine,
    engineVersion: data?.engineVersion,
    warnings: Array.isArray(data?.warnings) ? data.warnings : null,
    scoreOverall: data?.scoreOverall,
    breakdown: data?.breakdown,
    claimIds: Array.isArray(data?.claims) ? data.claims.map((c) => c?.id) : null,
  };
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
    console.error(`scoring-probe-check: non-JSON response from ${url}`);
    console.error(`  status=${response.status} | content-type=${response.headers.get('content-type')}`);
    console.error(`  body: ${rawText.slice(0, 200)}`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`scoring-probe-check: HTTP ${response.status} ${response.statusText}`);
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  return data;
}

const data = await postOnce();
const dataRepeat = await postOnce();

if (data?.profileId !== payload.profileId) {
  console.error('scoring-probe-check: profileId mismatch');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.engine !== 'unified_scoring') {
  console.error('scoring-probe-check: engine must be "unified_scoring"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.engineVersion !== 'v3.1') {
  console.error('scoring-probe-check: engineVersion must be "v3.1"');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (typeof data?.computedAt !== 'string' || Number.isNaN(Date.parse(data.computedAt))) {
  console.error('scoring-probe-check: computedAt must be ISO timestamp string');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!isNumberInRange(data?.scoreOverall, 0, 100)) {
  console.error('scoring-probe-check: scoreOverall must be a number in [0,100]');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!isNumberInRange(data?.breakdown?.fusion, 0, 100)) {
  console.error('scoring-probe-check: breakdown.fusion must be a number in [0,100]');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!isNumberInRange(data?.breakdown?.numerology, 0, 100)) {
  console.error('scoring-probe-check: breakdown.numerology must be a number in [0,100]');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!isNumberInRange(data?.breakdown?.astrology, 0, 100)) {
  console.error('scoring-probe-check: breakdown.astrology must be a number in [0,100]');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (Math.abs(data.scoreOverall - data.breakdown.fusion) > 0.0001) {
  console.error('scoring-probe-check: scoreOverall should be near breakdown.fusion');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const warnings = Array.isArray(data?.warnings) ? data.warnings : null;
if (warnings === null) {
  console.error('scoring-probe-check: warnings must always be an array');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!warnings.includes('astro_unavailable_using_numerology_only')) {
  console.error('scoring-probe-check: expected astro_unavailable_using_numerology_only warning for no-astro payload');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (data?.meta?.engine !== data.engine || data?.meta?.engineVersion !== data.engineVersion) {
  console.error('scoring-probe-check: top-level engine fields must match meta');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!Array.isArray(data?.meta?.warnings)) {
  console.error('scoring-probe-check: meta.warnings must always be an array');
  console.error(JSON.stringify(data));
  process.exit(1);
}

if (!Array.isArray(data?.claims) || data.claims.length === 0) {
  console.error('scoring-probe-check: claims must be a non-empty array');
  console.error(JSON.stringify(data));
  process.exit(1);
}

const normalizedA = JSON.stringify(normalizeForDeterminism(data));
const normalizedB = JSON.stringify(normalizeForDeterminism(dataRepeat));
if (normalizedA !== normalizedB) {
  console.error('scoring-probe-check: deterministic payload yielded different outputs');
  console.error(JSON.stringify({ first: normalizeForDeterminism(data), second: normalizeForDeterminism(dataRepeat) }));
  process.exit(1);
}

console.log(
  `scoring-probe-check: ok (${url}) engineVersion=${data.engineVersion} scoreOverall=${data.scoreOverall} numerology=${data.breakdown.numerology}`,
);
