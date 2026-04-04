import { and, eq } from 'drizzle-orm';
import { getDb, profiles } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderReviews,
  builderTasks,
  builderTestResults,
} from '../schema/builder.js';
import type { BdlCommand } from './builderBdlParser.js';

type AllowlistedTable =
  | 'builder_tasks'
  | 'builder_actions'
  | 'builder_reviews'
  | 'builder_test_results'
  | 'builder_artifacts'
  | 'profiles';

type TableMapEntry = {
  table: unknown;
  columns: Record<string, unknown>;
};

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DEFAULT_TIMEOUT_MS = 10_000;
const TABLES: Record<AllowlistedTable, TableMapEntry> = {
  builder_tasks: { table: builderTasks, columns: builderTasks as unknown as Record<string, unknown> },
  builder_actions: { table: builderActions, columns: builderActions as unknown as Record<string, unknown> },
  builder_reviews: { table: builderReviews, columns: builderReviews as unknown as Record<string, unknown> },
  builder_test_results: { table: builderTestResults, columns: builderTestResults as unknown as Record<string, unknown> },
  builder_artifacts: { table: builderArtifacts, columns: builderArtifacts as unknown as Record<string, unknown> },
  profiles: { table: profiles, columns: profiles as unknown as Record<string, unknown> },
};

export interface RuntimeCallResult {
  ok: boolean;
  method: string;
  path: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  timedOut: boolean;
  text: string;
  json: unknown;
  intent?: string;
  error?: string;
}

function parseDurationMs(value: string | undefined, fallback = DEFAULT_TIMEOUT_MS) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)(ms|s)?$/);
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  return match[2] === 's' ? amount * 1000 : amount;
}

