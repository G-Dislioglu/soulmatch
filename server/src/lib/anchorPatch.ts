/**
 * Anchor-Patch Module — Opus-Bridge v4.1
 *
 * Enables surgical edits in large files without full-file-overwrite.
 * Workers specify an anchor pattern + new content → module handles insertion.
 *
 * Supported modes:
 *   - insert-after:   Insert content after the anchor line
 *   - insert-before:  Insert content before the anchor line
 *   - replace-block:  Replace everything between startAnchor and endAnchor
 *   - patch:          Existing search/replace mode (unchanged)
 *   - overwrite:      Existing full-file mode (unchanged)
 */

// ─── Types ───

export interface AnchorInsert {
  mode: 'insert-after' | 'insert-before';
  path: string;
  anchor: string;        // Unique line/pattern to find in the file
  content: string;       // New code to insert
  anchorOffset?: number; // Optional: skip N lines after/before anchor (default 0)
}

export interface AnchorReplaceBlock {
  mode: 'replace-block';
  path: string;
  startAnchor: string;   // Pattern marking start of block to replace
  endAnchor: string;     // Pattern marking end of block to replace
  content: string;       // New code to replace the block with
  inclusive?: boolean;    // Replace anchors themselves too? (default false)
}

export interface ClassicPatch {
  mode: 'patch';
  path: string;
  patches: Array<{ search: string; replace: string }>;
}

export interface FullOverwrite {
  mode: 'overwrite';
  path: string;
  content: string;
}

export type EditOperation = AnchorInsert | AnchorReplaceBlock | ClassicPatch | FullOverwrite;

// ─── Result ───

export interface ApplyResult {
  success: boolean;
  path: string;
  mode: string;
  newContent?: string;
  error?: string;
  anchorLine?: number;   // Line number where anchor was found
  linesAdded?: number;
  linesRemoved?: number;
}

// ─── Core Logic ───

/**
 * Find the line number of an anchor pattern in file content.
 * Returns -1 if not found, throws if found multiple times.
 */
function findAnchorLine(lines: string[], anchor: string): number {
  const trimmedAnchor = anchor.trim();
  const matches: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(trimmedAnchor)) {
      matches.push(i);
    }
  }

  if (matches.length === 0) return -1;
  if (matches.length > 1) {
    // Try exact trim match as tiebreaker
    const exact = matches.filter(i => lines[i].trim() === trimmedAnchor);
    if (exact.length === 1) return exact[0];
    // Return first match but log warning — caller can decide
    return matches[0];
  }
  return matches[0];
}

/**
 * Apply an insert-after or insert-before operation.
 */
function applyAnchorInsert(fileContent: string, op: AnchorInsert): ApplyResult {
  const lines = fileContent.split('\n');
  const anchorIdx = findAnchorLine(lines, op.anchor);

  if (anchorIdx === -1) {
    return {
      success: false,
      path: op.path,
      mode: op.mode,
      error: `Anchor not found: "${op.anchor.substring(0, 80)}"`,
    };
  }

  const offset = op.anchorOffset ?? 0;
  const insertIdx = op.mode === 'insert-after'
    ? anchorIdx + 1 + offset
    : anchorIdx - offset;

  const clampedIdx = Math.max(0, Math.min(lines.length, insertIdx));
  const newLines = op.content.split('\n');

  lines.splice(clampedIdx, 0, ...newLines);

  return {
    success: true,
    path: op.path,
    mode: op.mode,
    newContent: lines.join('\n'),
    anchorLine: anchorIdx + 1, // 1-indexed for human readability
    linesAdded: newLines.length,
    linesRemoved: 0,
  };
}

/**
 * Apply a replace-block operation.
 */
function applyReplaceBlock(fileContent: string, op: AnchorReplaceBlock): ApplyResult {
  const lines = fileContent.split('\n');
  const startIdx = findAnchorLine(lines, op.startAnchor);
  const endIdx = findAnchorLine(lines, op.endAnchor);

  if (startIdx === -1) {
    return {
      success: false, path: op.path, mode: op.mode,
      error: `Start anchor not found: "${op.startAnchor.substring(0, 80)}"`,
    };
  }
  if (endIdx === -1) {
    return {
      success: false, path: op.path, mode: op.mode,
      error: `End anchor not found: "${op.endAnchor.substring(0, 80)}"`,
    };
  }
  if (endIdx <= startIdx) {
    return {
      success: false, path: op.path, mode: op.mode,
      error: `End anchor (line ${endIdx + 1}) must come after start anchor (line ${startIdx + 1})`,
    };
  }

  const inclusive = op.inclusive ?? false;
  const removeStart = inclusive ? startIdx : startIdx + 1;
  const removeEnd = inclusive ? endIdx + 1 : endIdx;
  const removeCount = removeEnd - removeStart;
  const newLines = op.content.split('\n');

  lines.splice(removeStart, removeCount, ...newLines);

  return {
    success: true,
    path: op.path,
    mode: op.mode,
    newContent: lines.join('\n'),
    anchorLine: startIdx + 1,
    linesAdded: newLines.length,
    linesRemoved: removeCount,
  };
}

/**
 * Apply a classic search/replace patch.
 */
function applyClassicPatch(fileContent: string, op: ClassicPatch): ApplyResult {
  let content = fileContent;
  let totalAdded = 0;
  let totalRemoved = 0;

  for (const patch of op.patches) {
    const searchTrimmed = patch.search.trim();
    if (!content.includes(searchTrimmed)) {
      return {
        success: false, path: op.path, mode: 'patch',
        error: `Search pattern not found: "${searchTrimmed.substring(0, 80)}"`,
      };
    }
    const before = content.split('\n').length;
    content = content.replace(searchTrimmed, patch.replace);
    const after = content.split('\n').length;
    totalAdded += Math.max(0, after - before);
    totalRemoved += Math.max(0, before - after);
  }

  return {
    success: true,
    path: op.path,
    mode: 'patch',
    newContent: content,
    linesAdded: totalAdded,
    linesRemoved: totalRemoved,
  };
}

