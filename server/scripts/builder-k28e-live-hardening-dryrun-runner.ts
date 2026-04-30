import { mkdir, writeFile } from 'node:fs/promises';
import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Agent, type Dispatcher } from 'undici';

import { outboundFetch } from '../src/lib/outboundHttp.js';

type TaskConfig = {
  taskId: 'K28E-T01' | 'K28E-T02';
  title: string;
  instruction: string;
  scope: string[];
};

type TaskResult = {
  taskId: TaskConfig['taskId'];
  title: string;
  status: string;
  summary: string;
  taskClass?: string;
  executionPolicy?: string;
  decision?: string;
  pushAllowed?: boolean;
  requiredExternalApproval?: boolean;
  pushBlockedReason?: string;
  judgeStatus?: string;
  judgeReason?: string;
};

type BatchReport = {
  batch: 'K2.8e-LiveHardeningDryRun';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  tasks: TaskResult[];
  environment: {
    outputFile: string;
  };
};

const TASKS: TaskConfig[] = [
  {
    taskId: 'K28E-T01',
    title: 'live dry-run probe for multi-line helper create-target',
    instruction:
      'Create exactly one new file `docs/archive/k28a-free-class1-ops-smoke.txt` with exactly these three lines:\nK2.8a free class_1 ops helper smoke\nexplicit create-target\nsingle-file only\nDo not modify any other file.',
    scope: ['docs/archive/k28a-free-class1-ops-smoke.txt'],
  },
  {
    taskId: 'K28E-T02',
    title: 'live dry-run probe for exact docs append',
    instruction:
      'Append exactly one new line `K2.8a free class_1 operations append smoke` to `docs/archive/push-test.md`. Do not modify any other line or file.',
    scope: ['docs/archive/push-test.md'],
  },
];

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k28e-live-hardening-dryrun-results.json');
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

async function runTask(
  baseUrl: string,
  dispatcher: Dispatcher | undefined,
  token: string,
  task: TaskConfig,
): Promise<TaskResult> {
  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: task.instruction,
      dryRun: true,
      skipDeploy: true,
      skipInlinePostPushChecks: true,
      scope: task.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const judgePhase = Array.isArray(result.phases)
    ? (result.phases as Array<{ phase?: unknown; status?: unknown; detail?: unknown }>).find((phase) => phase.phase === 'judge')
    : undefined;
  const judgeDetail = judgePhase?.detail as { reason?: unknown } | undefined;

  return {
    taskId: task.taskId,
    title: task.title,
    status: typeof result.status === 'string' ? result.status : 'unknown',
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass: typeof result.taskClass === 'string' ? result.taskClass : undefined,
    executionPolicy: typeof result.executionPolicy === 'string' ? result.executionPolicy : undefined,
    decision: typeof result.decision === 'string' ? result.decision : undefined,
    pushAllowed: result.pushAllowed === true,
    requiredExternalApproval: result.requiredExternalApproval === true,
    pushBlockedReason: typeof result.pushBlockedReason === 'string' ? result.pushBlockedReason : undefined,
    judgeStatus: typeof judgePhase?.status === 'string' ? judgePhase.status : undefined,
    judgeReason: typeof judgeDetail?.reason === 'string' ? judgeDetail.reason : undefined,
  };
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8e runner');

  const baseUrl = (process.env.K28E_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28E_RESOLVE_IP
    ?? process.env.K28A_RESOLVE_IP
    ?? process.env.K27F_RESOLVE_IP
    ?? process.env.K27E_RESOLVE_IP
    ?? process.env.K27D_RESOLVE_IP
    ?? process.env.K27C_RESOLVE_IP
    ?? process.env.DEPLOY_RESOLVE_IP
    ?? '216.24.57.251';
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = getDefaultOutputPath(repoRoot);

  const report: BatchReport = {
    batch: 'K2.8e-LiveHardeningDryRun',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    tasks: [],
    environment: { outputFile },
  };

  for (const task of TASKS) {
    const taskResult = await runTask(baseUrl, dispatcher, token, task);
    report.tasks.push(taskResult);
  }

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify(report, null, 2));
}

await main();
