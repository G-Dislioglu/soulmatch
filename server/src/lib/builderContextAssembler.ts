import { desc } from 'drizzle-orm';
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
  text: string;
  gaps: string[];
  conflicts: string[];
}

export async function assembleBuilderContext(options: BuilderContextAssemblerOptions = {}): Promise<string> {
  const result = await assembleBuilderContextFull(options);
  return result.text;
}

export async function assembleBuilderContextFull(options: BuilderContextAssemblerOptions = {}): Promise<AssembledContext> {
  const { userId, taskId, lane, phase } = options;
  const gaps: string[] = [];
  const conflicts: string[] = [];
  const contextParts: string[] = [];

  // --- M1: Conversation Context (Session-Memory) ---
  if (userId) {
    try {
      const conversationContext = await getUserMemoryContext(userId);
      if (conversationContext) {
        contextParts.push(`=== CONVERSATION CONTEXT ===\n${conversationContext}`);
      } else {
        gaps.push('Session-Memory leer — kein Gesprächsverlauf für diesen User');
      }
    } catch (error) {
      console.warn('[assembler] getUserMemoryContext failed:', error);
      gaps.push('Session-Memory nicht erreichbar');
    }
  } else {
    gaps.push('Kein userId — Conversation Context nicht verfügbar');
  }

  // --- M3: Operational Context (DB-basiert) ---
  try {
    const opResult = await buildOperationalContext();
    if (opResult.text) {
      contextParts.push(`=== OPERATIONAL CONTEXT ===\n${opResult.text}`);
    }
    conflicts.push(...opResult.conflicts);
  } catch (error) {
    console.warn('[assembler] buildOperationalContext failed:', error);
    gaps.push('Operational Context nicht erreichbar (DB-Fehler)');
  }

  // --- Active lane/phase/task info ---
  if (lane) contextParts.push(`[LANE: ${lane.toUpperCase()}]`);
  if (phase) contextParts.push(`[PHASE: ${phase.toUpperCase()}]`);
  if (taskId) contextParts.push(`[TASK: ${taskId}]`);

  // --- Gaps & Conflicts ---
  if (gaps.length > 0) {
    contextParts.push(`=== GAPS ===\n${gaps.map(g => '- ' + g).join('\n')}`);
  }
  if (conflicts.length > 0) {
    contextParts.push(`=== CONFLICTS ===\n${conflicts.map(c => '⚠ ' + c).join('\n')}`);
  }

  return {
    text: contextParts.join('\n\n'),
    gaps,
    conflicts,
  };
}

// --- Operational Context: compact summary from DB ---
async function buildOperationalContext(): Promise<{ text: string; conflicts: string[] }> {
  const db = getDb();
  const parts: string[] = [];

  // Last 5 tasks (any status) for overview
  const recentTasks = await db
    .select({
      id: builderTasks.id,
      title: builderTasks.title,
      status: builderTasks.status,
      commitHash: builderTasks.commitHash,
      updatedAt: builderTasks.updatedAt,
    })
    .from(builderTasks)
    .orderBy(desc(builderTasks.updatedAt))
    .limit(5);

  if (recentTasks.length === 0) {
    return { text: '', conflicts: [] };
  }

  // Active tasks (queued, applying, classifying, planning, reviewing)
  const activeStatuses = ['queued', 'applying', 'classifying', 'planning', 'reviewing'];
  const active = recentTasks.filter(t => activeStatuses.includes(t.status));
  const blocked = recentTasks.filter(t => t.status === 'blocked');
  const done = recentTasks.filter(t => t.status === 'done');
  const errored = recentTasks.filter(t => t.status === 'error');

  if (active.length > 0) {
    parts.push('Aktive Tasks: ' + active.map(t => `${t.title} (${t.status})`).join(', '));
  }
  if (blocked.length > 0) {
    parts.push('Blockiert: ' + blocked.map(t => `${t.title}`).join(', '));
  }
  if (errored.length > 0) {
    parts.push('Fehler: ' + errored.map(t => `${t.title}`).join(', '));
  }
  if (done.length > 0) {
    const latest = done[0];
    const commit = latest.commitHash ? ` (${latest.commitHash.slice(0, 7)})` : '';
    parts.push(`Letzter erfolgreicher Task: ${latest.title}${commit}`);
  }

  parts.push(`Pipeline: ${recentTasks.length} Tasks in letzter Übersicht — ${done.length} done, ${active.length} aktiv, ${blocked.length} blocked, ${errored.length} error`);

  // Phase 2: Conflict detection
  const detectedConflicts: string[] = [];
  for (const task of recentTasks) {
    if (task.status === 'blocked') {
      detectedConflicts.push(`Task "${task.title}" ist blockiert — keine Recovery eingeleitet`);
    }
    if (task.status === 'error') {
      detectedConflicts.push(`Task "${task.title}" hat Fehler — Retry oder manueller Eingriff nötig`);
    }
  }

  return { text: parts.join('\n'), conflicts: detectedConflicts };
}
