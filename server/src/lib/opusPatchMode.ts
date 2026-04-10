export interface PatchEdit {
  path: string;
  mode: "patch";
  edits: Array<{
    action: "insert_after" | "insert_before" | "replace" | "delete";
    search: string;
    content?: string;
  }>;
}

export function applyPatch(originalContent: string, edits: PatchEdit["edits"]): string {
  let content = originalContent;

  for (const edit of edits) {
    const index = content.indexOf(edit.search);

    if (index === -1) {
      throw new Error(`Search string not found: "${edit.search}"`);
    }

    switch (edit.action) {
      case "insert_after": {
        const lineEnd = content.indexOf("\n", index);
        const insertPosition = lineEnd === -1 ? content.length : lineEnd + 1;
        content = content.slice(0, insertPosition) + edit.content + content.slice(insertPosition);
        break;
      }
      case "insert_before": {
        const lineStart = content.lastIndexOf("\n", index);
        const insertPosition = lineStart === -1 ? 0 : lineStart + 1;
        content = content.slice(0, insertPosition) + edit.content + content.slice(insertPosition);
        break;
      }
      case "replace": {
        content = content.slice(0, index) + edit.content + content.slice(index + edit.search.length);
        break;
      }
      case "delete": {
        content = content.slice(0, index) + content.slice(index + edit.search.length);
        break;
      }
    }
  }

  return content;
}

export function validatePatch(originalContent: string, edits: PatchEdit["edits"]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const edit of edits) {
    if (originalContent.indexOf(edit.search) === -1) {
      errors.push(`Search string not found: "${edit.search}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
