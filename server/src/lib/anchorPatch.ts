type PatchPair = { search: string; replace: string };

export type EditOperation =
  | { mode: 'overwrite'; path?: string; content: string }
  | { mode: 'replace'; path?: string; search: string; replace: string }
  | { mode: 'patch'; path?: string; patches: PatchPair[] }
  | { mode: 'insert-before'; path?: string; anchor: string; content: string; anchorOffset?: number }
  | { mode: 'insert-after'; path?: string; anchor: string; content: string; anchorOffset?: number }
  | { mode: 'replace-block'; path?: string; startAnchor: string; endAnchor: string; content: string; inclusive?: boolean };

export const ANCHOR_PATCH_PROMPT = [
  'Antworte NUR mit genau EINEM JSON-Objekt fuer den Edit.',
  'Keine Markdown-Fences, kein Fliesstext, keine Erklaerung.',
  'Der path-Wert MUSS exakt der zugewiesenen Datei entsprechen.',
  'Erlaubte Modi:',
  '- {"mode":"patch","path":"file.ts","patches":[{"search":"exakter alter Text","replace":"exakter neuer Text"}]}',
  '- {"mode":"insert-after","path":"file.ts","anchor":"eindeutiger Anker","content":"einzufuegender Text nach dem Anker"}',
  '- {"mode":"insert-before","path":"file.ts","anchor":"eindeutiger Anker","content":"einzufuegender Text vor dem Anker"}',
  '- {"mode":"replace-block","path":"file.ts","startAnchor":"Start-Anker","endAnchor":"End-Anker","content":"neuer Block"}',
  '- {"mode":"overwrite","path":"file.ts","content":"vollstaendiger neuer Dateiinhalt"} nur als letzte Option.',
  'Regeln:',
  '- search/anchor muessen exakt zum aktuellen Dateiinhalt passen.',
  '- insert/replace-block nur mit eindeutigen Anchors verwenden.',
  '- Behalte Einrueckung, Zeilenumbrueche und Stil der Datei exakt bei.',
].join('\n');

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json|typescript)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function countOccurrences(source: string, target: string): number {
  if (!target) {
    return 0;
  }

  let count = 0;
  let index = 0;
  while (true) {
    const nextIndex = source.indexOf(target, index);
    if (nextIndex < 0) {
      return count;
    }
    count += 1;
    index = nextIndex + target.length;
  }
}

function findUniqueAnchorIndex(source: string, anchor: string): { index: number; error?: string } {
  const count = countOccurrences(source, anchor);
  if (count === 0) {
    return { index: -1, error: 'anchor not found in file' };
  }
  if (count > 1) {
    return { index: -1, error: 'anchor is not unique in file' };
  }
  return { index: source.indexOf(anchor) };
}

function parseLegacySearchReplace(raw: string): EditOperation | null {
  const lines = raw.split(/\r?\n/);
  const searchLines: string[] = [];
  const replaceLines: string[] = [];
  let mode: 'search' | 'replace' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('<<<SEARCH')) {
      mode = 'search';
      continue;
    }
    if (trimmed === '===REPLACE') {
      mode = 'replace';
      continue;
    }
    if (trimmed === '>>>') {
      break;
    }
    if (mode === 'search') {
      searchLines.push(line);
    } else if (mode === 'replace') {
      replaceLines.push(line);
    }
  }

  if (mode === null) {
    return null;
  }

  const search = searchLines.join('\n');
  const replace = replaceLines.join('\n');
  if (!search) {
    return { mode: 'overwrite', content: replace };
  }
  return { mode: 'patch', patches: [{ search, replace }] };
}

function normalizeMode(mode: string): EditOperation['mode'] {
  switch (mode) {
    case 'insert_after':
      return 'insert-after';
    case 'insert_before':
      return 'insert-before';
    case 'replace':
    case 'patch':
    case 'overwrite':
    case 'insert-after':
    case 'insert-before':
    case 'replace-block':
      return mode;
    case 'replace_block':
      return 'replace-block';
    default:
      throw new Error(`Unknown edit mode: ${mode}`);
  }
}

function normalizeOperation(value: unknown): EditOperation {
  if (!value || typeof value !== 'object') {
    throw new Error('Worker edit is not an object');
  }

  const candidate = value as Record<string, unknown>;
  const mode = normalizeMode(typeof candidate.mode === 'string' ? candidate.mode : '');
  const path = typeof candidate.path === 'string' ? candidate.path : undefined;

  if (mode === 'overwrite') {
    if (typeof candidate.content !== 'string') {
      throw new Error('overwrite requires content');
    }
    return { mode, path, content: candidate.content };
  }

  if (mode === 'patch' || mode === 'replace') {
    if (Array.isArray(candidate.patches)) {
      return {
        mode: 'patch',
        path,
        patches: candidate.patches.map((entry) => {
          const pair = entry as Record<string, unknown>;
          return {
            search: String(pair.search ?? ''),
            replace: String(pair.replace ?? ''),
          };
        }),
      };
    }

    if (typeof candidate.search === 'string' && typeof candidate.replace === 'string') {
      return { mode: 'replace', path, search: candidate.search, replace: candidate.replace };
    }

    throw new Error(`${mode} requires patches[] or search/replace`);
  }

  if (mode === 'insert-before' || mode === 'insert-after') {
    if (typeof candidate.anchor !== 'string' || typeof candidate.content !== 'string') {
      throw new Error(`${mode} requires anchor and content`);
    }
    return {
      mode,
      path,
      anchor: candidate.anchor,
      content: candidate.content,
      ...(typeof candidate.anchorOffset === 'number' ? { anchorOffset: candidate.anchorOffset } : {}),
    };
  }

  if (typeof candidate.startAnchor !== 'string' || typeof candidate.endAnchor !== 'string' || typeof candidate.content !== 'string') {
    throw new Error('replace-block requires startAnchor, endAnchor and content');
  }

  return {
    mode,
    path,
    startAnchor: candidate.startAnchor,
    endAnchor: candidate.endAnchor,
    content: candidate.content,
    ...(typeof candidate.inclusive === 'boolean' ? { inclusive: candidate.inclusive } : {}),
  };
}

