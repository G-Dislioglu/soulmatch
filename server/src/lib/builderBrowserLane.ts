import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getDb } from '../db.js';
import { builderArtifacts, builderTestResults } from '../schema/builder.js';
import type { BdlCommand } from './builderBdlParser.js';

interface BrowserStep {
  name: string;
  route: string;
  selector: string | null;
  text: string | null;
  waitFor: string | null;
  notes: string | null;
  screenshotFile: string;
}

interface PlaywrightTestSummary {
  title: string;
  status: string;
  error: string | null;
}

export interface BrowserLaneExecution {
  ok: boolean;
  reason: string;
  summary: string;
  durationMs: number;
  commandResults: Array<Record<string, unknown>>;
  screenshotsSaved: number;
}

function sanitizeName(value: string, fallback: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return cleaned || fallback;
}

function normalizeRoute(value: string | undefined) {
  if (!value || value.trim().length === 0) {
    return '/';
  }

  const trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function toBrowserStep(command: BdlCommand, index: number): BrowserStep {
  const baseName = command.params.name || command.params.intent || command.params.arg1 || `ui-run-${index + 1}`;

  return {
    name: baseName.slice(0, 80),
    route: normalizeRoute(command.params.route || command.params.path || command.params.url || command.params.arg1),
    selector: command.params.selector || command.params.locator || command.params.expect || null,
    text: command.params.text || command.params.contains || null,
    waitFor: command.params.waitFor || command.params.wait || null,
    notes: command.body?.trim() || null,
    screenshotFile: `${String(index + 1).padStart(2, '0')}-${sanitizeName(baseName, `ui-run-${index + 1}`)}.png`,
  };
}

function buildSpecContent(steps: BrowserStep[]) {
  return [
    "import { test, expect } from '@playwright/test';",
    "import { promises as fs } from 'node:fs';",
    "import path from 'node:path';",
    '',
    `const steps = ${JSON.stringify(steps, null, 2)} as const;`,
    '',
    'steps.forEach((step) => {',
    '  test(step.name, async ({ page }) => {',
    "    const screenshotDir = process.env['BUILDER_SCREENSHOT_DIR'];",
    '    try {',
    '      await page.goto(step.route);',
    "      await page.waitForLoadState('domcontentloaded');",
    '      if (step.waitFor) {',
    '        await page.waitForSelector(step.waitFor, { timeout: 10000 });',
    '      }',
    '      if (step.selector) {',
    '        await expect(page.locator(step.selector).first()).toBeVisible();',
    '      }',
    '      if (step.text) {',
    "        await expect(page.getByText(step.text, { exact: false }).first()).toBeVisible();",
    '      }',
    '    } finally {',
    '      if (screenshotDir) {',
    '        await fs.mkdir(screenshotDir, { recursive: true });',
    '        await page.screenshot({ path: path.join(screenshotDir, step.screenshotFile), fullPage: true });',
    '      }',
    '    }',
    '  });',
    '});',
    '',
  ].join('\n');
}

function parsePlaywrightReport(stdout: string) {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(stdout.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function collectPlaywrightTests(node: unknown, bucket: PlaywrightTestSummary[]) {
  if (!node || typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;
  const specs = Array.isArray(record.specs) ? record.specs as Array<Record<string, unknown>> : [];
  for (const spec of specs) {
    const tests = Array.isArray(spec.tests) ? spec.tests as Array<Record<string, unknown>> : [];
    for (const test of tests) {
      const results = Array.isArray(test.results) ? test.results as Array<Record<string, unknown>> : [];
      const latest = results[results.length - 1] ?? {};
      const errors = Array.isArray(latest.errors) ? latest.errors as Array<Record<string, unknown>> : [];
      const firstError = errors.find((entry) => typeof entry.message === 'string');
      bucket.push({
        title: typeof spec.title === 'string' ? spec.title : 'builder-browser-test',
        status: typeof latest.status === 'string' ? latest.status : 'unknown',
        error: typeof firstError?.message === 'string' ? firstError.message : null,
      });
    }
  }

  const suites = Array.isArray(record.suites) ? record.suites : [];
  for (const suite of suites) {
    collectPlaywrightTests(suite, bucket);
  }
}

async function saveTestResult(taskId: string, testName: string, passed: boolean, details: string, durationMs: number) {
  const db = getDb();
  await db.insert(builderTestResults).values({
    taskId,
    testName: testName.slice(0, 100),
    passed: passed ? 'true' : 'false',
    details,
    duration: durationMs,
  });
}

async function saveScreenshots(taskId: string, screenshotDir: string, steps: BrowserStep[]) {
  const db = getDb();
  let saved = 0;

  for (const step of steps) {
    const screenshotPath = path.join(screenshotDir, step.screenshotFile);
    try {
      const buffer = await fs.readFile(screenshotPath);
      await db.insert(builderArtifacts).values({
        taskId,
        artifactType: 'browser_screenshot',
        lane: 'browser',
        path: `/builder/browser/${taskId}/${step.screenshotFile}`,
        jsonPayload: {
          step: step.name,
          route: step.route,
          fileName: step.screenshotFile,
          contentType: 'image/png',
          dataBase64: buffer.toString('base64'),
        },
      });
      saved += 1;
    } catch {
      // Ignore missing screenshots for failed or aborted browser runs.
    }
  }

  return saved;
}

export async function runBrowserLane(
  taskId: string,
  worktreePath: string,
  commands: BdlCommand[],
): Promise<BrowserLaneExecution> {
  const steps = commands.filter((command) => command.kind === 'UI_RUN').map(toBrowserStep);
  const start = Date.now();

  if (steps.length === 0) {
    const durationMs = Date.now() - start;
    await saveTestResult(taskId, 'browser:missing-ui-run', false, 'No @UI_RUN command generated for browser lane', durationMs);
    return {
      ok: false,
      reason: 'missing_ui_run',
      summary: 'Browser lane skipped: no @UI_RUN command generated.',
      durationMs,
      commandResults: [],
      screenshotsSaved: 0,
    };
  }

  const clientDir = path.join(worktreePath, 'client');
  const tempSpecDir = path.join(clientDir, 'e2e', '__builder__');
  const specFileName = `builder-${taskId}.spec.ts`;
  const specFilePath = path.join(tempSpecDir, specFileName);
  const relativeSpecPath = path.posix.join('e2e', '__builder__', specFileName);
  const screenshotDir = path.join(os.tmpdir(), `builder-browser-${taskId}`);

  await fs.mkdir(tempSpecDir, { recursive: true });
  await fs.rm(screenshotDir, { recursive: true, force: true });
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.writeFile(specFilePath, buildSpecContent(steps), 'utf-8');

  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    executable,
    ['playwright', 'test', relativeSpecPath, '--config', 'playwright.config.ts', '--project', 'chromium', '--reporter=json'],
    {
      cwd: clientDir,
      encoding: 'utf-8',
      timeout: 180_000,
      windowsHide: true,
      env: {
        ...process.env,
        CI: '1',
        BUILDER_SCREENSHOT_DIR: screenshotDir,
      },
    },
  );

  const durationMs = Date.now() - start;
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const report = parsePlaywrightReport(stdout);
  const tests: PlaywrightTestSummary[] = [];
  if (report) {
    collectPlaywrightTests(report, tests);
  }

  const summaryByTitle = new Map(tests.map((test) => [test.title, test]));
  const ok = result.status === 0;
  const fallbackError = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n').slice(0, 2000) || 'Playwright run failed';

  const commandResults = steps.map((step) => {
    const testSummary = summaryByTitle.get(step.name);
    const passed = ok && (testSummary?.status === 'passed' || !testSummary);
    return {
      route: step.route,
      selector: step.selector,
      text: step.text,
      waitFor: step.waitFor,
      notes: step.notes,
      testName: step.name,
      screenshotFile: step.screenshotFile,
      passed,
      status: testSummary?.status ?? (ok ? 'passed' : 'failed'),
      error: testSummary?.error ?? (passed ? null : fallbackError),
      durationMs,
    } satisfies Record<string, unknown>;
  });

  for (const commandResult of commandResults) {
    await saveTestResult(
      taskId,
      `browser:${String(commandResult.testName ?? 'ui-run')}`,
      commandResult.passed === true,
      String(commandResult.error ?? commandResult.status ?? 'unknown'),
      durationMs,
    );
  }

  const screenshotsSaved = await saveScreenshots(taskId, screenshotDir, steps);

  await fs.rm(specFilePath, { force: true });
  await fs.rm(screenshotDir, { recursive: true, force: true });

  return {
    ok,
    reason: ok ? 'browser_ok' : 'browser_failed',
    summary: ok
      ? `Browser lane passed with ${steps.length} UI run(s).`
      : `Browser lane failed: ${fallbackError}`,
    durationMs,
    commandResults,
    screenshotsSaved,
  };
}