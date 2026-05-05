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

type PushTaskReport = {
  taskId: 'K28G-T03';
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
  landedContentExact: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type PushBatchReport = {
  batch: 'K2.8g-LiveT03Landing';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K28G-T03';
  };
  task?: PushTaskReport;
};

const K28G_TASK = {
  taskId: 'K28G-T03' as const,
  title: 'live non-dry landing probe for multi-line helper create-target',
  instruction:
    'Create exactly one new file `docs/archive/k28a-free-class1-ops-smoke.txt` with exactly these three lines:\nK2.8a free class_1 ops helper smoke\nexplicit create-target\nsingle-file only\nDo not modify any other file.',
  scope: ['docs/archive/k28a-free-class1-ops-smoke.txt'],
  expectedTaskClass: 'class_1' as const,
  expectedChangedFiles: ['docs/archive/k28a-free-class1-ops-smoke.txt'],
  expectedContent:
    'K2.8a free class_1 ops helper smoke\n'
    + 'explicit create-target\n'
    + 'single-file only',
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k28g-live-t03-landing-results.json');
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

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8g runner');

  const baseUrl = (process.env.K28G_BASE_URL ?? process.env.K28F_BASE_URL ?? process.env.K28E_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28G_RESOLVE_IP
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

  const currentContent = await readRepoFile(repoRoot, K28G_TASK.expectedChangedFiles[0]);
  if (currentContent.trim().length > 0) {
    throw new Error(`${K28G_TASK.taskId} cannot run because ${K28G_TASK.expectedChangedFiles[0]} already exists in current repo truth.`);
  }

  const headBefore = await getRemoteMainHead(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.8g-LiveT03Landing',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: {
      outputFile,
      task: K28G_TASK.taskId,
    },
  };

  console.log(`[k28g-live] remote main before: ${headBefore}`);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: K28G_TASK.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: K28G_TASK.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];

  await wait(90_000);
  const headAfter = await getRemoteMainHead(repoRoot);
  const runtimeCommit = verifiedCommit ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit) : undefined;

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const landedContent = verifiedCommit ? await getFileAtCommit(repoRoot, verifiedCommit, K28G_TASK.expectedChangedFiles[0]) : '';
  const landedContentExact = landedContent === K28G_TASK.expectedContent;

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== K28G_TASK.expectedTaskClass) assessmentReasons.push(`expected taskClass ${K28G_TASK.expectedTaskClass}, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(K28G_TASK.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${K28G_TASK.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (headAfter !== verifiedCommit) assessmentReasons.push(`remote head after 90s is ${headAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  if (runtimeCommit !== verifiedCommit) assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  if (!landedContentExact) assessmentReasons.push('landed content did not match the exact expected three-line file');

  report.headAfter = headAfter;
  report.task = {
    taskId: K28G_TASK.taskId,
    title: K28G_TASK.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => K28G_TASK.expectedChangedFiles.includes(filePath)),
    followUpHead: headAfter,
    runtimeCommit,
    runtimeMatchedVerifiedCommit: runtimeCommit === verifiedCommit,
    landedContentExact,
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({
    batch: report.batch,
    outputFile,
    headBefore: report.headBefore,
    headAfter: report.headAfter,
    task: {
      taskId: report.task.taskId,
      assessment: report.task.assessment,
      verifiedCommit: report.task.verifiedCommit,
      changedFiles: report.task.changedFiles,
      runtimeCommit: report.task.runtimeCommit,
      landedContentExact: report.task.landedContentExact,
      assessmentReasons: report.task.assessmentReasons,
    },
  }, null, 2));

  if (report.task.assessment === 'deviation') {
    process.exitCode = 1;
  }
}

await main();
