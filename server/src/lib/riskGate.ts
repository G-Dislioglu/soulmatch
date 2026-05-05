export type RiskZone = 'GREEN' | 'AMBER' | 'RED';

export type ActionPlane =
  | 'THINK'
  | 'READ_LOCAL'
  | 'RESEARCH'
  | 'CALL_PROVIDER'
  | 'SPAWN_AGENT'
  | 'EXTERNAL_CALL'
  | 'MUTATION'
  | 'COMMIT'
  | 'PUSH'
  | 'DEPLOY'
  | 'MEMORY_WRITE'
  | 'REGISTRY_WRITE'
  | 'DB_SCHEMA'
  | 'DELETE_DATA'
  | 'SECRET_ACCESS'
  | 'COST_ACTION';

export type ActionTarget =
  | 'LOCAL'
  | 'SANDBOX'
  | 'STAGING'
  | 'PROD'
  | 'REPO'
  | 'MEMORY'
  | 'REGISTRY'
  | 'EXTERNAL'
  | 'UNKNOWN';

export interface CapabilityVector {
  plane: ActionPlane;
  target?: ActionTarget;
  hasRollback?: boolean;
  touchesPrivacy?: boolean;
  costUnknown?: boolean;
  destructive?: boolean;
  persistent?: boolean;
  crossRepo?: boolean;
  usesSecrets?: boolean;
  pushBranch?: string;
}

export interface RiskDecision {
  zone: RiskZone;
  reasons: string[];
}

function targetOf(vector: CapabilityVector): ActionTarget {
  return vector.target ?? 'UNKNOWN';
}

function isProtectedBranch(branch?: string): boolean {
  return branch === 'main' || branch === 'master';
}

export function evaluateRisk(vector: CapabilityVector): RiskDecision {
  const reasons: string[] = [];
  const target = targetOf(vector);

  if (vector.usesSecrets || vector.plane === 'SECRET_ACCESS') {
    reasons.push('secret access requires explicit approval');
  }

  if (vector.plane === 'DELETE_DATA' || vector.destructive) {
    reasons.push('destructive action requires proof gate');
  }

  if (vector.plane === 'DB_SCHEMA') {
    reasons.push('database schema changes require proof gate');
  }

  if (vector.plane === 'MEMORY_WRITE') {
    reasons.push('persistent memory writes require proof gate');
  }

  if (vector.plane === 'REGISTRY_WRITE') {
    reasons.push('registry writes require proof gate');
  }

  if (vector.plane === 'DEPLOY' && target === 'PROD') {
    reasons.push('production deploy requires proof gate');
  }

  if (vector.plane === 'PUSH' && isProtectedBranch(vector.pushBranch)) {
    reasons.push('push to protected branch requires proof gate');
  }

  if (vector.plane === 'COST_ACTION' && vector.costUnknown) {
    reasons.push('unknown external cost requires proof gate');
  }

  if (vector.plane === 'EXTERNAL_CALL' && vector.touchesPrivacy) {
    reasons.push('privacy-sensitive external call requires proof gate');
  }

  if (vector.plane === 'MUTATION' && target === 'PROD' && !vector.hasRollback) {
    reasons.push('production mutation without rollback requires proof gate');
  }

  if (vector.crossRepo && vector.plane !== 'READ_LOCAL' && vector.plane !== 'THINK') {
    reasons.push('cross-repo write/action requires proof gate');
  }

  if (reasons.length > 0) {
    return { zone: 'RED', reasons };
  }

  if (
    vector.plane === 'SPAWN_AGENT' ||
    vector.plane === 'CALL_PROVIDER' ||
    vector.plane === 'EXTERNAL_CALL' ||
    vector.plane === 'COMMIT' ||
    vector.plane === 'PUSH' ||
    vector.plane === 'COST_ACTION' ||
    (vector.plane === 'DEPLOY' && target !== 'PROD') ||
    (vector.plane === 'MUTATION' && target === 'STAGING') ||
    (vector.plane === 'MUTATION' && target === 'PROD' && vector.hasRollback) ||
    vector.persistent
  ) {
    return { zone: 'AMBER', reasons: ['action requires intent and evidence'] };
  }

  if (vector.plane === 'MUTATION' && target === 'SANDBOX') {
    return { zone: 'GREEN', reasons: ['sandbox mutation is reversible by boundary'] };
  }

  if (vector.plane === 'THINK' || vector.plane === 'READ_LOCAL' || vector.plane === 'RESEARCH') {
    return { zone: 'GREEN', reasons: ['cognition/read-only action'] };
  }

  return { zone: 'AMBER', reasons: ['unknown target defaults to reviewable action'] };
}

export function riskZoneRank(zone: RiskZone): number {
  if (zone === 'RED') return 3;
  if (zone === 'AMBER') return 2;
  return 1;
}
