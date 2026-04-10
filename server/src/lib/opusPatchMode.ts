export interface PatchEditItem {
  action: "insert_after" | "replace" | "delete";
  search: string;
  content?: string;
}

export function applyPatch(
  original: string,
  edits: Array<PatchEditItem>
): string {
  let content = original;

  for (const edit of edits) {
    const index = content.indexOf(edit.search);

    if (index === -1) {
      throw new Error(`Search string not found: "${edit.search}"`);
    }

    switch (edit.action) {
      case "insert_after": {
        const insertPosition = index + edit.search.length;
        content =
          content.slice(0, insertPosition) +
          (edit.content ?? "") +
          content.slice(insertPosition);
        break;
      }
      case "replace": {
        content =
          content.slice(0, index) +
          (edit.content ?? "") +
          content.slice(index + edit.search.length);
        break;
      }
      case "delete": {
        content =
          content.slice(0, index) +
          content.slice(index + edit.search.length);
        break;
      }
    }
  }

  return content;
}

export function validatePatch(
  original: string,
  edits: Array<PatchEditItem>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const edit of edits) {
    if (original.indexOf(edit.search) === -1) {
      errors.push(`Search string not found: "${edit.search}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
