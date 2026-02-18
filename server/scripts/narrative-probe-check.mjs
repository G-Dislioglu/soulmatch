#!/usr/bin/env node

const baseUrl = process.env.NARRATIVE_BASE_URL ?? 'https://soulmatch-1.onrender.com';
const url = `${baseUrl.replace(/\/$/, '')}/api/narrative/probe`;

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    console.error(`narrative-probe-check: ${label} must be an array`);
    process.exit(1);
  }
}

async function probeScenario(scenario) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error(`narrative-probe-check: non-JSON response from ${url}`);
    console.error(`  status=${response.status} | content-type=${response.headers.get('content-type')}`);
    console.error(`  body: ${rawText.slice(0, 200)}`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`narrative-probe-check: HTTP ${response.status} ${response.statusText}`);
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (data?.status !== 'ok') {
    console.error('narrative-probe-check: status must be "ok"');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  const q = data?.qualityDebug;
  if (typeof q?.pass !== 'boolean') {
    console.error('narrative-probe-check: qualityDebug.pass must be boolean');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  ensureArray(q?.reasons, 'qualityDebug.reasons');

  if (typeof q?.fallbackUsed !== 'boolean') {
    console.error('narrative-probe-check: qualityDebug.fallbackUsed must be boolean');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (typeof q?.version !== 'string' || q.version.length === 0) {
    console.error('narrative-probe-check: qualityDebug.version must be string');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  const out = data?.output;
  ensureArray(out?.turns, 'output.turns');
  ensureArray(out?.nextSteps, 'output.nextSteps');

  if (typeof out?.watchOut !== 'string' || out.watchOut.length < 10) {
    console.error('narrative-probe-check: output.watchOut must be non-trivial string');
    console.error(JSON.stringify(data));
    process.exit(1);
  }

  if (scenario === 'pass') {
    if (q.pass !== true || q.fallbackUsed !== false) {
      console.error('narrative-probe-check: pass scenario must pass without fallback');
      console.error(JSON.stringify(data));
      process.exit(1);
    }
  }

  if (scenario === 'fail') {
    if (q.pass !== false || q.fallbackUsed !== true) {
      console.error('narrative-probe-check: fail scenario must fail and use fallback');
      console.error(JSON.stringify(data));
      process.exit(1);
    }
    if (out.nextSteps.length !== 3) {
      console.error('narrative-probe-check: fallback output must include exactly 3 nextSteps');
      console.error(JSON.stringify(data));
      process.exit(1);
    }
  }

  return q;
}

const passResult = await probeScenario('pass');
const failResult = await probeScenario('fail');

console.log(
  `narrative-probe-check: ok (${url}) passVersion=${passResult.version} failReasons=${failResult.reasons.length}`,
);
