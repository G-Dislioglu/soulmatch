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

type TrialTask = {
  taskId: 'K29A-T01' | 'K29A-T02' | 'K29A-T03';
  title: string;
  instruction: string;
  scope: string[];
  expectedChangedFiles: string[];
  expected: 'free_land' | 'fail_closed';
};

type TrialTaskReport = {
  taskId: TrialTask['taskId'];
  title: string;
  expected: TrialTask['expected'];
  status: string;
  taskClass: string;
  executionPolicy: string;
  pushAllowed: boolean;
  landed: boolean | null;
  verifiedCommit?: string;
  changedFiles: string[];
  followUpHead?: string;
  scopeClean: boolean;
  durationMs: number;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type TrialBatchReport = {
  batch: 'K2.9a-ObserverPilot';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
  };
  tasks: TrialTaskReport[];
};

const TRIAL_TASKS: TrialTask[] = [
  {
    taskId: 'K29A-T01',
    title: 'observer positive control exact docs append',
    instruction:
      'In `docs/archive/push-test.md`, append exactly one new line at the end: `K2.9a observer positive control append`. Do not modify any other file.',
    scope: ['docs/archive/push-test.md'],
    expectedChangedFiles: ['docs/archive/push-test.md'],
    expected: 'free_land',
  },
  {
    taskId: 'K29A-T02',
    title: 'observer positive control helper create-target',
    instruction:
      'Create exactly one new file `docs/archive/k29a-observer-helper.txt` with exactly these three lines:\nK2.9a observer helper\nsingle-file create-target\npositive control\nDo not modify any other file.',
    scope: ['docs/archive/k29a-observer-helper.txt'],
    expectedChangedFiles: ['docs/archive/k29a-observer-helper.txt'],
    expected: 'free_land',
  },
  {
    taskId: 'K29A-T03',
    title: 'observer negative control intentional multi-file ask',
    instruction:
      'In `docs/archive/push-test.md`, append exactly one new line at the end: `K2.9a observer negative control append`, and create exactly one new file `docs/archive/k29a-observer-negative.txt` with exactly one line `should not land`. Do not modify any other file.',
    scope: ['docs/archive/push-test.md', 'docs/archive/k29a-observer-negative.txt'],
    expectedChangedFiles: [],
    expected: 'fail_closed',
  },
];

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k29a-observer-trial-results.json');
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
  const { stdout } = await execFileAsync('git', ['ls-remote', 'origin', 'refs/heads/main'], {
    cwd: repoRoot,
  });
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
  const { stdout } = await execFileAsync('git', ['show', '--pretty=', '--name-only', commitSha], {
    cwd: repoRoot,
  });
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith('--')) continue;
    const key = entry.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, 'true');
      continue;
    }
    args.set(key, next);
    index += 1;
  }

  return {
    output: args.get('output'),
  };
}

async function runTask(
  repoRoot: string,
  baseUrl: string,
  token: string,
  dispatcher: Dispatcher | undefined,
  task: TrialTask,
): Promise<TrialTaskReport> {
  const startedAt = Date.now();
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
  const changedFiles = verifiedCommit
    ? await getCommitChangedFiles(repoRoot, verifiedCommit)
    : [];

  await wait(20_000);
  const followUpHead = await getRemoteMainHead(repoRoot);

  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const expectedChangedFiles = [...task.expectedChangedFiles].sort();
  const assessmentReasons: string[] = [];

  if (task.expected === 'free_land') {
    if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
    if (taskClass !== 'class_1') assessmentReasons.push(`expected taskClass class_1, got ${taskClass}`);
    if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
    if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
    if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
    if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
    if (JSON.stringify(changedFiles) !== JSON.stringify(expectedChangedFiles)) {
      assessmentReasons.push(`expected changedFiles ${expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
    }
    if (followUpHead !== verifiedCommit) {
      assessmentReasons.push(`remote head after wait is ${followUpHead}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
    }
  } else {
    if (landed === true) assessmentReasons.push('negative control landed unexpectedly');
    if (verifiedCommit) assessmentReasons.push(`negative control produced verifiedCommit ${verifiedCommit}`);
    if (changedFiles.length > 0) {
      assessmentReasons.push(`negative control changed files unexpectedly: ${changedFiles.join(', ')}`);
    }
    if (pushAllowed && executionPolicy === 'allow_push') {
      assessmentReasons.push('negative control remained push-allowed');
    }
  }

  return {
    taskId: task.taskId,
    title: task.title,
    expected: task.expected,
    status,
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    followUpHead,
    scopeClean: JSON.stringify(changedFiles) === JSON.stringify(expectedChangedFiles),
    durationMs: Date.now() - startedAt,
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.9a observer runner');

  const baseUrl = (process.env.K29A_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K29A_RESOLVE_IP
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
  const outputFile = args.output ?? getDefaultOutputPath(repoRoot);

  const report: TrialBatchReport = {
    batch: 'K2.9a-ObserverPilot',
    runDate: new Date().toISOString(),
    baseUrl,
    resolveIp,
    headBefore: await getRemoteMainHead(repoRoot),
    environment: {
      outputFile,
    },
    tasks: [],
  };

  for (const task of TRIAL_TASKS) {
    const taskReport = await runTask(repoRoot, baseUrl, token, dispatcher, task);
    report.tasks.push(taskReport);
  }

  report.headAfter = await getRemoteMainHead(repoRoot);

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[builder-k29a-observer-trial-runner] failed');
  console.error(error);
  process.exitCode = 1;
});