// ─── Public API ───

/**
 * Apply any edit operation to file content.
 * This is the single entry point for the validation phase.
 */
export function applyEdit(fileContent: string, op: EditOperation): ApplyResult {
  switch (op.mode) {
    case 'insert-after':
    case 'insert-before':
      return applyAnchorInsert(fileContent, op);
    case 'replace-block':
      return applyReplaceBlock(fileContent, op);
    case 'patch':
      return applyClassicPatch(fileContent, op);
    case 'overwrite':
      return {
        success: true,
        path: op.path,
        mode: 'overwrite',
        newContent: op.content,
        linesAdded: op.content.split('\n').length,
        linesRemoved: fileContent.split('\n').length,
      };
    default:
      return {
        success: false,
        path: (op as EditOperation).path ?? 'unknown',
        mode: String((op as Record<string, unknown>).mode ?? 'unknown'),
        error: `Unknown edit mode: ${(op as Record<string, unknown>).mode}`,
      };
  }
}

/**
 * Parse a worker's raw JSON output into an EditOperation.
 * Handles the new anchor modes + classic modes.
 */
export function parseWorkerEdit(raw: string): EditOperation | null {
  try {
    let cleaned = raw.trim();
    // Strip markdown fences
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json|typescript)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const parsed = JSON.parse(cleaned);

    // Validate required fields based on mode
    if (!parsed.mode || !parsed.path) return null;

    switch (parsed.mode) {
      case 'insert-after':
      case 'insert-before':
        if (!parsed.anchor || !parsed.content) return null;
        return {
          mode: parsed.mode,
          path: parsed.path,
          anchor: parsed.anchor,
          content: parsed.content,
          anchorOffset: parsed.anchorOffset,
        };

      case 'replace-block':
        if (!parsed.startAnchor || !parsed.endAnchor || !parsed.content) return null;
        return {
          mode: parsed.mode,
          path: parsed.path,
          startAnchor: parsed.startAnchor,
          endAnchor: parsed.endAnchor,
          content: parsed.content,
          inclusive: parsed.inclusive,
        };

      case 'patch':
        if (!Array.isArray(parsed.patches)) return null;
        return {
          mode: 'patch',
          path: parsed.path,
          patches: parsed.patches,
        };

      case 'overwrite':
        if (typeof parsed.content !== 'string') return null;
        return {
          mode: 'overwrite',
          path: parsed.path,
          content: parsed.content,
        };

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Validate an edit operation against the actual file content.
 * Returns error string if invalid, null if valid.
 */
export function validateEdit(fileContent: string, op: EditOperation): string | null {
  switch (op.mode) {
    case 'insert-after':
    case 'insert-before': {
      const lines = fileContent.split('\n');
      const idx = findAnchorLine(lines, (op as AnchorInsert).anchor);
      if (idx === -1) return `Anchor not found: "${(op as AnchorInsert).anchor.substring(0, 60)}"`;
      if (!(op as AnchorInsert).content.trim()) return 'Content is empty';
      return null;
    }
    case 'replace-block': {
      const rb = op as AnchorReplaceBlock;
      const lines = fileContent.split('\n');
      const s = findAnchorLine(lines, rb.startAnchor);
      const e = findAnchorLine(lines, rb.endAnchor);
      if (s === -1) return `Start anchor not found: "${rb.startAnchor.substring(0, 60)}"`;
      if (e === -1) return `End anchor not found: "${rb.endAnchor.substring(0, 60)}"`;
      if (e <= s) return 'End anchor must come after start anchor';
      return null;
    }
    case 'patch': {
      for (const p of (op as ClassicPatch).patches) {
        if (!fileContent.includes(p.search.trim())) {
          return `Search not found: "${p.search.trim().substring(0, 60)}"`;
        }
      }
      return null;
    }
    case 'overwrite':
      return null;
    default:
      return `Unknown mode: ${(op as Record<string, unknown>).mode}`;
  }
}

/**
 * Worker prompt snippet for anchor-patch modes.
 * Append this to the worker system prompt so workers know about the new modes.
 */
export const ANCHOR_PATCH_PROMPT = `
EDIT MODES (choose the most efficient one):

1. **patch** (preferred for small changes in existing code):
   {"mode":"patch","path":"file.ts","patches":[{"search":"old code","replace":"new code"}]}

2. **insert-after** (preferred for adding NEW code to a file):
   {"mode":"insert-after","path":"file.ts","anchor":"unique line to find","content":"new code to insert after that line"}

3. **insert-before** (insert before a specific line):
   {"mode":"insert-before","path":"file.ts","anchor":"unique line","content":"new code before it"}

4. **replace-block** (replace a section between two anchors):
   {"mode":"replace-block","path":"file.ts","startAnchor":"// --- START","endAnchor":"// --- END","content":"replacement code"}

5. **overwrite** (LAST RESORT — only if 70%+ of the file changes):
   {"mode":"overwrite","path":"file.ts","content":"entire new file content"}

RULES:
- Use patch or insert-after/before for files > 200 lines. NEVER overwrite large files.
- Anchors must be UNIQUE lines in the file. Use function signatures, comments, or export lines.
- Content must be valid TypeScript with correct indentation.
- Respond with ONLY the JSON edit object, no other text.
`;
