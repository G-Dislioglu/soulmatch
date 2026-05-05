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

type TaskConfig = {
  taskId: 'K28A-T01' | 'K28A-T02' | 'K28A-T03';
  title: string;
  instruction: string;
  scope: string[];
  expectedChangedFiles: string[];
  expectedNeedle: string;
  forbiddenNeedle?: string;
};

type TaskResult = {
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
  remoteHeadAfter?: string;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type BatchReport = {
  batch: 'K2.8a-FreeClass1OpsSubset';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  tasks: TaskResult[];
  passCount: number;
  deviationCount: number;
  environment: {
    outputFile: string;
  };
};

const TASKS: TaskConfig[] = [
  {
    taskId: 'K28A-T01',
    title: 'free docs append inside released class_1 corridor',
    instruction:
      'Append exactly one new line `K2.8a free class_1 operations append smoke` to `docs/archive/push-test.md`. Do not modify any other line or file.',
    scope: ['docs/archive/push-test.md'],
    expectedChangedFiles: ['docs/archive/push-test.md'],
    expectedNeedle: 'K2.8a free class_1 operations append smoke',
  },
  {
    taskId: 'K28A-T02',
    title: 'free non-governance anchored helper replacement inside released class_1 corridor',
    instruction:
      'In `docs/archive/k27a-free-class1-smoke.txt`, replace only the line `single-file anchored replacement` with `single-file anchored replacement retained under ops corridor`. Do not modify any other line or file.',
    scope: ['docs/archive/k27a-free-class1-smoke.txt'],
    expectedChangedFiles: ['docs/archive/k27a-free-class1-smoke.txt'],
    expectedNeedle: 'single-file anchored replacement retained under ops corridor',
    forbiddenNeedle: 'single-file anchored replacement\n',
  },
  {
    taskId: 'K28A-T03',
    title: 'free helper create-target inside released class_1 corridor',
    instruction:
      'Create exactly one new file `docs/archive/k28a-free-class1-ops-smoke.txt` with exactly these three lines:\nK2.8a free class_1 ops helper smoke\nexplicit create-target\nsingle-file only\nDo not modify any other file.',
    scope: ['docs/archive/k28a-free-class1-ops-smoke.txt'],
    expectedChangedFiles: ['docs/archive/k28a-free-class1-ops-smoke.txt'],
    expectedNeedle: 'K2.8a free class_1 ops helper smoke',
  },
];

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k28a-free-ops-results.json');
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
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).sort();
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
      // Fail closed by timeout.
    }
    await wait(intervalMs);
  }
  return lastSeen;
}

async function runTask(
  repoRoot: string,
  baseUrl: string,
  dispatcher: Dispatcher | undefined,
  token: string,
  task: TaskConfig,
): Promise<TaskResult> {
  const currentContent = await readRepoFile(repoRoot, task.expectedChangedFiles[0]);
  if (currentContent.includes(task.expectedNeedle)) {
    throw new Error(`${task.taskId} already landed on current repo truth (${task.expectedChangedFiles[0]} already contains expected needle).`);
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
  const remoteHeadAfter = await getRemoteMainHead(repoRoot);

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== 'class_1') assessmentReasons.push(`expected taskClass class_1, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(task.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${task.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (remoteHeadAfter !== verifiedCommit) {
    assessmentReasons.push(`remote head after 90s is ${remoteHeadAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  }
  if (verifiedCommit) {
    const landedContent = await getFileAtCommit(repoRoot, verifiedCommit, task.expectedChangedFiles[0]);
    if (!landedContent.includes(task.expectedNeedle)) {
      assessmentReasons.push(`expected landed content needle missing in ${task.expectedChangedFiles[0]}`);
    }
    if (task.forbiddenNeedle && landedContent.includes(task.forbiddenNeedle)) {
      assessmentReasons.push(`forbidden needle still present in ${task.expectedChangedFiles[0]}`);
    }
  }

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
    scopeClean: changedFiles.every((filePath) => task.expectedChangedFiles.includes(filePath)),
    remoteHeadAfter,
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8a runner');

  const baseUrl = (process.env.K28A_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28A_RESOLVE_IP ?? process.env.K27F_RESOLVE_IP ?? process.env.K27E_RESOLVE_IP ?? process.env.K27D_RESOLVE_IP ?? process.env.K27C_RESOLVE_IP ?? process.env.DEPLOY_RESOLVE_IP;
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = getDefaultOutputPath(repoRoot);
  const headBefore = await getRemoteMainHead(repoRoot);

  const report: BatchReport = {
    batch: 'K2.8a-FreeClass1OpsSubset',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    tasks: [],
    passCount: 0,
    deviationCount: 0,
    environment: { outputFile },
  };

  console.log(`[k28a-free] remote main before: ${headBefore}`);

  for (const task of TASKS) {
    const taskResult = await runTask(repoRoot, baseUrl, dispatcher, token, task);
    report.tasks.push(taskResult);
  }

  report.headAfter = await getRemoteMainHead(repoRoot);
  report.passCount = report.tasks.filter((task) => task.assessment === 'pass').length;
  report.deviationCount = report.tasks.filter((task) => task.assessment === 'deviation').length;

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  const lastVerifiedCommit = report.tasks.map((task) => task.verifiedCommit).filter((value): value is string => Boolean(value)).at(-1);
  const runtimeCommit = lastVerifiedCommit
    ? await waitForRuntimeCommit(baseUrl, dispatcher, lastVerifiedCommit)
    : undefined;

  console.log(JSON.stringify({
    batch: report.batch,
    outputFile,
    headBefore: report.headBefore,
    headAfter: report.headAfter,
    runtimeCommit,
    passCount: report.passCount,
    deviationCount: report.deviationCount,
    tasks: report.tasks.map((task) => ({
      taskId: task.taskId,
      assessment: task.assessment,
      verifiedCommit: task.verifiedCommit,
      changedFiles: task.changedFiles,
    })),
  }, null, 2));

  if (report.deviationCount > 0) {
    process.exitCode = 1;
  }
}

await main();
