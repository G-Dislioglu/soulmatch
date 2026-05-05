import type { BuilderStatus } from '../schema/builder.js';

export interface BuilderGoalRecord {
  id: string;
  title: string;
  goal: string;
  status: BuilderStatus | string;
  goalKind?: string | null;
  successConditions?: string[] | null;
  budgetIterations?: number | null;
  budgetUsed?: number | null;
  revisionLog?: Record<string, unknown>[] | null;
  parentTaskId?: string | null;
}

export interface BuilderGoalState {
  goalId: string;
  goalKind: string;
  status: string;
  isTerminal: boolean;
  budget: {
    iterations: number;
    used: number;
    remaining: number;
    exhausted: boolean;
  };
  success: {
    totalConditions: number;
    satisfiedConditions: string[];
    unsatisfiedConditions: string[];
    verificationMode: 'honesty_stub';
  };
  revisionCount: number;
  honesty: {
    status: 'stub_only';
    summary: string;
  };
}

const TERMINAL_STATUSES = new Set(['done', 'reverted', 'discarded', 'blocked']);

function normalizeConditions(value: string[] | null | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export function computeGoalState(goal: BuilderGoalRecord): BuilderGoalState {
  const successConditions = normalizeConditions(goal.successConditions);
  const budgetIterations = Math.max(1, Number.isFinite(goal.budgetIterations ?? NaN) ? Number(goal.budgetIterations) : 1);
  const budgetUsed = Math.max(0, Number.isFinite(goal.budgetUsed ?? NaN) ? Number(goal.budgetUsed) : 0);
  const remaining = Math.max(0, budgetIterations - budgetUsed);

  return {
    goalId: goal.id,
    goalKind: goal.goalKind ?? 'builder_goal',
    status: goal.status,
    isTerminal: TERMINAL_STATUSES.has(goal.status),
    budget: {
      iterations: budgetIterations,
      used: budgetUsed,
      remaining,
      exhausted: remaining <= 0,
    },
    success: {
      totalConditions: successConditions.length,
      satisfiedConditions: [],
      unsatisfiedConditions: successConditions,
      verificationMode: 'honesty_stub',
    },
    revisionCount: Array.isArray(goal.revisionLog) ? goal.revisionLog.length : 0,
    honesty: {
      status: 'stub_only',
      summary: 'Success-condition verification is not implemented yet; this state only reflects stored goal metadata, task lifecycle, and iteration budget.',
    },
  };
}
