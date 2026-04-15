import fs from 'node:fs';
import path from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderErrorCards, builderMemory, builderTasks } from '../schema/builder.js';
import { getAllAgentSummaries } from './agentHabitat.js';
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

export async function buildDirectorContext(): Promise<DirectorContext> {
  const db = getDb();
  const [recentTasks, continuityRows, patrolFindings, agentSummary] = await Promise.all([
    db
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
      .limit(12),
    db
      .select({ summary: builderMemory.summary })
      .from(builderMemory)
      .where(eq(builderMemory.layer, 'continuity'))
      .orderBy(desc(builderMemory.updatedAt))
      .limit(1),
    db
      .select({ severity: builderErrorCards.severity })
      .from(builderErrorCards)
      .orderBy(desc(builderErrorCards.createdAt))
      .limit(50),
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
  };
}