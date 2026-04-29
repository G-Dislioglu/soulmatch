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

type FreeTask = {
  taskId: 'K27A-T01' | 'K27A-T02' | 'K27A-T03';
  title: string;
  instruction: string;
  scope: string[];
  expectedChangedFiles: string[];
};

type FreeTaskReport = {
  taskId: FreeTask['taskId'];
  title: string;
  status: string;
  taskClass: string;
  executionPolicy: string;
  pushAllowed: boolean;
  landed: boolean | null;
  verifiedCommit?: string;
  changedFiles: string[];
  followUpHead?: string;
  scopeClean: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type FreeBatchReport = {
  batch: 'K2.7a-FreeClass1Subset';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
  };
  tasks: FreeTaskReport[];
};

const FREE_TASKS: FreeTask[] = [
  {
    taskId: 'K27A-T01',
    title: 'free class_1 single-file docs append',
    instruction:
      'In `docs/archive/push-test.md`, append exactly one new line at the end: `K2.7a free class_1 corridor append smoke`. Do not modify any other file.',
    scope: ['docs/archive/push-test.md'],
    expectedChangedFiles: ['docs/archive/push-test.md'],
  },
  {
    taskId: 'K27A-T02',
    title: 'free class_1 explicit helper create-target',
    instruction:
      'Create exactly one new file `docs/archive/k27a-free-class1-smoke.txt` with exactly these three lines:\nK2.7a free class_1 helper smoke\nsingle-file create-target\nno extra files\nDo not modify any other file.',
    scope: ['docs/archive/k27a-free-class1-smoke.txt'],
    expectedChangedFiles: ['docs/archive/k27a-free-class1-smoke.txt'],
  },
  {
    taskId: 'K27A-T03',
    title: 'free class_1 anchored corridor adoption marker',
    instruction:
      'In `docs/BUILDER-K2.6-CLASS1-RELEASE-CORRIDOR.md`, replace exactly ``- status: `decision_prep_ready``` with ``- status: `adopted_for_free_class1_subset``` and do not modify any other file.',
    scope: ['docs/BUILDER-K2.6-CLASS1-RELEASE-CORRIDOR.md'],
    expectedChangedFiles: ['docs/BUILDER-K2.6-CLASS1-RELEASE-CORRIDOR.md'],
  },
];

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k27a-free-class1-results.json');
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
  if (!resolveIp) {
    return undefined;
  }

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
  if (!sha) {
    throw new Error('Could not resolve remote main head');
  }
  return sha;
}

async function ensureCommitAvailable(repoRoot: string, commitSha: string): Promise<void> {
  try {
    await execFileAsync('git', ['cat-file', '-e', `${commitSha}^{commit}`], {
      cwd: repoRoot,
    });
    return;
  } catch {
    await execFileAsync('git', ['fetch', 'origin', 'refs/heads/main'], {
      cwd: repoRoot,
    });
    await execFileAsync('git', ['cat-file', '-e', `${commitSha}^{commit}`], {
      cwd: repoRoot,
    });
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
    startAt: args.get('start-at') ?? process.env.K27A_START_AT,
  };
}

async function runTask(
  repoRoot: string,
  baseUrl: string,
  token: string,
  dispatcher: Dispatcher | undefined,
  task: FreeTask,
): Promise<FreeTaskReport> {
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

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const expectedChangedFiles = [...task.expectedChangedFiles].sort();

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

  return {
    taskId: task.taskId,
    title: task.title,
    status,
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    followUpHead,
    scopeClean: changedFiles.every((filePath) => expectedChangedFiles.includes(filePath)),
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) {
    throw new Error('OPUS_BRIDGE_SECRET missing for K2.7a runner');
  }

  const baseUrl = (process.env.K27A_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K27A_RESOLVE_IP ?? process.env.DEPLOY_RESOLVE_IP;
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = path.resolve(args.output ?? getDefaultOutputPath(repoRoot));
  const headBefore = await getRemoteMainHead(repoRoot);
  const selectedTasks = args.startAt
    ? FREE_TASKS.slice(Math.max(0, FREE_TASKS.findIndex((task) => task.taskId === args.startAt)))
    : FREE_TASKS;

  if (args.startAt && selectedTasks.length === 0) {
    throw new Error(`Unknown start task: ${args.startAt}`);
  }

  const report: FreeBatchReport = {
    batch: 'K2.7a-FreeClass1Subset',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: { outputFile },
    tasks: [],
  };

  console.log(`[k27a-free] remote main before: ${headBefore}`);

  for (const task of selectedTasks) {
    const taskReport = await runTask(repoRoot, baseUrl, token, dispatcher, task);
    report.tasks.push(taskReport);
    if (taskReport.assessment !== 'pass') {
      report.headAfter = taskReport.followUpHead;
      break;
    }
  }

  report.headAfter = report.headAfter ?? await getRemoteMainHead(repoRoot);

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({
    batch: report.batch,
    outputFile,
    headBefore: report.headBefore,
    headAfter: report.headAfter,
    tasks: report.tasks.map((task) => ({
      taskId: task.taskId,
      status: task.status,
      taskClass: task.taskClass,
      assessment: task.assessment,
      verifiedCommit: task.verifiedCommit,
      changedFiles: task.changedFiles,
    })),
  }, null, 2));

  if (report.tasks.some((task) => task.assessment !== 'pass')) {
    process.exitCode = 1;
  }
}

await main();
