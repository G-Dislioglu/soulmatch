import fs from 'node:fs/promises';
import path from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderMemory } from '../schema/builder.js';
import { getRepoRoot } from './builderExecutor.js';

export interface DirectorAction {
  tool: string;
  [key: string]: unknown;
}

export interface DirectorActionResult {
  tool: string;
  ok: boolean;
  summary: string;
  data?: unknown;
}

const READ_FILE_TRIGGER_REGEX = /\b(lies|lese|zeig|zeige|oeffne|öffne|show|read|open)\b/i;
const DIRECTOR_REJECTION_REGEX = /\b(kann(?:\s+ich)?\s+nicht|cannot|can't|not possible|nicht moeglich|nicht möglich|error|fehler|kein zugriff|no access|unable)\b/i;
const REPO_PATH_REGEX = /(?:^|[\s"'`(])((?:client|server|docs|tools|aicos-registry|architecture)\/[A-Za-z0-9._\-/]+\.[A-Za-z0-9]+)(?=$|[\s"'`),:;!?])/gi;

function getBaseUrl(): string {
  return `http://localhost:${process.env.PORT || 3001}`;
}

function getOpusToken(): string {
  return process.env.OPUS_BRIDGE_SECRET || '';
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const json = await response.json().catch(() => ({ status: response.status }));
  if (!response.ok) {
    throw new Error(typeof json === 'object' ? JSON.stringify(json) : `HTTP ${response.status}`);
  }
  return json;
}

function buildOpusUrl(endpoint: string): string {
  const token = getOpusToken();
  return `${getBaseUrl()}${endpoint}${endpoint.includes('?') ? '&' : '?'}opus_token=${encodeURIComponent(token)}`;
}

function tryParseActionCandidate(candidate: string, seen: Set<string>, actions: DirectorAction[]): void {
  const trimmed = candidate.trim();
  if (!trimmed || seen.has(trimmed)) {
    return;
  }

  try {
    const parsed = JSON.parse(trimmed) as DirectorAction;
    if (parsed && typeof parsed.tool === 'string') {
      seen.add(trimmed);
      actions.push(parsed);
    }
  } catch {
    // Ignore malformed action candidates and keep the visible reply.
  }
}

export function parseDirectorActions(responseText: string): DirectorAction[] {
  const actions: DirectorAction[] = [];
  const seen = new Set<string>();
  const fencedRegex = /```action\s*([\s\S]*?)```/gi;
  const relaxedRegex = /(?:^|\n)(?:```\s*)?action\s*\n+(\{[\s\S]*?\})\s*(?:```|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = fencedRegex.exec(responseText)) !== null) {
    tryParseActionCandidate(match[1] ?? '', seen, actions);
  }

  while ((match = relaxedRegex.exec(responseText)) !== null) {
    tryParseActionCandidate(match[1] ?? '', seen, actions);
  }

  return actions;
}

export function stripDirectorActions(responseText: string): string {
  return responseText
    .replace(/```action\s*[\s\S]*?```/gi, '')
    .replace(/(?:^|\n)(?:```\s*)?action\s*\n+\{[\s\S]*?\}\s*(?:```)?/gi, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderDirectorActionSummary(results: DirectorActionResult[]): string {
  if (results.length === 0) {
    return '';
  }

  return ['### Director-Aktionen', ...results.map((result) => `- ${result.ok ? 'OK' : 'Fehler'} · ${result.tool}: ${result.summary}`)].join('\n');
}

function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function extractRepoPaths(text: string): string[] {
  const matches = [...text.matchAll(REPO_PATH_REGEX)]
    .map((match) => normalizeRepoPath(match[1] ?? ''))
    .filter(Boolean);

  return [...new Set(matches)];
}

export function inferReadFileFallbackAction(
  userMessage: string,
  responseText: string,
  existingActions: DirectorAction[],
): DirectorAction | null {
  if (existingActions.length > 0) {
    return null;
  }

  if (!READ_FILE_TRIGGER_REGEX.test(userMessage)) {
    return null;
  }

  if (DIRECTOR_REJECTION_REGEX.test(responseText)) {
    return null;
  }

  const paths = extractRepoPaths(userMessage);
  if (paths.length !== 1) {
    return null;
  }

  return {
    tool: 'read-file',
    path: paths[0],
  };
}

function buildReadRoots(repoRoot: string): string[] {
  const parentRoot = path.resolve(repoRoot, '..');
  return [...new Set([repoRoot, parentRoot])];
}

function buildReadCandidates(rootDir: string, normalizedPath: string): string[] {
  const candidates = [path.resolve(rootDir, normalizedPath)];

  if (normalizedPath.startsWith('server/')) {
    candidates.push(path.resolve(rootDir, normalizedPath.slice('server/'.length)));
  }

  if (normalizedPath.startsWith('client/')) {
    candidates.push(path.resolve(rootDir, normalizedPath.slice('client/'.length)));
  }

  return [...new Set(candidates)];
}

async function readRepoFile(filePath: string): Promise<DirectorActionResult> {
  const repoRoot = getRepoRoot();
  const normalizedPath = normalizeRepoPath(filePath);

  for (const rootDir of buildReadRoots(repoRoot)) {
    for (const candidate of buildReadCandidates(rootDir, normalizedPath)) {
      const relative = path.relative(rootDir, candidate);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        continue;
      }

      try {
        const content = await fs.readFile(candidate, 'utf-8');
        const truncated = content.length > 12000;
        return {
          tool: 'read-file',
          ok: true,
          summary: `${normalizedPath} gelesen${truncated ? ' (gekuerzt)' : ''}.`,
          data: {
            path: normalizedPath,
            content: truncated ? `${content.slice(0, 12000)}\n\n...[gekuerzt]` : content,
          },
        };
      } catch {
        // Try the next valid candidate.
      }
    }
  }

  return {
    tool: 'read-file',
    ok: false,
    summary: `Datei nicht gefunden: ${normalizedPath}`,
  };
}

function resolveMemoryLayer(action: DirectorAction): string | undefined {
  return typeof action.layer === 'string' && action.layer.trim() ? action.layer.trim() : undefined;
}

function resolveMemoryLimit(action: DirectorAction): number {
  if (typeof action.limit !== 'number' || !Number.isFinite(action.limit)) {
    return 10;
  }
  return Math.min(20, Math.max(1, Math.trunc(action.limit)));
}

async function writeMemory(action: DirectorAction): Promise<DirectorActionResult> {
  const summary = typeof action.summary === 'string' ? action.summary.trim() : '';
  if (!summary) {
    return { tool: 'memory-write', ok: false, summary: 'summary fehlt.' };
  }

  const layer = resolveMemoryLayer(action) ?? 'continuity';
  const key = typeof action.key === 'string' && action.key.trim()
    ? action.key.trim()
    : `maya-brain-${Date.now()}`;
  const payload = action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
    ? action.payload as Record<string, unknown>
    : { source: 'maya-director-tool' };

  const db = getDb();
  const [entry] = await db.insert(builderMemory).values({
    layer,
    key,
    summary,
    payload,
  }).returning({
    id: builderMemory.id,
    layer: builderMemory.layer,
    key: builderMemory.key,
    updatedAt: builderMemory.updatedAt,
  });

  return {
    tool: 'memory-write',
    ok: true,
    summary: `${layer}/${key} gespeichert.`,
    data: entry,
  };
}

async function readMemory(action: DirectorAction): Promise<DirectorActionResult> {
  const db = getDb();
  const layer = resolveMemoryLayer(action);
  const limit = resolveMemoryLimit(action);

  const baseQuery = db.select({
    id: builderMemory.id,
    layer: builderMemory.layer,
    key: builderMemory.key,
    summary: builderMemory.summary,
    updatedAt: builderMemory.updatedAt,
  }).from(builderMemory);

  const entries = layer
    ? await baseQuery.where(eq(builderMemory.layer, layer)).orderBy(desc(builderMemory.updatedAt)).limit(limit)
    : await baseQuery.orderBy(desc(builderMemory.updatedAt)).limit(limit);

  return {
    tool: 'memory-read',
    ok: true,
    summary: `${entries.length} ${layer ? `${layer}-` : ''}Memory-Eintraege geladen.`,
    data: { layer: layer ?? 'all', entries },
  };
}

export async function executeDirectorAction(action: DirectorAction): Promise<DirectorActionResult> {
  try {
    switch (action.tool) {
      case 'read-file': {
        if (typeof action.path !== 'string' || !action.path.trim()) {
          return { tool: 'read-file', ok: false, summary: 'path fehlt.' };
        }
        return await readRepoFile(action.path);
      }
      case 'opus-task': {
        const instruction = typeof action.instruction === 'string' ? action.instruction : '';
        if (!instruction.trim()) {
          return { tool: 'opus-task', ok: false, summary: 'instruction fehlt.' };
        }
        const result = await fetchJson(buildOpusUrl('/api/builder/opus-bridge/opus-task'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instruction,
            dryRun: Boolean(action.dryRun),
            scope: Array.isArray(action.scope) ? action.scope : undefined,
            workers: Array.isArray(action.workers) ? action.workers : undefined,
            skipDeploy: Boolean(action.skipDeploy),
          }),
        });
        const taskId = typeof (result as { taskId?: unknown }).taskId === 'string' ? (result as { taskId: string }).taskId : 'unbekannt';
        return { tool: 'opus-task', ok: true, summary: `Task gestartet (${taskId}).`, data: result };
      }
      case 'opus-task-async': {
        const instruction = typeof action.instruction === 'string' ? action.instruction : '';
        if (!instruction.trim()) {
          return { tool: 'opus-task-async', ok: false, summary: 'instruction fehlt.' };
        }
        const result = await fetchJson(buildOpusUrl('/api/health/opus-task-async'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction, dryRun: Boolean(action.dryRun) }),
        });
        const jobId = typeof (result as { jobId?: unknown }).jobId === 'string' ? (result as { jobId: string }).jobId : 'unbekannt';
        return { tool: 'opus-task-async', ok: true, summary: `Async-Job gestartet (${jobId}).`, data: result };
      }
      case 'opus-job-status': {
        const suffix = typeof action.id === 'string' && action.id ? `&id=${encodeURIComponent(action.id)}` : '';
        const result = await fetchJson(`${buildOpusUrl('/api/health/opus-job-status')}${suffix}`);
        return { tool: 'opus-job-status', ok: true, summary: 'Job-Status geladen.', data: result };
      }
      case 'patrol-status': {
        const result = await fetchJson(buildOpusUrl('/api/builder/opus-bridge/patrol-status'));
        return { tool: 'patrol-status', ok: true, summary: 'Patrol-Status geladen.', data: result };
      }
      case 'patrol-findings': {
        const severity = typeof action.severity === 'string' && action.severity ? `&severity=${encodeURIComponent(action.severity)}` : '';
        const result = await fetchJson(`${buildOpusUrl('/api/builder/opus-bridge/patrol-findings')}${severity}`);
        return { tool: 'patrol-findings', ok: true, summary: 'Patrol-Findings geladen.', data: result };
      }
      case 'benchmark': {
        const task = typeof action.task === 'string'
          ? action.task
          : typeof action.instruction === 'string'
            ? action.instruction
            : '';
        const result = await fetchJson(buildOpusUrl('/api/builder/opus-bridge/benchmark'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task }),
        });
        return { tool: 'benchmark', ok: true, summary: 'Benchmark ausgefuehrt.', data: result };
      }
      case 'memory-write': {
        return await writeMemory(action);
      }
      case 'memory-read': {
        return await readMemory(action);
      }
      default:
        return { tool: action.tool, ok: false, summary: `Unbekanntes Tool: ${action.tool}` };
    }
  } catch (error) {
    return {
      tool: action.tool,
      ok: false,
      summary: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executeDirectorActions(actions: DirectorAction[]): Promise<DirectorActionResult[]> {
  const results: DirectorActionResult[] = [];
  for (const action of actions) {
    results.push(await executeDirectorAction(action));
  }
  return results;
}