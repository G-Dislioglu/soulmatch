/**
 * Deterministic Scope Resolver — kein LLM darf Dateipfade raten.
 * 
 * Strategie:
 * 1. Exakte Pfadtreffer aus der Instruction
 * 2. Dateiname-Matches
 * 3. Export-/Symbol-Matches
 * 4. Keyword-Retrieval
 * 5. Optional: LLM nur zum RANKEN der Kandidaten, nie zum Erfinden
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface RepoFileEntry {
  path: string;
  lines: number;
  exports: string[];
}

interface RepoIndex {
  totalFiles: number;
  files: RepoFileEntry[];
}

const CREATE_SIGNAL_RE = /erstell|create|neue|hinzufueg|new file/i;

export type ScopeMethod = 'deterministic' | 'hybrid' | 'create';

export interface ScopeResult {
  files: string[];
  reasoning: string[];
  method: ScopeMethod;
  rejectedPaths?: string[];
}

let cachedIndex: RepoIndex | null = null;

function hasPlausiblePrefix(path: string, index: RepoIndex): boolean {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  const requiredDepth = segments.length >= 3 ? 3 : 1;
  const requiredPrefix = segments.slice(0, requiredDepth).join('/');

  return index.files.some((file) => {
    const filePrefix = file.path.split('/').filter(Boolean).slice(0, requiredDepth).join('/');
    return filePrefix === requiredPrefix;
  });
}

function loadIndex(): RepoIndex {
  if (cachedIndex) return cachedIndex;
  const paths = [
    resolve(process.cwd(), 'data/builder-repo-index.json'),
    resolve(process.cwd(), 'docs/builder-repo-index.json'),
    resolve(process.cwd(), '../docs/builder-repo-index.json'),
  ];
  for (const p of paths) {
    try {
      const raw = JSON.parse(readFileSync(p, 'utf-8'));
      // Normalize slim format (p/l/e) to full format (path/lines/exports)
      const files: RepoFileEntry[] = (raw.files || raw.f || []).map((f: Record<string, unknown>) => ({
        path: (f.path || f.p || '') as string,
        lines: (f.lines || f.l || 0) as number,
        exports: (f.exports || f.e || []) as string[],
      }));
      cachedIndex = { totalFiles: raw.totalFiles || raw.t || files.length, files };
      return cachedIndex;
    } catch { /* next */ }
  }
  throw new Error('builder-repo-index.json not found — run index generator first');
}

/** Invalidate cache (e.g. after a push that updates the index) */
export function invalidateIndexCache(): void {
  cachedIndex = null;
}

export function isIndexedRepoFile(path: string): boolean {
  return loadIndex().files.some((file) => file.path === path);
}

/**
 * Resolve scope deterministically from instruction text.
 * No LLM call. Pure text matching against repo index.
 */
export function resolveScope(instruction: string): ScopeResult {
  const index = loadIndex();
  const reasoning: string[] = [];
  const rejectedPaths: string[] = [];
  const scored = new Map<string, number>();
  let method: ScopeMethod = 'deterministic';

  const instrLower = instruction.toLowerCase();
  const hasCreateSignal = CREATE_SIGNAL_RE.test(instruction);
  const instrWords = new Set(instrLower.split(/[\s,;:()\[\]{}`'"`]+/).filter(w => w.length > 2));


  for (const file of index.files) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Exact path match (strongest signal)
    if (instruction.includes(file.path)) {
      score += 100;
      reasons.push(`exact path "${file.path}"`);
    }

    // 2. Filename match
    const filename = file.path.split('/').pop()?.replace(/\.(ts|tsx)$/, '') || '';
    if (instrLower.includes(filename.toLowerCase()) && filename.length > 3) {
      score += 50;
      reasons.push(`filename "${filename}"`);
    }

    // 3. Export/symbol match
    for (const exp of file.exports) {
      if (instrLower.includes(exp.toLowerCase())) {
        score += 30;
        reasons.push(`export "${exp}"`);
      }
    }

    // 4. Path segment keyword overlap
    const pathWords = file.path.toLowerCase().split(/[/\-_.]/g).filter(w => w.length > 2);
    let kwHits = 0;
    for (const pw of pathWords) {
      if (instrWords.has(pw)) kwHits++;
    }
    if (kwHits >= 2) {
      score += kwHits * 5;
      reasons.push(`${kwHits} path-keyword hits`);
    }

    if (score > 0) {
      scored.set(file.path, score);
      if (reasons.length > 0) {
        reasoning.push(`${file.path} (${score}): ${reasons.join(', ')}`);
      }
    }
  }

  // Sort by score, take top candidates
  const sorted = [...scored.entries()].sort((a, b) => b[1] - a[1]);
  
  // Take files with score >= 20, max 8 files
  const files = sorted
    .filter(([, s]) => s >= 20)
    .slice(0, 8)
    .map(([path]) => path);

  if (files.length === 0) {
    const pm = instruction.match(/(?:server|client)\/src\/[\w/. -]+\.tsx?/i);
    if (pm && hasCreateSignal) {
      if (hasPlausiblePrefix(pm[0], index)) {
        files.push(pm[0]);
        reasoning.push(pm[0] + " (CREATE): path not in index, instruction requests creation");
        method = 'create';
      } else if (!rejectedPaths.includes(pm[0])) {
        reasoning.push(`${pm[0]} REJECTED: no indexed file shares the first 3 path segments, likely hallucination`);
        rejectedPaths.push(pm[0]);
      }
    }
  }

  if (files.length === 0) {
    const pm = instruction.match(/(?:server|client)\/src\/[\w/.-]+\.tsx?/i);
    if (pm && hasCreateSignal) {
      if (hasPlausiblePrefix(pm[0], index)) {
        files.push(pm[0]);
        reasoning.push(pm[0] + " (CREATE)");
        method = 'create';
      } else if (!rejectedPaths.includes(pm[0])) {
        reasoning.push(`${pm[0]} REJECTED: no indexed file shares the first 3 path segments, likely hallucination`);
        rejectedPaths.push(pm[0]);
      }
    }
  }

  return {
    files,
    reasoning,
    method,
    ...(rejectedPaths.length > 0 ? { rejectedPaths } : {}),
  };
}

/**
 * Fetch file contents from GitHub raw for given paths.
 */
export async function fetchFileContents(
  files: string[],
  repo = 'G-Dislioglu/soulmatch',
  branch = 'main',
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  
  await Promise.all(files.map(async (f) => {
    try {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${f}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        contents.set(f, await res.text());
      }
    } catch { /* new file or fetch error */ }
  }));

  return contents;
}