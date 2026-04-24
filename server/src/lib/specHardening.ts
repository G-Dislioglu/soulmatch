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

function checkBacktickRegexPattern(lines: string[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      if (line.indexOf('/') !== -1 && countChar(line, GA) >= 2) {
        pushFinding(
          findings,
          'BACKTICK_IN_REGEX',
          'block',
          'Regex-Literal mit Grave-Accent erkannt — Worker eskapieren das nicht zuverlaessig',
          'Nutze statt Regex einen manuellen String-Parser, Grave-Accent als String.fromCharCode(96) konstante',
          index + 1,
          findFirstColumn(line, '/'),
        );
      }
    }
    return findings;
  } catch {
    return [];
  }
}

function checkUnescapedBackslashes(lines: string[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    const tokens = ['\\n', '\\t', '\\r', '\\\\'];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      for (const token of tokens) {
        const column = findFirstColumn(line, token);
        if (column !== undefined) {
          pushFinding(
            findings,
            'RAW_ESCAPE_SEQUENCE',
            'warn',
            'Raw-Escape-Sequenz erkannt',
            'Bei Worker-Dispatch kann der Escape unterschiedlich interpretiert werden',
            index + 1,
            column,
          );
          break;
        }
      }
    }
    return findings;
  } catch {
    return [];
  }
}

function checkCurlyTemplatePattern(lines: string[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const hasDollarTemplate = line.indexOf('${') !== -1 && line.indexOf('}') !== -1;
      const hasDoubleCurly = line.indexOf('{{') !== -1 && line.indexOf('}}') !== -1;
      if (hasDollarTemplate || hasDoubleCurly) {
        pushFinding(
          findings,
          'TEMPLATE_PLACEHOLDER_PATTERN',
          'warn',
          'Template-Placeholder-Muster erkannt',
          'Template-Placeholder werden von Workern nicht expandiert, Worker sehen den Literaltext',
          index + 1,
          hasDollarTemplate ? findFirstColumn(line, '${') : findFirstColumn(line, '{{'),
        );
      }
    }
    return findings;
  } catch {
    return [];
  }
}

function checkQuoteImbalance(lines: string[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const graveCount = countChar(line, GA);
      const doubleQuoteCount = countChar(line, '"');
      if (graveCount % 2 !== 0 || doubleQuoteCount % 2 !== 0) {
        pushFinding(
          findings,
          'QUOTE_IMBALANCE',
          'warn',
          'Unbalancierte Quotes erkannt',
          'Unbalancierte Quotes koennen Worker-Parser verwirren',
          index + 1,
          graveCount % 2 !== 0 ? findFirstColumn(line, GA) : findFirstColumn(line, '"'),
        );
      }
    }
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

function checkForbiddenPatterns(lines: string[]): SpecHardeningFinding[] {
  try {
    const findings: SpecHardeningFinding[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const lower = line.toLowerCase();
      const upper = line.toUpperCase();

      if (line.indexOf('<?php') !== -1) {
        pushFinding(
          findings,
          'FORBIDDEN_PATTERN',
          'block',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          index + 1,
          findFirstColumn(line, '<?php'),
        );
        continue;
      }

      if (lower.indexOf('<script') !== -1) {
        pushFinding(
          findings,
          'FORBIDDEN_PATTERN',
          'block',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          index + 1,
          findFirstColumn(lower, '<script'),
        );
        continue;
      }

      if (upper.indexOf('DROP TABLE') !== -1) {
        pushFinding(
          findings,
          'FORBIDDEN_PATTERN',
          'block',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          index + 1,
          findFirstColumn(upper, 'DROP TABLE'),
        );
        continue;
      }

      if (lower.indexOf('rm -rf /') !== -1) {
        pushFinding(
          findings,
          'FORBIDDEN_PATTERN',
          'block',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          'Instruction enthaelt Muster das als Injection/Exfiltration gelesen werden kann',
          index + 1,
          findFirstColumn(lower, 'rm -rf /'),
        );
      }
    }
    return findings;
  } catch {
    return [];
  }
}

export function hardenInstruction(instruction: string): SpecHardeningReport {
  const lines = instruction.split('\n');
  const findings: SpecHardeningFinding[] = [];

  findings.push(...checkBacktickRegexPattern(lines));
  findings.push(...checkUnescapedBackslashes(lines));
  findings.push(...checkCurlyTemplatePattern(lines));
  findings.push(...checkQuoteImbalance(lines));
  findings.push(...checkLengthLimits(instruction));
  findings.push(...checkForbiddenPatterns(lines));

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