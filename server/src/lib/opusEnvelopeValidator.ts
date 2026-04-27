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

export interface AppliedDiffFileSnapshot {
  path: string;
  mode: 'patch';
  changed: boolean;
  changedSegmentsCount: number;
  changedSegmentsPreview: string[];
}

export interface AppliedDiffSnapshot {
  actualChangedFiles: string[];
  files: AppliedDiffFileSnapshot[];
}

export interface EnvelopeValidationResult {
  valid: boolean;
  errors: string[];
  appliedDiffSnapshot?: AppliedDiffSnapshot;
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

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function extractBalancedJsonCandidate(raw: string): string | null {
  const start = raw.search(/[\[{]/);
  if (start === -1) return null;

  const open = raw[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === open) depth += 1;
    if (char === close) depth -= 1;

    if (depth === 0) {
      return raw.slice(start, index + 1);
    }
  }

  return null;
}

function normalizeParsedEnvelope(parsed: unknown, worker: string): EditEnvelope | null {
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
}

function collectParseCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates = new Set<string>();
  if (trimmed.length > 0) candidates.add(trimmed);

  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of trimmed.matchAll(fencePattern)) {
    const fenced = match[1]?.trim();
    if (fenced) candidates.add(fenced);
  }

  const unfenced = trimmed.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
  if (unfenced.length > 0) candidates.add(unfenced);

  const balanced = extractBalancedJsonCandidate(trimmed);
  if (balanced) candidates.add(balanced.trim());

  return [...candidates];
}

// ─── Parse ───

/**
 * Parse raw worker response into an EditEnvelope.
 * Strips markdown code fences, validates required structure.
 * Returns null if parsing fails or structure is invalid.
 */
export function parseEnvelope(raw: string, worker: string): EditEnvelope | null {
  for (const candidate of collectParseCandidates(raw)) {
    const parsed = tryParseJson(candidate);
    if (parsed === null) continue;

    const normalized = normalizeParsedEnvelope(parsed, worker);
    if (normalized) return normalized;

    if (parsed && typeof parsed === 'object') {
      for (const key of ['answer', 'content', 'response', 'result', 'output']) {
        const nested = (parsed as Record<string, unknown>)[key];
        if (typeof nested !== 'string') continue;
        for (const nestedCandidate of collectParseCandidates(nested)) {
          const nestedParsed = tryParseJson(nestedCandidate);
          if (nestedParsed === null) continue;
          const nestedEnvelope = normalizeParsedEnvelope(nestedParsed, worker);
          if (nestedEnvelope) return nestedEnvelope;
        }
      }
    }
  }

  return null;
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

function countExactOccurrences(source: string, search: string): number {
  if (search.length === 0) return 0;

  let count = 0;
  let fromIndex = 0;

  while (fromIndex <= source.length - search.length) {
    const foundIndex = source.indexOf(search, fromIndex);
    if (foundIndex === -1) break;
    count += 1;
    fromIndex = foundIndex + search.length;
  }

  return count;
}

function compactDiffPreview(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 80);
}

function validatePatchEdits(
  envelope: EditEnvelope,
  edits: EditEnvelope['edits'],
  originalFileContents?: Map<string, string>,
): { errors: string[]; appliedDiffSnapshot?: AppliedDiffSnapshot } {
  const errors: string[] = [];
  const hasPatchEdits = edits.some((edit) => edit.mode === 'patch');

  if (!hasPatchEdits || !originalFileContents) {
    return { errors };
  }

  const files: AppliedDiffFileSnapshot[] = [];

  for (const edit of edits) {
    if (edit.mode !== 'patch') continue;

    const originalContent = originalFileContents.get(edit.path);
    const fileSnapshot: AppliedDiffFileSnapshot = {
      path: edit.path,
      mode: 'patch',
      changed: false,
      changedSegmentsCount: 0,
      changedSegmentsPreview: [],
    };

    if (typeof originalContent !== 'string') {
      errors.push(`Patch search anchor not found: ${edit.path}`);
      files.push(fileSnapshot);
      continue;
    }

    const patches = edit.patches ?? [];
    let updatedContent = originalContent;
    let patchFailed = false;

    for (const patch of patches) {
      const matchCount = countExactOccurrences(originalContent, patch.search);

      if (matchCount === 0) {
        errors.push(`Patch search anchor not found: ${edit.path}`);
        patchFailed = true;
        continue;
      }

      if (matchCount > 1) {
        errors.push(`Ambiguous patch search anchor in ${edit.path}: matched ${matchCount} times`);
        patchFailed = true;
        continue;
      }

      if (patch.search === patch.replace) {
        errors.push(`Patch replace does not change content: ${edit.path}`);
        patchFailed = true;
        continue;
      }

      if (!updatedContent.includes(patch.search)) {
        errors.push(`Patch search anchor not found: ${edit.path}`);
        patchFailed = true;
        continue;
      }

      const nextContent = updatedContent.replace(patch.search, patch.replace);
      if (nextContent === updatedContent) {
        errors.push(`Patch replace does not change content: ${edit.path}`);
        patchFailed = true;
        continue;
      }

      fileSnapshot.changedSegmentsCount += 1;
      fileSnapshot.changedSegmentsPreview.push(
        `${compactDiffPreview(patch.search)} => ${compactDiffPreview(patch.replace)}`,
      );
      updatedContent = nextContent;
    }

    if (!patchFailed && updatedContent === originalContent) {
      errors.push(`Patch replace does not change content: ${edit.path}`);
    }

    fileSnapshot.changed = !patchFailed && updatedContent !== originalContent;
    files.push(fileSnapshot);

    if (!fileSnapshot.changed) {
      errors.push(`Patch edit path does not change content: ${edit.path}`);
    }
  }

  const actualChangedFiles = files.filter((file) => file.changed).map((file) => file.path);
  const appliedDiffSnapshot: AppliedDiffSnapshot = {
    actualChangedFiles,
    files,
  };

  if (actualChangedFiles.length === 0) {
    errors.push('Applied patch diff is empty');
    if ((envelope.claims?.length ?? 0) > 0) {
      errors.push('Claims present without applied patch diff');
    }
    if (envelope.summary.trim().length > 0) {
      errors.push('Summary present without applied patch diff');
    }
  }

  for (const claim of envelope.claims ?? []) {
    for (const ref of claim.evidence_refs) {
      if (ref.type !== 'edit_path') continue;
      if (!actualChangedFiles.includes(ref.ref)) {
        errors.push(`Claim edit_path does not match applied diff: ${ref.ref}`);
      }
    }
  }

  return { errors, appliedDiffSnapshot };
}

// ─── Validate ───

/**
 * Validate an envelope against scope files.
 * Checks that edits are in scope (unless create mode) and content is substantial.
 * Also runs TypeScript syntax check.
 */
export function validateEnvelope(
  envelope: EditEnvelope,
  scopeFiles: string[],
  originalFileContents?: Map<string, string>,
): EnvelopeValidationResult {
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
  const patchValidation = validatePatchEdits(envelope, envelope.edits, originalFileContents);
  errors.push(...patchValidation.errors);
  errors.push(...checkTypeScriptSyntax(envelope.edits));
  return {
    valid: errors.length === 0,
    errors,
    appliedDiffSnapshot: patchValidation.appliedDiffSnapshot,
  };
}
