import { builderTasks } from '../schema/builder.js';
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
    'You are part of a coordinated AI team, not a form checker.',
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
    '',
    'user_profile:',
    '- Prefers critical checking, larger coherent work blocks, practical implementation, anti-drift, and clear outcomes.',
    '- Does not want schema over thinking, unnecessary blocking, bureaucratic loops, or isolated workers without context.',
    '=== END TEAM AWARENESS ===',
  ].join('\n');
}
