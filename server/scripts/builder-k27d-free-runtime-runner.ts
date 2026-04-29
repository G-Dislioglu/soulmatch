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
  taskId: 'K27D-T01';
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
  batch: 'K2.7d-FreeRuntimeSubset';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K27D-T01';
  };
  preflightInvalidProbe?: HttpProbe;
  preflightValidProbe?: HttpProbe;
  postDeployInvalidProbe?: HttpProbe;
  postDeployValidProbe?: HttpProbe;
  task?: PushTaskReport;
};

const K27D_TASK = {
  taskId: 'K27D-T01' as const,
  title: 'free class_1 astrology profileId whitespace validation push',
  instruction:
    'In `server/src/routes/astro.ts`, tighten only the existing `/calc` route so a missing or whitespace-only `profileId` is rejected before calculation. Add a local trimmed `profileId` variable inside the route handler, return `400` with `errorResponse(\'invalid_profile_id\', \'profileId is required\')` when that trimmed value is empty, and otherwise pass the trimmed `profileId` into the normalized request before calling `calculateAstrology(...)`. Do not change any other route, helper, or file.',
  scope: ['server/src/routes/astro.ts'],
  expectedTaskClass: 'class_1' as const,
  expectedChangedFiles: ['server/src/routes/astro.ts'],
  invalidBody: '{"profileId":"   ","birthDate":"1990-01-01","system":"tropical","houseSystem":"placidus","include":{"planets":true,"houses":false,"aspects":false,"angles":false,"points":false}}',
  validBody: '{"profileId":"abc","birthDate":"1990-01-01","system":"tropical","houseSystem":"placidus","include":{"planets":true,"houses":false,"aspects":false,"angles":false,"points":false}}',
  expectedStrings: {
    routeStart: "astrologyRouter.post('/calc', async (req: Request, res: Response) => {",
    oldNormalize: '  const request = normalizeRequest(rawBody);',
    oldBirthDate: "  if (!request.birthDate || typeof request.birthDate !== 'string') {",
    newTrimmed: "  const profileId = typeof rawBody.profileId === 'string' ? rawBody.profileId.trim() : '';",
    newInvalid: "  if (!profileId) {",
    newNormalize: '    ...rawBody,',
  },
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string): string {
  return path.resolve(repoRoot, '..', 'k27d-free-runtime-results.json');
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

async function fetchProbe(url: string, body: string, dispatcher: Dispatcher | undefined): Promise<HttpProbe> {
  const response = await outboundFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    ...(dispatcher ? { dispatcher } : {}),
  });
  const text = await response.text();
  return {
    status: response.status,
    snippet: text.slice(0, 400),
  };
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
      if (lastSeen === expectedCommit) {
        return lastSeen;
      }
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
  if (!token) {
    throw new Error('OPUS_BRIDGE_SECRET missing for K2.7d runner');
  }

  const baseUrl = (process.env.K27D_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K27D_RESOLVE_IP ?? process.env.K27C_RESOLVE_IP ?? process.env.DEPLOY_RESOLVE_IP;
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = getDefaultOutputPath(repoRoot);

  const currentContent = normalizeText(await readRepoFile(repoRoot, K27D_TASK.expectedChangedFiles[0]));
  if (currentContent.includes(K27D_TASK.expectedStrings.newTrimmed) || currentContent.includes(K27D_TASK.expectedStrings.newInvalid)) {
    throw new Error(`K27D-T01 already landed on the current repo truth (${K27D_TASK.expectedChangedFiles[0]} already contains the trimmed astrology profileId validation).`);
  }
  if (!currentContent.includes(K27D_TASK.expectedStrings.routeStart) || !currentContent.includes(K27D_TASK.expectedStrings.oldNormalize) || !currentContent.includes(K27D_TASK.expectedStrings.oldBirthDate)) {
    throw new Error(`K27D-T01 cannot run because the expected astro route anchors are missing from ${K27D_TASK.expectedChangedFiles[0]}.`);
  }

  const calcUrl = `${baseUrl}/api/astro/calc`;
  const preflightInvalidProbe = await fetchProbe(calcUrl, K27D_TASK.invalidBody, dispatcher);
  const preflightValidProbe = await fetchProbe(calcUrl, K27D_TASK.validBody, dispatcher);
  if (preflightInvalidProbe.status !== 200) {
    throw new Error(`K27D-T01 expected whitespace-only profileId preflight probe to remain open on current runtime, got ${preflightInvalidProbe.status}.`);
  }
  if (preflightValidProbe.status !== 200) {
    throw new Error(`K27D-T01 expected valid preflight probe to succeed, got ${preflightValidProbe.status}.`);
  }

  const headBefore = await getRemoteMainHead(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.7d-FreeRuntimeSubset',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: {
      outputFile,
      task: K27D_TASK.taskId,
    },
    preflightInvalidProbe,
    preflightValidProbe,
  };

  console.log(`[k27d-free] remote main before: ${headBefore}`);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: K27D_TASK.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: K27D_TASK.scope,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];

  await wait(90_000);
  const headAfter = await getRemoteMainHead(repoRoot);
  const runtimeCommit = verifiedCommit
    ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit)
    : undefined;
  const postDeployInvalidProbe = await fetchProbe(calcUrl, K27D_TASK.invalidBody, dispatcher);
  const postDeployValidProbe = await fetchProbe(calcUrl, K27D_TASK.validBody, dispatcher);

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const invalidWhitespaceRejected = postDeployInvalidProbe.status === 400 && postDeployInvalidProbe.snippet.includes('"code":"invalid_profile_id"');
  const validProbeStillOk = postDeployValidProbe.status === 200 && postDeployValidProbe.snippet.includes('"profileId":"abc"');

  if (status !== 'success') {
    assessmentReasons.push(`expected status success, got ${status}`);
  }
  if (taskClass !== K27D_TASK.expectedTaskClass) {
    assessmentReasons.push(`expected taskClass ${K27D_TASK.expectedTaskClass}, got ${taskClass}`);
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
  if (JSON.stringify(changedFiles) !== JSON.stringify(K27D_TASK.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${K27D_TASK.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (headAfter !== verifiedCommit) {
    assessmentReasons.push(`remote head after 90s is ${headAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  }
  if (runtimeCommit !== verifiedCommit) {
    assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  }
  if (!invalidWhitespaceRejected) {
    assessmentReasons.push(`expected whitespace-only profileId probe to return 400 invalid_profile_id, got ${postDeployInvalidProbe.status}`);
  }
  if (!validProbeStillOk) {
    assessmentReasons.push(`expected valid probe to remain 200 with stable profileId, got ${postDeployValidProbe.status}`);
  }

  report.headAfter = headAfter;
  report.postDeployInvalidProbe = postDeployInvalidProbe;
  report.postDeployValidProbe = postDeployValidProbe;
  report.task = {
    taskId: K27D_TASK.taskId,
    title: K27D_TASK.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => K27D_TASK.expectedChangedFiles.includes(filePath)),
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
