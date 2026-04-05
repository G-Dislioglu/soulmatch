import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderReviews,
  builderTasks,
  builderTestResults,
} from '../schema/builder.js';
import { TASK_TYPE_TO_PROFILE, type TaskType } from './builderPolicyProfiles.js';
import { runDialogEngine } from './builderDialogEngine.js';
import { callProvider } from './providers.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  type: 'task_created' | 'task_status' | 'task_action' | 'chat' | 'error';
  message: string;
  taskId?: string;
  taskTitle?: string;
}

interface ClassifiedIntent {
  intent: 'task' | 'status' | 'approve' | 'revert' | 'delete' | 'detail' | 'chat';
  title?: string;
  goal?: string;
  risk?: string;
  taskType?: string;
  taskId?: string;
  message?: string;
}

const SYSTEM_PROMPT = `Du bist Maya, die KI-Assistentin im Builder Studio von Soulmatch.
Du sprichst Deutsch, locker und direkt. Du steuerst die gesamte Builder-Engine.

=== WAS DU KANNST ===
1. Tasks erstellen (Code-Aenderungen beschreiben)
2. Task-Status abfragen
3. Tasks genehmigen, reverten oder loeschen
4. Task-Details und Dialog zusammenfassen
5. Fragen zum Builder Studio beantworten

=== WIE DU ANTWORTEST ===
Antworte IMMER mit genau einem JSON-Objekt. Kein Fliesstext drumherum.

=== INTENTS ===

TASK ERSTELLEN — wenn der User eine Code-Aenderung beschreibt:
{"intent":"task","title":"Kurzer Titel","goal":"Detaillierte Beschreibung. Wichtig: TypeScript-Syntax muss korrekt sein, Strings in Anfuehrungszeichen.","risk":"low","taskType":"A"}

Task-Typen: A=Backend, B=UI, C=Frontend+Backend, D=Refactoring, P=Prototype, S=Architektur
Risk: low=1 Datei, medium=mehrere Dateien, high=DB/Auth/Core

STATUS ABFRAGEN — wenn der User nach Status, Fortschritt, Tasks fragt:
{"intent":"status"}

TASK GENEHMIGEN — wenn der User sagt "approve", "genehmige", "freigeben":
{"intent":"approve","taskId":"ID oder 'latest'"}

TASK REVERTEN — wenn der User sagt "revert", "zurueck", "rueckgaengig":
{"intent":"revert","taskId":"ID oder 'latest'"}

TASK LOESCHEN — wenn der User sagt "loesch", "delete", "entferne":
{"intent":"delete","taskId":"ID oder 'latest' oder 'all_blocked'"}

TASK-DETAILS — wenn der User Details, Dialog, Ergebnis eines Tasks sehen will:
{"intent":"detail","taskId":"ID oder 'latest'"}

CHAT — fuer alles andere (Fragen, Smalltalk, Hilfe):
{"intent":"chat","message":"Deine Antwort"}

=== BUILDER-WISSEN ===
- Die Engine nutzt Claude als Architect (plant Code), ChatGPT als Reviewer (prueft), Claude als Secondary Reviewer
- Bei @APPLY wird ein GitHub Action getriggert der den Code baut, testet und committed
- Status-Flow: queued -> classifying -> planning -> reviewing -> push_candidate/done
- blocked = ein Reviewer hat geblockt oder Build fehlgeschlagen
- review_needed = GitHub Action hatte Probleme
- Dateien in der GLOBAL_BLACKLIST koennen nicht geaendert werden (builder eigene Dateien)
- Die Engine kann neue Dateien erstellen und bestehende aendern (ausser Blacklist)`;

async function classifyIntent(
  message: string,
  history: ChatMessage[] = [],
): Promise<ClassifiedIntent> {
  const response = await callProvider('gemini', 'gemini-2.5-flash', {
    system: SYSTEM_PROMPT,
    messages: [
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user' as const, content: message },
    ],
    maxTokens: 500,
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { intent: 'chat', message: response };
    }

    return JSON.parse(jsonMatch[0]) as ClassifiedIntent;
  } catch {
    return { intent: 'chat', message: response };
  }
}

