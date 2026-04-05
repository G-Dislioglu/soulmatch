import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { checkDestructive } from './builderGates.js';

function runCommand(command: string, cwd?: string) {
  const destructive = checkDestructive(command);
  if (!destructive.safe) {
    throw new Error(`Destructive command blocked: ${destructive.match}`);
  }

  try {
    return execSync(command, {
      encoding: 'utf-8',
      timeout: 60_000,
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const execError = error as Error & { stderr?: string; stdout?: string };
    throw new Error(execError.stderr || execError.stdout || execError.message);
  }
}

function trimOutput(output: string) {
  return output.length > 2000 ? `${output.slice(0, 2000)}\n...[truncated]` : output;
}

function isGitAvailable() {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf-8',
      timeout: 3_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

export function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      timeout: 5_000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return process.cwd();
  }
}

export function createWorktree(taskId: string) {
  if (!isGitAvailable()) {
    const fallbackPath = process.cwd();
    console.log(`[builder] No git repo - using fallback path: ${fallbackPath}`);
    return { worktreePath: fallbackPath, branch: `builder/${taskId}` };
  }

  const repoRoot = getRepoRoot();
  const branch = `builder/${taskId}`;
  const worktreePath = path.join(os.tmpdir(), `builder-${taskId}`);
  runCommand(`git worktree add ${JSON.stringify(worktreePath)} -b ${JSON.stringify(branch)} HEAD`, repoRoot);
  return { worktreePath, branch };
}

export function removeWorktree(taskId: string) {
  if (!isGitAvailable()) {
    return;
  }

  const repoRoot = getRepoRoot();
  const branch = `builder/${taskId}`;
  const worktreePath = path.join(os.tmpdir(), `builder-${taskId}`);

  try {
    runCommand(`git worktree remove ${JSON.stringify(worktreePath)} --force`, repoRoot);
  } catch {
    // Ignore missing worktree errors.
  }

  try {
    runCommand(`git branch -D ${JSON.stringify(branch)}`, repoRoot);
  } catch {
    // Ignore missing branch errors.
  }
}

export function runCheck(worktreePath: string) {
  const run = (command: string) => {
    try {
      const output = runCommand(command, worktreePath);
      return { ok: true, output: trimOutput(output) };
    } catch (error) {
      return {
        ok: false,
        output: trimOutput(error instanceof Error ? error.message : String(error)),
      };
    }
  };

  return {
    tsc: run(`pnpm --dir ${JSON.stringify(path.join(worktreePath, 'client'))} typecheck`),
    build: run(`pnpm --dir ${JSON.stringify(path.join(worktreePath, 'server'))} build`),
  };
}

export function commitInWorktree(worktreePath: string, message: string) {
  runCommand('git add -A', worktreePath);
  runCommand(`git commit -m ${JSON.stringify(message)}`, worktreePath);
  return runCommand('git rev-parse HEAD', worktreePath).trim();
}

export function getWorktreeDiff(worktreePath: string) {
  return runCommand('git diff HEAD~1 --stat', worktreePath);
}