import { MAX_FILE_LINES_FOR_OVERWRITE } from './opusBridgeConfig.js';

export type ChangeMode = 'overwrite' | 'patch';

export function decideChangeMode(fileContent: string | null): ChangeMode {
  if (fileContent === null) {
    return 'overwrite';
  }

  const lineCount = fileContent.split('\n').length;

  if (lineCount > MAX_FILE_LINES_FOR_OVERWRITE) {
    return 'patch';
  }

  return 'overwrite';
}

export function getWorkerPromptForMode(mode: ChangeMode): string {
  if (mode === 'overwrite') {
    return 'Return the complete file content as JSON with format: {path, mode: "overwrite", content}. Include the full file content in the response.';
  }

  return 'Return minimal targeted edits as JSON with format: {path, mode: "patch", patches: [{search, replace}]}. Use precise search strings and their replacements.';
}
