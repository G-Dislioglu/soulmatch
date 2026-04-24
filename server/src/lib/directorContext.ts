import fs from 'node:fs';
import path from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderErrorCards, builderMemory, builderTasks } from '../schema/builder.js';
import { getAllAgentSummaries } from './agentHabitat.js';
import { getBuilderControlState, type BuilderControlState } from './builderControlPlane.js';
import { getActivePools } from './poolState.js';
import { getRepoRoot } from './builderExecutor.js';

export interface DirectorContext {
  projectState: string;
  continuityNote: string;
  recentTasks: Array<{
    id: string;
    title: string;
    goal: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  agentSummary: string;
  patrolSummary: {
    total: number;
    critical: number;
    high: number;
  };
  activePools: ReturnType<typeof getActivePools>;
  availableTools: string[];
  controlPlane: BuilderControlState;
}

function safeReadRepoFile(relativePath: string): string {
  const repoRoot = getRepoRoot();
  const candidate = path.resolve(repoRoot, relativePath);
  try {
    return fs.readFileSync(candidate, 'utf-8');
  } catch {
    return `[Datei ${relativePath} nicht gefunden]`;
  }
}

async function withFallback<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.warn(`[directorContext] ${label} unavailable:`, error);
    return fallback;
  }
}

export async function buildDirectorContext(): Promise<DirectorContext> {
  const db = getDb();
  const [recentTasks, continuityRows, patrolFindings, agentSummary] = await Promise.all([
    withFallback('recentTasks', () => db
      .select({
        id: builderTasks.id,
        title: builderTasks.title,
        goal: builderTasks.goal,
        status: builderTasks.status,
        createdAt: builderTasks.createdAt,
        updatedAt: builderTasks.updatedAt,
      })
      .from(builderTasks)
      .orderBy(desc(builderTasks.createdAt))
      .limit(12), []),
    withFallback('continuity', () => db
      .select({ summary: builderMemory.summary })
      .from(builderMemory)
      .where(eq(builderMemory.layer, 'continuity'))
      .orderBy(desc(builderMemory.updatedAt))
      .limit(1), [] as Array<{ summary: string }>),
    withFallback('patrolFindings', () => db
      .select({ severity: builderErrorCards.severity })
      .from(builderErrorCards)
      .orderBy(desc(builderErrorCards.createdAt))
      .limit(50), [] as Array<{ severity: string }>),
    getAllAgentSummaries(),
  ]);

  const critical = patrolFindings.filter((entry) => entry.severity === 'critical').length;
  const high = patrolFindings.filter((entry) => entry.severity === 'high').length;

  return {
    projectState: safeReadRepoFile('STATE.md'),
    continuityNote: continuityRows[0]?.summary ?? 'Keine Continuity Note vorhanden.',
    recentTasks,
    agentSummary,
    patrolSummary: {
      total: patrolFindings.length,
      critical,
      high,
    },
    activePools: getActivePools(),
    availableTools: [
      'read-file: Repo-Datei lesen',
      'opus-task-async: Pipeline-Task im Hintergrund starten',
      'opus-task: synchronen Pipeline-Task starten (nur wenn ausdruecklich noetig)',
      'opus-job-status: Async-Jobstatus abrufen',
      'memory-read: Builder-Memory nach Layer lesen',
      'memory-write: Builder-Memory-Notiz speichern',
      'patrol-status: Patrol-Statistik abrufen',
      'patrol-findings: Patrol-Findings nach Severity abrufen',
      'benchmark: Worker-Benchmark ausfuehren',
    ],
    controlPlane: getBuilderControlState(),
  };
}