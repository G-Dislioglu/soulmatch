import { mkdir, writeFile } from 'node:fs/promises';
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
  taskId: 'K29B-T01';
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
  invalidTypeRejected: boolean;
  promptsProbeStillOk: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type PushBatchReport = {
  batch: 'K2.9b-ObserverRuntimePilot';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K29B-T01';
  };
  preflightInvalidTypeProbe?: HttpProbe;
  preflightPromptsProbe?: HttpProbe;
  postDeployInvalidTypeProbe?: HttpProbe;
  postDeployPromptsProbe?: HttpProbe;
  task?: PushTaskReport;
};

const K29B_TASK = {
  taskId: 'K29B-T01' as const,
  title: 'observer runtime zimage invalid type guard push',
  instruction:
    'In `server/src/routes/zimage.ts`, tighten only the existing `POST /api/zimage/generate` route so any `type` value other than `room` or `persona` is rejected before prompt selection or the external fal.ai call. Add exactly one local guard in that route handler that returns `400` with `{ error: `Unknown type: ${type}` }` when `type` is not `room` or `persona`. Do not change `/api/zimage/batch`, `/api/zimage/prompts`, any prompt tables, external request payloads, or any other file.',
  scope: ['server/src/routes/zimage.ts'],
  expectedTaskClass: 'class_1' as const,
  expectedChangedFiles: ['server/src/routes/zimage.ts'],
  invalidTypeBody: {
    type: 'bogus',
    id: 'maya',
  },
  promptsPath: '/api/zimage/prompts',
  expectedStrings: {
    routeStart: "zimageRouter.post('/zimage/generate', async (req, res) => {",
    destructure: "  const { type, id } = req.body as { type: 'room' | 'persona'; id: string };",
    promptsLine: "  const prompts = type === 'room' ? ROOM_PROMPTS : PERSONA_PROMPTS;",
    newGuard: "  if (type !== 'room' && type !== 'persona') {",
  },
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k29b-observer-runtime-results.json');
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

async function fetchProbe(url: string, dispatcher: Dispatcher | undefined, init?: RequestInit): Promise<HttpProbe> {
  const response = await outboundFetch(url, {
    ...(init ?? {}),
    ...(dispatcher ? { dispatcher } : {}),
  });
  const text = await response.text();
  return {
    status: response.status,
    snippet: text.slice(0, 500),
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
      // timeout-based fail closed
    }
    await wait(intervalMs);
  }

  return lastSeen;
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.9b runner');

  const baseUrl = (process.env.K29B_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K29B_RESOLVE_IP
    ?? process.env.K29A_RESOLVE_IP
    ?? process.env.K28J_RESOLVE_IP
    ?? process.env.DEPLOY_RESOLVE_IP
    ?? '216.24.57.251';
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = getDefaultOutputPath(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.9b-ObserverRuntimePilot',
    runDate: new Date().toISOString(),
    baseUrl,
    resolveIp,
    headBefore: await getRemoteMainHead(repoRoot),
    environment: {
      outputFile,
      task: 'K29B-T01',
    },
  };

  report.preflightInvalidTypeProbe = await fetchProbe(`${baseUrl}/api/zimage/generate`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(K29B_TASK.invalidTypeBody),
  });

  report.preflightPromptsProbe = await fetchProbe(`${baseUrl}${K29B_TASK.promptsPath}`, dispatcher);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: K29B_TASK.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: K29B_TASK.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit
    ? await getCommitChangedFiles(repoRoot, verifiedCommit)
    : [];
  const runtimeCommit = verifiedCommit
    ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit)
    : undefined;

  report.postDeployInvalidTypeProbe = await fetchProbe(`${baseUrl}/api/zimage/generate`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(K29B_TASK.invalidTypeBody),
  });
  report.postDeployPromptsProbe = await fetchProbe(`${baseUrl}${K29B_TASK.promptsPath}`, dispatcher);

  await wait(20_000);
  const followUpHead = await getRemoteMainHead(repoRoot);
  report.headAfter = followUpHead;

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const expectedChangedFiles = [...K29B_TASK.expectedChangedFiles].sort();
  const invalidTypeRejected = report.postDeployInvalidTypeProbe.status === 400
    && report.postDeployInvalidTypeProbe.snippet.includes('Unknown type: bogus');
  const promptsProbeStillOk = report.postDeployPromptsProbe.status === 200
    && report.postDeployPromptsProbe.snippet.includes('rooms')
    && report.postDeployPromptsProbe.snippet.includes('personas');
  const runtimeMatchedVerifiedCommit = Boolean(runtimeCommit && verifiedCommit && runtimeCommit === verifiedCommit);

  if (status !== 'success') {
    assessmentReasons.push(`expected status success, got ${status}`);
  }
  if (taskClass !== 'class_1') {
    assessmentReasons.push(`expected taskClass class_1, got ${taskClass}`);
  }
  if (executionPolicy !== 'allow_push') {
    assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  }
  if (!pushAllowed) {
    assessmentReasons.push('pushAllowed=false');
  }
  if (landed !== true) {
    assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  }
  if (!verifiedCommit) {
    assessmentReasons.push('missing verifiedCommit');
  }
  if (JSON.stringify(changedFiles) !== JSON.stringify(expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (followUpHead !== verifiedCommit) {
    assessmentReasons.push(`remote head after wait is ${followUpHead}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  }
  if (report.preflightInvalidTypeProbe.status !== 200) {
    assessmentReasons.push(`expected preflight invalid-type status 200, got ${report.preflightInvalidTypeProbe.status}`);
  }
  if (!invalidTypeRejected) {
    assessmentReasons.push(`post invalid-type probe did not fail closed: ${report.postDeployInvalidTypeProbe.status}`);
  }
  if (!promptsProbeStillOk) {
    assessmentReasons.push(`prompts probe not healthy after deploy: ${report.postDeployPromptsProbe.status}`);
  }
  if (!runtimeMatchedVerifiedCommit) {
    assessmentReasons.push(`runtime commit ${runtimeCommit ?? 'missing'} did not match verifiedCommit ${verifiedCommit ?? 'missing'}`);
  }

  report.task = {
    taskId: 'K29B-T01',
    title: K29B_TASK.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: JSON.stringify(changedFiles) === JSON.stringify(expectedChangedFiles),
    followUpHead,
    runtimeCommit,
    runtimeMatchedVerifiedCommit,
    invalidTypeRejected,
    promptsProbeStillOk,
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[builder-k29b-observer-runtime-runner] failed');
  console.error(error);
  process.exitCode = 1;
});
