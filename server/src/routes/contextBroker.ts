import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { Router, type Request, type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { outboundFetch } from '../lib/outboundHttp.js';
import {
  asyncJobs,
  builderAgentProfiles,
  builderTasks,
  poolState,
} from '../schema/builder.js';

export const contextBrokerRouter = Router();

contextBrokerRouter.use(requireOpusToken);

type FileReadMode = 'full' | 'outline' | 'slice';
type AllowedOpsTable = 'builder_agent_profiles' | 'async_jobs' | 'pool_state' | 'builder_tasks';
type RecentCommit = { sha: string; message: string; date: string };

const DEFAULT_REPO = 'G-Dislioglu/soulmatch';
const GITHUB_ACCEPT = 'application/vnd.github+json';

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

function getGithubRepo(): string {
  return process.env.GITHUB_REPO || DEFAULT_REPO;
}

function getGithubAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: GITHUB_ACCEPT,
    'User-Agent': 'soulmatch-context-broker',
  };

  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  }

  return headers;
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

function readLocalRepoText(repoRoot: string, relativePath: string): string | null {
  const resolved = resolveRepoPath(repoRoot, relativePath);
  if (!resolved || !existsSync(resolved)) {
    return null;
  }

  return readFileSync(resolved, 'utf8');
}

function buildRawGithubUrl(repoRelativePath: string): string {
  const normalizedPath = normalizeRepoPath(repoRelativePath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://raw.githubusercontent.com/${getGithubRepo()}/main/${normalizedPath}`;
}

function buildGithubApiUrl(apiPath: string): string {
  return `https://api.github.com/repos/${getGithubRepo()}${apiPath}`;
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
    console.warn('[context-broker] text fetch failed:', url, error);
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
    console.warn('[context-broker] json fetch failed:', url, error);
    return null;
  }
}

async function readRepoFile(repoRoot: string, repoRelativePath: string): Promise<string | null> {
  const normalizedPath = normalizeRepoPath(repoRelativePath);
  const localContent = readLocalRepoText(repoRoot, normalizedPath);
  if (localContent !== null) {
    return localContent;
  }

  return fetchTextOrNull(buildRawGithubUrl(normalizedPath));
}

function requireRepoFile(content: string | null, repoRelativePath: string): string {
  if (content === null) {
    throw new Error(`File not found locally or on GitHub main: ${repoRelativePath}`);
  }

  return content;
}

