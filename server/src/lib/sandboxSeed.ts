import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderChatpool,
  builderOpusLog,
  builderTasks,
  type BuilderStatus,
} from '../schema/builder.js';
import { getAppEnv } from './appEnv.js';

type SeedTaskSpec = {
  title: string;
  goal: string;
  status: BuilderStatus;
  risk: string;
  taskType: string;
  policyProfile: string | null;
  commitHash?: string | null;
  scope: string[];
  notScope?: string[];
  requiredLanes?: string[];
  tokenCount?: number;
};

const SYNTHETIC_SEED_MARKER = '[SANDBOX_SYNTHETIC_SEED]';

const SANDBOX_TASKS: SeedTaskSpec[] = [
  {
    title: 'Builder Tribune planning demo',
    goal: `${SYNTHETIC_SEED_MARKER} Show a planning-phase Builder task for sandbox review only.`,
    status: 'planning',
    risk: 'low',
    taskType: 'A',
    policyProfile: 'class1-builder-safe',
    scope: ['client/src/modules/M16_builder/ui/BuilderStudioPage.tsx'],
    tokenCount: 220,
  },
  {
    title: 'Builder Tribune build demo',
    goal: `${SYNTHETIC_SEED_MARKER} Show a build-phase Builder task with worker activity for sandbox review only.`,
    status: 'applying',
    risk: 'medium',
    taskType: 'A',
    policyProfile: 'class1-builder-safe',
    scope: ['client/src/modules/M16_builder/ui/PatrolConsole.tsx'],
    tokenCount: 640,
  },
  {
    title: 'Builder Tribune review demo',
    goal: `${SYNTHETIC_SEED_MARKER} Show a review-needed Builder task for sandbox review only.`,
    status: 'review_needed',
    risk: 'medium',
    taskType: 'B',
    policyProfile: 'class2-approved-review',
    scope: ['server/src/routes/zimage.ts'],
    tokenCount: 910,
  },
  {
    title: 'Builder Tribune prototype demo',
    goal: `${SYNTHETIC_SEED_MARKER} Show a prototype-review Builder task for sandbox review only.`,
    status: 'prototype_review',
    risk: 'medium',
    taskType: 'P',
    policyProfile: 'prototype-preview',
    scope: ['client/src/modules/M16_builder/ui/BuilderStudioPage.tsx'],
    tokenCount: 780,
  },
  {
    title: 'Builder Tribune landed demo',
    goal: `${SYNTHETIC_SEED_MARKER} Show a landed Builder task for sandbox review only.`,
    status: 'done',
    risk: 'low',
    taskType: 'A',
    policyProfile: 'class1-builder-safe',
    scope: ['docs/BUILDER-TRIBUNE-CONTRACT-v0.1.md'],
    commitHash: 'sandbox1234567890abcdef1234567890abcdef12',
    tokenCount: 430,
  },
];

function buildEvidencePack(taskId: string, title: string, goal: string, finalStatus: string, options?: {
  tsc?: string;
  build?: string;
  runtimeResults?: Array<{ test: string; result: string; details: string; durationMs: number | null }>;
  agreement?: string | null;
  falseSuccess?: boolean;
  counterexamplesTested?: number;
  counterexamplesPassed?: number;
  totalTokens?: number;
}) {
  return {
    taskId,
    title,
    goal,
    intent: {
      why: 'Synthetic sandbox seed for Builder Tribune review.',
      user_outcome: 'Show non-empty Tribune states in sandbox.',
      false_success: 'Seed should never be interpreted as real production work.',
    },
    scope_files: [],
    base_commit: null,
    head_commit: null,
    diff_stat: null,
    reuse_search: {
      patterns_found: 0,
      reused: false,
      source: null,
    },
    checks: {
      tsc: options?.tsc ?? 'pass',
      build: options?.build ?? 'pass',
    },
    runtime_results: options?.runtimeResults ?? [],
    counterexamples_tested: options?.counterexamplesTested ?? 2,
    counterexamples_passed: options?.counterexamplesPassed ?? 2,
    reviews: {
      claude: { verdict: 'support', notes: 'Synthetic review signal for sandbox.' },
      chatgpt: { verdict: 'support', notes: 'Synthetic review signal for sandbox.' },
    },
    agreement_level: options?.agreement ?? 'high',
    final_status: finalStatus,
    false_success_detected: options?.falseSuccess ?? false,
    total_tokens: options?.totalTokens ?? 500,
    total_rounds: 3,
    created_at: new Date().toISOString(),
  };
}

export async function seedBuilderSandboxIfNeeded(): Promise<{ seeded: boolean; reason: string; taskCount: number }> {
  if (getAppEnv() !== 'sandbox') {
    return { seeded: false, reason: 'not_sandbox', taskCount: 0 };
  }

  const db = getDb();
  const existingTasks = await db
    .select({ id: builderTasks.id })
    .from(builderTasks)
    .orderBy(asc(builderTasks.createdAt))
    .limit(1);

  if (existingTasks.length > 0) {
    return { seeded: false, reason: 'tasks_present', taskCount: existingTasks.length };
  }

  await seedBuilderSandbox();
  return { seeded: true, reason: 'empty_db_seeded', taskCount: SANDBOX_TASKS.length };
}

