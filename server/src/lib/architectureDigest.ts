import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { outboundFetch } from './outboundHttp.js';

type DigestSection = 'modules' | 'routes' | 'db_tables' | 'cross_repos' | 'conventions';

type ModuleDigestEntry = {
  path: string;
  purpose: string;
  main_exports: string[];
  depends_on: string[];
  used_by: string[];
  file_count: number;
};

type RouteSubrouterEntry = {
  base: string;
  mount_file: string;
  endpoint_count: number;
  endpoints?: string[];
};

type RouteDigestEntry = {
  base: string;
  mount_file: string;
  endpoint_count?: number;
  endpoints?: string[];
  subrouters?: Record<string, RouteSubrouterEntry>;
};

type DbTableGroup = {
  tables: string[];
  purpose: string;
};

export type ArchitectureDigestResult = {
  generatedAt: string;
  repoHead: string;
  modules?: Record<string, ModuleDigestEntry>;
  routes?: Record<string, RouteDigestEntry>;
  db_tables?: Record<string, DbTableGroup>;
  cross_repos?: typeof CROSS_REPOS;
  conventions?: typeof CONVENTIONS;
};

type GitHubTreeItem = {
  path: string;
  type: string;
};

type GitHubTreeResponse = {
  tree?: GitHubTreeItem[];
};

type GitHubCommitResponse = Array<{
  sha?: string;
}>;

type DigestCacheEntry = {
  ts: number;
  data: ArchitectureDigestResult;
};

const DEFAULT_REPO = 'G-Dislioglu/soulmatch';
const GITHUB_ACCEPT = 'application/vnd.github+json';
const DIGEST_TTL_MS = 5 * 60_000;
const PURPOSE_FALLBACK = 'no purpose documented — add /** PURPOSE: ... */ in index.ts';
const ALL_SECTIONS: DigestSection[] = ['modules', 'routes', 'db_tables', 'cross_repos', 'conventions'];
const digestCache = new Map<string, DigestCacheEntry>();
const repoFileCache = new Map<string, { ts: number; content: string | null }>();
let repoTreeCache: { ts: number; files: string[] } | null = null;

const CROSS_REPOS = {
  soulmatch: {
    role: 'main app + builder runtime',
    github: 'https://github.com/G-Dislioglu/soulmatch',
  },
  'maya-core': {
    role: 'Maya als standalone Companion, Thread-Digest-Pipeline',
    github: 'https://github.com/G-Dislioglu/aicos-registry/tree/master/maya-core',
    note: 'liegt als Unterordner in aicos-registry, eigene Next.js-App',
  },
  'aicos-registry': {
    role: 'Karten-System, MEC-Phasen, Unified System Spec',
    github: 'https://github.com/G-Dislioglu/aicos-registry',
  },
} as const;

const CONVENTIONS = {
  module_prefix: 'M<NN>_<name> — organisch gewachsene Nummer, nicht an Reihenfolge gebunden',
  worker_profile_model_ids: 'poolState.ts POOL_MODEL_MAP ist source of truth, workerProfiles.ts hält Drift-Warnung-Header',
  bridge_auth: 'opus_token für /api/builder/opus-bridge/* und /api/context/*',
  docs_vs_container: 'Dockerfile Runtime-Stage kopiert nur server/ + client/dist — docs/ und Root-Files sind NICHT im Container (siehe F11-Followup)',
} as const;

function getRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'STATE.md')) && existsSync(path.join(candidate, 'docs'))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), '..');
}

function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function resolveRepoPath(repoRoot: string, relativePath: string): string | null {
  if (!relativePath || path.isAbsolute(relativePath)) {
    return null;
  }

  const resolved = path.resolve(repoRoot, relativePath);
  const normalizedRoot = path.resolve(repoRoot).toLowerCase();
  const normalizedResolved = resolved.toLowerCase();
  if (normalizedResolved !== normalizedRoot && !normalizedResolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }

  return resolved;
}

function getGithubRepo(): string {
  return process.env.GITHUB_REPO || DEFAULT_REPO;
}

function getGithubAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: GITHUB_ACCEPT,
    'User-Agent': 'soulmatch-architecture-digest',
  };

  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  }

  return headers;
}