function parseBoolean(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function parseScalar(value: string) {
  const booleanValue = parseBoolean(value);
  if (booleanValue !== undefined) {
    return booleanValue;
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseJsonLike(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function getLocalhostUrl(pathValue: string) {
  if (!pathValue) {
    throw new Error('CALL requires path');
  }

  if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) {
    const url = new URL(pathValue);
    if (!LOCALHOST_HOSTS.has(url.hostname)) {
      throw new Error('CALL only allows localhost targets');
    }

    return url.toString();
  }

  if (!pathValue.startsWith('/')) {
    throw new Error('CALL path must be absolute from localhost root');
  }

  const port = process.env.PORT || '3001';
  return `http://localhost:${port}${pathValue}`;
}

async function saveTestResult(taskId: string, testName: string, passed: boolean, details: string, durationMs?: number) {
  const db = getDb();
  await db.insert(builderTestResults).values({
    taskId,
    testName: testName.slice(0, 100),
    passed: passed ? 'true' : 'false',
    details,
    duration: durationMs,
  });
}

function buildCallBody(command: BdlCommand) {
  if (command.body) {
    const parsedBody = parseJsonLike(command.body);
    if (parsedBody !== undefined) {
      return parsedBody;
    }

    return command.body;
  }

  const parsedParamBody = parseJsonLike(command.params.body);
  return parsedParamBody ?? command.params.body;
}

function tryParseJson(text: string, contentType: string | null) {
  if (!text) {
    return null;
  }

  if (contentType?.includes('application/json') || /^[\[{]/.test(text.trim())) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return null;
}

function getJsonPathValue(input: unknown, pathValue: string | undefined) {
  if (!pathValue) {
    return input;
  }

  return pathValue.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    if (typeof current === 'object') {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, input);
}

function evaluateContains(text: string, needle: string) {
  return text.includes(needle);
}

function evaluateBefore(text: string, first: string, second: string) {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  return firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex;
}

function normalizeFilterValues(command: BdlCommand) {
  const bodyJson = parseJsonLike(command.body);
  if (bodyJson && typeof bodyJson === 'object' && !Array.isArray(bodyJson)) {
    const filters = (bodyJson as Record<string, unknown>).filters;
    if (filters && typeof filters === 'object' && !Array.isArray(filters)) {
      return filters as Record<string, unknown>;
    }
  }

  if (command.params.field) {
    const rawValue = command.params.equals ?? command.params.value ?? command.params.contains ?? '';
    return { [command.params.field]: parseScalar(rawValue) };
  }

  return {};
}

function buildWhereClause(columns: Record<string, unknown>, filters: Record<string, unknown>) {
  const entries = Object.entries(filters);
  if (entries.length === 0) {
    return undefined;
  }

  const predicates = entries.map(([field, value]) => {
    const column = columns[field];
    if (!column) {
      throw new Error(`DB_VERIFY field not allowlisted: ${field}`);
    }

    return eq(column as never, value as never);
  });

  return predicates.length === 1 ? predicates[0] : and(...predicates);
}

export async function callLocalEndpoint(taskId: string, command: BdlCommand): Promise<RuntimeCallResult> {
  const method = (command.params.method || 'GET').toUpperCase();
  const url = getLocalhostUrl(command.params.path || command.params.arg1 || '');
  const timeoutMs = parseDurationMs(command.params.timeout);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  const body = buildCallBody(command);

  try {
    const response = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const result: RuntimeCallResult = {
      ok: response.ok,
      method,
      path: command.params.path || command.params.arg1 || '',
      url,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - start,
      timedOut: false,
      text,
      json: tryParseJson(text, response.headers.get('content-type')),
      intent: command.params.intent,
    };

    await saveTestResult(
      taskId,
      `CALL ${method} ${result.path}`,
      result.ok,
      JSON.stringify({ status: result.status, intent: result.intent ?? null }),
      result.durationMs,
    );

    return result;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    const result: RuntimeCallResult = {
      ok: false,
      method,
      path: command.params.path || command.params.arg1 || '',
      url,
      status: 0,
      statusText: timedOut ? 'timeout' : 'error',
      durationMs: Date.now() - start,
      timedOut,
      text: '',
      json: null,
      intent: command.params.intent,
      error: error instanceof Error ? error.message : String(error),
    };

    await saveTestResult(
      taskId,
      `CALL ${method} ${result.path}`,
      false,
      JSON.stringify({ error: result.error, timedOut }),
      result.durationMs,
    );

    return result;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function assertExpect(taskId: string, command: BdlCommand, lastCallResult: RuntimeCallResult | null) {
  if (!lastCallResult) {
    const result = { passed: false, error: 'EXPECT requires previous CALL' };
    await saveTestResult(taskId, 'EXPECT', false, JSON.stringify(result));
    return result;
  }

  const contains = command.params.contains || command.params.arg1;
  const beforeLeft = command.params.before ? command.params.before.split('|')[0] : undefined;
  const beforeRight = command.params.before ? command.params.before.split('|')[1] : undefined;
  const positionalBefore = command.params.arg2 === 'before' ? command.params.arg3 : undefined;
  const expectedStatus = command.params.status ? Number(command.params.status) : undefined;
  const maxDuration = parseDurationMs(command.params.within, Number.MAX_SAFE_INTEGER);

  const checks = {
    status: expectedStatus === undefined ? true : lastCallResult.status === expectedStatus,
    contains: contains ? evaluateContains(lastCallResult.text, contains) : true,
    before: beforeLeft && beforeRight
      ? evaluateBefore(lastCallResult.text, beforeLeft, beforeRight)
      : contains && positionalBefore
        ? evaluateBefore(lastCallResult.text, contains, positionalBefore)
        : true,
    within: command.params.within ? lastCallResult.durationMs <= maxDuration : true,
    ok: command.params.ok ? lastCallResult.ok === (parseBoolean(command.params.ok) ?? true) : true,
  };

  const passed = Object.values(checks).every(Boolean);
  const result = { passed, checks, status: lastCallResult.status, durationMs: lastCallResult.durationMs };
  await saveTestResult(taskId, `EXPECT ${lastCallResult.path}`, passed, JSON.stringify(result), lastCallResult.durationMs);
  return result;
}

export async function assertExpectJson(taskId: string, command: BdlCommand, lastCallResult: RuntimeCallResult | null) {
  if (!lastCallResult) {
    const result = { passed: false, error: 'EXPECT_JSON requires previous CALL' };
    await saveTestResult(taskId, 'EXPECT_JSON', false, JSON.stringify(result));
    return result;
  }

  const subject = getJsonPathValue(lastCallResult.json, command.params.path || command.params.arg1);
  const expectedExists = parseBoolean(command.params.exists);
  const expectedEquals = command.params.equals ? parseScalar(command.params.equals) : undefined;
  const expectedContains = command.params.contains;

  const checks = {
    json: lastCallResult.json !== null,
    exists: expectedExists === undefined ? true : (subject !== undefined) === expectedExists,
    equals: expectedEquals === undefined ? true : JSON.stringify(subject) === JSON.stringify(expectedEquals),
    contains: expectedContains === undefined
      ? true
      : typeof subject === 'string'
        ? subject.includes(expectedContains)
        : Array.isArray(subject)
          ? subject.map((entry) => String(entry)).includes(expectedContains)
          : false,
  };

  const passed = Object.values(checks).every(Boolean);
  const result = { passed, checks, value: subject };
  await saveTestResult(taskId, `EXPECT_JSON ${lastCallResult.path}`, passed, JSON.stringify(result), lastCallResult.durationMs);
  return result;
}

export async function verifyDatabaseState(taskId: string, command: BdlCommand) {
  const tableName = (command.params.table || command.params.arg1 || '') as AllowlistedTable;
  const entry = TABLES[tableName];
  if (!entry) {
    const result = { passed: false, error: 'DB_VERIFY table not allowlisted' };
    await saveTestResult(taskId, `DB_VERIFY ${tableName || 'unknown'}`, false, JSON.stringify(result));
    return result;
  }

  const filters = normalizeFilterValues(command);
  const whereClause = buildWhereClause(entry.columns, filters);
  const db = getDb();
  const startedAt = Date.now();

  const rows = whereClause
    ? await db.select().from(entry.table as never).where(whereClause).limit(20)
    : await db.select().from(entry.table as never).limit(20);

  const expectedCount = command.params.count ? Number(command.params.count) : undefined;
  const minCount = command.params.minCount ? Number(command.params.minCount) : undefined;
  const exists = parseBoolean(command.params.exists);

  const checks = {
    exists: exists === undefined ? rows.length > 0 : (rows.length > 0) === exists,
    count: expectedCount === undefined ? true : rows.length === expectedCount,
    minCount: minCount === undefined ? true : rows.length >= minCount,
  };

  const passed = Object.values(checks).every(Boolean);
  const result = {
    passed,
    table: tableName,
    count: rows.length,
    checks,
    filters,
  };

  await saveTestResult(
    taskId,
    `DB_VERIFY ${tableName}`,
    passed,
    JSON.stringify(result),
    Date.now() - startedAt,
  );

  return result;
}