function extractRuntimeSeams(stateContent: string): string[] {
  const match = stateContent.match(/primary_runtime_seams`: `([^`]+)`/);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(' | ')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseActiveDrifts(claudeContextContent: string): Array<{ id: string; severity: string }> {
  const frontMatterMatch = claudeContextContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontMatterMatch?.[1]) {
    return [];
  }

  const lines = frontMatterMatch[1].split(/\r?\n/);
  const drifts: Array<{ id: string; severity: string }> = [];
  let inDriftWatchlist = false;
  let currentId: string | null = null;

  for (const line of lines) {
    if (!inDriftWatchlist) {
      if (line.trim() === 'drift_watchlist:') {
        inDriftWatchlist = true;
      }
      continue;
    }

    if (!line.startsWith('  ') && line.trim().length > 0) {
      break;
    }

    const idMatch = line.match(/^\s*- id:\s*(.+)$/);
    if (idMatch?.[1]) {
      currentId = idMatch[1].trim();
      continue;
    }

    const severityMatch = line.match(/^\s+severity:\s*(.+)$/);
    if (currentId && severityMatch?.[1]) {
      drifts.push({ id: currentId, severity: severityMatch[1].trim() });
      currentId = null;
    }
  }

  return drifts;
}

function extractHandoffPath(sessionStateContent: string): string | null {
  const match = sessionStateContent.match(/^\*\*Handoff:\*\*\s+`([^`]+)`/m);
  return match?.[1] ? normalizeRepoPath(match[1]) : null;
}

async function getLatestHandoff(repoRoot: string, sessionStateContent: string): Promise<{ path: string; content: string } | null> {
  const handoffPath = extractHandoffPath(sessionStateContent);
  if (!handoffPath) {
    return null;
  }

  const content = await readRepoFile(repoRoot, handoffPath);
  if (content === null) {
    return null;
  }

  return {
    path: handoffPath,
    content,
  };
}

async function readRecentCommits(): Promise<RecentCommit[]> {
  type GithubCommitResponse = Array<{
    sha?: string;
    commit?: {
      message?: string;
      committer?: { date?: string };
    };
  }>;

  const data = await fetchJsonOrNull<GithubCommitResponse>(buildGithubApiUrl('/commits?per_page=15'));
  if (!data) {
    return [];
  }

  return data.map((entry) => ({
    sha: entry.sha ?? '',
    message: entry.commit?.message ?? '',
    date: entry.commit?.committer?.date ?? '',
  }));
}

async function readRepoHead(): Promise<string> {
  const commits = await readRecentCommits();
  return commits[0]?.sha ?? '';
}

function buildOutline(content: string): string {
  const lines = content.split(/\r?\n/);
  const headerLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('*/')
    ) {
      headerLines.push(line);
      continue;
    }

    break;
  }

  const exportLines = lines.filter((line) => line.startsWith('export '));
  const combined = [...headerLines, '', ...exportLines].join('\n').trimEnd();
  return combined.length > 0 ? combined : content.split(/\r?\n/).slice(0, 40).join('\n');
}

function buildFullContent(content: string): { content: string; truncated: boolean } {
  const maxBytes = 500 * 1024;
  const buffer = Buffer.from(content, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return { content, truncated: false };
  }

  return { content: buffer.subarray(0, maxBytes).toString('utf8'), truncated: true };
}

contextBrokerRouter.post('/session-start', async (_req: Request, res: Response) => {
  try {
    const repoRoot = getRepoRoot();
    const [claudeContextRaw, stateRaw, radarRaw, sessionStateRaw, recentCommits, repoHead] = await Promise.all([
      readRepoFile(repoRoot, 'docs/CLAUDE-CONTEXT.md'),
      readRepoFile(repoRoot, 'STATE.md'),
      readRepoFile(repoRoot, 'RADAR.md'),
      readRepoFile(repoRoot, 'docs/SESSION-STATE.md'),
      readRecentCommits(),
      readRepoHead(),
    ]);

    const claudeContext = requireRepoFile(claudeContextRaw, 'docs/CLAUDE-CONTEXT.md');
    const state = requireRepoFile(stateRaw, 'STATE.md');
    const radar = requireRepoFile(radarRaw, 'RADAR.md');
    const sessionState = requireRepoFile(sessionStateRaw, 'docs/SESSION-STATE.md');
    const latestHandoff = await getLatestHandoff(repoRoot, sessionState);

    res.json({
      generatedAt: new Date().toISOString(),
      repoHead,
      anchors: {
        claudeContext,
        state,
        radar,
        sessionState,
        latestHandoff,
      },
      recentCommits,
      activeDrifts: parseActiveDrifts(claudeContext),
      runtimeSeams: extractRuntimeSeams(state),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

contextBrokerRouter.post('/files/read', async (req: Request, res: Response) => {
  const body = req.body as {
    paths?: string[];
    mode?: FileReadMode;
    slice?: { start?: number; end?: number };
  };

  const paths = Array.isArray(body.paths) ? body.paths : [];
  if (paths.length === 0) {
    res.status(400).json({ error: 'paths is required' });
    return;
  }

  if (paths.length > 20) {
    res.status(400).json({ error: 'max 20 paths per request' });
    return;
  }

  const mode: FileReadMode = body.mode ?? 'full';
  if (!['full', 'outline', 'slice'].includes(mode)) {
    res.status(400).json({ error: 'mode must be full, outline, or slice' });
    return;
  }

  if (mode === 'slice') {
    const start = body.slice?.start;
    const end = body.slice?.end;
    if (!Number.isInteger(start) || !Number.isInteger(end) || (start ?? 0) < 1 || (end ?? 0) < (start ?? 0)) {
      res.status(400).json({ error: 'slice mode requires valid 1-indexed start/end' });
      return;
    }
  }

  const repoRoot = getRepoRoot();
  const uniquePaths = paths.map((requestedPath) => normalizeRepoPath(requestedPath));
  const rawFiles = await Promise.all(uniquePaths.map((requestedPath) => readRepoFile(repoRoot, requestedPath)));
  const notFound: string[] = [];
  const files = uniquePaths.flatMap((requestedPath, index) => {
    const raw = rawFiles[index];
    if (raw === null) {
      notFound.push(requestedPath);
      return [];
    }

    const lines = raw.split(/\r?\n/);
    let content = raw;
    let truncated = false;

    if (mode === 'outline') {
      content = buildOutline(raw);
    } else if (mode === 'slice') {
      const start = body.slice?.start ?? 1;
      const end = body.slice?.end ?? start;
      content = lines.slice(start - 1, end).join('\n');
    } else {
      const fullContent = buildFullContent(raw);
      content = fullContent.content;
      truncated = fullContent.truncated;
    }

    return [{
      path: normalizeRepoPath(requestedPath),
      mode,
      lines: lines.length,
      content,
      truncated,
    }];
  });

  res.json({ files, notFound });
});

contextBrokerRouter.post('/ops/query', async (req: Request, res: Response) => {
  const body = req.body as {
    table?: AllowedOpsTable;
    filter?: { id?: string; status?: string } | null;
    limit?: number;
  };

  const table = body.table;
  if (!table || !['builder_agent_profiles', 'async_jobs', 'pool_state', 'builder_tasks'].includes(table)) {
    res.status(400).json({
      error: 'unknown table',
      allowed: ['builder_agent_profiles', 'async_jobs', 'pool_state', 'builder_tasks'],
    });
    return;
  }

  const filter = body.filter ?? null;
  const limit = Math.min(Math.max(body.limit ?? 20, 1), 50);
  const db = getDb();

  if (filter && Object.keys(filter).some((key) => key !== 'id' && key !== 'status')) {
    console.warn('[context-broker] ignoring unsupported filter keys:', Object.keys(filter));
  }

  try {
    let rows: unknown[] = [];

    switch (table) {
      case 'builder_agent_profiles': {
        if (filter?.id) {
          rows = await db.select().from(builderAgentProfiles).where(eq(builderAgentProfiles.agentId, filter.id)).limit(1);
        } else if (filter?.status) {
          console.warn('[context-broker] builder_agent_profiles does not support status filter');
          rows = await db.select().from(builderAgentProfiles).orderBy(desc(builderAgentProfiles.updatedAt)).limit(limit);
        } else {
          rows = await db.select().from(builderAgentProfiles).orderBy(desc(builderAgentProfiles.updatedAt)).limit(limit);
        }
        break;
      }
      case 'async_jobs': {
        if (filter?.id) {
          rows = await db.select().from(asyncJobs).where(eq(asyncJobs.id, filter.id)).limit(1);
        } else if (filter?.status) {
          rows = await db.select().from(asyncJobs).where(eq(asyncJobs.status, filter.status)).orderBy(desc(asyncJobs.createdAt)).limit(limit);
        } else {
          rows = await db.select().from(asyncJobs).orderBy(desc(asyncJobs.createdAt)).limit(limit);
        }
        break;
      }
      case 'pool_state': {
        if (filter?.status) {
          console.warn('[context-broker] pool_state does not support status filter');
        }
        if (filter?.id) {
          const numericId = Number.parseInt(filter.id, 10);
          if (Number.isNaN(numericId)) {
            rows = [];
          } else {
            rows = await db.select().from(poolState).where(eq(poolState.id, numericId)).limit(1);
          }
        } else {
          rows = await db.select().from(poolState).orderBy(desc(poolState.updatedAt)).limit(limit);
        }
        break;
      }
      case 'builder_tasks': {
        if (filter?.id) {
          rows = await db.select().from(builderTasks).where(eq(builderTasks.id, filter.id)).limit(1);
        } else if (filter?.status) {
          rows = await db.select().from(builderTasks).where(eq(builderTasks.status, filter.status)).orderBy(desc(builderTasks.createdAt)).limit(limit);
        } else {
          rows = await db.select().from(builderTasks).orderBy(desc(builderTasks.createdAt)).limit(limit);
        }
        break;
      }
    }

    res.json({ table, rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});