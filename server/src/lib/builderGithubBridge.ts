import fs from 'node:fs';
import path from 'node:path';
import { parsePatchBody } from './builderPatchExecutor.js';
import type { BdlCommand } from './builderBdlParser.js';
import { outboundFetch } from './outboundHttp.js';

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
    const response = await outboundFetch(
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

export function validatePatchPayloads(
  repoRoot: string,
  patches: PatchPayload[],
): { ok: true } | { ok: false; error: string; patch: PatchPayload } {
  const root = path.resolve(repoRoot);

  for (const patch of patches) {
    const target = path.resolve(root, patch.file);
    if (!target.startsWith(root + path.sep)) {
      return { ok: false, error: `patch_path_outside_repo:${patch.file}`, patch };
    }

    if (patch.action !== 'replace') {
      continue;
    }

    if (!fs.existsSync(target)) {
      return { ok: false, error: `replace_target_missing:${patch.file}`, patch };
    }

    const current = fs.readFileSync(target, 'utf8');
    if (!patch.oldText || !current.includes(patch.oldText)) {
      return { ok: false, error: `replace_old_text_not_found:${patch.file}`, patch };
    }
  }

  return { ok: true };
}
export function formatSessionLogEntry(params: {
  commitShaShort: string;
  commitMessage: string;
  filesChanged: string[];
  timestamp: string;
  taskId?: string;
  pushedBy?: string;
}): string {
  const firstLine = params.commitMessage.split('\n')[0];
  const filesStr = params.filesChanged.join(', ');
  const taskId = params.taskId || 'n/a';
  const pushedBy = params.pushedBy || 'opus-bridge';

  return [
    `## ${params.timestamp}`,
    `- **Commit:** \`${params.commitShaShort}\` — ${firstLine}`,
    `- **Files:** ${filesStr}`,
    `- **Task:** ${taskId}`,
    `- **Pushed by:** ${pushedBy}`,
    '---',
    '',
  ].join('\n');
}

export function buildSessionLogBlob(
  currentContent: string,
  newEntry: string,
  nowUtc?: Date,
): {
  updatedContent: string;
  archiveContent: string | null;
  archiveFileName: string | null;
  needsRotation: boolean;
} {
  const now = nowUtc ?? new Date();
  let base: string;

  if (!currentContent || currentContent.trim() === '') {
    base = '# SESSION LOG\n\n' + newEntry;
  } else {
    const lines = currentContent.split('\n');
    const headerEndIdx = lines.findIndex((l, i) => i > 0 && l.trim() !== '');
    if (headerEndIdx === -1) {
      base = currentContent + '\n' + newEntry;
    } else {
      const before = lines.slice(0, headerEndIdx);
      const after = lines.slice(headerEndIdx);
      base = before.concat(newEntry, ...after).join('\n');
    }
  }

  const allLines = base.split('\n');
  if (allLines.length <= 1000) {
    return {
      updatedContent: base,
      archiveContent: null,
      archiveFileName: null,
      needsRotation: false,
    };
  }

  const archiveLines = allLines.slice(-500);
  const mainLines = allLines.slice(0, -500);
  const updatedContent = mainLines.join('\n');
  const archiveContent = archiveLines.join('\n');
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const archiveFileName = `docs/SESSION-LOG-archive-${year}-${month}.md`;

  return {
    updatedContent,
    archiveContent,
    archiveFileName,
    needsRotation: true,
  };
}

export async function ensureSessionLogFile(
  octokit: any,
  owner: string,
  repo: string,
  ref: string,
): Promise<{ exists: boolean; currentContent: string; currentBlobSha: string | null }> {
  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: 'docs/SESSION-LOG.md',
      ref,
    });
    const content = Buffer.from((data as any).content, 'base64').toString('utf-8');
    return { exists: true, currentContent: content, currentBlobSha: (data as any).sha };
  } catch (err: any) {
    if (err?.status === 404) {
      return { exists: false, currentContent: '', currentBlobSha: null };
    }
    throw err;
  }
}

export async function ensureArchiveFile(
  octokit: any,
  owner: string,
  repo: string,
  ref: string,
  archivePath: string,
): Promise<{ exists: boolean; currentContent: string }> {
  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: archivePath,
      ref,
    });
    const content = Buffer.from((data as any).content, 'base64').toString('utf-8');
    return { exists: true, currentContent: content };
  } catch (err: any) {
    if (err?.status === 404) {
      return { exists: false, currentContent: '' };
    }
    throw err;
  }
}

export function injectSessionLogIntoTree(
  treeItems: Array<{ path: string; mode: string; type: string; sha?: string; content?: string }>,
  logContent: string,
  archiveContent?: string | null,
  archiveFileName?: string | null,
): Array<{ path: string; mode: string; type: string; sha?: string; content?: string }> {
  const result = [...treeItems];
  result.push({ path: 'docs/SESSION-LOG.md', mode: '100644', type: 'blob', content: logContent });
  if (archiveContent && archiveFileName) {
    result.push({ path: archiveFileName, mode: '100644', type: 'blob', content: archiveContent });
  }
  return result;
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
