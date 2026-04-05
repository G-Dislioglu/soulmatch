export interface BdlCommand {
  kind: string;
  params: Record<string, string>;
  body?: string;
  raw: string;
}

const KNOWN_KINDS = new Set([
  'TASK',
  'CLASSIFY',
  'READ',
  'READ_UI',
  'READ_STYLES',
  'TRACE_FLOW',
  'FIND_PATTERN',
  'PLAN',
  'PATCH',
  'APPLY',
  'CHECK',
  'REVIEW',
  'APPROVE',
  'REQUEST_CHANGE',
  'BLOCK',
  'OBSERVE',
  'STAGE',
  'COMMIT',
  'STATUS',
  'SAY',
  'AGREE',
  'DISAGREE',
  'CALL',
  'EXPECT',
  'EXPECT_JSON',
  'DB_READ',
  'DB_VERIFY',
  'DB_COUNT',
  'READ_LOGS',
  'COUNTEREXAMPLE',
  'FAILURE_PATH',
  'GOLDEN_PATH',
  'SEARCH',
]);

function parseParams(input: string) {
  const params: Record<string, string> = {};
  let index = 0;
  let positionalIndex = 1;

  while (index < input.length) {
    while (index < input.length && /\s/.test(input[index])) {
      index += 1;
    }

    if (index >= input.length) {
      break;
    }

    let token = '';
    let inQuotes = false;

    while (index < input.length) {
      const char = input[index];
      if (char === '"' && input[index - 1] !== '\\') {
        inQuotes = !inQuotes;
        token += char;
        index += 1;
        continue;
      }

      if (!inQuotes && /\s/.test(char)) {
        break;
      }

      token += char;
      index += 1;
    }

    if (!token) {
      continue;
    }

    const colonIndex = token.indexOf(':');
    if (colonIndex > 0) {
      const key = token.slice(0, colonIndex).trim();
      const rawValue = token.slice(colonIndex + 1).trim();
      const value = rawValue.replace(/^"|"$/g, '').replace(/\\"/g, '"');
      params[key] = value;
    } else {
      params[`arg${positionalIndex}`] = token.replace(/^"|"$/g, '').replace(/\\"/g, '"');
      positionalIndex += 1;
    }
  }

  return params;
}

function parseCommandAt(lines: string[], startIndex: number) {
  const line = lines[startIndex] ?? '';
  const trimmed = line.trimStart();
  const braceIndex = trimmed.indexOf('{');
  const header = (braceIndex >= 0 ? trimmed.slice(0, braceIndex) : trimmed).trim();
  const commandHeader = header.slice(1).trim();
  const firstSpace = commandHeader.search(/\s/);
  const rawKind = firstSpace === -1 ? commandHeader : commandHeader.slice(0, firstSpace);
  const kind = rawKind.toUpperCase();
  const paramsPart = firstSpace === -1 ? '' : commandHeader.slice(firstSpace + 1).trim();
  const params = parseParams(paramsPart);

  if (braceIndex < 0) {
    return {
      command: {
        kind: KNOWN_KINDS.has(kind) ? kind : kind,
        params,
        raw: line,
      } satisfies BdlCommand,
      endIndex: startIndex,
    };
  }

  const rawLines: string[] = [];
  const bodyChars: string[] = [];
  let depth = 0;
  let inBody = false;
  let endIndex = startIndex;

  for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex += 1) {
    const currentLine = lines[lineIndex] ?? '';
    rawLines.push(currentLine);
    const startChar = lineIndex === startIndex ? currentLine.indexOf('{') : 0;

    for (let charIndex = startChar; charIndex < currentLine.length; charIndex += 1) {
      const char = currentLine[charIndex];
      if (!inBody) {
        if (char === '{') {
          inBody = true;
          depth = 1;
        }
        continue;
      }

      if (char === '{') {
        depth += 1;
        bodyChars.push(char);
        continue;
      }

      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          endIndex = lineIndex;
          break;
        }
        bodyChars.push(char);
        continue;
      }

      bodyChars.push(char);
    }

    if (depth === 0 && inBody) {
      break;
    }

    if (inBody) {
      bodyChars.push('\n');
    }

    endIndex = lineIndex;
  }

  return {
    command: {
      kind: KNOWN_KINDS.has(kind) ? kind : kind,
      params,
      body: bodyChars.join('').trim(),
      raw: rawLines.join('\n'),
    } satisfies BdlCommand,
    endIndex,
  };
}

export function parseBdl(text: string): BdlCommand[] {
  const lines = text.split(/\r?\n/);
  const commands: BdlCommand[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trimStart() ?? '';
    if (!trimmed.startsWith('@')) {
      continue;
    }

    const { command, endIndex } = parseCommandAt(lines, index);
    commands.push(command);
    index = endIndex;
  }

  return commands;
}

export function extractTextContent(text: string): string {
  const lines = text.split(/\r?\n/);
  const prose: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trimStart() ?? '';
    if (!trimmed.startsWith('@')) {
      if (trimmed) {
        prose.push(lines[index]);
      }
      continue;
    }

    const { endIndex } = parseCommandAt(lines, index);
    index = endIndex;
  }

  return prose.join('\n').trim();
}