import { mkdir, readFile, writeFile } from 'node:fs/promises';
import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { Agent, type Dispatcher } from 'undici';

const execFileAsync = promisify(execFile);

type HttpProbe = {
  status: number;
  snippet: string;
};

type PushTaskReport = {
  taskId: 'K28T-T01';
  title: string;
  status: string;
  summary: string;
  taskClass: string;
  executionPolicy: string;
  pushAllowed: boolean;
  landed: boolean | null;
  verifiedCommit?: string;
  changedFiles: string[];
  scopeClean: boolean;
  followUpHead?: string;
  runtimeCommit?: string;
  runtimeMatchedVerifiedCommit: boolean;
  invalidWhitespaceProviderRejected: boolean;
  invalidUnknownProviderRejected: boolean;
  validProbeBehaviorPreserved: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type PushBatchReport = {
  batch: 'K2.8t-WeeklyProviderGuard';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K28T-T01';
  };
  preflightWhitespaceProbe?: HttpProbe;
  preflightUnknownProviderProbe?: HttpProbe;
  preflightValidProbe?: HttpProbe;
  postDeployWhitespaceProbe?: HttpProbe;
  postDeployUnknownProviderProbe?: HttpProbe;
  postDeployValidProbe?: HttpProbe;
  task?: PushTaskReport;
};

const K28T_TASK = {
  taskId: 'K28T-T01' as const,
  title: 'free class_1 weekly-insight provider guard landing on studio.ts',
  instruction:
    'In `server/src/routes/studio.ts`, change only the existing `/weekly-insight` POST route. Keep the current `name` and `lifePath` validation exactly as it is. Immediately after the existing line `const config = PROVIDER_CONFIGS[providerName];`, add exactly `if (!config) {`, then `  res.status(400).json({ error: `Unknown provider: ${providerName}` });`, then `  return;`, then `}` using the same surrounding indentation style. Do not modify any other route, helper, type, prompt, provider logic, or file.',
  scope: ['server/src/routes/studio.ts'],
  expectedTaskClass: 'class_1' as const,
  expectedChangedFiles: ['server/src/routes/studio.ts'],
  invalidWhitespaceProviderBody: {
    name: 'Ada',
    lifePath: 3,
    provider: '   ',
  },
  invalidUnknownProviderBody: {
    name: 'Ada',
    lifePath: 3,
    provider: 'bogus',
  },
  validBody: {
    name: 'Ada',
    lifePath: 3,
    provider: 'openai',
  },
  expectedStrings: {
    baselinePresent: [
      "studioRouter.post('/weekly-insight', async (req: Request, res: Response) => {",
      "  const providerName: ProviderName = body.provider ?? 'openai';",
      "  const config = PROVIDER_CONFIGS[providerName];\n  const apiKey = resolveApiKey(providerName, body.clientApiKey);",
    ],
    landedPresent: [
      "studioRouter.post('/weekly-insight', async (req: Request, res: Response) => {\n  const body = req.body as WeeklyInsightRequestBody;\n  if (!body.name || !body.lifePath) {\n    res.status(400).json({ error: 'name and lifePath required' });\n    return;\n  }\n\n  const providerName: ProviderName = body.provider ?? 'openai';\n  const config = PROVIDER_CONFIGS[providerName];\n  if (!config) {\n    res.status(400).json({ error: `Unknown provider: ${providerName}` });\n    return;\n  }\n  const apiKey = resolveApiKey(providerName, body.clientApiKey);",
    ],
  },
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k28t-weekly-provider-guard-results.json');
}

