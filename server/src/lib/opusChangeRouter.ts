import { MAX_FILE_LINES_FOR_OVERWRITE } from './opusBridgeConfig.js';

export type ChangeMode = 'ambiguous' | 'create' | 'overwrite' | 'patch';

export function decideChangeMode(fileContent: string | null): ChangeMode {
  if (fileContent === null) {
    return 'create';
  }

  if (fileContent.length === 0) {
    return 'ambiguous';
  }

  const lineCount = fileContent.split('\n').length;

  if (lineCount > MAX_FILE_LINES_FOR_OVERWRITE) {
    return 'patch';
  }

  return 'overwrite';
}

export function getWorkerPromptForMode(mode: ChangeMode): string {
  if (mode === 'ambiguous') {
    return 'The file state is ambiguous. Do not invent edits until the caller confirms whether the file exists and what its current contents are.';
  }

  if (mode === 'create') {
    return 'If the scoped path is a new file, respond with JSON using {path, mode: "create", content}. Create the full file content and do not emit patch mode for that file.';
  }

  if (mode === 'overwrite') {
    return 'Return the complete file content as JSON with format: {path, mode: "overwrite", content}. Include the full file content in the response.';
  }

  return 'Return minimal targeted edits as JSON with format: {path, mode: "patch", patches: [{search, replace}]}. Use precise search strings and their replacements.';
}
