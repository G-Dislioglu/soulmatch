import type { EditEnvelope } from './opusEnvelopeValidator.js';
import { extractExplicitPaths } from './opusAnchorPaths.js';

export type GateMode = 'shadow' | 'hard';
export type ImpactClass = 'low' | 'high';
export type ClaimRejectCode = 'missing_claims' | 'no_anchor';
export type ScopeCompatibility = 'compatible' | 'mismatch' | 'not_evaluated';

export interface DerivedClaimResult {
  text: string;
  anchorStatus: 'anchored' | 'no_anchor';
  scopeCompatibility: ScopeCompatibility;
  matchedRefs: string[];
  rejectCode?: ClaimRejectCode;
}

export interface CandidateGateResult {
  worker: string;
  mode: GateMode;
  impactClass: ImpactClass;
  blocked: boolean;
  rejectCodes: ClaimRejectCode[];
  claims: DerivedClaimResult[];
}

interface EvaluateCandidateClaimsParams {
  instruction: string;
  scopeFiles: string[];
  envelope: EditEnvelope;
  mode?: GateMode;
}

function uniqueRejectCodes(codes: ClaimRejectCode[]): ClaimRejectCode[] {
  return [...new Set(codes)];
}

function deriveScopeCompatibility(matchedRefs: string[], scopeFiles: string[]): ScopeCompatibility {
  const editPathRefs = matchedRefs
    .filter((ref) => ref.startsWith('edit_path:'))
    .map((ref) => ref.slice('edit_path:'.length));

  if (editPathRefs.length === 0) {
    return 'compatible';
  }

  return editPathRefs.every((path) => scopeFiles.includes(path)) ? 'compatible' : 'mismatch';
}

function matchEvidenceRef(
  ref: NonNullable<EditEnvelope['claims']>[number]['evidence_refs'][number],
  editedPaths: string[],
  scopeFiles: string[],
  explicitPaths: string[],
): string | null {
  if (ref.type === 'edit_path' && editedPaths.includes(ref.ref)) {
    return `edit_path:${ref.ref}`;
  }
  if (ref.type === 'scope_path' && scopeFiles.includes(ref.ref)) {
    return `scope_path:${ref.ref}`;
  }
  if (ref.type === 'explicit_path' && explicitPaths.includes(ref.ref)) {
    return `explicit_path:${ref.ref}`;
  }
  return null;
}

export function resolveGateMode(): GateMode {
  return process.env.F13_GATE_MODE === 'hard' ? 'hard' : 'shadow';
}

export function deriveImpactClass(envelope: EditEnvelope): ImpactClass {
  if (envelope.edits.length > 3) {
    return 'high';
  }

  const highImpactPaths = envelope.edits.some((edit) =>
    edit.path.startsWith('server/src/routes/')
    || edit.path.startsWith('server/src/schema/')
    || edit.path.startsWith('.github/workflows/')
    || edit.path === 'migration.sql'
    || edit.path === 'arcana_migration.sql',
  );

  return highImpactPaths ? 'high' : 'low';
}

export function evaluateCandidateClaims({
  instruction,
  scopeFiles,
  envelope,
  mode = resolveGateMode(),
}: EvaluateCandidateClaimsParams): CandidateGateResult {
  const explicitPaths = extractExplicitPaths(instruction);
  const editedPaths = envelope.edits.map((edit) => edit.path);
  const claims = envelope.claims ?? [];

  if (claims.length === 0) {
    return {
      worker: envelope.worker,
      mode,
      impactClass: deriveImpactClass(envelope),
      blocked: mode === 'hard',
      rejectCodes: ['missing_claims'],
      claims: [],
    };
  }

  const evaluatedClaims = claims.map((claim) => {
    const matchedRefs = claim.evidence_refs
      .map((ref) => matchEvidenceRef(ref, editedPaths, scopeFiles, explicitPaths))
      .filter((value): value is string => value !== null);

    if (matchedRefs.length === 0) {
      return {
        text: claim.text,
        anchorStatus: 'no_anchor' as const,
        scopeCompatibility: 'not_evaluated' as const,
        matchedRefs: [],
        rejectCode: 'no_anchor' as const,
      };
    }

    return {
      text: claim.text,
      anchorStatus: 'anchored' as const,
      scopeCompatibility: deriveScopeCompatibility(matchedRefs, scopeFiles),
      matchedRefs,
    };
  });

  const rejectCodes = uniqueRejectCodes(
    evaluatedClaims.reduce<ClaimRejectCode[]>((codes, claim) => {
      if (claim.rejectCode) {
        codes.push(claim.rejectCode);
      }
      return codes;
    }, []),
  );

  return {
    worker: envelope.worker,
    mode,
    impactClass: deriveImpactClass(envelope),
    blocked: mode === 'hard' && rejectCodes.length > 0,
    rejectCodes,
    claims: evaluatedClaims,
  };
}
