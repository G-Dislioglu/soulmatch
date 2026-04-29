/**
 * SmartPush — entscheidet automatisch Overwrite vs Patch pro Datei.
 * Keine Beschränkungen: jede Datei, jeder Pfad, jede Größe.
 */

import { readFile as fsReadFile } from 'node:fs/promises';
import path from 'node:path';
import { decideChangeMode } from './opusChangeRouter.js';
import { applyPatch, applyPatches, PatchEdit } from './opusPatchMode.js';
import { getAuthUrl } from './opusBridgeConfig.js';
import { waitForPushResult } from './pushResultWaiter.js';
import { outboundFetch } from './outboundHttp.js';
import { type BuilderSideEffectsContract } from './builderSideEffects.js';

// Wie lange wir maximal auf den execution-result-Callback aus der
// GitHub Action warten, bevor wir den Push als nicht-gelandet werten.
// Begründung: pnpm install + tsc + build + push dauern typischerweise
// 60-150s, bei Netzwerkproblemen auch länger. 3 Minuten ist ein
// großzügiges Fenster, das echte Erfolge nicht künstlich wegschneidet.
const PUSH_CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;

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
  asyncDispatch: boolean;
  error?: string;
  durationMs: number;
  /** Verified commit SHA if the GitHub Actions run actually landed a commit on main. */
  commitHash?: string;
  /** True after a terminal success callback, false after a terminal failure callback, undefined while callback truth is still pending. */
  landed?: boolean;
}

interface SmartPushOptions {
  acceptanceSmoke?: boolean;
  sourceAsyncJobId?: string;
  sideEffects?: BuilderSideEffectsContract;
}

async function buildOverwriteFromPatch(file: string, patches: PatchEdit[]): Promise<string> {
  const candidatePaths = [
    path.resolve(process.cwd(), file),
    path.resolve(process.cwd(), '..', file),
  ];

  let currentContent: string | null = null;

  for (const candidatePath of candidatePaths) {
    try {
      currentContent = await fsReadFile(candidatePath, 'utf8');
      break;
    } catch {
      // Try next candidate path.
    }
  }

  if (currentContent === null) {
    throw new Error(`patch fallback could not read ${file}`);
  }

  return applyPatches(currentContent, patches);
}

export async function smartPush(
  files: SmartPushFile[],
  message: string,
  options?: SmartPushOptions,
): Promise<SmartPushResult> {
  const start = Date.now();
  const modes: Record<string, 'ambiguous' | 'overwrite' | 'create' | 'patch'> = {};
  const errors: string[] = [];

  const overwrites: Array<{ file: string; content: string }> = [];
  const patchJobs: Array<{ file: string; patches: PatchEdit[] }> = [];
  let asyncDispatch = false;

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

  // Tracke die taskIds aus /push-Dispatches, um danach auf
  // execution-result-Callbacks zu warten. Erst wenn für alle
  // dispatchten Tasks ein committed:true-Callback eintraf,
  // werten wir pushed als true.
  const dispatchedTaskIds: string[] = [];
  let verifiedCommitHash: string | undefined;

  // Overwrites via internal /push endpoint (chunked, via GitHub Action)
  if (overwrites.length > 0) {
    asyncDispatch = true;
    try {
      const res = await outboundFetch(getAuthUrl('/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: overwrites,
          message,
          acceptanceSmoke: options?.acceptanceSmoke === true,
          sourceAsyncJobId: options?.sourceAsyncJobId,
          sideEffects: options?.sideEffects,
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!data.triggered) {
        errors.push(`overwrite push failed: ${JSON.stringify(data)}`);
      } else if (typeof data.taskId === 'string' && data.taskId.length > 0) {
        dispatchedTaskIds.push(data.taskId);
      } else {
        errors.push('overwrite push: missing taskId in /push response');
      }
    } catch (e: unknown) {
      errors.push(`overwrite error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Patches via GitHub API directly (no size limit)
  const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  for (const job of patchJobs) {
    if (!ghToken) {
      asyncDispatch = true;
      // Fallback: resolve the replacement locally and send a deterministic
      // full-file overwrite instead of brittle search/replace payloads.
      try {
        const pushFiles = [{
          file: job.file,
          content: await buildOverwriteFromPatch(job.file, job.patches),
        }];
        const res = await outboundFetch(getAuthUrl('/push'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: pushFiles,
            message,
            acceptanceSmoke: options?.acceptanceSmoke === true,
            sourceAsyncJobId: options?.sourceAsyncJobId,
            sideEffects: options?.sideEffects,
          }),
        });
        const data = await res.json() as Record<string, unknown>;
        if (!data.triggered) {
          errors.push(`patch-via-push failed for ${job.file}`);
        } else if (typeof data.taskId === 'string' && data.taskId.length > 0) {
          dispatchedTaskIds.push(data.taskId);
        } else {
          errors.push(`patch-via-push for ${job.file}: missing taskId in /push response`);
        }
      } catch (e: unknown) {
        errors.push(`patch fallback error: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      const result = await applyPatch(REPO_OWNER, REPO_NAME, job.file, job.patches, message, ghToken);
      if (!result.success) errors.push(`patch failed for ${job.file}: ${result.error}`);
    }
  }

  // Jetzt die eigentliche Landung verifizieren.
  // Wenn Dispatches abgesetzt wurden, warten wir für jede taskId auf ein
  // terminales execution-result-Signal (committed:true oder reason:*).
  // Der direkte applyPatch-Pfad ist synchron und braucht keinen Wait —
  // seine Fehler sind bereits in `errors` gelandet.
  let landed: boolean | undefined;
  if (dispatchedTaskIds.length > 0) {
    const results = await Promise.all(
      dispatchedTaskIds.map((taskId) =>
        waitForPushResult(taskId, PUSH_CALLBACK_TIMEOUT_MS).then((r) => ({ taskId, r })),
      ),
    );
    const hasPendingTruth = results.some((entry) => entry.r.landed === undefined);
    landed = hasPendingTruth ? undefined : results.every((entry) => entry.r.landed === true);
    for (const entry of results) {
      if (entry.r.landed === false) {
        errors.push(
          `push did not land for task ${entry.taskId}: ${entry.r.reason ?? 'unknown_reason'}`,
        );
      } else if (entry.r.landed === undefined) {
        errors.push(
          `push callback timed out for task ${entry.taskId}: ${entry.r.reason ?? 'unknown_reason'}; landing truth still pending`,
        );
      } else if (entry.r.commitHash && !verifiedCommitHash) {
        verifiedCommitHash = entry.r.commitHash;
      }
    }
  } else if (patchJobs.length > 0 && errors.length === 0) {
    // Reiner direct-applyPatch-Pfad (synchron). Erfolge bedeuten echte Commits.
    landed = true;
  }

  const dispatchesSucceeded = dispatchedTaskIds.length > 0 || patchJobs.length > 0 || overwrites.length > 0;
  // pushed spiegelt jetzt die Realität: true nur, wenn keine Fehler UND
  // entweder ein synchroner direct-patch-Erfolg oder eine verifizierte
  // asynchrone Landung vorliegt.
  const pushed = errors.length === 0 && (landed !== false) && dispatchesSucceeded;

  return {
    pushed,
    filesCount: files.length,
    modes,
    asyncDispatch,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    durationMs: Date.now() - start,
    commitHash: verifiedCommitHash,
    landed,
  };
}
