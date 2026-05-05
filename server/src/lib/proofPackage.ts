import { type CapabilityVector, type RiskZone, evaluateRisk } from './riskGate.js';

export type SandboxResult = 'pass' | 'fail' | 'not_run';

export interface ProofPackage {
  intent?: string;
  capabilityVector: CapabilityVector;
  evidence?: string[];
  testsRun?: string[];
  sandboxResult?: SandboxResult;
  rollbackPlan?: string;
  councilProvenance?: string;
  approvalId?: string;
}

export interface ProofValidationResult {
  valid: boolean;
  zone: RiskZone;
  reasons: string[];
}

function hasText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasEvidence(pkg: ProofPackage): boolean {
  return Array.isArray(pkg.evidence) && pkg.evidence.some((entry) => hasText(entry));
}

export function validateProofPackage(pkg: ProofPackage, zoneOverride?: RiskZone): ProofValidationResult {
  const decision = evaluateRisk(pkg.capabilityVector);
  const zone = zoneOverride ?? decision.zone;
  const reasons: string[] = [];

  if (zone === 'GREEN') {
    return { valid: true, zone, reasons };
  }

  if (!hasText(pkg.intent)) {
    reasons.push('intent is required for AMBER/RED actions');
  }

  if (!hasEvidence(pkg)) {
    reasons.push('evidence is required for AMBER/RED actions');
  }

  if (zone === 'RED') {
    if (pkg.sandboxResult !== 'pass') {
      reasons.push('passing sandboxResult is required for RED actions');
    }

    if (!hasText(pkg.rollbackPlan)) {
      reasons.push('rollbackPlan is required for RED actions');
    }

    if (!hasText(pkg.councilProvenance)) {
      reasons.push('councilProvenance is required for RED actions');
    }
  }

  return {
    valid: reasons.length === 0,
    zone,
    reasons,
  };
}
