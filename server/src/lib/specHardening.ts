const GA = String.fromCharCode(96);
const MAX_INSTRUCTION_LENGTH = 50000;

export interface SpecHardeningFinding {
  code: string;
  severity: 'block' | 'warn';
  message: string;
  hint?: string;
  position?: { line: number; column: number };
}

export interface SpecHardeningReport {
  ok: boolean;
  findings: SpecHardeningFinding[];
  stats: {
    instructionLength: number;
    lineCount: number;
    findingCount: number;
    blockCount: number;
    warnCount: number;
  };
}

interface InstructionLineContext {
  text: string;
  inCodeBlock: boolean;
}

interface ForbiddenPatternRule {
  token: string;
  codeOnly: boolean;
  normalize(line: string): string;
}

const FORBIDDEN_PATTERN_MESSAGE = 'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann';

const FORBIDDEN_PATTERN_RULES: ForbiddenPatternRule[] = [
  {
    token: '<?php',
    codeOnly: true,
    normalize: (line) => line,
  },
  {
    token: '<script',
    codeOnly: true,
    normalize: (line) => line.toLowerCase(),
  },
  {
    token: 'DROP TABLE',
    codeOnly: true,
    normalize: (line) => line.toUpperCase(),
  },
  {
    token: 'rm -rf /',
    codeOnly: true,
    normalize: (line) => line.toLowerCase(),
  },
];

function countChar(value: string, target: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === target) {
      count += 1;
    }
  }
  return count;
}

function findFirstColumn(line: string, token: string): number | undefined {
  const index = line.indexOf(token);
  return index === -1 ? undefined : index + 1;
}

function buildInstructionLineContexts(lines: string[]): InstructionLineContext[] {
  const contexts: InstructionLineContext[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const isFenceLine = trimmed.startsWith(`${GA}${GA}${GA}`);

    if (isFenceLine) {
      contexts.push({ text: line, inCodeBlock: false });
      inCodeBlock = !inCodeBlock;
      continue;
    }

    contexts.push({ text: line, inCodeBlock });
  }

  return contexts;
}

function pushFinding(
  findings: SpecHardeningFinding[],
  code: string,
  severity: 'block' | 'warn',
  message: string,
  hint: string | undefined,
  lineNumber: number,
  column: number | undefined,
): void {
  findings.push({
    code,
    severity,
    message,
    ...(hint ? { hint } : {}),
    ...(column !== undefined ? { position: { line: lineNumber, column } } : {}),
  });
}

function forEachCodeLine(
  lineContexts: InstructionLineContext[],
  visitor: (line: string, lineNumber: number) => void,
): void {
  for (let index = 0; index < lineContexts.length; index += 1) {
    const lineContext = lineContexts[index];
    if (!lineContext?.inCodeBlock) {
      continue;
    }

    visitor(lineContext.text, index + 1);
  }
}

function findBacktickDelimitedRegexColumn(line: string): number | undefined {
  let backtickStart = -1;

  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== GA) {
      continue;
    }

    if (backtickStart === -1) {
      backtickStart = index;
      continue;
    }

    const span = line.slice(backtickStart + 1, index).trim();
    if (/^\/(?:\\.|[^/\n])+\/[dgimsuvy]*$/.test(span)) {
      const slashOffset = line.slice(backtickStart + 1, index).indexOf('/');
      return slashOffset === -1 ? undefined : backtickStart + slashOffset + 2;
    }

    backtickStart = -1;
  }

  return undefined;
}

function checkBacktickRegexPattern(lineContexts: InstructionLineContext[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    forEachCodeLine(lineContexts, (line, lineNumber) => {
      const column = findBacktickDelimitedRegexColumn(line);
      if (column !== undefined) {
        pushFinding(
          findings,
          'BACKTICK_IN_REGEX',
          'block',
          'Regex-Literal mit Grave-Accent erkannt — Worker eskapieren das nicht zuverlaessig',
          'Nutze statt Regex einen manuellen String-Parser, Grave-Accent als String.fromCharCode(96) konstante',
          lineNumber,
          column,
        );
      }
    });
    return findings;
  } catch {
    return [];
  }
}