export function parseWorkerEdit(rawOutput: string): EditOperation {
  const cleaned = stripCodeFences(rawOutput);
  const legacy = parseLegacySearchReplace(cleaned);
  if (legacy) {
    return legacy;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Worker edit is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      throw new Error('Worker edit array must contain exactly one operation');
    }
    return normalizeOperation(parsed[0]);
  }

  const wrapped = parsed as Record<string, unknown>;
  if (wrapped.edit && typeof wrapped.edit === 'object') {
    return normalizeOperation(wrapped.edit);
  }
  if (wrapped.operation && typeof wrapped.operation === 'object') {
    return normalizeOperation(wrapped.operation);
  }

  return normalizeOperation(parsed);
}

export function validateEdit(fileContent: string | undefined, parsed: EditOperation): string | null {
  const source = fileContent ?? '';

  switch (parsed.mode) {
    case 'overwrite':
      return null;
    case 'replace': {
      if (!parsed.search) {
        return 'replace requires a non-empty search block';
      }
      return source.includes(parsed.search) ? null : `replace search block not found in file: ${parsed.search.slice(0, 60)}`;
    }
    case 'patch': {
      for (const patch of parsed.patches) {
        if (!patch.search) {
          return 'patch requires a non-empty search block';
        }
        if (!source.includes(patch.search)) {
          return `patch search block not found in file: ${patch.search.slice(0, 60)}`;
        }
      }
      return null;
    }
    case 'insert-before':
    case 'insert-after':
      return findUniqueAnchorIndex(source, parsed.anchor).error ?? null;
    case 'replace-block': {
      const start = findUniqueAnchorIndex(source, parsed.startAnchor);
      if (start.error) {
        return `start ${start.error}`;
      }
      const end = findUniqueAnchorIndex(source, parsed.endAnchor);
      if (end.error) {
        return `end ${end.error}`;
      }
      if (end.index <= start.index) {
        return 'end anchor must come after start anchor';
      }
      return null;
    }
  }
}

export function applyEdit(fileContent: string | undefined, parsed: EditOperation): { success: boolean; newContent: string; error?: string } {
  const source = fileContent ?? '';
  const validationError = validateEdit(fileContent, parsed);
  if (validationError) {
    return { success: false, newContent: source, error: validationError };
  }

  switch (parsed.mode) {
    case 'overwrite':
      return { success: true, newContent: parsed.content };
    case 'replace':
      return { success: true, newContent: source.replace(parsed.search, parsed.replace) };
    case 'patch': {
      let nextContent = source;
      for (const patch of parsed.patches) {
        nextContent = nextContent.replace(patch.search, patch.replace);
      }
      return { success: true, newContent: nextContent };
    }
    case 'insert-before':
    case 'insert-after': {
      const anchorInfo = findUniqueAnchorIndex(source, parsed.anchor);
      if (anchorInfo.error) {
        return { success: false, newContent: source, error: anchorInfo.error };
      }
      const anchorIndex = anchorInfo.index;
      const anchorEnd = anchorIndex + parsed.anchor.length;
      return parsed.mode === 'insert-before'
        ? { success: true, newContent: `${source.slice(0, anchorIndex)}${parsed.content}${source.slice(anchorIndex)}` }
        : { success: true, newContent: `${source.slice(0, anchorEnd)}${parsed.content}${source.slice(anchorEnd)}` };
    }
    case 'replace-block': {
      const startInfo = findUniqueAnchorIndex(source, parsed.startAnchor);
      const endInfo = findUniqueAnchorIndex(source, parsed.endAnchor);
      if (startInfo.error || endInfo.error || endInfo.index < 0 || startInfo.index < 0) {
        return { success: false, newContent: source, error: startInfo.error || endInfo.error || 'replace-block anchors invalid' };
      }
      const startIndex = parsed.inclusive ? startInfo.index : startInfo.index + parsed.startAnchor.length;
      const endIndex = parsed.inclusive ? endInfo.index + parsed.endAnchor.length : endInfo.index;
      return {
        success: true,
        newContent: `${source.slice(0, startIndex)}${parsed.content}${source.slice(endIndex)}`,
      };
    }
  }
}
