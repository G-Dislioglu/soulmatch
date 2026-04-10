/**
 * Opus Index Generator
 *
 * Fetches all TypeScript/TSX files from server/src/ via GitHub API,
 * extracts exported names, pushes to the opus bridge endpoint,
 * and invalidates the in-memory repo index cache.
 *
 * Usage:
 *   const { totalFiles, durationMs } = await regenerateRepoIndex();
 */

import { invalidateIndexCache } from './builderScopeResolver.js';

const GITHUB_API_BASE = 'https://api.github.com/repos/G-Dislioglu/soulmatch';
const GITHUB_TREE_URL = `${GITHUB_API_BASE}/git/trees/main?recursive=1`;
const RAW_BASE = 'https://raw.githubusercontent.com/G-Dislioglu/soulmatch/main';

const FILE_TIMEOUT_MS = 5_000;
const MAX_CONCURRENCY = 10;

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url?: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

interface IndexedFile {
  p: string;   // path
  l: number;   // lines
  e: string[]; // export names
}

interface RepoIndexPayload {
  t: number;         // totalFiles
  f: IndexedFile[];  // files
}

function buildGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SoulMatch-OpusBridge/1.0',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function buildPushHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'SoulMatch-OpusBridge/1.0',
  };
}

/**
 * Filter a GitHub tree to only server/src TypeScript/TSX files,
 * excluding node_modules, dist, and non-file entries.
 */
function filterServerSourceFiles(tree: GitHubTreeItem[]): string[] {
  const allowedExtensions = new Set(['.ts', '.tsx']);
  return tree
    .filter(
      (item) =>
        item.type === 'blob' &&
        item.path.startsWith('server/src/') &&
        allowedExtensions.has(getExtension(item.path)) &&
        !item.path.includes('/node_modules/') &&
        !item.path.includes('/dist/'),
    )
    .map((item) => item.path);
}

function getExtension(path: string): string {
  const idx = path.lastIndexOf('.');
  return idx >= 0 ? path.slice(idx) : '';
}

/**
 * Fetch a single file's raw content from GitHub with a timeout.
 * Returns null on failure.
 */
async function fetchFileContent(path: string): Promise<string | null> {
  const url = `${RAW_BASE}/${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FILE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: buildGitHubHeaders(),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract all exported names from a TypeScript/TSX file.
 * Matches: export function, export const, export class,
 * export interface, export type, export enum.
 */
function extractExportNames(content: string): string[] {
  const exports: string[] = [];

  // Match "export" followed by keyword, then optional "declare", then identifier
  // Handles: export function Foo, export const bar, export class Baz, export interface Qux, export type Foo, export enum Bar
  // Also handles: export default ... but we skip that for the index
  const regex =
    /(?:^|\n)\s*export\s+(?:declare\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // Also capture: export { name } and export { name as alias }
  const namedExportRegex = /(?:^|\n)\s*export\s+\{([^}]+)\}/gm;
  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = namedExportRegex.exec(content)) !== null) {
    const inner = namedMatch[1];
    // Split by comma, strip "as" aliases, strip leading/trailing whitespace
    const names = inner.split(',').map((s) => {
      const trimmed = s.trim();
      const asIdx = trimmed.indexOf(' as ');
      return asIdx >= 0 ? trimmed.slice(0, asIdx).trim() : trimmed;
    });
    for (const name of names) {
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
        exports.push(name);
      }
    }
  }

  return exports;
}

/**
 * Process a batch of file paths concurrently (up to MAX_CONCURRENCY).
 */
async function processBatch(
  paths: string[],
  concurrency: number,
): Promise<IndexedFile[]> {
  const results: IndexedFile[] = [];

  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (p) => {
        const content = await fetchFileContent(p);
        if (content === null) {
          return null;
        }
        const lines = content.split('\n').length;
        const exports = extractExportNames(content);
        return { p, l: lines, e: exports } satisfies IndexedFile;
      }),
    );
    for (const r of batchResults) {
      if (r !== null) {
        results.push(r);
      }
    }
  }

  return results;
}

/**
 * Push the built index to the opus bridge /push endpoint.
 */
async function pushIndex(payload: RepoIndexPayload): Promise<void> {
  const port = process.env.PORT ?? '3001';
  const token = process.env.OPUS_BRIDGE_SECRET ?? '';
  const url = `http://localhost:${port}/api/builder/opus-bridge/push?opus_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: buildPushHeaders(),
    body: JSON.stringify({
      files: [{ file: 'server/data/builder-repo-index.json', content: JSON.stringify(payload) }],
      message: `chore: regen repo index (${payload.f.length} files)`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(`opus bridge push failed: ${res.status} ${res.statusText} — ${text}`);
  }
}

/**
 * Main entry point. Fetches the full repo tree, filters server/src files,
 * fetches each file, extracts exports, pushes to opus bridge,
 * invalidates the in-memory cache, and returns stats.
 */
export async function regenerateRepoIndex(): Promise<{
  totalFiles: number;
  durationMs: number;
}> {
  const start = Date.now();

  // 1. Fetch full GitHub tree
  let treeResponse: GitHubTreeResponse;
  try {
    const res = await fetch(GITHUB_TREE_URL, {
      headers: buildGitHubHeaders(),
    });
    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status} ${res.statusText}`);
    }
    treeResponse = (await res.json()) as GitHubTreeResponse;
  } catch (err) {
    throw new Error(`Failed to fetch GitHub tree: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Filter to server/src/**/*.ts / ***.tsx
  const sourcePaths = filterServerSourceFiles(treeResponse.tree);
  console.log(`[opusIndexGenerator] Found ${sourcePaths.length} source files in server/src/`);

  // 3. Fetch + extract exports in batches of MAX_CONCURRENCY
  const files = await processBatch(sourcePaths, MAX_CONCURRENCY);

  // 4. Build payload
  const payload: RepoIndexPayload = {
    t: files.length,
    f: files,
  };

  // 5. Push to opus bridge
  try {
    await pushIndex(payload);
    console.log(`[opusIndexGenerator] Pushed index to opus bridge (${files.length} files)`);
  } catch (err) {
    console.error('[opusIndexGenerator] Failed to push index:', err);
    throw err;
  }

  // 6. Invalidate in-memory cache used by builderScopeResolver
  invalidateIndexCache();
  console.log('[opusIndexGenerator] Index cache invalidated');

  const durationMs = Date.now() - start;
  console.log(`[opusIndexGenerator] Done in ${durationMs}ms`);

  return { totalFiles: files.length, durationMs };
}
