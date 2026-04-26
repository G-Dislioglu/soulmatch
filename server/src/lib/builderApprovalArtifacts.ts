import { and, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { getDb } from '../db.js';
import { builderArtifacts } from '../schema/builder.js';

type ApprovalTicketPayload = {
  approval_kind?: unknown;
  instruction_fingerprint?: unknown;
  scope_fingerprint?: unknown;
  source_task_id?: unknown;
  source_run_id?: unknown;
  issued_by?: unknown;
  verdict?: unknown;
  expires_at?: unknown;
  consumed_at?: unknown;
};

type ValidateApprovalArtifactInput = {
  approvalId: string;
  instruction: string;
  scope: string[];
  sourceTaskId?: string;
  sourceRunId?: string;
  now?: Date;
};

export type ApprovalArtifactValidationResult = {
  valid: boolean;
  reason: string;
  errorClass?: 'db_unavailable';
  approvalId: string;
  instructionFingerprint: string;
  scopeFingerprint: string;
};

function normalizeInstruction(instruction: string): string {
  return instruction
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeScope(scope: string[]): string[] {
  return [...new Set(
    scope
      .map((entry) => entry.replace(/\\/g, '/').trim())
      .filter((entry) => entry.length > 0),
  )].sort((left, right) => left.localeCompare(right));
}

function createFingerprint(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function asPayload(value: unknown): ApprovalTicketPayload {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as ApprovalTicketPayload;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isApprovedVerdict(verdict: unknown): boolean {
  return typeof verdict === 'string' && verdict.toLowerCase() === 'approved';
}

function parseExpiresAt(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isConsumed(raw: unknown): boolean {
  if (raw == null) {
    return false;
  }

  if (typeof raw === 'string') {
    return raw.trim().length > 0;
  }

  return true;
}

function invalid(
  reason: string,
  approvalId: string,
  instructionFingerprint: string,
  scopeFingerprint: string,
  errorClass?: 'db_unavailable',
): ApprovalArtifactValidationResult {
  return {
    valid: false,
    reason,
    ...(errorClass ? { errorClass } : {}),
    approvalId,
    instructionFingerprint,
    scopeFingerprint,
  };
}

export function fingerprintInstruction(instruction: string): string {
  return createFingerprint(normalizeInstruction(instruction));
}

export function fingerprintScope(scope: string[]): string {
  return createFingerprint(JSON.stringify(normalizeScope(scope)));
}

export async function validateApprovalArtifact(
  input: ValidateApprovalArtifactInput,
): Promise<ApprovalArtifactValidationResult> {
  const approvalId = input.approvalId.trim();
  const instructionFingerprint = fingerprintInstruction(input.instruction);
  const scopeFingerprint = fingerprintScope(input.scope);

  if (!approvalId) {
    return invalid(
      'approvalId is required for approval artifact validation.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  const db = getDb();
  let artifact: {
    id: string;
    artifactType: string;
    jsonPayload: unknown;
  } | undefined;

  try {
    [artifact] = await db
      .select({
        id: builderArtifacts.id,
        artifactType: builderArtifacts.artifactType,
        jsonPayload: builderArtifacts.jsonPayload,
      })
      .from(builderArtifacts)
      .where(and(
        eq(builderArtifacts.id, approvalId),
        eq(builderArtifacts.artifactType, 'approval_ticket'),
      ))
      .limit(1);
  } catch {
    return invalid(
      'approval validation unavailable',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
      'db_unavailable',
    );
  }

  if (!artifact) {
    return invalid(
      'approvalId does not reference a builder_artifacts approval_ticket.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  const payload = asPayload(artifact.jsonPayload);
  const approvalKind = asString(payload.approval_kind);
  const artifactInstructionFingerprint = asString(payload.instruction_fingerprint);
  const artifactScopeFingerprint = asString(payload.scope_fingerprint);
  const sourceTaskId = asString(payload.source_task_id);
  const sourceRunId = asString(payload.source_run_id);

  if (approvalKind !== 'operator_gate_v1_3') {
    return invalid(
      'approval_ticket approval_kind must be operator_gate_v1_3.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  if (!isApprovedVerdict(payload.verdict)) {
    return invalid(
      'approval_ticket verdict must be approved.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  if (!artifactInstructionFingerprint || artifactInstructionFingerprint !== instructionFingerprint) {
    return invalid(
      'approval_ticket instruction_fingerprint mismatch.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  if (!artifactScopeFingerprint || artifactScopeFingerprint !== scopeFingerprint) {
    return invalid(
      'approval_ticket scope_fingerprint mismatch.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  const now = input.now ?? new Date();
  const expiresAt = parseExpiresAt(payload.expires_at);
  if (!expiresAt || expiresAt.getTime() <= now.getTime()) {
    return invalid(
      'approval_ticket expired or invalid expires_at.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  if (isConsumed(payload.consumed_at)) {
    return invalid(
      'approval_ticket already consumed (consumed_at is set).',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  if (input.sourceTaskId && sourceTaskId && input.sourceTaskId !== sourceTaskId) {
    return invalid(
      'approval_ticket source_task_id mismatch.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  if (input.sourceRunId && sourceRunId && input.sourceRunId !== sourceRunId) {
    return invalid(
      'approval_ticket source_run_id mismatch.',
      approvalId,
      instructionFingerprint,
      scopeFingerprint,
    );
  }

  return {
    valid: true,
    reason: 'approval_ticket is valid for this instruction and scope.',
    approvalId,
    instructionFingerprint,
    scopeFingerprint,
  };
}