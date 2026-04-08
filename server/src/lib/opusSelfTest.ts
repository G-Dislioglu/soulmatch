// opusSelfTest.ts — The Builder can test itself internally (no external curl needed)

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const BASE = `http://localhost:${PORT}`;
const OPUS_TOKEN = 'opus-bridge-2026-geheim';

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

export async function selfVerify(checks: SelfTestCheck[]): Promise<{
  allPassed: boolean;
  results: SelfTestResult[];
}> {
  const results: SelfTestResult[] = [];

  for (const check of checks) {
    const start = Date.now();
    const url = `${BASE}${check.path}${check.path.includes('?') ? '&' : '?'}opus_token=${OPUS_TOKEN}`;

    try {
      const res = await fetch(url, {
        method: check.method,
        headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
        body: check.body ? JSON.stringify(check.body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });

      const text = await res.text().catch(() => '');
      const expectedStatus = check.expectStatus ?? 200;
      const statusOk = res.status === expectedStatus;
      const bodyOk = check.expectBodyContains
        ? text.includes(check.expectBodyContains)
        : true;

      results.push({
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
      });
    } catch (err) {
      results.push({
        path: check.path,
        passed: false,
        status: 0,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    allPassed: results.every((r) => r.passed),
    results,
  };
}

// Convenience: quick health check
export async function selfHealthCheck(): Promise<boolean> {
  const { allPassed } = await selfVerify([
    { method: 'GET', path: '/api/builder/opus-bridge/pipeline-info', expectBodyContains: 'decomposer' },
  ]);
  return allPassed;
}
