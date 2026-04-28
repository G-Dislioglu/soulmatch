/**
 * memoryBus.ts — Zentraler Memory-Bus fuer die Builder-Pipeline
 *
 * Jede Rolle bekommt einen spezifisch zusammengestellten Kontext:
 * - Scouts: Project DNA + Graph + Error Cards + letzte Tasks im Scope
 * - Destillierer: relevante Error-Patterns fuer Crush-Operatoren
 * - Council: Builder Memory + Worker-Ranking + Entscheidungshistorie
 * - Worker: Council-Begruendung + Error Cards fuer betroffene Dateien
 * - Maya: Gesamtueberblick (Summary aller Schichten)
 */

import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderTasks } from '../schema/builder.js';
import { builderChatpool } from '../schema/opusBridge.js';
import {
  findRelevantErrorCards,
  generateGraphBriefing,
  loadArchitectureGraph,
  loadProjectDna,
} from './opusGraphIntegration.js';
import { buildBuilderMemoryContext } from './builderMemory.js';
import { buildTeamCoordinationContext } from './builderTeamAwareness.js';
import { getWorkerRanking } from './opusWorkerSwarm.js';

function hasDatabaseAccess(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// ─── Shared Helpers ───

async function getRecentTasksInScope(scope: string[], limit = 3): Promise<string> {
  if (scope.length === 0) return '';
  if (!hasDatabaseAccess()) return '';

  try {
    const db = getDb();
    // Find recent tasks that touched any of the same files
    const recentTasks = await db
      .select({
        title: builderTasks.title,
        status: builderTasks.status,
        scope: builderTasks.scope,
        createdAt: builderTasks.createdAt,
      })
      .from(builderTasks)
      .where(sql`${builderTasks.scope}::jsonb ?| array[${sql.raw(scope.map((s) => `'${s.replace(/'/g, "''")}'`).join(','))}]`)
      .orderBy(desc(builderTasks.createdAt))
      .limit(limit);

    if (recentTasks.length === 0) return '';

    const lines = recentTasks.map((t) => {
      const scopeList = Array.isArray(t.scope) ? (t.scope as string[]).join(', ') : '';
      return `- [${t.status}] ${t.title} (${scopeList})`;
    });

    return `LETZTE TASKS IM GLEICHEN BEREICH:\n${lines.join('\n')}`;
  } catch (error) {
    console.error('[memoryBus] getRecentTasksInScope failed:', error);
    return '';
  }
}

async function getRecentCouncilDecisions(limit = 3): Promise<string> {
  if (!hasDatabaseAccess()) return '';

  try {
    const db = getDb();
    // Get recent roundtable messages that contain @APPROVE or @BLOCK
    const decisions = await db
      .select({
        taskId: builderChatpool.taskId,
        actor: builderChatpool.actor,
        content: builderChatpool.content,
        createdAt: builderChatpool.createdAt,
      })
      .from(builderChatpool)
      .where(eq(builderChatpool.phase, 'roundtable'))
      .orderBy(desc(builderChatpool.createdAt))
      .limit(limit * 3); // Get more, then filter

    const approveDecisions = decisions
      .filter((d) => d.content.includes('@APPROVE') || d.content.includes('@BLOCK'))
      .slice(0, limit);

    if (approveDecisions.length === 0) return '';

    const lines = approveDecisions.map((d) => {
      const snippet = d.content.slice(0, 200).replace(/\n/g, ' ');
      return `- [${d.actor}]: ${snippet}`;
    });

    return `LETZTE COUNCIL-ENTSCHEIDUNGEN:\n${lines.join('\n')}`;
  } catch (error) {
    console.error('[memoryBus] getRecentCouncilDecisions failed:', error);
    return '';
  }
}

async function formatWorkerRanking(): Promise<string> {
  if (!hasDatabaseAccess()) return '';

  try {
    const ranking = await getWorkerRanking();
    if (ranking.length === 0) return '';

    const lines = ranking.map((r) =>
      `- ${r.worker}: ${r.avgScore}% (${r.taskCount} Tasks)`,
    );

    return `WORKER-RANKING (Durchschnitt):\n${lines.join('\n')}`;
  } catch (error) {
    console.error('[memoryBus] formatWorkerRanking failed:', error);
    return '';
  }
}

async function safeFindRelevantErrorCards(taskGoal: string, scope: string[]) {
  if (!hasDatabaseAccess()) return [];

  try {
    return await findRelevantErrorCards(taskGoal, scope);
  } catch {
    console.warn('[memoryBus] error cards unavailable, continuing without them.');
    return [];
  }
}

// ─── Role-Specific Context Builders ───

/**
 * Scout-Kontext: Was brauchen Scouts um effektiv zu recherchieren?
 * - Project DNA (Projektstruktur, Konventionen)
 * - Architecture Graph (Datei-Beziehungen)
 * - Error Cards (bekannte Fallen)
 * - Letzte Tasks im gleichen Scope (was wurde kuerzlich geaendert)
 */
