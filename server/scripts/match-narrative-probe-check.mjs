#!/usr/bin/env node

const baseUrl = process.env.MATCH_BASE_URL ?? 'https://soulmatch-1.onrender.com';
const url = `${baseUrl.replace(/\/$/, '')}/api/match/narrative`;

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    console.error(`match-narrative-probe-check: ${label} must be array`);
    process.exit(1);
  }
}

async function postScenario(body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error(`match-narrative-probe-check: non-JSON response from ${url}`);
    console.error(`  status=${response.status} | content-type=${response.headers.get('content-type')}`);
    console.error(`  body: ${rawText.slice(0, 200)}`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`match-narrative-probe-check: HTTP ${response.status} ${response.statusText}`);
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (data?.status !== 'ok') {
    console.error('match-narrative-probe-check: status must be "ok"');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (typeof data?.qualityDebug?.pass !== 'boolean') {
    console.error('match-narrative-probe-check: qualityDebug.pass must be boolean');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (typeof data?.qualityDebug?.fallbackUsed !== 'boolean') {
    console.error('match-narrative-probe-check: qualityDebug.fallbackUsed must be boolean');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  ensureArray(data?.qualityDebug?.reasons, 'qualityDebug.reasons');
  ensureArray(data?.narrative?.turns, 'narrative.turns');
  ensureArray(data?.narrative?.nextSteps, 'narrative.nextSteps');
  ensureArray(data?.anchorsProvided, 'anchorsProvided');
  ensureArray(data?.anchorsUsed, 'anchorsUsed');

  if (typeof data?.narrative?.watchOut !== 'string' || data.narrative.watchOut.length < 10) {
    console.error('match-narrative-probe-check: narrative.watchOut must be non-trivial string');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  return data;
}

const passScenario = {
  profileA: { id: 'probe-a', name: 'Ayla' },
  profileB: { id: 'probe-b', name: 'Mete' },
  matchOverall: 78,
  connectionType: 'anker',
  keyReasons: ['Numerologie-Kernscore (v3.1)', 'Verbindungstyp', 'Klarer Kommunikationsfokus'],
  anchorsProvided: ['A1', 'A2', 'A3'],
  anchorsUsed: ['A1', 'A2'],
};

const failScenario = {
  profileA: { id: 'probe-a', name: 'Ayla' },
  profileB: { id: 'probe-b', name: 'Mete' },
  matchOverall: 42,
  connectionType: 'katalysator',
  keyReasons: ['Numerologie-Kernscore (v3.1)', 'Verbindungstyp', 'Lernimpulse sichtbar'],
  anchorsProvided: ['A1', 'A2'],
  anchorsUsed: ['A1', 'A9'],
  forceFallback: true,
};

const passResult = await postScenario(passScenario);
const failResult = await postScenario(failScenario);

if (passResult.qualityDebug.fallbackUsed) {
  console.error('match-narrative-probe-check: pass scenario must not use fallback');
  console.error(JSON.stringify(passResult));
  process.exit(1);
}

if (!passResult.qualityDebug.pass) {
  console.error('match-narrative-probe-check: pass scenario must pass quality gate');
  console.error(JSON.stringify(passResult));
  process.exit(1);
}

if (passResult.qualityDebug.anchorsMinRequired !== 2) {
  console.error('match-narrative-probe-check: pass scenario anchorsMinRequired must be 2');
  console.error(JSON.stringify(passResult));
  process.exit(1);
}

if ((passResult.qualityDebug.anchorsUsedCount ?? 0) < 2) {
  console.error('match-narrative-probe-check: pass scenario anchorsUsedCount must be >= 2');
  console.error(JSON.stringify(passResult));
  process.exit(1);
}

if (!failResult.qualityDebug.fallbackUsed || failResult.qualityDebug.pass) {
  console.error('match-narrative-probe-check: fail scenario must use fallback and fail gate');
  console.error(JSON.stringify(failResult));
  process.exit(1);
}

if (typeof failResult.qualityDebug.anchorsUsedCount !== 'number') {
  console.error('match-narrative-probe-check: fail scenario anchorsUsedCount must be numeric');
  console.error(JSON.stringify(failResult));
  process.exit(1);
}

if (!failResult.qualityDebug.reasons.includes('anchors_used_outside_provided')) {
  console.error('match-narrative-probe-check: fail scenario must report anchors_used_outside_provided');
  console.error(JSON.stringify(failResult));
  process.exit(1);
}

if (!Array.isArray(failResult.meta?.warnings) || !failResult.meta.warnings.includes('narrative_gate_fallback_applied')) {
  console.error('match-narrative-probe-check: fail scenario must include narrative_gate_fallback_applied warning');
  console.error(JSON.stringify(failResult));
  process.exit(1);
}

if (!failResult.meta.warnings.includes('anchors_used_outside_provided')) {
  console.error('match-narrative-probe-check: fail scenario must include anchors_used_outside_provided warning');
  console.error(JSON.stringify(failResult));
  process.exit(1);
}

if (failResult.narrative.nextSteps.length !== 3) {
  console.error('match-narrative-probe-check: fallback narrative must contain exactly 3 nextSteps');
  console.error(JSON.stringify(failResult));
  process.exit(1);
}

console.log(
  `PASS fixture: pass=${passResult.qualityDebug.pass} fallbackUsed=${passResult.qualityDebug.fallbackUsed} anchorsUsed>=2=${(passResult.qualityDebug.anchorsUsedCount ?? 0) >= 2}`,
);

console.log(
  `FAIL fixture: pass=${failResult.qualityDebug.pass} fallbackUsed=${failResult.qualityDebug.fallbackUsed} reasons>=1=${failResult.qualityDebug.reasons.length >= 1}`,
);

console.log(
  `match-narrative-probe-check: ok (${url}) passReasons=${passResult.qualityDebug.reasons.length} failReasons=${failResult.qualityDebug.reasons.length}`,
);
