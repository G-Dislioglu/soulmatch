import { mkdir, readFile, writeFile } from 'node:fs/promises';
import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { Agent, type Dispatcher } from 'undici';

import { outboundFetch } from '../src/lib/outboundHttp.js';
import { issueApprovalTicket } from './lib/builderApprovalTicket.js';

const execFileAsync = promisify(execFile);

type HttpProbe = {
  status: number;
  snippet: string;
};

type ApprovalValidation = {
  valid: boolean;
  reason: string;
  approvalId: string;
  instructionFingerprint: string;
  scopeFingerprint: string;
};

type PushTaskSpec = {
  taskId: 'K28O-T01' | 'K28O-T02';
  title: string;
  instruction: string;
  scope: string[];
  expectedTaskClass: 'class_2';
  expectedChangedFiles: string[];
  invalidBody: Record<string, unknown>;
  validBody: Record<string, unknown>;
  probePath: string;
  preflightInvalidStatus: number;
  preflightValidStatus: number;
  postInvalidStatus: number;
  postValidStatus: number;
  postInvalidSnippet: string;
  postValidSnippet: string;
  expectedStrings: {
    baselinePresent: string[];
    landedPresent: string[];
    landedAbsent: string[];
  };
};

type PushTaskReport = {
  taskId: 'K28O-T01' | 'K28O-T02';
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
  approvalId: string;
  approvalValidation?: ApprovalValidation;
  invalidWhitespaceRejected: boolean;
  validProbeStillOk: boolean;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type PushBatchReport = {
  batch: 'K2.8o-Class2ApprovedRuntime';
  runDate: string;
  baseUrl: string;
  resolveIp?: string;
  headBefore: string;
  headAfter?: string;
  environment: {
    outputFile: string;
    task: 'K28O-T01' | 'K28O-T02';
  };
  preflightInvalidProbe?: HttpProbe;
  preflightValidProbe?: HttpProbe;
  postDeployInvalidProbe?: HttpProbe;
  postDeployValidProbe?: HttpProbe;
  task?: PushTaskReport;
};

const PUSH_TASKS: Record<string, PushTaskSpec> = {
  'K28O-T01': {
    taskId: 'K28O-T01',
    title: 'approved class_2 match single birthDate whitespace validation push',
    instruction:
      'In `server/src/routes/match.ts`, tighten only the existing `POST /api/match/single` route so whitespace-only `profileA.birthDate` and whitespace-only `profileB.birthDate` are rejected before numerology or astrology work starts. Add local trimmed `profileABirthDate` and `profileBBirthDate` variables inside that route handler, keep the existing `400` payload `{ error: \'profileA.birthDate and profileB.birthDate are required\' }` when either trimmed value is empty, and use the trimmed values for `deriveNumerologyFromBirthDate(...)` plus the `birthDate` fields passed into `calculateAstrologyForMatch(...)`. Do not change any other route, helper, scoring logic, warning logic, or file.',
    scope: ['server/src/routes/match.ts'],
    expectedTaskClass: 'class_2',
    expectedChangedFiles: ['server/src/routes/match.ts'],
    invalidBody: {
      profileA: { birthDate: '   ' },
      profileB: { birthDate: '2000-01-01' },
    },
    validBody: {
      profileA: { birthDate: '1999-01-01' },
      profileB: { birthDate: '2000-01-01' },
    },
    probePath: '/api/match/single',
    preflightInvalidStatus: 500,
    preflightValidStatus: 200,
    postInvalidStatus: 400,
    postValidStatus: 200,
    postInvalidSnippet: '"error":"profileA.birthDate and profileB.birthDate are required"',
    postValidSnippet: '"engine":"unified_match"',
    expectedStrings: {
      baselinePresent: [
        "matchRouter.post('/single', async (req: Request, res: Response) => {",
        '    const numerologyA = deriveNumerologyFromBirthDate(request.profileA.birthDate);',
        '    const numerologyB = deriveNumerologyFromBirthDate(request.profileB.birthDate);',
      ],
      landedPresent: [
        "    const profileABirthDate = typeof request?.profileA?.birthDate === 'string' ? request.profileA.birthDate.trim() : '';",
        "    const profileBBirthDate = typeof request?.profileB?.birthDate === 'string' ? request.profileB.birthDate.trim() : '';",
        "    const numerologyA = deriveNumerologyFromBirthDate(profileABirthDate);",
        "    const numerologyB = deriveNumerologyFromBirthDate(profileBBirthDate);",
        '            birthDate: profileABirthDate,',
        '            birthDate: profileBBirthDate,',
      ],
      landedAbsent: [
        '    const numerologyA = deriveNumerologyFromBirthDate(request.profileA.birthDate);',
        '    const numerologyB = deriveNumerologyFromBirthDate(request.profileB.birthDate);',
      ],
    },
  },
  'K28O-T02': {
    taskId: 'K28O-T02',
    title: 'approved class_2 journey eventType whitespace validation push',
    instruction:
      'In `server/src/routes/journey.ts`, tighten only the existing `POST /api/journey/optimal-dates` route so whitespace-only `eventType` is rejected before calculation starts. Add exactly one local line `const eventType = (body.eventType ?? \'\').trim();` inside that route handler, keep the existing `400` payload `{ error: \'invalid_request\', message: \'eventType, startDate, endDate, birthDate required\' }` when the trimmed value is empty, and replace the existing calculate call with exactly `const result = calculate({...body, eventType: eventType as JourneyEventType, startDate, endDate, birthDate});`. Do not change any helper, scoring logic, date trimming, response shape, or any other file.',
    scope: ['server/src/routes/journey.ts'],
    expectedTaskClass: 'class_2',
    expectedChangedFiles: ['server/src/routes/journey.ts'],
    invalidBody: {
      eventType: '   ',
      startDate: '2026-05-01',
      endDate: '2026-05-03',
      birthDate: '2000-01-01',
    },
    validBody: {
      eventType: 'travel',
      startDate: '2026-05-01',
      endDate: '2026-05-03',
      birthDate: '2000-01-01',
    },
    probePath: '/api/journey/optimal-dates',
    preflightInvalidStatus: 500,
    preflightValidStatus: 200,
    postInvalidStatus: 400,
    postValidStatus: 200,
    postInvalidSnippet: '"error":"invalid_request"',
    postValidSnippet: '"eventType":"travel"',
    expectedStrings: {
      baselinePresent: [
        "journeyRouter.post('/optimal-dates', (req: Request, res: Response) => {",
        "    if(!body.eventType||!startDate||!endDate||!birthDate) {",
        '    const result = calculate({...body, startDate, endDate, birthDate});',
      ],
      landedPresent: [
        "    const eventType = (body.eventType ?? '').trim();",
        "    if(!eventType||!startDate||!endDate||!birthDate) {",
        "    const result = calculate({...body, eventType: eventType as JourneyEventType, startDate, endDate, birthDate});",
      ],
      landedAbsent: [
        "    if(!body.eventType||!startDate||!endDate||!birthDate) {",
        '    const result = calculate({...body, startDate, endDate, birthDate});',
      ],
    },
  },
};

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..');
}

