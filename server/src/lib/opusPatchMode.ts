import { MAX_FILE_LINES_FOR_OVERWRITE } from './opusBridgeConfig';

export type PatchEdit = { search: string; replace: string };

export function applyPatches(source: string, patches: PatchEdit[]): string {
  let result = source;
  for (const p of patches) {
    if (!result.includes(p.search)) throw new Error("Not found: " + p.search.slice(0,40));
    result = result.replace(p.search, p.replace);
  }
  return result;
}

export function estimateFileComplexity(content: string): { lines: number; tooLargeForOverwrite: boolean } {
  const lines = content.split('\n').length;
  return {
    lines,
    tooLargeForOverwrite: lines > MAX_FILE_LINES_FOR_OVERWRITE,
  };
}

export async function applyPatch(
  repoOwner: string,
  repoName: string,
  filePath: string,
  patches: Array<{ search: string; replace: string }>,
  commitMessage: string,
  token: string
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    // 1. Fetch current file content
    const getResponse = await fetch(url, { headers });
    if (!getResponse.ok) {
      return { success: false, error: `Failed to fetch file: ${getResponse.statusText}` };
    }
    const fileData = await getResponse.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const sha = fileData.sha;

    // 2. Apply patches
    let updatedContent = currentContent;
    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i];
      if (!updatedContent.includes(patch.search)) {
        return {
          success: false,
          error: `Patch ${i + 1} failed: search string not found`,
        };
      }
      updatedContent = updatedContent.replace(patch.search, patch.replace);
    }

    // 3. PUT updated content
    const putBody = {
      message: commitMessage,
      content: Buffer.from(updatedContent).toString('base64'),
      sha,
    };

    const putResponse = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(putBody),
    });

    if (!putResponse.ok) {
      const errorData = await putResponse.json().catch(() => ({}));
      return { success: false, error: `Failed to update file: ${putResponse.statusText}`, ...errorData };
    }

    const result = await putResponse.json();
    return { success: true, commitSha: result.commit.sha };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
