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

type RunReport = {
  batch: 'K2.7c-FreeAnchoredReplacement';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  outputFile: string;
  result: {
    status: string;
    taskClass: string;
    executionPolicy: string;
    pushAllowed: boolean;
    landed: boolean | null;
    verifiedCommit?: string;
    changedFiles: string[];
    followUpHead?: string;
    assessment: 'pass' | 'deviation';
    assessmentReasons: string[];
  };
};

const TARGET_FILE = 'docs/archive/k27a-free-class1-smoke.txt';
const SEARCH = 'single-file create-target';
const REPLACE = 'single-file anchored replacement';

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
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

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k27c-free-anchored-results.json');
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) {
    throw new Error('OPUS_BRIDGE_SECRET missing for K2.7c runner');
  }

  const baseUrl = (process.env.K27C_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K27C_RESOLVE_IP ?? process.env.K27B_RESOLVE_IP ?? process.env.DEPLOY_RESOLVE_IP;
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = getDefaultOutputPath(repoRoot);
  const headBefore = await getRemoteMainHead(repoRoot);

  console.log(`[k27c-free] remote main before: ${headBefore}`);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: `In \`${TARGET_FILE}\`, replace exactly \`${SEARCH}\` with \`${REPLACE}\`. Do not modify any other file.`,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: [TARGET_FILE],
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];
  await wait(20_000);
  const followUpHead = await getRemoteMainHead(repoRoot);

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const expectedChangedFiles = [TARGET_FILE];

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== 'class_1') assessmentReasons.push(`expected taskClass class_1, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (verifiedCommit && followUpHead !== verifiedCommit) {
    assessmentReasons.push(`remote head after wait is ${followUpHead}, expected verifiedCommit ${verifiedCommit}`);
  }

  const report: RunReport = {
    batch: 'K2.7c-FreeAnchoredReplacement',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    headAfter: followUpHead,
    outputFile,
    result: {
      status,
      taskClass,
      executionPolicy,
      pushAllowed,
      landed,
      ...(verifiedCommit ? { verifiedCommit } : {}),
      changedFiles,
      followUpHead,
      assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
      assessmentReasons,
    },
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify(report, null, 2));

  if (report.result.assessment !== 'pass') {
    process.exitCode = 1;
  }
}

await main();
