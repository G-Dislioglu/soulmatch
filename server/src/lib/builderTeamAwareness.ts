import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderAgentProfiles,
  builderAssumptions,
  builderMemory,
  builderTasks,
} from '../schema/builder.js';
import { buildBuilderTaskContract } from './builderTaskContract.js';
import { TASK_TYPE_TO_PROFILE } from './builderPolicyProfiles.js';

export type BuilderTeamRole = 'architect' | 'scout' | 'reviewer' | 'observer' | 'worker' | 'judge';

const ROLE_PROFILES: Record<BuilderTeamRole, { purpose: string; strengths: string; limits: string }> = {
  architect: {
    purpose: 'plans the smallest useful path from mission to patch',
    strengths: 'source reading, structure, implementation sequencing, risk judgement',
    limits: 'must not invent files, imports, libraries, or expand mission without evidence',
  },
  scout: {
    purpose: 'finds source context and likely affected files',
    strengths: 'repo discovery, pattern search, evidence collection',
    limits: 'does not implement; compresses findings into an actionable brief',
  },
  reviewer: {
    purpose: 'checks real risk and product value without replacing thinking with formality',
    strengths: 'scope, correctness, reuse, UX heuristics, false-success detection',
    limits: 'must not block for low-risk bureaucracy when the patch is useful and bounded',
  },
  observer: {
    purpose: 'settles review disagreement and identifies hard risk',
    strengths: 'tie-breaking, contradiction detection, safety boundary checks',
    limits: 'only intervenes on material disagreement or hard safety risk',
  },
  worker: {
    purpose: 'implements scoped changes autonomously after understanding the mission',
    strengths: 'local fixes, targeted refactors, type/build repair, pragmatic UI implementation',
    limits: 'must ask or stop at hard risk boundaries',
  },
  judge: {
    purpose: 'verifies outcome against mission, evidence, and user value',
    strengths: 'proof discipline, regression detection, acceptance criteria',
    limits: 'does not demand ornamental process when real proof is present',
  },
};

function summarizeMission(task: typeof builderTasks.$inferSelect) {
  const profile = task.policyProfile
    ?? TASK_TYPE_TO_PROFILE[task.taskType as keyof typeof TASK_TYPE_TO_PROFILE]
    ?? 'default';

  return [
    `active_goal: ${task.title || task.goal}`,
    `goal_kind: ${task.goalKind ?? 'standard'}`,
    `task_type: ${task.taskType}`,
    `policy_profile: ${profile}`,
    `user_intent: ${task.goal}`,
    `scope: ${task.scope.join(', ') || '(discover if needed)'}`,
    `not_scope: ${task.notScope.join(', ') || '(none declared)'}`,
  ].join('\n');
}

export function buildTeamAwarenessBrief(
  task: typeof builderTasks.$inferSelect,
  role: BuilderTeamRole,
) {
  const profile = ROLE_PROFILES[role];

  return [
    '=== BUILDER TEAM AWARENESS ===',
    'Charter: Anti-Bureaucracy & Team Autonomy v0.1. You are part of a coordinated AI team, not a form checker.',
    'Mission-first work: understand, gather context, plan, implement, prove. Do not let process replace thinking.',
    `self_role: ${role}`,
    `self_purpose: ${profile.purpose}`,
    `self_strengths: ${profile.strengths}`,
    `self_limits: ${profile.limits}`,
    '',
    'team:',
    '- Maya: mission control, user interpreter, route adapter, clarification hub, team moderator.',
    '- Scout: finds files and evidence.',
    '- Architect/Worker: plans and implements bounded fixes.',
    '- Reviewer/Judge: verifies real risk, outcome, and proof.',
    '- Council/Visual lanes: provide specialist evidence when the mission needs it.',
    '',
    'mission:',
    summarizeMission(task),
    '',
    'decision_policy:',
    '- Continue with an explicit assumption for low-risk uncertainty: missing file path, small helper, ordinary type error, local refactor needed for the fix.',
    '- Ask Maya or mark a clarification need for medium uncertainty: user-intent conflict, scope expansion, unclear design direction, multiple plausible architecture paths.',
    '- Block only for hard risk: secrets/auth, destructive DB migration, cross-repo write, provider/council cost outside the approved task, copied external assets, deploy/push without approval, or a clearly wrong mission.',
    '- If no live ask channel exists, write the assumption or clarification need in @PLAN and continue unless it is a hard-risk boundary.',
    '- Do not introduce stronger restrictions or new blocking rules silently. If a new guard is necessary, justify it as a real safety boundary.',
    '',
    'user_profile:',
    '- Prefers critical checking, larger coherent work blocks, practical implementation, anti-drift, and clear outcomes.',
    '- Does not want schema over thinking, unnecessary blocking, bureaucratic loops, or isolated workers without context.',
    '=== END TEAM AWARENESS ===',
  ].join('\n');
}

function compact(value: unknown, max = 420) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value ?? {});
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

function listLines(title: string, rows: string[]) {
  if (rows.length === 0) {
    return '';
  }
  return [`${title}:`, ...rows.map((row) => `- ${row}`)].join('\n');
}

function summarizeAction(action: typeof builderActions.$inferSelect) {
  const result = action.result ? ` result=${compact(action.result, 180)}` : '';
  return `${action.actor}/${action.lane}/${action.kind}: ${compact(action.payload, 220)}${result}`;
}

