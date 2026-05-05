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

type AppendTaskConfig = {
  taskId: 'K28I-T01';
  title: string;
  instruction: string;
  scope: ['docs/archive/push-test.md'];
  targetPath: 'docs/archive/push-test.md';
  appendedLine: string;
};

type CreateTaskConfig = {
  taskId: 'K28I-T03';
  title: string;
  instruction: string;
  scope: ['docs/archive/k28i-free-class1-ops-smoke.txt'];
  targetPath: 'docs/archive/k28i-free-class1-ops-smoke.txt';
  expectedContent: string;
};

type TaskConfig = AppendTaskConfig | CreateTaskConfig;

type TaskReport = {
  taskId: TaskConfig['taskId'];
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
  runtimeCommit?: string;
  runtimeMatchedVerifiedCommit: boolean;
  landedContentExact: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type BatchReport = {
  batch: 'K2.8i-LiveRepeatability';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  tasks: TaskReport[];
  passCount: number;
  deviationCount: number;
  environment: {
    outputFile: string;
  };
};

const TASKS: TaskConfig[] = [
  {
    taskId: 'K28I-T01',
    title: 'live non-dry repeatability probe for exact docs append',
    instruction:
      'Append exactly one new line `K2.8i free class_1 operations append smoke` to `docs/archive/push-test.md`. Do not modify any other line or file.',
    scope: ['docs/archive/push-test.md'],
    targetPath: 'docs/archive/push-test.md',
    appendedLine: 'K2.8i free class_1 operations append smoke',
  },
  {
    taskId: 'K28I-T03',
    title: 'live non-dry repeatability probe for multi-line helper create-target',
    instruction:
      'Create exactly one new file `docs/archive/k28i-free-class1-ops-smoke.txt` with exactly these three lines:\nK2.8i free class_1 ops helper smoke\nrepeatability create-target\nsingle-file only\nDo not modify any other file.',
    scope: ['docs/archive/k28i-free-class1-ops-smoke.txt'],
    targetPath: 'docs/archive/k28i-free-class1-ops-smoke.txt',
    expectedContent:
      'K2.8i free class_1 ops helper smoke\n'
      + 'repeatability create-target\n'
      + 'single-file only',
  },
];

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k28i-live-repeatability-results.json');
}

function loadRunnerEnv(repoRoot: string): void {
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

async function getFileAtCommit(repoRoot: string, commitSha: string, relativePath: string): Promise<string> {
  await ensureCommitAvailable(repoRoot, commitSha);
  const { stdout } = await execFileAsync('git', ['show', `${commitSha}:${relativePath}`], { cwd: repoRoot });
  return stdout.replace(/\r\n/g, '\n');
}

async function readRepoFile(repoRoot: string, relativePath: string): Promise<string> {
  try {
    return (await readFile(path.join(repoRoot, relativePath), 'utf8')).replace(/\r\n/g, '\n');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
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

function landedAppendIsExact(beforeContent: string, afterContent: string, appendedLine: string): boolean {
  const beforeLines = beforeContent.split('\n');
  const afterLines = afterContent.split('\n');
  const afterLinesTrimmed = afterLines.at(-1) === '' ? afterLines.slice(0, -1) : afterLines;

  if (afterLinesTrimmed.length !== beforeLines.length + 1) return false;
  if (afterLinesTrimmed.slice(0, beforeLines.length).join('\n') !== beforeLines.join('\n')) return false;
  return afterLinesTrimmed.at(-1) === appendedLine;
}

async function runTask(
  repoRoot: string,
  baseUrl: string,
  dispatcher: Dispatcher | undefined,
  token: string,
  task: TaskConfig,
): Promise<TaskReport> {
  const beforeContent = await readRepoFile(repoRoot, task.targetPath);

  if (task.taskId === 'K28I-T01' && beforeContent.split('\n').includes(task.appendedLine)) {
    throw new Error(`${task.taskId} cannot run because ${task.targetPath} already contains the target append line in current repo truth.`);
  }

  if (task.taskId === 'K28I-T03' && beforeContent.trim().length > 0) {
    throw new Error(`${task.taskId} cannot run because ${task.targetPath} already exists in current repo truth.`);
  }

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: task.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: task.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];

  await wait(90_000);
  const runtimeCommit = verifiedCommit ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit) : undefined;

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const landedContent = verifiedCommit ? await getFileAtCommit(repoRoot, verifiedCommit, task.targetPath) : '';
  const landedContentExact = task.taskId === 'K28I-T01'
    ? landedAppendIsExact(beforeContent, landedContent, task.appendedLine)
    : landedContent === task.expectedContent;

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== 'class_1') assessmentReasons.push(`expected taskClass class_1, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(task.scope)) {
    assessmentReasons.push(`expected changedFiles ${task.scope.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (runtimeCommit !== verifiedCommit) assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  if (!landedContentExact) assessmentReasons.push('landed content did not match the exact expected single-file change');

  return {
    taskId: task.taskId,
    title: task.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => task.scope.includes(filePath as never)),
    runtimeCommit,
    runtimeMatchedVerifiedCommit: runtimeCommit === verifiedCommit,
    landedContentExact,
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8i runner');

  const baseUrl = (process.env.K28I_BASE_URL ?? process.env.K28H_BASE_URL ?? process.env.K28G_BASE_URL ?? process.env.K28F_BASE_URL ?? process.env.K28E_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28I_RESOLVE_IP
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
  const headBefore = await getRemoteMainHead(repoRoot);

  const report: BatchReport = {
    batch: 'K2.8i-LiveRepeatability',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    tasks: [],
    passCount: 0,
    deviationCount: 0,
    environment: { outputFile },
  };

  console.log(`[k28i-live] remote main before: ${headBefore}`);

  for (const task of TASKS) {
    const taskReport = await runTask(repoRoot, baseUrl, dispatcher, token, task);
    report.tasks.push(taskReport);
  }

  report.headAfter = await getRemoteMainHead(repoRoot);
  report.passCount = report.tasks.filter((task) => task.assessment === 'pass').length;
  report.deviationCount = report.tasks.filter((task) => task.assessment === 'deviation').length;

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({
    batch: report.batch,
    outputFile,
    headBefore: report.headBefore,
    headAfter: report.headAfter,
    passCount: report.passCount,
    deviationCount: report.deviationCount,
    tasks: report.tasks.map((task) => ({
      taskId: task.taskId,
      assessment: task.assessment,
      verifiedCommit: task.verifiedCommit,
      changedFiles: task.changedFiles,
      runtimeCommit: task.runtimeCommit,
      landedContentExact: task.landedContentExact,
      assessmentReasons: task.assessmentReasons,
    })),
  }, null, 2));

  if (report.deviationCount > 0) {
    process.exitCode = 1;
  }
}

await main();
