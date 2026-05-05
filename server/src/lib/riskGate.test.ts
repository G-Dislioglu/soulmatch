import assert from 'node:assert/strict';

import { validateProofPackage } from './proofPackage.js';
import { evaluateRisk, type CapabilityVector } from './riskGate.js';
import { buildRiskLogEntry } from './riskLogger.js';

const vector = (overrides: Partial<CapabilityVector>): CapabilityVector => ({
  plane: 'THINK',
  target: 'LOCAL',
  ...overrides,
});

function testGreenCognition(): void {
  assert.equal(evaluateRisk(vector({ plane: 'THINK' })).zone, 'GREEN');
  assert.equal(evaluateRisk(vector({ plane: 'READ_LOCAL', touchesPrivacy: true })).zone, 'GREEN');
  assert.equal(evaluateRisk(vector({ plane: 'MUTATION', target: 'SANDBOX' })).zone, 'GREEN');
}

function testAmberReviewableActions(): void {
  assert.equal(evaluateRisk(vector({ plane: 'SPAWN_AGENT' })).zone, 'AMBER');
  assert.equal(evaluateRisk(vector({ plane: 'CALL_PROVIDER' })).zone, 'AMBER');
  assert.equal(evaluateRisk(vector({ plane: 'MUTATION', target: 'STAGING' })).zone, 'AMBER');
  assert.equal(evaluateRisk(vector({ plane: 'MUTATION', target: 'PROD', hasRollback: true })).zone, 'AMBER');
}

function testRedHardCaps(): void {
  assert.equal(evaluateRisk(vector({ plane: 'DEPLOY', target: 'PROD' })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'MEMORY_WRITE' })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'REGISTRY_WRITE' })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'DB_SCHEMA' })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'DELETE_DATA' })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'SECRET_ACCESS' })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'PUSH', pushBranch: 'main' })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'EXTERNAL_CALL', touchesPrivacy: true })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'MUTATION', target: 'PROD', hasRollback: false })).zone, 'RED');
  assert.equal(evaluateRisk(vector({ plane: 'COST_ACTION', costUnknown: true })).zone, 'RED');
}

function testProofPackage(): void {
  assert.equal(validateProofPackage({ capabilityVector: vector({ plane: 'THINK' }) }).valid, true);

  const amber = validateProofPackage({
    capabilityVector: vector({ plane: 'SPAWN_AGENT' }),
    intent: 'ask scout for second opinion',
    evidence: ['input is ambiguous'],
  });
  assert.equal(amber.valid, true);

  const amberMissingEvidence = validateProofPackage({
    capabilityVector: vector({ plane: 'SPAWN_AGENT' }),
    intent: 'ask scout',
  });
  assert.equal(amberMissingEvidence.valid, false);
  assert.match(amberMissingEvidence.reasons.join('\n'), /evidence/);

  const redMissingCouncil = validateProofPackage({
    capabilityVector: vector({ plane: 'DEPLOY', target: 'PROD' }),
    intent: 'deploy production',
    evidence: ['build passed'],
    sandboxResult: 'pass',
    rollbackPlan: 'git revert',
  });
  assert.equal(redMissingCouncil.valid, false);
  assert.match(redMissingCouncil.reasons.join('\n'), /councilProvenance/);

  const redComplete = validateProofPackage({
    capabilityVector: vector({ plane: 'DEPLOY', target: 'PROD' }),
    intent: 'deploy production',
    evidence: ['build passed'],
    sandboxResult: 'pass',
    rollbackPlan: 'git revert',
    councilProvenance: 'artifact:abc',
  });
  assert.equal(redComplete.valid, true);
}

function testLogOnlyEntry(): void {
  const entry = buildRiskLogEntry(
    vector({ plane: 'MEMORY_WRITE' }),
    'maya autonomy memory write',
    new Date('2026-05-06T00:00:00.000Z'),
  );

  assert.equal(entry.type, 'RISK_DECISION');
  assert.equal(entry.mode, 'log_only');
  assert.equal(entry.zone, 'RED');
  assert.equal(entry.timestamp, '2026-05-06T00:00:00.000Z');
}

testGreenCognition();
testAmberReviewableActions();
testRedHardCaps();
testProofPackage();
testLogOnlyEntry();

console.log('riskGate tests passed');
