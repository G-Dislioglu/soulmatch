import { type CapabilityVector, type RiskDecision, evaluateRisk } from './riskGate.js';

export interface RiskLogEntry {
  type: 'RISK_DECISION';
  timestamp: string;
  zone: RiskDecision['zone'];
  reasons: string[];
  vector: CapabilityVector;
  context?: string;
  mode: 'log_only';
}

export function buildRiskLogEntry(vector: CapabilityVector, context?: string, now = new Date()): RiskLogEntry {
  const decision = evaluateRisk(vector);
  return {
    type: 'RISK_DECISION',
    timestamp: now.toISOString(),
    zone: decision.zone,
    reasons: decision.reasons,
    vector,
    ...(context ? { context } : {}),
    mode: 'log_only',
  };
}

export function logRiskDecision(vector: CapabilityVector, context?: string): RiskLogEntry {
  const entry = buildRiskLogEntry(vector, context);
  console.log(JSON.stringify(entry));
  return entry;
}