function buildRawGithubUrl(repoRelativePath: string): string {
  const encodedPath = normalizeRepoPath(repoRelativePath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://raw.githubusercontent.com/${getGithubRepo()}/main/${encodedPath}`;
}

function buildGithubApiUrl(apiPath: string): string {
  return `https://api.github.com/repos/${getGithubRepo()}${apiPath}`;
}

function isCacheFresh(timestamp: number): boolean {
  return timestamp > Date.now() - DIGEST_TTL_MS;
}

function readLocalRepoText(repoRoot: string, repoRelativePath: string): string | null {
  const resolved = resolveRepoPath(repoRoot, repoRelativePath);
  if (!resolved || !existsSync(resolved) || !statSync(resolved).isFile()) {
    return null;
  }

  return readFileSync(resolved, 'utf8');
}

async function fetchTextOrNull(url: string): Promise<string | null> {
  try {
    const response = await outboundFetch(url, {
      headers: getGithubAuthHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.warn('[architecture-digest] text fetch failed:', url, error);
    return null;
  }
}

async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  try {
    const response = await outboundFetch(url, {
      headers: getGithubAuthHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json() as T;
  } catch (error) {
    console.warn('[architecture-digest] json fetch failed:', url, error);
    return null;
  }
}

async function readRepoFile(repoRoot: string, repoRelativePath: string): Promise<string | null> {
  const normalizedPath = normalizeRepoPath(repoRelativePath);
  const cached = repoFileCache.get(normalizedPath);
  if (cached && isCacheFresh(cached.ts)) {
    return cached.content;
  }

  const localContent = readLocalRepoText(repoRoot, normalizedPath);
  if (localContent !== null) {
    repoFileCache.set(normalizedPath, { ts: Date.now(), content: localContent });
    return localContent;
  }

  const remoteContent = await fetchTextOrNull(buildRawGithubUrl(normalizedPath));
  repoFileCache.set(normalizedPath, { ts: Date.now(), content: remoteContent });
  return remoteContent;
}

function listLocalRepoFiles(repoRoot: string, repoRelativePath: string): string[] | null {
  const resolved = resolveRepoPath(repoRoot, repoRelativePath);
  if (!resolved || !existsSync(resolved)) {
    return null;
  }

  const stats = statSync(resolved);
  if (stats.isFile()) {
    return [normalizeRepoPath(repoRelativePath)];
  }

  const files: string[] = [];
  const walk = (directoryPath: string): void => {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const childPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walk(childPath);
      } else if (entry.isFile()) {
        files.push(normalizeRepoPath(path.relative(repoRoot, childPath)));
      }
    }
  };

  walk(resolved);
  return files;
}

async function getRepoTreeFiles(): Promise<string[]> {
  if (repoTreeCache && isCacheFresh(repoTreeCache.ts)) {
    return repoTreeCache.files;
  }

  const response = await fetchJsonOrNull<GitHubTreeResponse>(buildGithubApiUrl('/git/trees/main?recursive=1'));
  const files = (response?.tree ?? [])
    .filter((item) => item.type === 'blob')
    .map((item) => normalizeRepoPath(item.path))
    .sort();
  repoTreeCache = { ts: Date.now(), files };
  return files;
}

async function listRepoFiles(repoRoot: string, repoRelativePath: string): Promise<string[]> {
  const localFiles = listLocalRepoFiles(repoRoot, repoRelativePath);
  if (localFiles !== null) {
    return localFiles;
  }

  const prefix = normalizeRepoPath(repoRelativePath).replace(/\/$/, '');
  const repoFiles = await getRepoTreeFiles();
  return repoFiles.filter((filePath) => filePath === prefix || filePath.startsWith(`${prefix}/`));
}

function normalizeSectionList(sections?: string[]): DigestSection[] {
  if (!sections || sections.length === 0) {
    return [...ALL_SECTIONS];
  }

  const normalized: DigestSection[] = [];
  for (const rawSection of sections) {
    const section = String(rawSection).trim() as DigestSection;
    if ((ALL_SECTIONS as string[]).includes(section)) {
      if (!normalized.includes(section)) {
        normalized.push(section);
      }
      continue;
    }

    console.warn('[architecture-digest] ignoring unknown section:', rawSection);
  }

  return normalized;
}

function buildCacheKey(sections: DigestSection[]): string {
  if (sections.length === ALL_SECTIONS.length) {
    return 'all';
  }

  return [...sections].sort().join(',');
}

function normalizeRouteKey(importPath: string): string {
  const baseName = normalizeRepoPath(importPath).split('/').pop()?.replace(/\.js$/, '').replace(/\.ts$/, '') ?? 'route';
  if (baseName === 'contextBroker') {
    return 'context';
  }
  if (baseName === 'opusBridge') {
    return 'opus-bridge';
  }
  if (baseName === 'astro') {
    return 'astro';
  }
  if (baseName === 'scoutPatrol') {
    return 'patrol';
  }
  return baseName;
}

function toServerSourcePath(importPath: string): string {
  const normalized = normalizeRepoPath(importPath)
    .replace(/^\.\//, 'server/src/')
    .replace(/\.js$/, '.ts');
  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEndpointPath(routePath: string): string {
  if (routePath === '/') {
    return '/';
  }
  return routePath.replace(/^\//, '');
}

function detectLocalRouterIdentifier(fileContent: string, importedRouterName: string): string {
  const exportedConstPattern = new RegExp(`export\\s+const\\s+${escapeRegExp(importedRouterName)}\\s*=\\s*Router\\(`);
  if (exportedConstPattern.test(fileContent)) {
    return importedRouterName;
  }

  const aliasMatch = fileContent.match(new RegExp(`export\\s*\\{\\s*(\\w+)\\s+as\\s+${escapeRegExp(importedRouterName)}\\s*\\}`));
  if (aliasMatch?.[1]) {
    return aliasMatch[1];
  }

  return importedRouterName;
}

function extractEndpoints(fileContent: string, routerIdentifier: string): string[] {
  const endpointPattern = new RegExp(`${escapeRegExp(routerIdentifier)}\\.(get|post|put|delete|patch)\\(\\s*['\"]([^'\"]+)['\"]`, 'g');
  const endpoints = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = endpointPattern.exec(fileContent)) !== null) {
    endpoints.add(normalizeEndpointPath(match[2] ?? ''));
  }
  return [...endpoints].sort();
}

function findParentRouteKey(routeKey: string, routes: Array<{ key: string; base: string }>): string | null {
  const current = routes.find((route) => route.key === routeKey);
  if (!current) {
    return null;
  }

  const candidates = routes
    .filter((route) => route.key !== routeKey)
    .filter((route) => route.base !== '/api')
    .filter((route) => current.base.startsWith(`${route.base}/`))
    .sort((left, right) => right.base.length - left.base.length);

  return candidates[0]?.key ?? null;
}

function sortObjectByKey<T>(input: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)));
}

