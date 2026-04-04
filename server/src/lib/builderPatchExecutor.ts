import { readFile, writeFile } from './builderFileIO.js';
import { checkScope } from './builderGates.js';

export interface PatchResult {
  file: string;
  applied: boolean;
  linesRemoved: number;
  linesAdded: number;
  error?: string;
}

function stripPatchPrefix(line: string, prefix: '+' | '-') {
  const trimmedStart = line.trimStart();
  if (!trimmedStart.startsWith(prefix)) {
    return null;
  }

  const withoutPrefix = trimmedStart.slice(1);
  const withoutLineNumber = withoutPrefix.replace(/^L\d+:\s*/, '');

  return withoutLineNumber.startsWith(' ') ? withoutLineNumber.slice(1) : withoutLineNumber;
}

export function parsePatchBody(body: string): { oldLines: string[]; newLines: string[] } {
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of body.split(/\r?\n/)) {
    const oldLine = stripPatchPrefix(line, '-');
    if (oldLine !== null) {
      oldLines.push(oldLine);
      continue;
    }

    const newLine = stripPatchPrefix(line, '+');
    if (newLine !== null) {
      newLines.push(newLine);
    }
  }

  return { oldLines, newLines };
}

function applyReplacement(content: string, oldText: string, newText: string) {
  if (!oldText) {
    if (!newText) {
      return { applied: false, content, error: 'Patch has no + or - lines' };
    }

    const separator = content.length === 0 || content.endsWith('\n') ? '' : '\n';
    return { applied: true, content: `${content}${separator}${newText}` };
  }

  if (content.includes(oldText)) {
    return { applied: true, content: content.replace(oldText, newText) };
  }

  const windowsOldText = oldText.replace(/\n/g, '\r\n');
  const windowsNewText = newText.replace(/\n/g, '\r\n');
  if (content.includes(windowsOldText)) {
    return { applied: true, content: content.replace(windowsOldText, windowsNewText) };
  }

  return { applied: false, content, error: 'Old text not found in file' };
}

export async function applyPatch(
  worktreePath: string,
  filePath: string,
  patchBody: string,
  taskScope: string[],
  policyForbidden: string[],
): Promise<PatchResult> {
  const scopeCheck = checkScope(filePath, taskScope, policyForbidden);
  if (!scopeCheck.allowed) {
    return {
      file: filePath,
      applied: false,
      linesRemoved: 0,
      linesAdded: 0,
      error: `Scope violation: ${scopeCheck.reason ?? 'blocked'}`,
    };
  }

  const { oldLines, newLines } = parsePatchBody(patchBody);
  const oldText = oldLines.join('\n');
  const newText = newLines.join('\n');
  let currentContent = '';

  try {
    const readResult = await readFile(worktreePath, filePath);
    currentContent = readResult.content;
  } catch (error) {
    if (oldLines.length > 0 || newLines.length === 0) {
      return {
        file: filePath,
        applied: false,
        linesRemoved: oldLines.length,
        linesAdded: newLines.length,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const replacement = applyReplacement(currentContent, oldText, newText);
  if (!replacement.applied) {
    return {
      file: filePath,
      applied: false,
      linesRemoved: oldLines.length,
      linesAdded: newLines.length,
      error: replacement.error,
    };
  }

  await writeFile(worktreePath, filePath, replacement.content);

  return {
    file: filePath,
    applied: true,
    linesRemoved: oldLines.length,
    linesAdded: newLines.length,
  };
}