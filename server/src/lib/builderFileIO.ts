import { execSync } from 'node:child_process';
import { mkdir, readFile as fsReadFile, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'node:path';
import { checkScope } from './builderGates.js';

function normalizeRelativePath(relativePath: string) {
  return relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function resolveRootPath(rootDir: string, relativePath = '') {
  const normalized = normalizeRelativePath(relativePath);
  const resolved = path.resolve(rootDir, normalized || '.');
  const relativeFromRoot = path.relative(rootDir, resolved).replace(/\\/g, '/');

  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    throw new Error('Path escapes allowed root');
  }

  return { normalized: relativeFromRoot, resolved };
}

function ensureScope(relativePath: string, taskScope: string[] = [], policyForbidden: string[] = []) {
  const scopeCheck = checkScope(relativePath, taskScope, policyForbidden);
  if (!scopeCheck.allowed) {
    throw new Error(scopeCheck.reason ?? 'Scope violation');
  }
}

export async function readFile(
  rootDir: string,
  relativePath: string,
  taskScope: string[] = [],
  policyForbidden: string[] = [],
) {
  const { normalized, resolved } = resolveRootPath(rootDir, relativePath);
  ensureScope(normalized, taskScope, policyForbidden);
  const content = await fsReadFile(resolved, 'utf8');
  const lines = content.length === 0 ? 0 : content.split(/\r?\n/).length;
  return { content, lines };
}

export async function writeFile(
  rootDir: string,
  relativePath: string,
  content: string,
  taskScope: string[] = [],
  policyForbidden: string[] = [],
) {
  const { normalized, resolved } = resolveRootPath(rootDir, relativePath);
  ensureScope(normalized, taskScope, policyForbidden);
  await mkdir(path.dirname(resolved), { recursive: true });
  await fsWriteFile(resolved, content, 'utf8');
}

export async function findPattern(rootDir: string, pattern: string, fileGlob?: string) {
  const safePattern = pattern.replace(/"/g, '\\"');
  const includePart = fileGlob ? ` --include=\"${fileGlob.replace(/"/g, '\\"')}\"` : '';
  const command = `grep -rn${includePart} -E \"${safePattern}\" . 2>/dev/null || true`;
  let output = '';

  try {
    output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
    });
  } catch {
    return [];
  }

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 50)
    .map((line) => {
      const match = line.match(/^\.\/?([^:]+):(\d+):(.*)$/);
      if (!match) {
        return null;
      }

      return {
        file: match[1].replace(/\\/g, '/'),
        line: Number(match[2]),
        text: match[3],
      };
    })
    .filter((entry): entry is { file: string; line: number; text: string } => entry !== null);
}

export async function listFiles(rootDir: string, subPath?: string) {
  const { normalized, resolved } = resolveRootPath(rootDir, subPath ?? '');
  ensureScope(normalized, [], []);

  const command = [
    'find',
    '.',
    '-maxdepth',
    '3',
    '-path',
    './node_modules',
    '-prune',
    '-o',
    '-path',
    './.git',
    '-prune',
    '-o',
    '-type',
    'f',
    '-print',
  ].join(' ');

  let output = '';

  try {
    output = execSync(command, {
      cwd: resolved,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
    });
  } catch {
    return [];
  }

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((entry) => entry.replace(/^\.\//, ''))
    .map((entry) => (normalized ? path.posix.join(normalized, entry) : entry))
    .map((entry) => entry.replace(/\\/g, '/'));
}

export async function diffFiles(rootDir: string) {
  return execSync('git diff --stat', {
    cwd: rootDir,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true,
  });
}