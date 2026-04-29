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
  taskId: 'K26D-T01';
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
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type PushBatchReport = {
  batch: 'K2.6d-CodeAdjacentControlledPush';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K26D-T01';
  };
  task?: PushTaskReport;
};

const K26D_TASK = {
  taskId: 'K26D-T01' as const,
  title: 'controlled class_1 code-adjacent comment push',
  instruction: 'In `server/src/lib/pipelineTestMarker.ts`, insert exactly one new first line: `// K2.6d controlled class_1 code-adjacent smoke marker`. Do not modify any other file.',
  scope: ['server/src/lib/pipelineTestMarker.ts'],
  expectedTaskClass: 'class_1' as const,
  expectedChangedFiles: ['server/src/lib/pipelineTestMarker.ts'],
  marker: '// K2.6d controlled class_1 code-adjacent smoke marker',
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k26d-push-results.json');
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
    .filter(Boolean);
}

async function readRepoFile(repoRoot: string, relativePath: string): Promise<string> {
  try {
    return await readFile(path.join(repoRoot, relativePath), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function normalizePaths(paths: string[]): string[] {
  return [...new Set(paths.map((entry) => entry.replace(/\\/g, '/').trim()).filter(Boolean))].sort();
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
      if (lastSeen === expectedCommit) {
        return lastSeen;
      }
    } catch {
      // Keep polling; deploy/runtime lag should fail closed via timeout instead of crashing the runner.
    }

    await wait(intervalMs);
  }

  return lastSeen;
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) {
    throw new Error('OPUS_BRIDGE_SECRET missing for K2.6d runner');
  }

  const baseUrl = (process.env.K26D_BASE_URL ?? process.env.K26C_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K26D_RESOLVE_IP ?? process.env.K26C_RESOLVE_IP ?? process.env.DEPLOY_RESOLVE_IP;
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = path.resolve(args.output ?? getDefaultOutputPath(repoRoot));

  const currentContent = await readRepoFile(repoRoot, K26D_TASK.expectedChangedFiles[0]);
  if (currentContent.includes(K26D_TASK.marker)) {
    throw new Error(`K26D-T01 already landed on the current repo truth (${K26D_TASK.expectedChangedFiles[0]} already contains the marker).`);
  }

  const headBefore = await getRemoteMainHead(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.6d-CodeAdjacentControlledPush',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: {
      outputFile,
      task: K26D_TASK.taskId,
    },
  };

  console.log(`[k26d-push] remote main before: ${headBefore}`);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: K26D_TASK.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: K26D_TASK.scope,
      acceptanceSmoke: true,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit
    ? normalizePaths(await getCommitChangedFiles(repoRoot, verifiedCommit))
    : [];

  await wait(90_000);
  const headAfter = await getRemoteMainHead(repoRoot);
  const runtimeCommit = verifiedCommit
    ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit)
    : undefined;

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;

  if (status !== 'success') {
    assessmentReasons.push(`expected status success, got ${status}`);
  }
  if (taskClass !== K26D_TASK.expectedTaskClass) {
    assessmentReasons.push(`expected taskClass ${K26D_TASK.expectedTaskClass}, got ${taskClass}`);
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
  if (JSON.stringify(changedFiles) !== JSON.stringify(K26D_TASK.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${K26D_TASK.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (headAfter !== verifiedCommit) {
    assessmentReasons.push(`remote head after 90s is ${headAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  }
  if (runtimeCommit !== verifiedCommit) {
    assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  }

  report.headAfter = headAfter;
  report.task = {
    taskId: K26D_TASK.taskId,
    title: K26D_TASK.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => K26D_TASK.expectedChangedFiles.includes(filePath)),
    followUpHead: headAfter,
    runtimeCommit,
    runtimeMatchedVerifiedCommit: runtimeCommit === verifiedCommit,
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
    },
  }, null, 2));
}

await main();