function extractPurpose(indexContent: string | null): string {
  if (!indexContent) {
    return PURPOSE_FALLBACK;
  }

  const match = indexContent.match(/\/\*\*\s*PURPOSE:\s*([\s\S]*?)\*\//);
  if (!match?.[1]) {
    return PURPOSE_FALLBACK;
  }

  const cleaned = match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || PURPOSE_FALLBACK;
}

function extractMainExports(indexContent: string | null): string[] {
  if (!indexContent) {
    return [];
  }

  const exports = new Set<string>();
  const namedExportPattern = /(?:^|\n)\s*export(?:\s+type)?\s+\{([^}]+)\}/gm;
  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = namedExportPattern.exec(indexContent)) !== null) {
    for (const rawName of namedMatch[1].split(',')) {
      const trimmed = rawName.trim();
      if (!trimmed) {
        continue;
      }

      const aliasParts = trimmed.split(/\s+as\s+/i).map((value) => value.trim()).filter(Boolean);
      const exportName = aliasParts.length > 1 ? aliasParts[1] : aliasParts[0];
      if (exportName && exportName !== 'default') {
        exports.add(exportName);
      }
    }
  }

  const directExportPattern = /(?:^|\n)\s*export\s+(?:declare\s+)?(?:const|function|class|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let directMatch: RegExpExecArray | null;
  while ((directMatch = directExportPattern.exec(indexContent)) !== null) {
    exports.add(directMatch[1]);
  }

  return [...exports].sort();
}