async function resolveTaskId(taskId: string | undefined): Promise<string | null> {
  if (!taskId || taskId === 'latest') {
    const db = getDb();
    const [latest] = await db
      .select({ id: builderTasks.id })
      .from(builderTasks)
      .orderBy(desc(builderTasks.updatedAt))
      .limit(1);

    return latest?.id ?? null;
  }

  return taskId;
}

async function summarizeTaskDialog(taskId: string): Promise<string> {
  const db = getDb();
  const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
  if (!task) {
    return 'Task nicht gefunden.';
  }

  const actions = await db
    .select()
    .from(builderActions)
    .where(eq(builderActions.taskId, taskId))
    .orderBy(asc(builderActions.createdAt));

  const summary: string[] = [
    `Task: ${task.title}`,
    `Ziel: ${task.goal}`,
    `Status: ${task.status}`,
    `Erstellt: ${new Date(task.createdAt).toLocaleString('de-DE')}`,
    '',
  ];

  for (const action of actions) {
    const actor = action.actor;
    const kind = action.kind;
    const result = action.result as Record<string, unknown> | null;

    if (kind === 'FIND_PATTERN') {
      const matches = (result?.matches as unknown[]) ?? [];
      summary.push(`${actor}: Codebase durchsucht — ${matches.length} Treffer`);
    } else if (kind === 'PATCH') {
      summary.push(`${actor}: Patch vorbereitet fuer ${(result?.file as string) ?? 'unbekannt'}`);
    } else if (kind === 'APPLY') {
      const mode = (result?.mode as string) ?? '';
      const triggered = result?.triggered as boolean;
      summary.push(`${actor}: @APPLY — ${mode}${triggered ? ', GitHub Action getriggert' : ''}`);
    } else if (kind === 'REVIEW') {
      summary.push(`${actor}: Review abgegeben`);
    } else if (kind === 'APPROVE') {
      summary.push(`${actor}: Approved`);
    } else if (kind === 'BLOCK') {
      summary.push(`${actor}: Blocked`);
    } else if (kind === 'GITHUB_ACTION_RESULT') {
      const tsc = result?.tsc_ok as boolean;
      const build = result?.build_ok as boolean;
      const committed = result?.committed as boolean;
      const hash = result?.commit_hash as string | null;
      summary.push(
        `GitHub Action: tsc=${tsc ? 'pass' : 'fail'}, build=${build ? 'pass' : 'fail'}${committed ? `, committed ${hash?.slice(0, 7)}` : ''}`,
      );
    }
  }

  if (task.commitHash) {
    summary.push(`\nCommit: ${task.commitHash.slice(0, 7)}`);
  }

  return summary.join('\n');
}

