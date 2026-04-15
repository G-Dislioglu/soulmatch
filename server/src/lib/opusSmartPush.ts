/**
 * SmartPush — entscheidet automatisch Overwrite vs Patch pro Datei.
 * Keine Beschränkungen: jede Datei, jeder Pfad, jede Größe.
 */

import { decideChangeMode } from './opusChangeRouter.js';
import { applyPatch, PatchEdit } from './opusPatchMode.js';
import { getAuthUrl } from './opusBridgeConfig.js';

const REPO_OWNER = 'G-Dislioglu';
const REPO_NAME = 'soulmatch';

interface SmartPushFile {
  file: string;
  mode?: 'ambiguous' | 'overwrite' | 'create' | 'patch';
  content?: string;          // full file for overwrite
  patches?: PatchEdit[];     // search/replace for patch mode
  originalContent?: string;  // current content (for mode decision)
}

interface SmartPushResult {
  pushed: boolean;
  filesCount: number;
  modes: Record<string, 'ambiguous' | 'overwrite' | 'create' | 'patch'>;
  error?: string;
  durationMs: number;
}

export async function smartPush(
  files: SmartPushFile[],
  message: string,
): Promise<SmartPushResult> {
  const start = Date.now();
  const modes: Record<string, 'ambiguous' | 'overwrite' | 'create' | 'patch'> = {};
  const errors: string[] = [];

  const overwrites: Array<{ file: string; content: string }> = [];
  const patchJobs: Array<{ file: string; patches: PatchEdit[] }> = [];

  for (const f of files) {
    const mode = f.mode ?? (f.patches ? 'patch' : decideChangeMode(f.originalContent ?? null));
    modes[f.file] = mode;

    if (mode === 'ambiguous') {
      errors.push(`ambiguous file state for ${f.file}`);
      continue;
    }

    if (mode === 'patch' && f.patches && f.patches.length > 0) {
      patchJobs.push({ file: f.file, patches: f.patches });
    } else if (f.content !== undefined) {
      overwrites.push({ file: f.file, content: f.content });
    }
  }

  // Overwrites via internal /push endpoint (chunked, via GitHub Action)
  if (overwrites.length > 0) {
    try {
      const res = await fetch(getAuthUrl('/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: overwrites, message }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!data.triggered) errors.push(`overwrite push failed: ${JSON.stringify(data)}`);
    } catch (e: unknown) {
      errors.push(`overwrite error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Patches via GitHub API directly (no size limit)
  const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  for (const job of patchJobs) {
    if (!ghToken) {
      // Fallback: convert patches to overwrite search/replace via /push
      try {
        const pushFiles = job.patches.map(p => ({
          file: job.file,
          search: p.search,
          replace: p.replace,
        }));
        const res = await fetch(getAuthUrl('/push'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: pushFiles, message }),
        });
        const data = await res.json() as Record<string, unknown>;
        if (!data.triggered) errors.push(`patch-via-push failed for ${job.file}`);
      } catch (e: unknown) {
        errors.push(`patch fallback error: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      const result = await applyPatch(REPO_OWNER, REPO_NAME, job.file, job.patches, message, ghToken);
      if (!result.success) errors.push(`patch failed for ${job.file}: ${result.error}`);
    }
  }

  return {
    pushed: errors.length === 0,
    filesCount: files.length,
    modes,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    durationMs: Date.now() - start,
  };
}
