import { and, eq, gte, ne } from 'drizzle-orm';
import { getDb } from '../db.js';
import { type BuilderStatus, builderTasks } from '../schema/builder.js';

type StageKey = 'stage1' | 'stage2' | 'stage3';
type PromotionReadiness = 'ready' | 'needs_revision' | 'reject';

type CanaryTask = typeof builderTasks.$inferSelect;

export interface CanaryLaneFlags {
  prototype: boolean;
  counterexample: boolean;
  browser: boolean;
}

export interface CanaryStageConfig {
  key: StageKey;
  label: string;
  weeks: string;
  maxTasksPerDay: number;
  allowedRisks: string[];
  allowedProfiles: string[];
  maxScopeFiles: number | null;
  laneFlags: CanaryLaneFlags;
}

export interface CanaryGateResult {
  allowed: boolean;
  stage: StageKey;
  label: string;
  laneFlags: CanaryLaneFlags;
  reasons: string[];
  startedToday: number;
  remainingToday: number;
  scopeFileCount: number;
  profile: string | null;
  risk: string;
  summary: string;
}

export interface CanaryPromotionStatus {
  currentStage: StageKey;
  currentLabel: string;
  nextStage: StageKey | null;
  manualPromotion: true;
  envVar: 'BUILDER_CANARY_STAGE';
  greenTasks: number;
  threshold: number;
  promotionReadiness: PromotionReadiness;
  summary: string;
}

export interface CanaryAuditSummary {
  taskId: string;
  stage: StageKey;
  stageLabel: string;
  taskStatus: BuilderStatus;
  gate: CanaryGateResult;
  promotion: CanaryPromotionStatus;
  allowedNextStatuses: BuilderStatus[];
  stageConfig: CanaryStageConfig;
  summary: string;
}

const PROMOTION_THRESHOLD = 10;
const GREEN_STATUSES = new Set<BuilderStatus>(['push_candidate', 'done']);

export const CANARY_STAGE_CONFIG: Record<StageKey, CanaryStageConfig> = {
  stage1: {
    key: 'stage1',
    label: 'Woche 1-2',
    weeks: 'Woche 1-2',
    maxTasksPerDay: 2,
    allowedRisks: ['low'],
    allowedProfiles: ['api_sse_fix', 'refactor_safe'],
    maxScopeFiles: 2,
    laneFlags: {
      prototype: false,
      counterexample: false,
      browser: false,
    },
  },
  stage2: {
    key: 'stage2',
    label: 'Woche 3-4',
    weeks: 'Woche 3-4',
    maxTasksPerDay: 5,
    allowedRisks: ['low', 'medium'],
    allowedProfiles: ['api_sse_fix', 'refactor_safe', 'ui_layout', 'form_flow'],
    maxScopeFiles: 2,
    laneFlags: {
      prototype: true,
      counterexample: false,
      browser: false,
    },
  },
  stage3: {
    key: 'stage3',
    label: 'Woche 5+',
    weeks: 'Woche 5+',
    maxTasksPerDay: 99,
    allowedRisks: ['low', 'medium', 'high'],
    allowedProfiles: ['api_sse_fix', 'refactor_safe', 'ui_layout', 'form_flow', 'arch_sensitive', 'db_sensitive'],
    maxScopeFiles: null,
    laneFlags: {
      prototype: true,
      counterexample: true,
      browser: true,
    },
  },
};

export const BUILDER_STATUS_TRANSITIONS: Record<BuilderStatus, BuilderStatus[]> = {
  queued: ['classifying', 'reverted', 'discarded'],
  classifying: ['prototyping', 'planning', 'blocked'],
  prototyping: ['prototype_review', 'planning', 'blocked'],
  prototype_review: ['prototyping', 'planning', 'discarded'],
  planning: ['reviewing', 'blocked', 'review_needed'],
  counterexampling: ['push_candidate', 'review_needed', 'blocked'],
  applying: ['checking', 'review_needed', 'blocked'],
  checking: ['testing', 'browser_testing', 'review_needed', 'blocked'],
  testing: ['reviewing', 'push_candidate', 'review_needed', 'blocked'],
  browser_testing: ['push_candidate', 'review_needed', 'blocked'],
  reviewing: ['browser_testing', 'counterexampling', 'push_candidate', 'review_needed', 'blocked'],
  push_candidate: ['done', 'reverted', 'review_needed'],
  needs_human_review: ['classifying', 'reverted', 'discarded'],
  review_needed: ['classifying', 'reverted', 'discarded'],
  blocked: ['classifying', 'reverted', 'discarded'],
  done: [],
  reverted: ['classifying'],
  discarded: [],
};

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function resolveStageKey(rawValue: string | undefined): StageKey {
  const normalized = rawValue?.trim().toLowerCase() ?? '';
  if (normalized === 'stage2' || normalized === '2' || normalized === 'week2' || normalized === 'woche3-4') {
    return 'stage2';
  }

  if (normalized === 'stage3' || normalized === '3' || normalized === 'week3' || normalized === 'woche5+') {
    return 'stage3';
  }

  return 'stage1';
}