function checkUnescapedBackslashes(lineContexts: InstructionLineContext[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    const tokens = ['\\n', '\\t', '\\r', '\\\\'];
    forEachCodeLine(lineContexts, (line, lineNumber) => {
      for (const token of tokens) {
        const column = findFirstColumn(line, token);
        if (column !== undefined) {
          pushFinding(
            findings,
            'RAW_ESCAPE_SEQUENCE',
            'warn',
            'Raw-Escape-Sequenz erkannt',
            'Bei Worker-Dispatch kann der Escape unterschiedlich interpretiert werden',
            lineNumber,
            column,
          );
          break;
        }
      }
    });
    return findings;
  } catch {
    return [];
  }
}

function checkCurlyTemplatePattern(lineContexts: InstructionLineContext[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    forEachCodeLine(lineContexts, (line, lineNumber) => {
      const hasDollarTemplate = line.indexOf('${') !== -1 && line.indexOf('}') !== -1;
      const hasDoubleCurly = line.indexOf('{{') !== -1 && line.indexOf('}}') !== -1;
      if (hasDollarTemplate || hasDoubleCurly) {
        pushFinding(
          findings,
          'TEMPLATE_PLACEHOLDER_PATTERN',
          'warn',
          'Template-Placeholder-Muster erkannt',
          'Template-Placeholder werden von Workern nicht expandiert, Worker sehen den Literaltext',
          lineNumber,
          hasDollarTemplate ? findFirstColumn(line, '${') : findFirstColumn(line, '{{'),
        );
      }
    });
    return findings;
  } catch {
    return [];
  }
}

function checkQuoteImbalance(lineContexts: InstructionLineContext[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    forEachCodeLine(lineContexts, (line, lineNumber) => {
      const graveCount = countChar(line, GA);
      const doubleQuoteCount = countChar(line, '"');
      if (graveCount % 2 !== 0 || doubleQuoteCount % 2 !== 0) {
        pushFinding(
          findings,
          'QUOTE_IMBALANCE',
          'warn',
          'Unbalancierte Quotes erkannt',
          'Unbalancierte Quotes koennen Worker-Parser verwirren',
          lineNumber,
          graveCount % 2 !== 0 ? findFirstColumn(line, GA) : findFirstColumn(line, '"'),
        );
      }
    });
    return findings;
  } catch {
    return [];
  }
}

function checkLengthLimits(instruction: string): SpecHardeningFinding[] {
  try {
    if (instruction.length <= MAX_INSTRUCTION_LENGTH) {
      return [];
    }

    return [{
      code: 'INSTRUCTION_TOO_LONG',
      severity: 'block',
      message: 'Instruction ist laenger als 50000 Zeichen',
      hint: 'Instruction vor Dispatch in kleinere, engere Bloecke schneiden',
    }];
  } catch {
    return [];
  }
}

function checkForbiddenPatterns(lines: InstructionLineContext[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) {
        continue;
      }

      for (const rule of FORBIDDEN_PATTERN_RULES) {
        if (rule.codeOnly && !line.inCodeBlock) {
          continue;
        }

        const haystack = rule.normalize(line.text);
        if (haystack.indexOf(rule.token) === -1) {
          continue;
        }

        pushFinding(
          findings,
          'FORBIDDEN_PATTERN',
          'block',
          FORBIDDEN_PATTERN_MESSAGE,
          FORBIDDEN_PATTERN_MESSAGE,
          index + 1,
          findFirstColumn(haystack, rule.token),
        );
        break;
      }
    }
    return findings;
  } catch {
    return [];
  }
}

export function hardenInstruction(instruction: string): SpecHardeningReport {
  const lines = instruction.split('\n');
  const lineContexts = buildInstructionLineContexts(lines);
  const findings: SpecHardeningFinding[] = [];

  findings.push(...checkBacktickRegexPattern(lineContexts));
  findings.push(...checkUnescapedBackslashes(lineContexts));
  findings.push(...checkCurlyTemplatePattern(lineContexts));
  findings.push(...checkQuoteImbalance(lineContexts));
  findings.push(...checkLengthLimits(instruction));
  findings.push(...checkForbiddenPatterns(lineContexts));

  const blockCount = findings.filter((finding) => finding.severity === 'block').length;
  const warnCount = findings.filter((finding) => finding.severity === 'warn').length;

  return {
    ok: blockCount === 0,
    findings,
    stats: {
      instructionLength: instruction.length,
      lineCount: lines.length,
      findingCount: findings.length,
      blockCount,
      warnCount,
    },
  };
}