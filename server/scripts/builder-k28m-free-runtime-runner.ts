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
  taskId: 'K28M-T01';
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
  invalidWhitespaceRejected: boolean;
  validProbeStillOk: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type PushBatchReport = {
  batch: 'K2.8m-FreeRuntimeSubset';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K28M-T01';
  };
  preflightInvalidProbe?: HttpProbe;
  preflightValidProbe?: HttpProbe;
  postDeployInvalidProbe?: HttpProbe;
  postDeployValidProbe?: HttpProbe;
  task?: PushTaskReport;
};

const K28M_TASK = {
  taskId: 'K28M-T01' as const,
  title: 'free class_1 match single birthDate whitespace validation push',
  instruction:
    'In `server/src/routes/match.ts`, tighten only the existing `POST /api/match/single` route so whitespace-only `profileA.birthDate` and whitespace-only `profileB.birthDate` are rejected before numerology or astrology work starts. Add local trimmed `profileABirthDate` and `profileBBirthDate` variables inside that route handler, keep the existing `400` payload `{ error: \'profileA.birthDate and profileB.birthDate are required\' }` when either trimmed value is empty, and use the trimmed values for `deriveNumerologyFromBirthDate(...)` plus the `birthDate` fields passed into `calculateAstrologyForMatch(...)`. Do not change any other route, helper, scoring logic, warning logic, or file.',
  scope: ['server/src/routes/match.ts'],
  expectedTaskClass: 'class_1' as const,
  expectedChangedFiles: ['server/src/routes/match.ts'],
  invalidBody: {
    profileA: { birthDate: '   ' },
    profileB: { birthDate: '2000-01-01' },
  },
  validBody: {
    profileA: { birthDate: '1999-01-01' },
    profileB: { birthDate: '2000-01-01' },
  },
  expectedStrings: {
    routeStart: "matchRouter.post('/single', async (req: Request, res: Response) => {",
    oldValidation: "    if (!request?.profileA?.birthDate || !request?.profileB?.birthDate) {",
    oldNumerologyA: '    const numerologyA = deriveNumerologyFromBirthDate(request.profileA.birthDate);',
    oldNumerologyB: '    const numerologyB = deriveNumerologyFromBirthDate(request.profileB.birthDate);',
    oldAstroA: '            birthDate: request.profileA.birthDate,',
    oldAstroB: '            birthDate: request.profileB.birthDate,',
    newTrimmedA: "    const profileABirthDate = typeof request?.profileA?.birthDate === 'string' ? request.profileA.birthDate.trim() : '';",
    newTrimmedB: "    const profileBBirthDate = typeof request?.profileB?.birthDate === 'string' ? request.profileB.birthDate.trim() : '';",
    newNumerologyA: '    const numerologyA = deriveNumerologyFromBirthDate(profileABirthDate);',
    newNumerologyB: '    const numerologyB = deriveNumerologyFromBirthDate(profileBBirthDate);',
    newAstroA: '            birthDate: profileABirthDate,',
    newAstroB: '            birthDate: profileBBirthDate,',
  },
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k28m-free-runtime-results.json');
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
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8m runner');

  const baseUrl = (process.env.K28M_BASE_URL ?? process.env.K28L_BASE_URL ?? process.env.K28K_BASE_URL ?? process.env.K28J_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28M_RESOLVE_IP
    ?? process.env.K28L_RESOLVE_IP
    ?? process.env.K28K_RESOLVE_IP
    ?? process.env.K28J_RESOLVE_IP
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

  const currentContent = normalizeText(await readRepoFile(repoRoot, K28M_TASK.expectedChangedFiles[0]));
  if (currentContent.includes(K28M_TASK.expectedStrings.newTrimmedA)) {
    throw new Error(`K28M-T01 already landed on the current repo truth (${K28M_TASK.expectedChangedFiles[0]} already contains trimmed match single birthDate validation).`);
  }
  if (
    !currentContent.includes(K28M_TASK.expectedStrings.routeStart)
    || !currentContent.includes(K28M_TASK.expectedStrings.oldValidation)
    || !currentContent.includes(K28M_TASK.expectedStrings.oldNumerologyA)
    || !currentContent.includes(K28M_TASK.expectedStrings.oldNumerologyB)
    || !currentContent.includes(K28M_TASK.expectedStrings.oldAstroA)
    || !currentContent.includes(K28M_TASK.expectedStrings.oldAstroB)
  ) {
    throw new Error(`K28M-T01 cannot run because the expected match route anchors are missing from ${K28M_TASK.expectedChangedFiles[0]}.`);
  }

  const routeUrl = `${baseUrl}/api/match/single`;
  const preflightInvalidProbe = await fetchProbe(routeUrl, K28M_TASK.invalidBody, dispatcher);
  const preflightValidProbe = await fetchProbe(routeUrl, K28M_TASK.validBody, dispatcher);

  if (preflightInvalidProbe.status !== 500) {
    throw new Error(`K28M-T01 expected whitespace-only birthDate preflight probe to fail as 500 on current runtime, got ${preflightInvalidProbe.status}.`);
  }
  if (preflightValidProbe.status !== 200) {
    throw new Error(`K28M-T01 expected valid preflight probe to succeed, got ${preflightValidProbe.status}.`);
  }

  const headBefore = await getRemoteMainHead(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.8m-FreeRuntimeSubset',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: {
      outputFile,
      task: K28M_TASK.taskId,
    },
    preflightInvalidProbe,
    preflightValidProbe,
  };

  console.log(`[k28m-free] remote main before: ${headBefore}`);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: K28M_TASK.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: K28M_TASK.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];

  await wait(90_000);
  const headAfter = await getRemoteMainHead(repoRoot);
  const runtimeCommit = verifiedCommit ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit) : undefined;
  const postDeployInvalidProbe = await fetchProbe(routeUrl, K28M_TASK.invalidBody, dispatcher);
  const postDeployValidProbe = await fetchProbe(routeUrl, K28M_TASK.validBody, dispatcher);

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const invalidWhitespaceRejected = postDeployInvalidProbe.status === 400 && postDeployInvalidProbe.snippet.includes('"error":"profileA.birthDate and profileB.birthDate are required"');
  const validProbeStillOk = postDeployValidProbe.status === 200 && postDeployValidProbe.snippet.includes('"engine":"unified_match"');

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== K28M_TASK.expectedTaskClass) assessmentReasons.push(`expected taskClass ${K28M_TASK.expectedTaskClass}, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(K28M_TASK.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${K28M_TASK.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (headAfter !== verifiedCommit) assessmentReasons.push(`remote head after 90s is ${headAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  if (runtimeCommit !== verifiedCommit) assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  if (!invalidWhitespaceRejected) assessmentReasons.push(`expected whitespace-only birthDate probe to return 400, got ${postDeployInvalidProbe.status}`);
  if (!validProbeStillOk) assessmentReasons.push(`expected valid probe to remain 200, got ${postDeployValidProbe.status}`);

  report.headAfter = headAfter;
  report.postDeployInvalidProbe = postDeployInvalidProbe;
  report.postDeployValidProbe = postDeployValidProbe;
  report.task = {
    taskId: K28M_TASK.taskId,
    title: K28M_TASK.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => K28M_TASK.expectedChangedFiles.includes(filePath)),
    followUpHead: headAfter,
    runtimeCommit,
    runtimeMatchedVerifiedCommit: runtimeCommit === verifiedCommit,
    invalidWhitespaceRejected,
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
    preflightInvalidProbe,
    postDeployInvalidProbe,
    task: {
      taskId: report.task.taskId,
      status: report.task.status,
      taskClass: report.task.taskClass,
      assessment: report.task.assessment,
      verifiedCommit: report.task.verifiedCommit,
      runtimeCommit: report.task.runtimeCommit,
      invalidWhitespaceRejected: report.task.invalidWhitespaceRejected,
      validProbeStillOk: report.task.validProbeStillOk,
    },
  }, null, 2));

  if (report.task.assessment !== 'pass') {
    process.exitCode = 1;
  }
}

await main();