function taskMatchesStageRules(task: CanaryTask, config: CanaryStageConfig) {
  const profile = task.policyProfile ?? null;
  const scopeFileCount = task.scope.length;
  const reasons: string[] = [];

  if (!config.allowedRisks.includes(task.risk)) {
    reasons.push(`Risk ${task.risk} ist in ${config.label} nicht erlaubt.`);
  }

  if (!profile || !config.allowedProfiles.includes(profile)) {
    reasons.push(`Profil ${profile ?? 'unbekannt'} ist in ${config.label} nicht erlaubt.`);
  }

  if (config.maxScopeFiles !== null && scopeFileCount > config.maxScopeFiles) {
    reasons.push(`Scope umfasst ${scopeFileCount} Dateien und ueberschreitet das Limit ${config.maxScopeFiles}.`);
  }

  return {
    profile,
    scopeFileCount,
    reasons,
  };
}

async function countStartedToday(taskId: string) {
  try {
    const db = getDb();
    const today = getStartOfToday();
    const tasks = await db
      .select({ id: builderTasks.id })
      .from(builderTasks)
      .where(and(
        gte(builderTasks.updatedAt, today),
        ne(builderTasks.id, taskId),
        ne(builderTasks.status, 'queued'),
      ));

    return tasks.length;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

function isGreenTask(task: CanaryTask) {
  return GREEN_STATUSES.has(task.status as BuilderStatus);
}

export function getCurrentCanaryStage() {
  const stage = resolveStageKey(process.env.BUILDER_CANARY_STAGE);
  return {
    stage,
    config: CANARY_STAGE_CONFIG[stage],
    manualPromotion: true as const,
    envVar: 'BUILDER_CANARY_STAGE' as const,
  };
}

export async function evaluateCanaryGate(task: CanaryTask): Promise<CanaryGateResult> {
  const { stage, config } = getCurrentCanaryStage();
  const startedToday = await countStartedToday(task.id);
  const ruleCheck = taskMatchesStageRules(task, config);
  const reasons = [...ruleCheck.reasons];

  if (startedToday >= config.maxTasksPerDay) {
    reasons.push(`Tageslimit erreicht: ${startedToday}/${config.maxTasksPerDay} gestartete Tasks heute.`);
  }

  const allowed = reasons.length === 0;
  const remainingToday = Math.max(0, config.maxTasksPerDay - startedToday);

  return {
    allowed,
    stage,
    label: config.label,
    laneFlags: config.laneFlags,
    reasons,
    startedToday,
    remainingToday,
    scopeFileCount: ruleCheck.scopeFileCount,
    profile: ruleCheck.profile,
    risk: task.risk,
    summary: allowed
      ? `${config.label} erlaubt diesen Task. ${remainingToday} Start(s) heute verbleibend.`
      : `${config.label} blockiert diesen Task: ${reasons.join(' ')}`,
  };
}

export async function getCanaryPromotionStatus(): Promise<CanaryPromotionStatus> {
  const db = getDb();
  const { stage, config } = getCurrentCanaryStage();
  const tasks = await db.select().from(builderTasks);

  const greenTasks = tasks.filter((task) => isGreenTask(task) && taskMatchesStageRules(task, config).reasons.length === 0).length;
  const nextStage = stage === 'stage1' ? 'stage2' : stage === 'stage2' ? 'stage3' : null;
  const promotionReadiness: PromotionReadiness = nextStage === null
    ? 'reject'
    : greenTasks >= PROMOTION_THRESHOLD
      ? 'ready'
      : 'needs_revision';

  return {
    currentStage: stage,
    currentLabel: config.label,
    nextStage,
    manualPromotion: true,
    envVar: 'BUILDER_CANARY_STAGE',
    greenTasks,
    threshold: PROMOTION_THRESHOLD,
    promotionReadiness,
    summary: nextStage === null
      ? `${config.label} ist die hoechste Canary-Stufe; Promotion bleibt unnoetig und manuell.`
      : promotionReadiness === 'ready'
        ? `${greenTasks} gruene Tasks in ${config.label}: naechste Stufe ist manuell freischaltbar.`
        : `${greenTasks}/${PROMOTION_THRESHOLD} gruene Tasks in ${config.label}: noch nicht bereit fuer manuelle Promotion.`,
  };
}

export async function buildTaskAudit(taskId: string): Promise<CanaryAuditSummary | null> {
  const db = getDb();
  const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));

  if (!task) {
    return null;
  }

  const { config } = getCurrentCanaryStage();
  const gate = await evaluateCanaryGate(task);
  const promotion = await getCanaryPromotionStatus();
  const allowedNextStatuses = BUILDER_STATUS_TRANSITIONS[task.status as BuilderStatus] ?? [];

  return {
    taskId: task.id,
    stage: gate.stage,
    stageLabel: gate.label,
    taskStatus: task.status as BuilderStatus,
    gate,
    promotion,
    allowedNextStatuses,
    stageConfig: config,
    summary: `${gate.summary} Aktueller Status ${task.status}; naechste erlaubte Stati: ${allowedNextStatuses.join(', ') || 'keine'}.`,
  };
}
