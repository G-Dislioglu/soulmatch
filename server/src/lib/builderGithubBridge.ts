import { parsePatchBody } from './builderPatchExecutor.js';
import type { BdlCommand } from './builderBdlParser.js';

export interface PatchPayload {
  file: string;
  action: 'write' | 'replace' | 'append';
  content?: string;
  oldText?: string;
  newText?: string;
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
        action: 'append',
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