function getDefaultOutputPath(repoRoot: string, taskId: string): string {
  const suffix = taskId === 'K28O-T01' ? 'k28o-class2-approved-results.json' : 'k28p-class2-approved-results.json';
  return path.resolve(repoRoot, '..', suffix);
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

async function fetchProbe(url: string, body: Record<string, unknown>, dispatcher: Dispatcher | undefined): Promise<HttpProbe> {
  const response = await outboundFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(dispatcher ? { dispatcher } : {}),
  });
  const text = await response.text();
  return {
    status: response.status,
    snippet: text.slice(0, 400),
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

async function readRepoFile(repoRoot: string, relativePath: string): Promise<string> {
  try {
    return await readFile(path.join(repoRoot, relativePath), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
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
      if (lastSeen === expectedCommit) return lastSeen;
    } catch {
      // Fail closed by timeout rather than runner crash.
    }
    await wait(intervalMs);
  }

  return lastSeen;
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
    task: args.get('task') ?? 'K28O-T01',
  };
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const args = parseArgs(process.argv.slice(2));
  const selectedTask = PUSH_TASKS[args.task];
  if (!selectedTask) {
    throw new Error(`Unknown K28O task: ${args.task}`);
  }

  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET missing for K2.8o runner');

  const baseUrl = (process.env.K28O_BASE_URL ?? process.env.K28N_BASE_URL ?? process.env.K28M_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'https://soulmatch-1.onrender.com').replace(/\/$/, '');
  const resolveIp = process.env.K28O_RESOLVE_IP
    ?? process.env.K28N_RESOLVE_IP
    ?? process.env.K28M_RESOLVE_IP
    ?? process.env.K28L_RESOLVE_IP
    ?? process.env.K28K_RESOLVE_IP
    ?? process.env.K28J_RESOLVE_IP
    ?? process.env.DEPLOY_RESOLVE_IP
    ?? '216.24.57.251';
  const dispatcher = createResolveDispatcher(baseUrl, resolveIp);
  const outputFile = path.resolve(args.output ?? getDefaultOutputPath(repoRoot, selectedTask.taskId));

  const currentContent = normalizeText(await readRepoFile(repoRoot, selectedTask.expectedChangedFiles[0]));
  if (selectedTask.expectedStrings.landedPresent.every((entry) => currentContent.includes(entry))) {
    throw new Error(`${selectedTask.taskId} already appears landed on current repo truth (${selectedTask.expectedChangedFiles[0]} already contains all target markers).`);
  }
  for (const expectedPresent of selectedTask.expectedStrings.baselinePresent) {
    if (!currentContent.includes(expectedPresent)) {
      throw new Error(`${selectedTask.taskId} cannot run because expected baseline anchor is missing from ${selectedTask.expectedChangedFiles[0]}.`);
    }
  }

  const routeUrl = `${baseUrl}${selectedTask.probePath}`;
  const preflightInvalidProbe = await fetchProbe(routeUrl, selectedTask.invalidBody, dispatcher);
  const preflightValidProbe = await fetchProbe(routeUrl, selectedTask.validBody, dispatcher);

  if (preflightInvalidProbe.status !== selectedTask.preflightInvalidStatus) {
    throw new Error(`${selectedTask.taskId} expected invalid preflight status ${selectedTask.preflightInvalidStatus}, got ${preflightInvalidProbe.status}.`);
  }
  if (preflightValidProbe.status !== selectedTask.preflightValidStatus) {
    throw new Error(`${selectedTask.taskId} expected valid preflight status ${selectedTask.preflightValidStatus}, got ${preflightValidProbe.status}.`);
  }

  const approval = await issueApprovalTicket({
    title: `${selectedTask.taskId} approval ticket`,
    instruction: selectedTask.instruction,
    scope: selectedTask.scope,
    issuedBy: 'codex_builder_runner',
  });

  const approvalValidation = await fetchJson(`${baseUrl}/api/builder/opus-bridge/approval-validate?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approvalId: approval.approvalId,
      instruction: selectedTask.instruction,
      scope: selectedTask.scope,
    }),
  }) as ApprovalValidation;

  if (!approvalValidation.valid) {
    throw new Error(`${selectedTask.taskId} approval ticket failed live validation: ${approvalValidation.reason}`);
  }

  const headBefore = await getRemoteMainHead(repoRoot);

  const report: PushBatchReport = {
    batch: 'K2.8o-Class2ApprovedRuntime',
    runDate: new Date().toISOString(),
    baseUrl,
    ...(resolveIp ? { resolveIp } : {}),
    headBefore,
    environment: {
      outputFile,
      task: selectedTask.taskId,
    },
    preflightInvalidProbe,
    preflightValidProbe,
  };

  console.log(`[k28o-approved] remote main before: ${headBefore}`);

  const result = await fetchJson(`${baseUrl}/api/builder/opus-bridge/opus-task?opus_token=${encodeURIComponent(token)}`, dispatcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: selectedTask.instruction,
      dryRun: false,
      skipDeploy: false,
      skipInlinePostPushChecks: false,
      scope: selectedTask.scope,
      approvalId: approval.approvalId,
      hasApprovedPlan: true,
      sideEffects: { mode: 'none' },
    }),
  }) as Record<string, unknown>;

  const verifiedCommit = typeof result.verifiedCommit === 'string' ? result.verifiedCommit : undefined;
  const changedFiles = verifiedCommit ? await getCommitChangedFiles(repoRoot, verifiedCommit) : [];

  await wait(90_000);
  const headAfter = await getRemoteMainHead(repoRoot);
  const runtimeCommit = verifiedCommit ? await waitForRuntimeCommit(baseUrl, dispatcher, verifiedCommit) : undefined;
  const postDeployInvalidProbe = await fetchProbe(routeUrl, selectedTask.invalidBody, dispatcher);
  const postDeployValidProbe = await fetchProbe(routeUrl, selectedTask.validBody, dispatcher);

  const assessmentReasons: string[] = [];
  const status = typeof result.status === 'string' ? result.status : 'unknown';
  const taskClass = typeof result.taskClass === 'string' ? result.taskClass : 'unknown';
  const executionPolicy = typeof result.executionPolicy === 'string' ? result.executionPolicy : 'unknown';
  const landed = typeof result.landed === 'boolean' ? result.landed : null;
  const pushAllowed = result.pushAllowed === true;
  const invalidWhitespaceRejected = postDeployInvalidProbe.status === selectedTask.postInvalidStatus && postDeployInvalidProbe.snippet.includes(selectedTask.postInvalidSnippet);
  const validProbeStillOk = postDeployValidProbe.status === selectedTask.postValidStatus && postDeployValidProbe.snippet.includes(selectedTask.postValidSnippet);

  if (status !== 'success') assessmentReasons.push(`expected status success, got ${status}`);
  if (taskClass !== selectedTask.expectedTaskClass) assessmentReasons.push(`expected taskClass ${selectedTask.expectedTaskClass}, got ${taskClass}`);
  if (executionPolicy !== 'allow_push') assessmentReasons.push(`expected executionPolicy allow_push, got ${executionPolicy}`);
  if (!pushAllowed) assessmentReasons.push('pushAllowed=false');
  if (landed !== true) assessmentReasons.push(`expected landed=true, got ${String(landed)}`);
  if (!verifiedCommit) assessmentReasons.push('missing verifiedCommit');
  if (JSON.stringify(changedFiles) !== JSON.stringify(selectedTask.expectedChangedFiles)) {
    assessmentReasons.push(`expected changedFiles ${selectedTask.expectedChangedFiles.join(', ')}, got ${changedFiles.join(', ') || 'none'}`);
  }
  if (headAfter !== verifiedCommit) assessmentReasons.push(`remote head after 90s is ${headAfter}, expected verifiedCommit ${verifiedCommit ?? 'missing'}`);
  if (runtimeCommit !== verifiedCommit) assessmentReasons.push(`runtime commit is ${runtimeCommit ?? 'unknown'}, expected ${verifiedCommit ?? 'missing'}`);
  if (!invalidWhitespaceRejected) assessmentReasons.push(`expected invalid post-deploy probe to return ${selectedTask.postInvalidStatus}, got ${postDeployInvalidProbe.status}`);
  if (!validProbeStillOk) assessmentReasons.push(`expected valid probe to remain ${selectedTask.postValidStatus}, got ${postDeployValidProbe.status}`);

  report.headAfter = headAfter;
  report.postDeployInvalidProbe = postDeployInvalidProbe;
  report.postDeployValidProbe = postDeployValidProbe;
  report.task = {
    taskId: selectedTask.taskId,
    title: selectedTask.title,
    status,
    summary: typeof result.summary === 'string' ? result.summary : '',
    taskClass,
    executionPolicy,
    pushAllowed,
    landed,
    verifiedCommit,
    changedFiles,
    scopeClean: changedFiles.every((filePath) => selectedTask.expectedChangedFiles.includes(filePath)),
    followUpHead: headAfter,
    runtimeCommit,
    runtimeMatchedVerifiedCommit: runtimeCommit === verifiedCommit,
    approvalId: approval.approvalId,
    approvalValidation,
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
    approvalId: approval.approvalId,
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
