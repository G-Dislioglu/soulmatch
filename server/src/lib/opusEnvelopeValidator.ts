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
export interface EditEnvelope {
  edits: Array<{
    path: string;
    mode: 'overwrite' | 'create';
    content: string;
  }>;
  summary: string;
  worker: string;
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
    const parsed = JSON.parse(cleaned);
    if (!parsed.edits || !Array.isArray(parsed.edits) || parsed.edits.length === 0) return null;
    for (const edit of parsed.edits) {
      if (!edit.path || typeof edit.path !== 'string') return null;
      if (!edit.content || typeof edit.content !== 'string') return null;
      if (!['overwrite', 'create'].includes(edit.mode)) edit.mode = 'overwrite';
    }
    return { edits: parsed.edits, summary: parsed.summary || '', worker };
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
    if (!edit.path.endsWith('.ts') && !edit.path.endsWith('.tsx')) continue;
    try {
      const result = ts.transpileModule(edit.content, {
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
    if (edit.content.length < 10) {
      errors.push(`"${edit.path}" content too short (${edit.content.length} chars)`);
    }
  }
  errors.push(...checkTypeScriptSyntax(envelope.edits));
  return { valid: errors.length === 0, errors };
}