export async function handleBuilderChat(
  message: string,
  history: ChatMessage[] = [],
): Promise<ChatResponse> {
  try {
    const classified = await classifyIntent(message, history);
    const db = getDb();

    if (classified.intent === 'task' && classified.title && classified.goal) {
      const taskType = (classified.taskType || 'A') as TaskType;
      const policyProfile = TASK_TYPE_TO_PROFILE[taskType] ?? null;

      const [created] = await db
        .insert(builderTasks)
        .values({
          title: classified.title,
          goal: classified.goal,
          risk: classified.risk || 'low',
          taskType,
          policyProfile,
        })
        .returning();

      if (!created) {
        return { type: 'error', message: 'Task konnte nicht erstellt werden.' };
      }

      await db
        .update(builderTasks)
        .set({ status: 'classifying', updatedAt: new Date() })
        .where(eq(builderTasks.id, created.id));

      void runDialogEngine(created.id).catch((err) => {
        console.error('[fusion] engine error:', err);
      });

      return {
        type: 'task_created',
        message: `Ich starte: "${classified.title}". Claude plant, ChatGPT prueft. Ich melde mich wenn es fertig ist.`,
        taskId: created.id,
        taskTitle: classified.title,
      };
    }

    if (classified.intent === 'status') {
      const tasks = await db
        .select()
        .from(builderTasks)
        .orderBy(desc(builderTasks.updatedAt))
        .limit(5);

      if (tasks.length === 0) {
        return { type: 'task_status', message: 'Keine Tasks vorhanden. Beschreib mir was du aendern willst!' };
      }

      const lines = tasks.map((task) => {
        const status = task.status === 'done'
          ? `done (${task.commitHash?.slice(0, 7) ?? ''})`
          : task.status;
        return `• ${task.title} — ${status}`;
      });

      return { type: 'task_status', message: `Aktuelle Tasks:\n${lines.join('\n')}` };
    }

    if (classified.intent === 'approve') {
      const taskId = await resolveTaskId(classified.taskId);
      if (!taskId) {
        return { type: 'error', message: 'Kein Task gefunden.' };
      }

      const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
      if (!task) {
        return { type: 'error', message: 'Task nicht gefunden.' };
      }

      await db
        .update(builderTasks)
        .set({ status: 'done', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      return {
        type: 'task_action',
        message: `"${task.title}" genehmigt und auf done gesetzt.`,
        taskId,
      };
    }

    if (classified.intent === 'revert') {
      const taskId = await resolveTaskId(classified.taskId);
      if (!taskId) {
        return { type: 'error', message: 'Kein Task gefunden.' };
      }

      const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
      if (!task) {
        return { type: 'error', message: 'Task nicht gefunden.' };
      }

      await db
        .update(builderTasks)
        .set({ status: 'reverted', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      return {
        type: 'task_action',
        message: `"${task.title}" wurde revertiert.`,
        taskId,
      };
    }

    if (classified.intent === 'delete') {
      if (classified.taskId === 'all_blocked') {
        const blocked = await db
          .select({ id: builderTasks.id, title: builderTasks.title })
          .from(builderTasks)
          .where(eq(builderTasks.status, 'blocked'));

        let count = 0;
        for (const task of blocked) {
          await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, task.id));
          await db.delete(builderActions).where(eq(builderActions.taskId, task.id));
          await db.delete(builderTestResults).where(eq(builderTestResults.taskId, task.id));
          await db.delete(builderReviews).where(eq(builderReviews.taskId, task.id));
          await db.delete(builderTasks).where(eq(builderTasks.id, task.id));
          count += 1;
        }

        return {
          type: 'task_action',
          message: count > 0 ? `${count} blockierte Tasks geloescht.` : 'Keine blockierten Tasks vorhanden.',
        };
      }

      const taskId = await resolveTaskId(classified.taskId);
      if (!taskId) {
        return { type: 'error', message: 'Kein Task gefunden.' };
      }

      const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
      if (!task) {
        return { type: 'error', message: 'Task nicht gefunden.' };
      }

      await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, taskId));
      await db.delete(builderActions).where(eq(builderActions.taskId, taskId));
      await db.delete(builderTestResults).where(eq(builderTestResults.taskId, taskId));
      await db.delete(builderReviews).where(eq(builderReviews.taskId, taskId));
      await db.delete(builderTasks).where(eq(builderTasks.id, taskId));

      return {
        type: 'task_action',
        message: `"${task.title}" wurde geloescht.`,
        taskId,
      };
    }

    if (classified.intent === 'detail') {
      const taskId = await resolveTaskId(classified.taskId);
      if (!taskId) {
        return { type: 'error', message: 'Kein Task gefunden.' };
      }

      const summary = await summarizeTaskDialog(taskId);
      return { type: 'task_status', message: summary, taskId };
    }

    return {
      type: 'chat',
      message: classified.message || 'Ich bin Maya, dein Builder-Assistent. Sag mir was du aendern willst!',
    };
  } catch (error) {
    console.error('[fusion] chat error:', error);
    return {
      type: 'error',
      message: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}