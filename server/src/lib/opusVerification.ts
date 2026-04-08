export interface EndpointTest {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  expect: {
    status: number;
    bodyContains?: string;
    maxResponseTimeMs?: number;
  };
}

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  status?: number;
  error?: string;
}

export interface VerificationResult {
  allPassed: boolean;
  results: TestResult[];
  durationMs: number;
}

export const STANDARD_TESTS: EndpointTest[] = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    expect: { status: 200, bodyContains: 'ok' },
  },
  {
    name: 'Builder Pipeline Info',
    method: 'GET',
    path: '/api/builder/opus-bridge/pipeline-info',
    expect: { status: 200, bodyContains: 'decomposer' },
  },
  {
    name: 'Builder Session Info',
    method: 'GET',
    path: '/api/builder/opus-bridge/session-info',
    expect: { status: 200 },
  },
  {
    name: 'Builder Standup',
    method: 'GET',
    path: '/api/builder/opus-bridge/standup',
    expect: { status: 200, bodyContains: 'ranking' },
  },
  {
    name: 'Builder Audit Auth Check',
    method: 'GET',
    path: '/api/builder/opus-bridge/audit',
    expect: { status: 401 },
  },
  {
    name: 'Arcana Personas',
    method: 'GET',
    path: '/api/arcana/personas',
    expect: { status: 200, bodyContains: 'maya' },
  },
  {
    name: 'Arcana Voices',
    method: 'GET',
    path: '/api/arcana/voices',
    expect: { status: 200, bodyContains: 'Aoede' },
  },
  {
    name: 'Discuss Diag Config',
    method: 'GET',
    path: '/api/discuss-diag',
    expect: { status: 200, bodyContains: 'openai' },
  },
  {
    name: 'Builder Self Test',
    method: 'POST',
    path: '/api/builder/opus-bridge/self-test',
    expect: { status: 200, bodyContains: 'allPassed' },
  },
  {
    name: 'Builder Worker Stats',
    method: 'GET',
    path: '/api/builder/opus-bridge/worker-stats',
    expect: { status: 200 },
  },
];

export async function runVerificationTests(
  baseUrl: string,
  tests: EndpointTest[],
): Promise<VerificationResult> {
  const startedAt = Date.now();
  const results: TestResult[] = [];

  for (const test of tests) {
    const testStartedAt = Date.now();

    try {
      const response = await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          ...(test.headers ?? {}),
        },
        body: test.body ? JSON.stringify(test.body) : undefined,
      });

      const bodyText = await response.text();
      const durationMs = Date.now() - testStartedAt;
      const passed =
        response.status === test.expect.status &&
        (!test.expect.bodyContains || bodyText.includes(test.expect.bodyContains)) &&
        (!test.expect.maxResponseTimeMs || durationMs <= test.expect.maxResponseTimeMs);

      results.push({
        name: test.name,
        passed,
        durationMs,
        status: response.status,
        error: passed ? undefined : bodyText.slice(0, 200),
      });
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        durationMs: Date.now() - testStartedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    allPassed: results.every((result) => result.passed),
    results,
    durationMs: Date.now() - startedAt,
  };
}