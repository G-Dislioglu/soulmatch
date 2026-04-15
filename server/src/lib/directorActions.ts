import fs from 'node:fs/promises';
import path from 'node:path';
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

export function parseDirectorActions(responseText: string): DirectorAction[] {
  const actions: DirectorAction[] = [];
  const regex = /```action\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(responseText)) !== null) {
    try {
      const parsed = JSON.parse((match[1] ?? '').trim()) as DirectorAction;
      if (parsed && typeof parsed.tool === 'string') {
        actions.push(parsed);
      }
    } catch {
      // Ignore malformed action blocks and keep the visible reply.
    }
  }

  return actions;
}

export function stripDirectorActions(responseText: string): string {
  return responseText.replace(/```action\s*[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function renderDirectorActionSummary(results: DirectorActionResult[]): string {
  if (results.length === 0) {
    return '';
  }

  return ['### Director-Aktionen', ...results.map((result) => `- ${result.ok ? 'OK' : 'Fehler'} · ${result.tool}: ${result.summary}`)].join('\n');
}

async function readRepoFile(filePath: string): Promise<DirectorActionResult> {
  const repoRoot = getRepoRoot();
  const resolved = path.resolve(repoRoot, filePath.replace(/^[/\\]+/, ''));
  if (!resolved.startsWith(repoRoot)) {
    return { tool: 'read-file', ok: false, summary: 'Pfad liegt ausserhalb des Repos.' };
  }

  const content = await fs.readFile(resolved, 'utf-8');
  const truncated = content.length > 12000;
  return {
    tool: 'read-file',
    ok: true,
    summary: `${filePath} gelesen${truncated ? ' (gekuerzt)' : ''}.`,
    data: {
      path: filePath,
      content: truncated ? `${content.slice(0, 12000)}\n\n...[gekuerzt]` : content,
    },
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