export async function seedBuilderSandbox(): Promise<{ taskCount: number }> {
  if (getAppEnv() !== 'sandbox') {
    throw new Error('seedBuilderSandbox() is only allowed when APP_ENV resolves to sandbox');
  }

  const db = getDb();

  const inserted = await db
    .insert(builderTasks)
    .values(
      SANDBOX_TASKS.map((task) => ({
        title: task.title,
        goal: task.goal,
        status: task.status,
        risk: task.risk,
        taskType: task.taskType,
        policyProfile: task.policyProfile,
        scope: task.scope,
        notScope: task.notScope ?? [],
        requiredLanes: task.requiredLanes ?? ['code', 'runtime', 'review'],
        tokenCount: task.tokenCount ?? 0,
        commitHash: task.commitHash ?? null,
      })),
    )
    .returning();

  for (const task of inserted) {
    if (task.status === 'planning') {
      await db.insert(builderChatpool).values({
        taskId: task.id,
        round: 1,
        phase: 'architect-assembly',
        actor: 'maya',
        model: 'opus',
        content: 'Ich schneide gerade Scope und Risiko fuer den naechsten Builder-Schritt zu.',
        tokensUsed: 120,
        durationMs: 1800,
      });
      await db.insert(builderActions).values({
        taskId: task.id,
        lane: 'architect',
        kind: 'plan',
        actor: 'maya',
        payload: { phase: 'planning', synthetic: true },
        result: { status: 'planning' },
      });
    }

    if (task.status === 'applying') {
      await db.insert(builderChatpool).values([
        {
          taskId: task.id,
          round: 2,
          phase: 'roundtable',
          actor: 'worker-deepseek',
          model: 'deepseek',
          content: 'Ich uebernehme den Patrol-Console-Contract und schneide den API-Pfad enger.',
          tokensUsed: 210,
          durationMs: 2600,
        },
        {
          taskId: task.id,
          round: 2,
          phase: 'distiller',
          actor: 'distiller',
          model: 'gemini-flash',
          content: 'Die Worker-Vorschlaege fokussieren sich auf einen einzigen UI-Contract-Fix.',
          tokensUsed: 90,
          durationMs: 900,
        },
      ]);
      await db.insert(builderActions).values({
        taskId: task.id,
        lane: 'code',
        kind: 'patch_apply',
        actor: 'deepseek',
        payload: { synthetic: true, files: task.scope },
        result: { status: 'applying' },
      });
      await db.insert(builderOpusLog).values({
        action: 'worker_swarm',
        taskId: task.id,
        input: { synthetic: true, phase: 'building' },
        output: { activeModels: ['deepseek', 'gemini-flash'] },
        tokensUsed: 300,
      });
    }

    if (task.status === 'review_needed') {
      const evidence = buildEvidencePack(task.id, task.title, task.goal, 'review_needed', {
        tsc: 'pass',
        build: 'pass',
        runtimeResults: [
          { test: 'POST /api/zimage/generate bogus type', result: 'pass', details: 'Returns 400 unknown type', durationMs: 210 },
        ],
        agreement: 'medium',
        counterexamplesPassed: 1,
        counterexamplesTested: 1,
        totalTokens: 910,
      });
      await db.insert(builderArtifacts).values({
        taskId: task.id,
        artifactType: 'evidence_pack',
        lane: 'review',
        jsonPayload: evidence,
      });
      await db.insert(builderActions).values({
        taskId: task.id,
        lane: 'review',
        kind: 'approval_required',
        actor: 'judge',
        payload: { synthetic: true, status: 'review_needed' },
        result: { status: 'review_needed' },
      });
    }

    if (task.status === 'prototype_review') {
      await db.insert(builderActions).values({
        taskId: task.id,
        lane: 'prototype',
        kind: 'preview_ready',
        actor: 'maya',
        payload: { synthetic: true, status: 'prototype_review' },
        result: { status: 'prototype_review' },
      });
      await db.insert(builderChatpool).values({
        taskId: task.id,
        round: 3,
        phase: 'prototype',
        actor: 'maya',
        model: 'opus',
        content: 'Ich habe einen sichtbaren Zwischenstand vorbereitet und brauche jetzt deine Entscheidung.',
        tokensUsed: 140,
        durationMs: 1500,
      });
    }

    if (task.status === 'done') {
      const evidence = buildEvidencePack(task.id, task.title, task.goal, 'done', {
        tsc: 'pass',
        build: 'pass',
        runtimeResults: [
          { test: 'Tribune contract document path', result: 'pass', details: 'Document present and build unaffected', durationMs: 80 },
        ],
        agreement: 'high',
        totalTokens: 430,
      });
      await db.insert(builderArtifacts).values({
        taskId: task.id,
        artifactType: 'evidence_pack',
        lane: 'runtime',
        jsonPayload: evidence,
      });
      await db.insert(builderActions).values({
        taskId: task.id,
        lane: 'push',
        kind: 'landed',
        actor: 'system',
        payload: { synthetic: true, commitHash: task.commitHash },
        result: { status: 'done', commitHash: task.commitHash },
      });
      await db.insert(builderOpusLog).values({
        action: 'self_test',
        taskId: task.id,
        input: { synthetic: true },
        output: { status: 'pass' },
        tokensUsed: 0,
      });
    }
  }

  return { taskCount: inserted.length };
}

export async function clearSyntheticSandboxSeed(): Promise<void> {
  const db = getDb();
  const seededTasks = await db
    .select({ id: builderTasks.id })
    .from(builderTasks)
    .where(and(eq(builderTasks.goal, `${SYNTHETIC_SEED_MARKER} Show a planning-phase Builder task for sandbox review only.`)));

  for (const task of seededTasks) {
    await db.delete(builderChatpool).where(eq(builderChatpool.taskId, task.id));
    await db.delete(builderActions).where(eq(builderActions.taskId, task.id));
    await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, task.id));
    await db.delete(builderOpusLog).where(eq(builderOpusLog.taskId, task.id));
    await db.delete(builderTasks).where(eq(builderTasks.id, task.id));
  }
}
