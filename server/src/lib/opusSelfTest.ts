// opusSelfTest.ts — The Builder can test itself internally (no external curl needed)

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const BASE = `http://localhost:${PORT}`;
const OPUS_TOKEN = 'opus-bridge-2026-geheim';

/** Delay (ms) to wait after deploy before running self-tests */
const STARTUP_DELAY_MS = parseInt(process.env.OPUS_STARTUP_DELAY_MS ?? '3000', 10);

/** Default request timeout (ms) */
const REQUEST_TIMEOUT_MS = 15_000;

/** How many retries for health-check readiness probe */
const HEALTH_RETRIES = 3;

/** Delay between health-check retries (ms) */
const HEALTH_RETRY_DELAY_MS = 1500;

export interface SelfTestCheck {
  method: 'GET' | 'POST';
  path: string;               // e.g. '/api/builder/opus-bridge/pipeline-info'
  body?: Record<string, unknown>;
  expectStatus?: number;       // default: 200
  expectBodyContains?: string; // substring match on JSON response
}

export interface SelfTestResult {
  path: string;
  passed: boolean;
  status: number;
  durationMs: number;
  error?: string;
  bodySnippet?: string;        // first 300 chars
}

/**
 * Sleep helper.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the full URL, appending opus_token as a query param.
 * Also handles paths that already contain a query string.
 */
function buildUrl(base: string, path: string, token: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}opus_token=${encodeURIComponent(token)}`;
}

/**
 * Wait for the server to be reachable via a lightweight readiness probe.
 * Retries up to HEALTH_RETRIES times with HEALTH_RETRY_DELAY_MS between attempts.
 */
async function waitForServer(base: string): Promise<void> {
  const probePath = '/api/builder/opus-bridge/pipeline-info';
  const url = buildUrl(base, probePath, OPUS_TOKEN);

  for (let attempt = 1; attempt <= HEALTH_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return; // server is up
    } catch {
      // not ready yet
    }
    if (attempt < HEALTH_RETRIES) {
      await sleep(HEALTH_RETRY_DELAY_MS);
    }
  }
  // If we exhaust retries, continue anyway — individual checks will report the error
}

/**
 * Run a single self-test check.
 */
async function runCheck(check: SelfTestCheck): Promise<SelfTestResult> {
  const start = Date.now();
  const url = buildUrl(BASE, check.path, OPUS_TOKEN);

  const headers: Record<string, string> = {};
  if (check.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      method: check.method,
      headers,
      body: check.body ? JSON.stringify(check.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await res.text().catch(() => '');
    const expectedStatus = check.expectStatus ?? 200;
    const statusOk = res.status === expectedStatus;
    const bodyOk = check.expectBodyContains
      ? text.includes(check.expectBodyContains)
      : true;

    return {
      path: check.path,
      passed: statusOk && bodyOk,
      status: res.status,
      durationMs: Date.now() - start,
      bodySnippet: text.slice(0, 300),
      error: !statusOk
        ? `expected ${expectedStatus}, got ${res.status}`
        : !bodyOk
          ? `body missing "${check.expectBodyContains}"`
          : undefined,
    };
  } catch (err) {
    return {
      path: check.path,
      passed: false,
      status: 0,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function selfVerify(checks: SelfTestCheck[]): Promise<{
  allPassed: boolean;
  results: SelfTestResult[];
  detail: {
    serverReachable: boolean;
    startupDelayMs: number;
    timestamp: string;
  };
}> {
  // Give the server time to stabilize after a fresh deploy
  await sleep(STARTUP_DELAY_MS);

  // Ensure the server is responding before running checks
  let serverReachable = false;
  try {
    await waitForServer(BASE);
    serverReachable = true;
  } catch {
    serverReachable = false;
  }

  const results: SelfTestResult[] = [];
  for (const check of checks) {
    const result = await runCheck(check);
    results.push(result);
  }

  const allPassed = results.every((r) => r.passed);

  return {
    allPassed,
    results,
    detail: {
      serverReachable,
      startupDelayMs: STARTUP_DELAY_MS,
      timestamp: new Date().toISOString(),
    },
  };
}

// Convenience: quick health check (uses the same resilience as selfVerify)
export async function selfHealthCheck(): Promise<{
  healthy: boolean;
  detail: {
    serverReachable: boolean;
    startupDelayMs: number;
    timestamp: string;
  };
}> {
  const { allPassed, detail } = await selfVerify([
    {
      method: 'GET',
      path: '/api/builder/opus-bridge/pipeline-info',
      // Only check for a successful response; don't require specific body content
      // to avoid false negatives from schema changes
      expectStatus: 200,
    },
  ]);
  return { healthy: allPassed, detail };
}
