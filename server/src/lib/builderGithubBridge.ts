import { parsePatchBody } from './builderPatchExecutor.js';
import type { BdlCommand } from './builderBdlParser.js';

export interface PatchPayload {
  file: string;
  action: 'write' | 'replace' | 'append' | 'overwrite';
  content?: string;
  oldText?: string;
  newText?: string;
}

function isSearchReplacePatchBody(body: string): boolean {
  return body.trimStart().startsWith('<<<SEARCH');
}

export interface ExecutionResult {
  tsc: string;
  build: string;
  diff: string;
  run_id?: string;
  run_url?: string;
  commit_hash?: string;
  committed?: boolean;
}

export async function triggerGithubAction(
  taskId: string,
  patches: PatchPayload[],
  branch?: string,
): Promise<{ triggered: boolean; error?: string }> {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return { triggered: false, error: 'GITHUB_PAT not set' };
  }

  const repo = process.env.GITHUB_REPO || 'G-Dislioglu/soulmatch';
  const callbackUrl =
    process.env.RENDER_EXTERNAL_URL || 'https://soulmatch-1.onrender.com';

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'builder-task',
          client_payload: {
            task_id: taskId,
            patches,
            callback_url: callbackUrl,
            branch: branch || 'main',
          },
        }),
      },
    );

    if (response.status === 204 || response.status === 200) {
      return { triggered: true };
    }

    const text = await response.text().catch(() => '');
    return {
      triggered: false,
      error: `GitHub API ${response.status}: ${text.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      triggered: false,
      error: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function convertBdlPatchesToPayload(
  commands: BdlCommand[],
): PatchPayload[] {
  const payloads: PatchPayload[] = [];

  for (const cmd of commands) {
    if (cmd.kind !== 'PATCH') {
      continue;
    }

    const file = cmd.params.file;
    if (!file || !cmd.body) {
      continue;
    }

    const { oldLines, newLines } = parsePatchBody(cmd.body);

    if (oldLines.length === 0 && newLines.length > 0) {
      payloads.push({
        file,
        action: isSearchReplacePatchBody(cmd.body) ? 'overwrite' : 'append',
        content: newLines.join('\n'),
      });
    } else {
      payloads.push({
        file,
        action: 'replace',
        oldText: oldLines.join('\n'),
        newText: newLines.join('\n'),
      });
    }
  }

  return payloads;
}
export async function triggerGithubActionChunked(
  taskId: string,
  patches: PatchPayload[],
  branch?: string,
): Promise<{ triggered: boolean; chunks: number; error?: string }> {
  const payloadSize = JSON.stringify(patches).length;

  if (payloadSize < 50000) {
    const result = await triggerGithubAction(taskId, patches, branch);
    return { triggered: result.triggered, chunks: 1, error: result.error };
  }

  const chunks: PatchPayload[][] = [];
  let currentChunk: PatchPayload[] = [];
  let currentChunkSize = 0;

  for (const patch of patches) {
    const patchSize = JSON.stringify(patch).length;

    if (patchSize >= 50000) {
      return { triggered: false, chunks: 0, error: `Single patch exceeds 50KB (${patchSize} bytes)` };
    }

    if (currentChunkSize + patchSize >= 50000) {
      if (currentChunk.length > 0) chunks.push(currentChunk);
      currentChunk = [patch];
      currentChunkSize = patchSize;
    } else {
      currentChunk.push(patch);
      currentChunkSize += patchSize;
    }
  }

  if (currentChunk.length > 0) chunks.push(currentChunk);

  for (let i = 0; i < chunks.length; i++) {
    const result = await triggerGithubAction(taskId, chunks[i], branch);
    if (!result.triggered) {
      return { triggered: false, chunks: i + 1, error: `Chunk ${i + 1}/${chunks.length}: ${result.error}` };
    }
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  return { triggered: true, chunks: chunks.length };
}