function extractModuleDependencies(moduleName: string, fileContents: Array<string | null>): string[] {
  const dependencies = new Set<string>();
  const importPattern = /\bfrom\s+['\"]([^'\"]+)['\"]|import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g;

  for (const content of fileContents) {
    if (!content) {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(content)) !== null) {
      const specifier = match[1] ?? match[2] ?? '';
      const moduleMatch = specifier.match(/M\d{2}_[A-Za-z0-9_-]+/);
      if (moduleMatch?.[0] && moduleMatch[0] !== moduleName) {
        dependencies.add(moduleMatch[0]);
      }
    }
  }

  return [...dependencies].sort();
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  limit: number,
  mapper: (item: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function buildModulesDigest(repoRoot: string): Promise<Record<string, ModuleDigestEntry>> {
  const moduleFiles = await listRepoFiles(repoRoot, 'client/src/modules');
  const moduleNames = [...new Set(
    moduleFiles
      .map((filePath) => filePath.match(/^client\/src\/modules\/(M\d{2}_[^/]+)/)?.[1] ?? null)
      .filter((value): value is string => value !== null),
  )].sort();

  const moduleFilePaths = new Map<string, string[]>();
  for (const moduleName of moduleNames) {
    const prefix = `client/src/modules/${moduleName}/`;
    moduleFilePaths.set(
      moduleName,
      moduleFiles
        .filter((filePath) => filePath.startsWith(prefix))
        .filter((filePath) => /\.(ts|tsx)$/.test(filePath))
        .sort(),
    );
  }

  const uniqueFilePaths = [...new Set(moduleNames.flatMap((moduleName) => moduleFilePaths.get(moduleName) ?? []))];
  const contents = await mapWithConcurrency(uniqueFilePaths, 16, async (filePath) => ({
    filePath,
    content: await readRepoFile(repoRoot, filePath),
  }));
  const contentMap = new Map(contents.map((entry) => [entry.filePath, entry.content]));

  const modules: Record<string, ModuleDigestEntry> = {};
  for (const moduleName of moduleNames) {
    const modulePath = `client/src/modules/${moduleName}`;
    const tsFiles = moduleFilePaths.get(moduleName) ?? [];
    const indexPath = `${modulePath}/index.ts`;
    const indexContent = contentMap.get(indexPath) ?? null;
    const fileContents = tsFiles.map((filePath) => contentMap.get(filePath) ?? null);

    modules[moduleName] = {
      path: modulePath,
      purpose: extractPurpose(indexContent),
      main_exports: extractMainExports(indexContent),
      depends_on: extractModuleDependencies(moduleName, fileContents),
      used_by: [],
      file_count: tsFiles.length,
    };
  }

  for (const [moduleName, moduleDigest] of Object.entries(modules)) {
    for (const dependency of moduleDigest.depends_on) {
      if (modules[dependency] && !modules[dependency].used_by.includes(moduleName)) {
        modules[dependency].used_by.push(moduleName);
      }
    }
  }

  for (const moduleDigest of Object.values(modules)) {
    moduleDigest.used_by.sort();
  }

  return sortObjectByKey(modules);
}

async function buildRoutesDigest(repoRoot: string): Promise<Record<string, RouteDigestEntry>> {
  const indexContent = await readRepoFile(repoRoot, 'server/src/index.ts');
  if (!indexContent) {
    return {};
  }

  const importMap = new Map<string, string>();
  const importPattern = /import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]/g;
  let importMatch: RegExpExecArray | null;
  while ((importMatch = importPattern.exec(indexContent)) !== null) {
    const importPath = importMatch[2];
    const normalizedImportPath = toServerSourcePath(importPath);
    for (const rawSpecifier of importMatch[1].split(',')) {
      const cleaned = rawSpecifier.trim().replace(/^type\s+/, '');
      if (!cleaned) {
        continue;
      }

      const parts = cleaned.split(/\s+as\s+/i).map((value) => value.trim());
      const localName = parts[1] ?? parts[0];
      importMap.set(localName, normalizedImportPath);
    }
  }

  const mounts: Array<{ key: string; base: string; mount_file: string; endpoints: string[] }> = [];
  const mountPattern = /app\.use\(\s*['\"]([^'\"]+)['\"]\s*,\s*(\w+)\s*\)/g;
  let mountMatch: RegExpExecArray | null;
  while ((mountMatch = mountPattern.exec(indexContent)) !== null) {
    const base = mountMatch[1] ?? '';
    const routerImportName = mountMatch[2] ?? '';
    const mountFile = importMap.get(routerImportName);
    if (!mountFile) {
      continue;
    }

    const mountFileContent = await readRepoFile(repoRoot, mountFile);
    const localRouterIdentifier = mountFileContent ? detectLocalRouterIdentifier(mountFileContent, routerImportName) : routerImportName;
    mounts.push({
      key: normalizeRouteKey(mountFile),
      base,
      mount_file: mountFile,
      endpoints: mountFileContent ? extractEndpoints(mountFileContent, localRouterIdentifier) : [],
    });
  }

  const topLevelRoutes: Record<string, RouteDigestEntry> = Object.fromEntries(
    mounts.map((mount) => [
      mount.key,
      {
        base: mount.base,
        mount_file: mount.mount_file,
        endpoint_count: mount.endpoints.length,
        ...(mount.endpoints.length > 0 ? { endpoints: mount.endpoints } : {}),
      } satisfies RouteDigestEntry,
    ]),
  );

  for (const mount of mounts) {
    const parentKey = findParentRouteKey(mount.key, mounts.map((entry) => ({ key: entry.key, base: entry.base })));
    if (!parentKey) {
      continue;
    }

    const parent = topLevelRoutes[parentKey];
    if (!parent) {
      continue;
    }

    const subrouters = parent.subrouters ?? {};
    subrouters[mount.key] = {
      base: mount.base,
      mount_file: mount.mount_file,
      endpoint_count: mount.endpoints.length,
      ...(mount.endpoints.length > 0 ? { endpoints: mount.endpoints } : {}),
    };

    topLevelRoutes[parentKey] = {
      ...parent,
      subrouters: sortObjectByKey(subrouters),
    };
    delete topLevelRoutes[mount.key];
  }

  return sortObjectByKey(topLevelRoutes);
}

function groupDbTable(tableName: string): keyof typeof DB_GROUP_PURPOSES {
  if (tableName.startsWith('builder_') || tableName === 'pool_state' || tableName === 'async_jobs') {
    return 'builder_stack';
  }
  if (tableName === 'profiles' || tableName.startsWith('profile_') || tableName.startsWith('session_') || tableName.startsWith('user_')) {
    return 'product_stack';
  }
  if (tableName.startsWith('persona_')) {
    return 'arcana_stack';
  }
  return 'other';
}

const DB_GROUP_PURPOSES = {
  builder_stack: 'Builder-Pipeline: Tasks, Worker-Briefings, Pool-Config, Memory-Layers, Async-Job-Persistenz',
  product_stack: 'Soulmatch-App-Runtime: Profile-Daten und weitere user-nahe Persistenz, soweit sie im Repo-Code als Drizzle-Tabellen sichtbar ist',
  arcana_stack: 'Arcana-Studio: Persona-Definitionen, Voice-Overrides und Presets',
  other: 'Weitere repo-sichtbare Tabellen ohne stabile Stack-Gruppierung',
} as const;

async function buildDbTablesDigest(repoRoot: string): Promise<Record<string, DbTableGroup>> {
  const schemaFiles = ['server/src/schema/builder.ts', 'server/src/schema/arcana.ts', 'server/src/db.ts'];
  const groups: Record<string, DbTableGroup> = {};
  const tablePattern = /pgTable\(['\"]([^'\"]+)['\"]/g;

  for (const schemaFile of schemaFiles) {
    const content = await readRepoFile(repoRoot, schemaFile);
    if (!content) {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = tablePattern.exec(content)) !== null) {
      const tableName = match[1];
      const groupKey = groupDbTable(tableName);
      if (!groups[groupKey]) {
        groups[groupKey] = {
          tables: [],
          purpose: DB_GROUP_PURPOSES[groupKey],
        };
      }

      if (!groups[groupKey].tables.includes(tableName)) {
        groups[groupKey].tables.push(tableName);
      }
    }
  }

  for (const group of Object.values(groups)) {
    group.tables.sort();
  }

  return sortObjectByKey(groups);
}

async function readRepoHead(): Promise<string> {
  if (process.env.GIT_COMMIT_SHA) {
    return process.env.GIT_COMMIT_SHA;
  }

  const commits = await fetchJsonOrNull<GitHubCommitResponse>(buildGithubApiUrl('/commits?per_page=1'));
  return commits?.[0]?.sha ?? '';
}

export async function buildArchitectureDigest(sections?: string[]): Promise<ArchitectureDigestResult> {
  const normalizedSections = normalizeSectionList(sections);
  const cacheKey = buildCacheKey(normalizedSections);
  const cached = digestCache.get(cacheKey);
  if (cached && isCacheFresh(cached.ts)) {
    return cached.data;
  }

  const repoRoot = getRepoRoot();
  const result: ArchitectureDigestResult = {
    generatedAt: new Date().toISOString(),
    repoHead: await readRepoHead(),
  };

  if (normalizedSections.includes('modules')) {
    result.modules = await buildModulesDigest(repoRoot);
  }
  if (normalizedSections.includes('routes')) {
    result.routes = await buildRoutesDigest(repoRoot);
  }
  if (normalizedSections.includes('db_tables')) {
    result.db_tables = await buildDbTablesDigest(repoRoot);
  }
  if (normalizedSections.includes('cross_repos')) {
    result.cross_repos = CROSS_REPOS;
  }
  if (normalizedSections.includes('conventions')) {
    result.conventions = CONVENTIONS;
  }

  digestCache.set(cacheKey, { ts: Date.now(), data: result });
  return result;
}