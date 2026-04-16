import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, posix, resolve } from 'node:path';

export interface RelatedFile {
  path: string;
  source: 'import' | 'reverse-import' | 'neighbor';
  preview: string;
}

interface RepoFileEntry {
  path: string;
  lines: number;
  exports: string[];
}

function normalizeFileIndex(fileIndex: Record<string, unknown>): RepoFileEntry[] {
  const rawFiles = Array.isArray(fileIndex.files)
    ? fileIndex.files
    : Array.isArray(fileIndex.f)
      ? fileIndex.f
      : [];

  return rawFiles
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const path = (record.path || record.p || '') as string;
      if (!path) return null;
      return {
        path,
        lines: Number(record.lines || record.l || 0),
        exports: Array.isArray(record.exports || record.e) ? ((record.exports || record.e) as string[]) : [],
      } satisfies RepoFileEntry;
    })
    .filter((entry): entry is RepoFileEntry => entry !== null);
}

export function loadBuilderFileIndex(): Record<string, unknown> {
  const candidates = [
    resolve(process.cwd(), 'data/builder-repo-index.json'),
    resolve(process.cwd(), 'server/data/builder-repo-index.json'),
    resolve(process.cwd(), '../server/data/builder-repo-index.json'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    return JSON.parse(readFileSync(candidate, 'utf8')) as Record<string, unknown>;
  }

  throw new Error('builder-repo-index.json not found');
}

function resolveRepoFilePath(relativePath: string): string | null {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', relativePath),
    resolve(process.cwd(), 'server', '..', relativePath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

function readRepoFile(relativePath: string): string | null {
  const filePath = resolveRepoFilePath(relativePath);
  if (!filePath) return null;

  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function toPreview(content: string, maxLines = 100): string {
  return content.split('\n').slice(0, maxLines).join('\n');
}

function extractRelativeImports(content: string): string[] {
  const matches = new Set<string>();
  const patterns = [
    /(?:import|export)\s+[\s\S]*?from\s+['"](\.[^'"]+)['"]/g,
    /import\(\s*['"](\.[^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      matches.add(match[1]);
    }
  }

  return [...matches];
}

function resolveImportPath(importerPath: string, importPath: string, knownPaths: Set<string>): string | null {
  if (!importPath.startsWith('.')) return null;

  const base = posix.normalize(posix.join(posix.dirname(importerPath), importPath));
  const candidates = new Set<string>([
    base,
    `${base}.ts`,
    `${base}.tsx`,
    posix.join(base, 'index.ts'),
    posix.join(base, 'index.tsx'),
  ]);

  if (base.endsWith('.js')) {
    candidates.add(`${base.slice(0, -3)}.ts`);
    candidates.add(`${base.slice(0, -3)}.tsx`);
  }

  if (base.endsWith('.jsx')) {
    candidates.add(`${base.slice(0, -4)}.tsx`);
    candidates.add(`${base.slice(0, -4)}.ts`);
  }

  for (const candidate of candidates) {
    if (knownPaths.has(candidate)) return candidate;
  }

  return null;
}

function splitStem(stem: string): string[] {
  return stem
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s._-]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function commonPrefixLength(left: string, right: string): number {
  const max = Math.min(left.length, right.length);
  let count = 0;
  while (count < max && left[count] === right[count]) count++;
  return count;
}

function scoreNeighbor(targetPath: string, candidatePath: string): number {
  if (posix.dirname(targetPath) !== posix.dirname(candidatePath)) return 0;

  const targetStem = basename(targetPath, extname(targetPath));
  const candidateStem = basename(candidatePath, extname(candidatePath));
  if (targetStem === candidateStem) return 0;

  const targetTokens = splitStem(targetStem);
  const candidateTokens = splitStem(candidateStem);
  const sharedFirstToken = targetTokens[0] && candidateTokens[0] === targetTokens[0];
  const prefix = commonPrefixLength(targetStem.toLowerCase(), candidateStem.toLowerCase());

  let score = 0;
  if (candidateStem.toLowerCase().startsWith(targetStem.toLowerCase())) score += 100;
  if (sharedFirstToken) score += 35;
  if (prefix >= 4) score += prefix;

  return score;
}

export async function findRelatedFiles(
  targetPath: string,
  fileIndex: Record<string, unknown>,
  maxFiles = 5,
): Promise<RelatedFile[]> {
  const indexedFiles = normalizeFileIndex(fileIndex);
  const knownPaths = new Set(indexedFiles.map((entry) => entry.path));
  const ranked = new Map<string, { source: RelatedFile['source']; score: number }>();

  const upsert = (path: string, source: RelatedFile['source'], score: number) => {
    if (path === targetPath) return;
    const existing = ranked.get(path);
    if (!existing || score > existing.score) {
      ranked.set(path, { source, score });
    }
  };

  const targetContent = readRepoFile(targetPath);
  if (targetContent) {
    for (const importPath of extractRelativeImports(targetContent)) {
      const resolved = resolveImportPath(targetPath, importPath, knownPaths);
      if (resolved) upsert(resolved, 'import', 300);
    }
  }

  for (const file of indexedFiles) {
    if (file.path === targetPath) continue;
    const content = readRepoFile(file.path);
    if (!content) continue;
    const imports = extractRelativeImports(content);
    for (const importPath of imports) {
      const resolved = resolveImportPath(file.path, importPath, knownPaths);
      if (resolved === targetPath) {
        upsert(file.path, 'reverse-import', 200);
        break;
      }
    }
  }

  for (const file of indexedFiles) {
    const score = scoreNeighbor(targetPath, file.path);
    if (score > 0) upsert(file.path, 'neighbor', score);
  }

  return [...ranked.entries()]
    .sort((left, right) => right[1].score - left[1].score || left[0].localeCompare(right[0]))
    .slice(0, maxFiles)
    .map(([path, meta]) => {
      const content = readRepoFile(path) ?? '';
      return {
        path,
        source: meta.source,
        preview: toPreview(content, 100),
      } satisfies RelatedFile;
    });
}