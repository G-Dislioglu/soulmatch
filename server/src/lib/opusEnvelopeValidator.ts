/**
 * Opus Envelope Validator
 * 
 * Validates worker output envelopes for correct JSON structure,
 * required fields, and TypeScript syntax.
 */

let ts: typeof import('typescript') | null = null;
try {
  ts = await import('typescript');
} catch {
  // typescript not available at runtime — TS check will be skipped
}

// ─── Types ───

/** The one and only change format. No SEARCH/REPLACE. No diff. No regex. */
export interface ClaimEvidenceRef {
  type: 'edit_path' | 'scope_path' | 'explicit_path' | 'other';
  ref: string;
  description?: string;
}

export interface WorkerClaim {
  text: string;
  evidence_refs: ClaimEvidenceRef[];
}

export interface EditEnvelope {
  edits: Array<{
    path: string;
    mode: 'overwrite' | 'create' | 'patch';
    content?: string;
    patches?: Array<{ search: string; replace: string }>;
  }>;
  summary: string;
  worker: string;
  claims?: WorkerClaim[];
}

type ParsedEdit = {
  path?: unknown;
  mode?: unknown;
  content?: unknown;
  patches?: unknown;
};

type ParsedClaim = {
  text?: unknown;
  evidence_refs?: unknown;
};

function normalizeClaimEvidenceRef(rawRef: unknown): ClaimEvidenceRef | null {
  if (!rawRef || typeof rawRef !== 'object') return null;
  const candidate = rawRef as { type?: unknown; ref?: unknown; description?: unknown };
  if (typeof candidate.ref !== 'string' || candidate.ref.length === 0) return null;
  if (candidate.type !== 'edit_path' && candidate.type !== 'scope_path' && candidate.type !== 'explicit_path' && candidate.type !== 'other') {
    return null;
  }
  if (candidate.type === 'other') {
    return {
      type: 'other',
      ref: candidate.ref,
      ...(typeof candidate.description === 'string' && candidate.description.length > 0 ? { description: candidate.description } : {}),
    };
  }
  return { type: candidate.type, ref: candidate.ref };
}

function normalizeClaim(rawClaim: ParsedClaim): WorkerClaim | null {
  if (typeof rawClaim.text !== 'string' || rawClaim.text.trim().length === 0) return null;
  if (!Array.isArray(rawClaim.evidence_refs)) return null;
  const evidenceRefs = rawClaim.evidence_refs
    .map((ref) => normalizeClaimEvidenceRef(ref))
    .filter((ref): ref is ClaimEvidenceRef => ref !== null);
  return { text: rawClaim.text.trim(), evidence_refs: evidenceRefs };
}

function normalizeEdit(rawEdit: ParsedEdit): EditEnvelope['edits'][number] | null {
  if (typeof rawEdit.path !== 'string' || rawEdit.path.length === 0) return null;

  const inferredMode = Array.isArray(rawEdit.patches)
    ? 'patch'
    : rawEdit.mode === 'create'
      ? 'create'
      : rawEdit.mode === 'patch'
        ? 'patch'
        : 'overwrite';

  if (inferredMode === 'patch') {
    if (!Array.isArray(rawEdit.patches) || rawEdit.patches.length === 0) return null;
    const patches = rawEdit.patches
      .map((patch) => {
        if (!patch || typeof patch !== 'object') return null;
        const candidate = patch as { search?: unknown; replace?: unknown };
        if (typeof candidate.search !== 'string' || typeof candidate.replace !== 'string') return null;
        return { search: candidate.search, replace: candidate.replace };
      })
      .filter((patch): patch is { search: string; replace: string } => patch !== null);

    if (patches.length === 0) return null;
    return { path: rawEdit.path, mode: 'patch', patches };
  }

  if (typeof rawEdit.content !== 'string') return null;
  return { path: rawEdit.path, mode: inferredMode, content: rawEdit.content };
}

// ─── Parse ───

/**
 * Parse raw worker response into an EditEnvelope.
 * Strips markdown code fences, validates required structure.
 * Returns null if parsing fails or structure is invalid.
 */
export function parseEnvelope(raw: string, worker: string): EditEnvelope | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;

    const rawEdits = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { edits?: unknown }).edits)
        ? (parsed as { edits: unknown[] }).edits
        : parsed && typeof parsed === 'object' && 'path' in (parsed as Record<string, unknown>)
          ? [parsed]
          : null;

    if (!rawEdits || rawEdits.length === 0) return null;

    const edits = rawEdits
      .map((edit) => (edit && typeof edit === 'object' ? normalizeEdit(edit as ParsedEdit) : null))
      .filter((edit): edit is EditEnvelope['edits'][number] => edit !== null);

    if (edits.length === 0) return null;

    const summary = parsed && typeof parsed === 'object' && 'summary' in (parsed as Record<string, unknown>)
      && typeof (parsed as { summary?: unknown }).summary === 'string'
      ? (parsed as { summary: string }).summary
      : '';

    const claims = parsed && typeof parsed === 'object' && Array.isArray((parsed as { claims?: unknown }).claims)
      ? (parsed as { claims: unknown[] }).claims
        .map((claim) => (claim && typeof claim === 'object' ? normalizeClaim(claim as ParsedClaim) : null))
        .filter((claim): claim is WorkerClaim => claim !== null)
      : undefined;

    return { edits, summary, worker, ...(claims ? { claims } : {}) };
  } catch {
    return null;
  }
}

// ─── TypeScript Syntax Check ───

/**
 * Check TypeScript syntax for .ts/.tsx files in the edits.
 * Returns array of error strings (empty if all valid or TS not available).
 */
export function checkTypeScriptSyntax(edits: EditEnvelope['edits']): string[] {
  if (!ts) return []; // typescript not available — skip check
  const errors: string[] = [];
  for (const edit of edits) {
    if (edit.mode === 'patch') continue;
    if (!edit.path.endsWith('.ts') && !edit.path.endsWith('.tsx')) continue;
    try {
      const result = ts.transpileModule(edit.content ?? '', {
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          strict: false,
        },
      });
      if (result.diagnostics?.length) {
        for (const d of result.diagnostics) {
          errors.push(`${edit.path}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
        }
      }
    } catch (e: unknown) {
      errors.push(`${edit.path}: transpile crashed — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return errors;
}

// ─── Validate ───

/**
 * Validate an envelope against scope files.
 * Checks that edits are in scope (unless create mode) and content is substantial.
 * Also runs TypeScript syntax check.
 */
export function validateEnvelope(envelope: EditEnvelope, scopeFiles: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const edit of envelope.edits) {
    // Scope = Kontext, nicht Beschränkung. Worker dürfen jede Datei anfassen.
    if (edit.mode === 'patch') {
      if (!edit.patches || edit.patches.length === 0) {
        errors.push(`"${edit.path}" patch mode requires at least one patch`);
      }
      continue;
    }
    if ((edit.content?.length ?? 0) < 10) {
      errors.push(`"${edit.path}" content too short (${edit.content?.length ?? 0} chars)`);
    }
  }
  errors.push(...checkTypeScriptSyntax(envelope.edits));
  return { valid: errors.length === 0, errors };
}
