import { desc, eq, notInArray, gte } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderTasks } from '../schema/builder.js';
import { getUserMemoryContext } from './memoryService.js';

interface BuilderContextAssemblerOptions {
  userId?: string;
  taskId?: string;
  lane?: string;
  phase?: string;
}

interface AssembledContext {
  operational: string;
  conversation: string;
  gaps: string[];
  conflicts: string[];
}

export async function assembleBuilderContext(options: BuilderContextAssemblerOptions = {}): Promise<string> {
  const { userId, taskId, lane, phase } = options;
  const result: AssembledContext = {
    operational: '',
    conversation: '',
    gaps: [],
    conflicts: [],
  };

  // === CONVERSATION CONTEXT (M1) ===
  if (userId) {
    try {
      result.conversation = await getUserMemoryContext(userId);
    } catch (error) {
      console.warn('[assembler] Failed to get user memory context:', error);
      result.gaps.push('Session-Memory nicht verfuegbar (Fehler beim Laden)');
    }
  } else {
    result.gaps.push('Kein userId — Conversation-Memory nicht verfuegbar');
  }

  // === OPERATIONAL CONTEXT (M3) ===
  try {
    const db = getDb();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Active/running tasks
    const activeTasks = await db
      .select({ id: builderTasks.id, title: builderTasks.title, status: builderTasks.status, updatedAt: builderTasks.updatedAt })
      .from(builderTasks)
      .where(notInArray(builderTasks.status, ['done', 'reverted', 'discarded']))
      .orderBy(desc(builderTasks.updatedAt))
      .limit(5);

    // Last completed task
    const lastDone = await db
      .select({ id: builderTasks.id, title: builderTasks.title, commitHash: builderTasks.commitHash, updatedAt: builderTasks.updatedAt })
      .from(builderTasks)
      .where(eq(builderTasks.status, 'done'))
      .orderBy(desc(builderTasks.updatedAt))
      .limit(1);

    // Blocked tasks (last 24h)
    const blockedTasks = await db
      .select({ id: builderTasks.id, title: builderTasks.title, updatedAt: builderTasks.updatedAt })
      .from(builderTasks)
      .where(eq(builderTasks.status, 'blocked'))
      .orderBy(desc(builderTasks.updatedAt))
      .limit(3);

    const opParts: string[] = [];

    if (lastDone.length > 0) {
      const t = lastDone[0];
      opParts.push(`Letzter abgeschlossener Task: "${t.title}" (${t.commitHash?.slice(0, 7) || 'kein Commit'})`);
    }

    if (activeTasks.length > 0) {
      const lines = activeTasks.map(t => `  - ${t.title} [${t.status}]`);
      opParts.push(`Aktive Tasks (${activeTasks.length}):\n${lines.join('\n')}`);
    } else {
      opParts.push('Keine aktiven Tasks — Pipeline idle.');
    }

    if (blockedTasks.length > 0) {
      const lines = blockedTasks.map(t => `  - ${t.title}`);
      opParts.push(`BLOCKED (${blockedTasks.length}):\n${lines.join('\n')}`);

      // === CONFLICT DETECTION ===
      for (const bt of blockedTasks) {
        result.conflicts.push(`Task "${bt.title}" ist blocked ohne Recovery-Vorschlag`);
      }
    }

    result.operational = opParts.join('\n');
  } catch (error) {
    console.warn('[assembler] Operational context failed:', error);
    result.gaps.push('Operational Context nicht verfuegbar (DB-Fehler)');
  }

  // === ASSEMBLE OUTPUT ===
  const outputParts: string[] = [];

  if (result.operational) {
    outputParts.push(`=== OPERATIONAL CONTEXT ===\n${result.operational}`);
  }

  if (result.conversation) {
    outputParts.push(`=== CONVERSATION CONTEXT ===\n${result.conversation}`);
  }

  if (lane) outputParts.push(`[LANE: ${lane.toUpperCase()}]`);
  if (phase) outputParts.push(`[PHASE: ${phase.toUpperCase()}]`);
  if (taskId) outputParts.push(`[TASK: ${taskId}]`);

  if (result.gaps.length > 0) {
    outputParts.push(`=== GAPS ===\n${result.gaps.map(g => '- ' + g).join('\n')}`);
  }

  if (result.conflicts.length > 0) {
    outputParts.push(`=== CONFLICTS ===\n${result.conflicts.map(c => '⚠ ' + c).join('\n')}`);
  }

  return outputParts.join('\n\n');
}