function summarizeAgent(profile: typeof builderAgentProfiles.$inferSelect) {
  const strengths = profile.strengths.length > 0 ? profile.strengths.slice(0, 4).join(', ') : 'not learned yet';
  const weaknesses = profile.weaknesses.length > 0 ? profile.weaknesses.slice(0, 3).join(', ') : 'not learned yet';
  const learnings = profile.lastLearnings.length > 0 ? profile.lastLearnings.slice(0, 2).join('; ') : 'none';
  return `${profile.agentId} (${profile.role}): strengths=${strengths}; limits=${weaknesses}; learnings=${learnings}; success=${profile.successCount}/${profile.taskCount}; avgQuality=${profile.avgQuality}`;
}

function summarizeMemory(row: typeof builderMemory.$inferSelect) {
  return `${row.layer}${row.worker ? `/${row.worker}` : ''}: ${row.summary}`;
}

function summarizeAssumption(row: typeof builderAssumptions.$inferSelect) {
  return `${row.title}: ${row.text}`;
}

export async function buildTeamContextPack(
  task: typeof builderTasks.$inferSelect,
  role: BuilderTeamRole,
) {
  const db = getDb();
  const contract = buildBuilderTaskContract(task);
  let actions: Array<typeof builderActions.$inferSelect> = [];
  let memories: Array<typeof builderMemory.$inferSelect> = [];
  let agentProfiles: Array<typeof builderAgentProfiles.$inferSelect> = [];
  let assumptions: Array<typeof builderAssumptions.$inferSelect> = [];

  try {
    [actions, memories, agentProfiles, assumptions] = await Promise.all([
      db
        .select()
        .from(builderActions)
        .where(eq(builderActions.taskId, task.id))
        .orderBy(desc(builderActions.createdAt))
        .limit(10),
      db
        .select()
        .from(builderMemory)
        .orderBy(desc(builderMemory.updatedAt))
        .limit(8),
      db
        .select()
        .from(builderAgentProfiles)
        .orderBy(desc(builderAgentProfiles.updatedAt))
        .limit(8),
      db
        .select()
        .from(builderAssumptions)
        .where(eq(builderAssumptions.hardeningStatus, 'accepted'))
        .orderBy(desc(builderAssumptions.updatedAt))
        .limit(6),
    ]);
  } catch (error) {
    return [
      '=== BUILDER TEAM CONTEXT PACK ===',
      `role: ${role}`,
      `task: ${task.id}`,
      `context_load: failed (${error instanceof Error ? error.message : String(error)})`,
      'Fallback: use the mission brief and gather missing context autonomously. Do not block unless a hard risk boundary is reached.',
      '=== END TEAM CONTEXT PACK ===',
    ].join('\n');
  }

  const taskMemories = memories.filter((row) => row.taskId === task.id);
  const globalMemories = memories.filter((row) => row.taskId !== task.id);
  const recentHardSignals = actions.filter((action) => {
    const text = `${action.kind} ${compact(action.result, 240)} ${compact(action.payload, 240)}`.toLowerCase();
    return text.includes('block')
      || text.includes('failed')
      || text.includes('error')
      || text.includes('oldtext')
      || text.includes('tsc')
      || text.includes('retry');
  });

  const sections = [
    '=== BUILDER TEAM CONTEXT PACK ===',
    'Purpose: give the AI concrete memory, task history, role awareness, and assumptions before it acts.',
    `role: ${role}`,
    `task_id: ${task.id}`,
    `active_mission: ${task.title || task.goal}`,
    `mission_contract: intent=${contract.intent.kind}; lifecycle=${contract.lifecycle.phase}/${contract.lifecycle.attentionState}; team=${contract.team.activeInstances.join(', ')}; output=${contract.output.kind}/${contract.output.format}; codeLane=${contract.codeLane.phase}/${contract.codeLane.status}`,
    `success_conditions: ${task.successConditions.length > 0 ? task.successConditions.join(' | ') : '(not explicit; infer from goal and evidence)'}`,
    `budget: used=${task.budgetUsed}/${task.budgetIterations}; tokens=${task.tokenCount ?? 0}/${task.tokenBudget ?? 0}`,
    listLines('recent_task_actions', actions.slice(0, 8).map(summarizeAction)),
    listLines('known_risks_or_failed_attempts', recentHardSignals.slice(0, 5).map(summarizeAction)),
    listLines('task_memory', taskMemories.slice(0, 4).map(summarizeMemory)),
    listLines('global_builder_memory', globalMemories.slice(0, 4).map(summarizeMemory)),
    listLines('agent_profiles', agentProfiles.map(summarizeAgent)),
    listLines('accepted_assumptions', assumptions.map(summarizeAssumption)),
    'working_rule: low uncertainty -> continue with a marked assumption; medium uncertainty -> @CLARIFY or @CONSULT and continue when safe; hard risk -> @BLOCK with options.',
    'maya_rule: Maya is mission control and clarification hub. Ask Maya for intent/route conflicts; ask specialist roles for technical uncertainty.',
    '=== END TEAM CONTEXT PACK ===',
  ].filter(Boolean);

  return sections.join('\n');
}
