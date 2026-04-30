import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { orchestrateTask } from '../src/lib/opusTaskOrchestrator.js';

type TaskConfig = {
  taskId: 'K28D-T01' | 'K28D-T02';
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
  judgeLane?: string;
  judgeStatus?: string;
  editModes: Array<{ path: string; mode: string }>;
  assessment: 'pass' | 'deviation';
  assessmentReasons: string[];
};

type BatchReport = {
  batch: 'K2.8d-LocalJudgeHardening';
  runDate: string;
  workerLane: 'grok';
  tasks: TaskResult[];
  passCount: number;
  deviationCount: number;
  environment: {
    outputFile: string;
  };
};

const TASKS: TaskConfig[] = [
  {
    taskId: 'K28D-T01',
    title: 'local hardening rerun for multi-line helper create-target',
    instruction:
      'Create exactly one new file `docs/archive/k28a-free-class1-ops-smoke.txt` with exactly these three lines:\nK2.8a free class_1 ops helper smoke\nexplicit create-target\nsingle-file only\nDo not modify any other file.',
    scope: ['docs/archive/k28a-free-class1-ops-smoke.txt'],
  },
  {
    taskId: 'K28D-T02',
    title: 'local hardening rerun for exact docs append',
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
  return path.resolve(repoRoot, '..', 'k28d-local-hardening-results.json');
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

async function runTask(task: TaskConfig): Promise<TaskResult> {
  const result = await orchestrateTask({
    instruction: task.instruction,
    scope: task.scope,
    workers: ['grok'],
    dryRun: true,
    skipDeploy: true,
    skipInlinePostPushChecks: true,
    sideEffects: { mode: 'none' },
  });

  const judgePhase = result.phases.find((phase) => phase.phase === 'judge');
  const judgeDetail = judgePhase?.detail as { judgeLane?: string } | undefined;
  const editModes = result.edits?.edits.map((edit) => ({ path: edit.path, mode: edit.mode })) ?? [];
  const assessmentReasons: string[] = [];

  if (result.status !== 'dry_run') {
    assessmentReasons.push(`expected status dry_run, got ${result.status}`);
  }
  if (result.taskClass !== 'class_1') {
    assessmentReasons.push(`expected taskClass class_1, got ${result.taskClass ?? 'missing'}`);
  }
  if (result.decision !== 'approve') {
    assessmentReasons.push(`expected decision approve, got ${result.decision ?? 'missing'}`);
  }
  if (judgePhase?.status !== 'ok') {
    assessmentReasons.push(`expected judge status ok, got ${judgePhase?.status ?? 'missing'}`);
  }
  if (editModes.length !== 1) {
    assessmentReasons.push(`expected exactly one edit, got ${editModes.length}`);
  }
  if (!editModes.every((edit) => task.scope.includes(edit.path))) {
    assessmentReasons.push(`expected all edit paths inside scope, got ${editModes.map((edit) => edit.path).join(', ') || 'none'}`);
  }

  return {
    taskId: task.taskId,
    title: task.title,
    status: result.status,
    summary: result.summary,
    taskClass: result.taskClass,
    executionPolicy: result.executionPolicy,
    decision: result.decision,
    pushAllowed: result.pushAllowed,
    judgeLane: judgeDetail?.judgeLane,
    judgeStatus: judgePhase?.status,
    editModes,
    assessment: assessmentReasons.length === 0 ? 'pass' : 'deviation',
    assessmentReasons,
  };
}

async function main() {
  const repoRoot = getRepoRoot();
  loadRunnerEnv(repoRoot);
  const outputFile = getDefaultOutputPath(repoRoot);

  const report: BatchReport = {
    batch: 'K2.8d-LocalJudgeHardening',
    runDate: new Date().toISOString(),
    workerLane: 'grok',
    tasks: [],
    passCount: 0,
    deviationCount: 0,
    environment: { outputFile },
  };

  for (const task of TASKS) {
    const taskResult = await runTask(task);
    report.tasks.push(taskResult);
  }

  report.passCount = report.tasks.filter((task) => task.assessment === 'pass').length;
  report.deviationCount = report.tasks.filter((task) => task.assessment === 'deviation').length;

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify(report, null, 2));

  if (report.deviationCount > 0) {
    process.exitCode = 1;
  }
}

await main();