export async function buildScoutContext(taskGoal: string, scope: string[]): Promise<string> {
  const [projectDna, errorCards, recentTasks] = await Promise.all([
    Promise.resolve(loadProjectDna()),
    safeFindRelevantErrorCards(taskGoal, scope),
    getRecentTasksInScope(scope),
  ]);

  const graph = loadArchitectureGraph();
  const graphBriefing = generateGraphBriefing(graph, scope);

  const sections: string[] = [];
  sections.push(buildTeamCoordinationContext({ role: 'scout', taskGoal, scope }));

  if (projectDna) sections.push(projectDna);
  if (graphBriefing) sections.push(`REPO-KONTEXT:\n${graphBriefing}`);

  if (errorCards.length > 0) {
    sections.push(`BEKANNTE FEHLER:\n${errorCards
      .map((c) => `- ${c.id}: ${c.title} -- ${c.solution}`)
      .join('\n')}`);
  }

  if (recentTasks) sections.push(recentTasks);

  return sections.join('\n\n');
}

/**
 * Destillierer-Kontext: Was braucht der Destillierer fuer Crush-Operatoren?
 * - Error Patterns (fuer SE: Schwachstellen-Erkennung)
 * - Letzte Tasks (fuer AN: Analogie — wo wurde Aehnliches schon geloest)
 */
export async function buildDistillerContext(taskGoal: string, scope: string[]): Promise<string> {
  const [errorCards, recentTasks] = await Promise.all([
    safeFindRelevantErrorCards(taskGoal, scope),
    getRecentTasksInScope(scope, 5),
  ]);

  const sections: string[] = [];
  sections.push(buildTeamCoordinationContext({ role: 'distiller', taskGoal, scope }));

  if (errorCards.length > 0) {
    sections.push(`BEKANNTE FEHLER-PATTERNS (fuer SE-Operator):\n${errorCards
      .map((c) => `- ${c.id}: ${c.title} -- Loesung: ${c.solution}`)
      .join('\n')}`);
  }

  if (recentTasks) {
    sections.push(`AEHNLICHE TASKS (fuer AN-Operator):\n${recentTasks}`);
  }

  return sections.join('\n\n');
}

/**
 * Council-Kontext: Was braucht der Council fuer Architektur-Entscheidungen?
 * - Builder Memory (episodisch + semantisch)
 * - Worker-Ranking (wer kann was am besten)
 * - Entscheidungshistorie (was hat vorher funktioniert/nicht)
 */
export async function buildCouncilContext(taskGoal?: string, scope: string[] = []): Promise<string> {
  const [builderMemory, workerRanking, councilHistory] = await Promise.all([
    buildBuilderMemoryContext().catch(() => ''),
    formatWorkerRanking(),
    getRecentCouncilDecisions(),
  ]);

  const sections: string[] = [
    buildTeamCoordinationContext({ role: 'council', taskGoal, scope }),
  ];

  if (builderMemory) sections.push(`BUILDER MEMORY:\n${builderMemory}`);
  if (workerRanking) sections.push(workerRanking);
  if (councilHistory) sections.push(councilHistory);

  return sections.join('\n\n');
}

/**
 * Worker-Kontext: Was braucht ein Worker fuer sauberen Code?
 * - Warum dieser Ansatz gewaehlt wurde (Council-Begruendung)
 * - Error Cards fuer die betroffenen Dateien
 * - Relevante Code-Konventionen
 */
export async function buildWorkerContext(
  taskGoal: string,
  files: string[],
  councilReasoning?: string,
): Promise<string> {
  const projectDna = loadProjectDna();
  const errorCards = await safeFindRelevantErrorCards(files.join(' '), files);

  const sections: string[] = [
    buildTeamCoordinationContext({ role: 'worker', taskGoal, scope: files }),
  ];

  if (councilReasoning) {
    sections.push(`COUNCIL-ENTSCHEIDUNG (warum dieser Ansatz):\n${councilReasoning}`);
  }

  if (errorCards.length > 0) {
    sections.push(`BEKANNTE FALLEN FUER DIESE DATEIEN:\n${errorCards
      .map((c) => `- ${c.id}: ${c.title} -- ${c.solution}`)
      .join('\n')}`);
  }

  // Extract just the conventions section from Project DNA
  if (projectDna) {
    const conventionMatch = projectDna.match(/(?:konvention|convention|naming|style)[^\n]*\n(?:[\s\S]*?)(?=\n\n|\n===|$)/i);
    if (conventionMatch) {
      sections.push(`CODE-KONVENTIONEN:\n${conventionMatch[0].slice(0, 500)}`);
    }
  }

  return sections.join('\n\n');
}

/**
 * Maya-Kontext: Gesamtueberblick fuer den Chat.
 * Leichtgewichtige Zusammenfassung aller Schichten.
 */
export async function buildMayaFullContext(): Promise<string> {
  const [builderMemory, workerRanking] = await Promise.all([
    buildBuilderMemoryContext().catch(() => ''),
    formatWorkerRanking(),
  ]);

  const sections: string[] = [
    buildTeamCoordinationContext({ role: 'maya' }),
  ];

  if (builderMemory) sections.push(builderMemory);
  if (workerRanking) sections.push(workerRanking);

  return sections.join('\n\n');
}
