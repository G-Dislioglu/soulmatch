import { mkdir, readFile, writeFile } from 'node:fs/promises';
import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { Agent, type Dispatcher } from 'undici';

import { outboundFetch } from '../src/lib/outboundHttp.js';

const execFileAsync = promisify(execFile);

type HttpProbe = {
  status: number;
  snippet: string;
};

type PushTaskReport = {
  taskId: 'K28J-T01';
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
  invalidSystemRejected: boolean;
  invalidUserRejected: boolean;
  validProbeStillOk: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type PushBatchReport = {
  batch: 'K2.8j-FreeRuntimeSubset';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K28J-T01';
  };
  preflightInvalidSystemProbe?: HttpProbe;
  preflightInvalidUserProbe?: HttpProbe;
  preflightValidProbe?: HttpProbe;
  postDeployInvalidSystemProbe?: HttpProbe;
  postDeployInvalidUserProbe?: HttpProbe;
  postDeployValidProbe?: HttpProbe;
  task?: PushTaskReport;
};

const K28J_TASK = {
  taskId: 'K28J-T01' as const,
  title: 'free class_1 guide prompt whitespace validation push',
  instruction:
    'In `server/src/routes/guide.ts`, tighten only the existing `/guide` POST route so whitespace-only `systemPrompt` and whitespace-only `userMessage` are rejected before the provider call. Add local trimmed `systemPrompt` and `userMessage` variables inside the route handler, keep the existing `400` payload `{ error: \'Missing systemPrompt or userMessage\' }` when either trimmed value is empty, and pass the trimmed values into the provider request messages without changing any other route, helper, type, provider table, or file. Do not touch any other file.',
  scope: ['server/src/routes/guide.ts'],
  expectedTaskClass: 'class_1' as const,
  expectedChangedFiles: ['server/src/routes/guide.ts'],
  invalidSystemBody: {
    systemPrompt: '   ',
    userMessage: 'hello',
    provider: 'openai',
    clientApiKey: 'dummy-key',
  },
  invalidUserBody: {
    systemPrompt: 'system',
    userMessage: '   ',
    provider: 'openai',
    clientApiKey: 'dummy-key',
  },
  validBody: {
    systemPrompt: 'system',
    userMessage: 'hello',
    provider: 'openai',
    clientApiKey: 'dummy-key',
  },
  expectedStrings: {
    routeStart: "guideRouter.post('/guide', async (req: Request, res: Response) => {",
    oldValidation: '  if (!body.systemPrompt || !body.userMessage) {',
    oldSystemContent: "          { role: 'system', content: body.systemPrompt },",
    oldUserContent: "          { role: 'user', content: body.userMessage },",
    newTrimmedSystem: "  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt.trim() : '';",
    newTrimmedUser: "  const userMessage = typeof body.userMessage === 'string' ? body.userMessage.trim() : '';",
    newSystemContent: "          { role: 'system', content: systemPrompt },",
    newUserContent: "          { role: 'user', content: userMessage },",
  },
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k28j-free-runtime-results.json');
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
  const response = await outboundFetch(url, {
    ...(init ?? {}),
    ...(dispatcher ? { dispatcher } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text.slice(0, 300)}`);
  }

  return response.json();
}

async function fetchProbe(url: string, body: Record<string, unknown>, dispatcher: Dispatcher | undefined): Promise<HttpProbe> {
  const response = await outboundFetch(url, {
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
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8j runner');

  const baseUrl = (process.env.K28J_BASE_URL ?? process.env.K28I_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28J_RESOLVE_IP
    ?? process.env.K28I_RESOLVE_IP
    ?? process.env.K28H_RESOLVE_IP
    ?? process.env.K28G_RESOLVE_IP
    ?? process.env.K28F_RESOLVE_IP
    ?? process.env.K28E_RESOLVE_IP
    ?? process.env.K28A_RESOLVE_IP
    ?? process.env.K27F_RESOLVE_IP
    ?? process.env.K27E_RESOLVE_IP
    ?? process.env.K27D_RESOLVE_IP
    ?? process.env.K27C_RESOLVE_IP
    ?? process.env.DEPLOY_RESOLVE_IP
    ?? '216.24.57.251';
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = getDefaultOutputPath(repoRoot);

  const currentContent = normalizeText(await readRepoFile(repoRoot, K28J_TASK.expectedChangedFiles[0]));
  if (
    currentContent.includes(K28J_TASK.expectedStrings.newTrimmedSystem)
    || currentContent.includes(K28J_TASK.expectedStrings.newTrimmedUser)
  ) {
    throw new Error(`K28J-T01 already landed on the current repo truth (${K28J_TASK.expectedChangedFiles[0]} already contains trimmed guide prompt validation).`);
  }
  if (
    !currentContent.includes(K28J_TASK.expectedStrings.routeStart)
    || !currentContent.includes(K28J_TASK.expectedStrings.oldValidation)
    || !currentContent.includes(K28J_TASK.expectedStrings.oldSystemContent)
    || !currentContent.includes(K28J_TASK.expectedStrings.oldUserContent)
  ) {
    throw new Error(`K28J-T01 cannot run because the expected guide route anchors are missing from ${K28J_TASK.expectedChangedFiles[0]}.`);
  }

  const routeUrl = `${baseUrl}/api/guide`;
  const preflightInvalidSystemProbe = await fetchProbe(routeUrl, K28J_TASK.invalidSystemBody, dispatcher);
  const preflightInvalidUserProbe = await fetchProbe(routeUrl, K28J_TASK.invalidUserBody, dispatcher);
  const preflightValidProbe = await fetchProbe(routeUrl, K28J_TASK.validBody, dispatcher);

  if (preflightInvalidSystemProbe.status !== 200) {
    throw new Error(`K28J-T01 expected whitespace-only systemPrompt preflight probe to remain open on current runtime, got ${preflightInvalidSystemProbe.status}.`);
  }
  if (preflightInvalidUserProbe.status !== 200) {
    throw new Error(`K28J-T01 expected whitespace-only userMessage preflight probe to remain open on current runtime, got ${preflightInvalidUserProbe.status}.`);
  }
  if (preflightValidProbe.status !== 200) {
    throw new Error(`K28J-T01 expected valid preflight probe to succeed, got ${preflightValidProbe.status}.`);
  }

  const headBefore = await getRemoteMainHead(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.8j-FreeRuntimeSubset',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: {
      outputFile,
      task: K28J_TASK.taskId,
    },
    preflightInvalidSystemProbe,
    preflightInvalidUserProbe,
    preflightValidProbe,
  };

  console.log(`[k28j-free] remote main before: ${headBefore}`);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: K28J_TASK.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: K28J_TASK.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];

  await wait(90_000);
  const headAfter = await getRemoteMainHead(repoRoot);
  const runtimeCommit = verifiedCommit ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit) : undefined;
  const postDeployInvalidSystemProbe = await fetchProbe(routeUrl, K28J_TASK.invalidSystemBody, dispatcher);
  const postDeployInvalidUserProbe = await fetchProbe(routeUrl, K28J_TASK.invalidUserBody, dispatcher);
  const postDeployValidProbe = await fetchProbe(routeUrl, K28J_TASK.validBody, dispatcher);

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const invalidSystemRejected = postDeployInvalidSystemProbe.status === 400 && postDeployInvalidSystemProbe.snippet.includes('"error":"Missing systemPrompt or userMessage"');
  const invalidUserRejected = postDeployInvalidUserProbe.status === 400 && postDeployInvalidUserProbe.snippet.includes('"error":"Missing systemPrompt or userMessage"');
  const validProbeStillOk = postDeployValidProbe.status === 200 && postDeployValidProbe.snippet.includes('"text":"');

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== K28J_TASK.expectedTaskClass) assessmentReasons.push(`expected taskClass ${K28J_TASK.expectedTaskClass}, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(K28J_TASK.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${K28J_TASK.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (headAfter !== verifiedCommit) assessmentReasons.push(`remote head after 90s is ${headAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  if (runtimeCommit !== verifiedCommit) assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  if (!invalidSystemRejected) assessmentReasons.push(`expected whitespace-only systemPrompt probe to return 400, got ${postDeployInvalidSystemProbe.status}`);
  if (!invalidUserRejected) assessmentReasons.push(`expected whitespace-only userMessage probe to return 400, got ${postDeployInvalidUserProbe.status}`);
  if (!validProbeStillOk) assessmentReasons.push(`expected valid probe to remain 200 with text payload, got ${postDeployValidProbe.status}`);

  report.headAfter = headAfter;
  report.postDeployInvalidSystemProbe = postDeployInvalidSystemProbe;
  report.postDeployInvalidUserProbe = postDeployInvalidUserProbe;
  report.postDeployValidProbe = postDeployValidProbe;
  report.task = {
    taskId: K28J_TASK.taskId,
    title: K28J_TASK.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => K28J_TASK.expectedChangedFiles.includes(filePath)),
    followUpHead: headAfter,
    runtimeCommit,
    runtimeMatchedVerifiedCommit: runtimeCommit === verifiedCommit,
    invalidSystemRejected,
    invalidUserRejected,
    validProbeStillOk,
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
    preflightInvalidSystemProbe,
    preflightInvalidUserProbe,
    postDeployInvalidSystemProbe,
    postDeployInvalidUserProbe,
    task: {
      taskId: report.task.taskId,
      status: report.task.status,
      taskClass: report.task.taskClass,
      assessment: report.task.assessment,
      verifiedCommit: report.task.verifiedCommit,
      runtimeCommit: report.task.runtimeCommit,
      invalidSystemRejected: report.task.invalidSystemRejected,
      invalidUserRejected: report.task.invalidUserRejected,
      validProbeStillOk: report.task.validProbeStillOk,
    },
  }, null, 2));

  if (report.task.assessment !== 'pass') {
    process.exitCode = 1;
  }
}

await main();
