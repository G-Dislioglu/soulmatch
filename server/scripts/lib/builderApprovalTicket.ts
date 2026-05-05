import { getDb } from '../../src/db.js';
import { fingerprintInstruction, fingerprintScope } from '../../src/lib/builderApprovalArtifacts.js';
import { builderArtifacts, builderTasks } from '../../src/schema/builder.js';

type IssueApprovalTicketInput = {
  title: string;
  instruction: string;
  scope: string[];
  sourceTaskId?: string;
  sourceRunId?: string;
  issuedBy?: string;
  expiresAt?: Date;
};

export type IssuedApprovalTicket = {
  approvalId: string;
  artifactTaskId: string;
  instructionFingerprint: string;
  scopeFingerprint: string;
  expiresAt: string;
};

export async function issueApprovalTicket(input: IssueApprovalTicketInput): Promise<IssuedApprovalTicket> {
  const db = getDb();
  const expiresAt = input.expiresAt ?? new Date(Date.now() + (4 * 60 * 60 * 1000));
  const scope = [...new Set(input.scope.map((entry) => entry.replace(/\\/g, '/').trim()).filter(Boolean))].sort();
  const instructionFingerprint = fingerprintInstruction(input.instruction);
  const scopeFingerprint = fingerprintScope(scope);

  const [artifactTask] = await db.insert(builderTasks).values({
    title: input.title,
    goal: input.instruction,
    risk: 'medium',
    taskType: 'B',
    policyProfile: 'operator_gate_v1_3',
    scope,
    requiredLanes: ['review'],
    status: 'done',
  }).returning({ id: builderTasks.id });

  if (!artifactTask) {
    throw new Error('Failed to create approval ticket backing task');
  }

  const [artifact] = await db.insert(builderArtifacts).values({
    taskId: artifactTask.id,
    artifactType: 'approval_ticket',
    lane: 'review',
    jsonPayload: {
      approval_kind: 'operator_gate_v1_3',
      instruction_fingerprint: instructionFingerprint,
      scope_fingerprint: scopeFingerprint,
      ...(input.sourceTaskId ? { source_task_id: input.sourceTaskId } : {}),
      ...(input.sourceRunId ? { source_run_id: input.sourceRunId } : {}),
      issued_by: input.issuedBy ?? 'codex_builder_runner',
      verdict: 'approved',
      expires_at: expiresAt.toISOString(),
      consumed_at: null,
    },
  }).returning({ id: builderArtifacts.id });

  if (!artifact) {
    throw new Error('Failed to create approval ticket artifact');
  }

  return {
    approvalId: artifact.id,
    artifactTaskId: artifactTask.id,
    instructionFingerprint,
    scopeFingerprint,
    expiresAt: expiresAt.toISOString(),
  };
}