function loadRunnerEnv(repoRoot: string) {
  const candidatePaths = [
    path.join(repoRoot, 'server', '.env.local'),
    path.join(repoRoot, 'server', '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, '.env'),
  ];

  for (const candidatePath of candidatePaths) {
    dotenv.config({ path: candidatePath, override: false, quiet: true });
  }
}

function createResolveDispatcher(baseUrl: string, resolveIp: string | undefined): Dispatcher | undefined {
  if (!resolveIp) return undefined;

  const hostname = new URL(baseUrl).hostname;
  return new Agent({
    connect: {
      family: 4,
      lookup(lookupHostname, _options, callback) {
        if (lookupHostname === hostname) {
          callback(null, resolveIp, 4);
          return;
        }
        dns.lookup(lookupHostname, callback);
      },
    },
  });
}

async function fetchJson(url: string, dispatcher: Dispatcher | undefined, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...(init ?? {}),
    ...(dispatcher ? { dispatcher } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text.slice(0, 300)}`);
  }

  return response.json();
}

async function fetchJsonWithRetry(
  url: string,
  dispatcher: Dispatcher | undefined,
  init: RequestInit,
  attempts = 3,
  retryDelayMs = 15_000,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJson(url, dispatcher, init);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry =
        message.startsWith('502 ')
        || message.includes('fetch failed')
        || message.includes('UND_ERR_CONNECT_TIMEOUT');
      if (!shouldRetry || attempt === attempts) {
        throw error;
      }
      await wait(retryDelayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchProbe(url: string, body: Record<string, unknown>, dispatcher: Dispatcher | undefined): Promise<HttpProbe> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(dispatcher ? { dispatcher } : {}),
  });
  const text = await response.text();
  return {
    status: response.status,
    snippet: text.slice(0, 400),
  };
}

async function fetchProbeWithRetry(
  url: string,
  body: Record<string, unknown>,
  dispatcher: Dispatcher | undefined,
  attempts = 3,
  retryDelayMs = 10_000,
): Promise<HttpProbe> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchProbe(url, body, dispatcher);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = message.includes('fetch failed') || message.includes('UND_ERR_CONNECT_TIMEOUT');
      if (!shouldRetry || attempt === attempts) {
        throw error;
      }
      await wait(retryDelayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function getRemoteMainHead(repoRoot: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['ls-remote', 'origin', 'refs/heads/main'], { cwd: repoRoot });
  const sha = stdout.trim().split(/\s+/)[0];
  if (!sha) throw new Error('Could not resolve remote main head');
  return sha;
}

async function ensureCommitAvailable(repoRoot: string, commitSha: string): Promise<void> {
  try {
    await execFileAsync('git', ['cat-file', '-e', `${commitSha}^{commit}`], { cwd: repoRoot });
  } catch {
    await execFileAsync('git', ['fetch', 'origin', 'refs/heads/main'], { cwd: repoRoot });
    await execFileAsync('git', ['cat-file', '-e', `${commitSha}^{commit}`], { cwd: repoRoot });
  }
}

async function getCommitChangedFiles(repoRoot: string, commitSha: string): Promise<string[]> {
  await ensureCommitAvailable(repoRoot, commitSha);
  const { stdout } = await execFileAsync('git', ['show', '--pretty=', '--name-only', commitSha], { cwd: repoRoot });
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

async function readRepoFile(repoRoot: string, relativePath: string): Promise<string> {
  try {
    return await readFile(path.join(repoRoot, relativePath), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRuntimeCommit(
  baseUrl: string,
  dispatcher: Dispatcher | undefined,
  expectedCommit: string,
  timeoutMs = 8 * 60_000,
  intervalMs = 15_000,
): Promise<string | undefined> {
  const startedAt = Date.now();
  let lastSeen: string | undefined;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const health = await fetchJson(`${baseUrl}/api/health`, dispatcher) as Record<string, unknown>;
      lastSeen = typeof health.commit === 'string' ? health.commit : lastSeen;
      if (lastSeen === expectedCommit) return lastSeen;
    } catch {
      // Fail closed by timeout rather than runner crash.
    }
    await wait(intervalMs);
  }

  return lastSeen;
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8t runner');

  const baseUrl = (process.env.K28T_BASE_URL ?? process.env.K28S_BASE_URL ?? process.env.K28Q_BASE_URL ?? process.env.K28K_BASE_URL ?? process.env.K28J_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28T_RESOLVE_IP
    ?? process.env.K28S_RESOLVE_IP
    ?? process.env.K28Q_RESOLVE_IP
    ?? process.env.K28O_RESOLVE_IP
    ?? process.env.K28N_RESOLVE_IP
    ?? process.env.K28M_RESOLVE_IP
    ?? process.env.K28K_RESOLVE_IP
    ?? process.env.K28J_RESOLVE_IP
    ?? process.env.DEPLOY_RESOLVE_IP;
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = getDefaultOutputPath(repoRoot);

  const currentContent = normalizeText(await readRepoFile(repoRoot, K28T_TASK.expectedChangedFiles[0]));
  if (K28T_TASK.expectedStrings.landedPresent.every((entry) => currentContent.includes(entry))) {
    throw new Error(`K28T-T01 already appears landed on current repo truth (${K28T_TASK.expectedChangedFiles[0]} already contains all target markers).`);
  }
  for (const expectedPresent of K28T_TASK.expectedStrings.baselinePresent) {
    if (!currentContent.includes(expectedPresent)) {
      throw new Error(`K28T-T01 cannot run because expected baseline anchor is missing from ${K28T_TASK.expectedChangedFiles[0]}.`);
    }
  }

  const routeUrl = `${baseUrl}/api/weekly-insight`;
  const preflightWhitespaceProbe = await fetchProbeWithRetry(routeUrl, K28T_TASK.invalidWhitespaceProviderBody, dispatcher);
  const preflightUnknownProviderProbe = await fetchProbeWithRetry(routeUrl, K28T_TASK.invalidUnknownProviderBody, dispatcher);
  const preflightValidProbe = await fetchProbeWithRetry(routeUrl, K28T_TASK.validBody, dispatcher);

  if (preflightWhitespaceProbe.status !== 502) {
    throw new Error(`K28T-T01 expected whitespace-only provider preflight probe to fail on current runtime with 502, got ${preflightWhitespaceProbe.status}.`);
  }
  if (preflightUnknownProviderProbe.status !== 502) {
    throw new Error(`K28T-T01 expected unknown provider preflight probe to fail on current runtime with 502, got ${preflightUnknownProviderProbe.status}.`);
  }
  const headBefore = await getRemoteMainHead(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.8t-WeeklyProviderGuard',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: {
      outputFile,
      task: K28T_TASK.taskId,
    },
    preflightWhitespaceProbe,
    preflightUnknownProviderProbe,
    preflightValidProbe,
  };

  console.log(`[k28t-runner] remote main before: ${headBefore}`);

  const result = await fetchJsonWithRetry(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: K28T_TASK.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: K28T_TASK.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];

  await wait(90_000);
  const headAfter = await getRemoteMainHead(repoRoot);
  const runtimeCommit = verifiedCommit ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit) : undefined;
  const postDeployWhitespaceProbe = await fetchProbeWithRetry(routeUrl, K28T_TASK.invalidWhitespaceProviderBody, dispatcher);
  const postDeployUnknownProviderProbe = await fetchProbeWithRetry(routeUrl, K28T_TASK.invalidUnknownProviderBody, dispatcher);
  const postDeployValidProbe = await fetchProbeWithRetry(routeUrl, K28T_TASK.validBody, dispatcher);

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const invalidWhitespaceProviderRejected = postDeployWhitespaceProbe.status === 400 && postDeployWhitespaceProbe.snippet.includes('Unknown provider');
  const invalidUnknownProviderRejected = postDeployUnknownProviderProbe.status === 400 && postDeployUnknownProviderProbe.snippet.includes('Unknown provider');
  const validProbeBehaviorPreserved =
    postDeployValidProbe.status === 200
    || postDeployValidProbe.status === preflightValidProbe.status;

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== K28T_TASK.expectedTaskClass) assessmentReasons.push(`expected taskClass ${K28T_TASK.expectedTaskClass}, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(K28T_TASK.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${K28T_TASK.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (headAfter !== verifiedCommit) assessmentReasons.push(`remote head after 90s is ${headAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  if (runtimeCommit !== verifiedCommit) assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  if (!invalidWhitespaceProviderRejected) assessmentReasons.push(`expected whitespace-only provider probe to return 400, got ${postDeployWhitespaceProbe.status}`);
  if (!invalidUnknownProviderRejected) assessmentReasons.push(`expected unknown provider probe to return 400, got ${postDeployUnknownProviderProbe.status}`);
  if (!validProbeBehaviorPreserved) {
    assessmentReasons.push(`expected valid probe status to remain ${preflightValidProbe.status} or improve to 200, got ${postDeployValidProbe.status}`);
  }

  report.headAfter = headAfter;
  report.postDeployWhitespaceProbe = postDeployWhitespaceProbe;
  report.postDeployUnknownProviderProbe = postDeployUnknownProviderProbe;
  report.postDeployValidProbe = postDeployValidProbe;
  report.task = {
    taskId: K28T_TASK.taskId,
    title: K28T_TASK.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => K28T_TASK.expectedChangedFiles.includes(filePath)),
    followUpHead: headAfter,
    runtimeCommit,
    runtimeMatchedVerifiedCommit: runtimeCommit === verifiedCommit,
    invalidWhitespaceProviderRejected,
    invalidUnknownProviderRejected,
    validProbeBehaviorPreserved,
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({
    batch: report.batch,
    outputFile,
    headBefore,
    headAfter,
    task: {
      taskId: report.task.taskId,
      status: report.task.status,
      taskClass: report.task.taskClass,
      assessment: report.task.assessment,
      verifiedCommit: report.task.verifiedCommit,
      runtimeCommit: report.task.runtimeCommit,
      invalidWhitespaceProviderRejected: report.task.invalidWhitespaceProviderRejected,
      invalidUnknownProviderRejected: report.task.invalidUnknownProviderRejected,
      validProbeBehaviorPreserved: report.task.validProbeBehaviorPreserved,
    },
  }, null, 2));

  if (report.task.assessment !== 'pass') {
    process.exitCode = 1;
  }
}

await main();
