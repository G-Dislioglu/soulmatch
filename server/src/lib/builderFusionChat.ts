import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderTasks } from '../schema/builder.js';
import { TASK_TYPE_TO_PROFILE, type TaskType } from './builderPolicyProfiles.js';
import { runDialogEngine } from './builderDialogEngine.js';
import { callProvider } from './providers.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  type: 'task_created' | 'task_status' | 'chat' | 'error';
  message: string;
  taskId?: string;
  taskTitle?: string;
}

const CLASSIFIER_SYSTEM = `Du bist der Builder-Assistent fuer Soulmatch.
Du sprichst Deutsch, locker und direkt.

Wenn der User eine Code-Aenderung beschreibt, antworte mit einem JSON-Block:
{"intent":"task","title":"Kurzer Titel","goal":"Detaillierte Beschreibung was gemacht werden soll","risk":"low","taskType":"A"}

Task-Typen:
A = API/Backend Fix oder Feature
B = UI/Layout Aenderung
C = Formular/Flow (Frontend + Backend)
D = Refactoring (nur Umbau, keine neue Funktion)
P = Prototype/Preview
S = Architektur-sensitiv (DB, Auth, Core)

Risk-Level:
low = Einzelne Datei, keine Breaking Changes
medium = Mehrere Dateien, Tests noetig
high = DB-Schema, Auth, Core-Architektur

Wenn der User eine Frage stellt oder chattet, antworte mit:
{"intent":"chat","message":"Deine Antwort hier"}

Wenn der User nach dem Status eines Tasks fragt, antworte mit:
{"intent":"status","message":"Ich schaue nach..."}

Antworte IMMER mit genau einem JSON-Objekt. Kein Fliesstext drumherum.`;

export async function classifyIntent(
  message: string,
  history: ChatMessage[] = [],
): Promise<{
  intent: 'task' | 'chat' | 'status';
  title?: string;
  goal?: string;
  risk?: string;
  taskType?: string;
  message?: string;
}> {
  const response = await callProvider('gemini', 'gemini-2.5-flash', {
    system: CLASSIFIER_SYSTEM,
    messages: [
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user', content: message },
    ],
    maxTokens: 500,
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { intent: 'chat', message: response };
    }
    return JSON.parse(jsonMatch[0]) as {
      intent: 'task' | 'chat' | 'status';
      title?: string;
      goal?: string;
      risk?: string;
      taskType?: string;
      message?: string;
    };
  } catch {
    return { intent: 'chat', message: response };
  }
}

export async function handleBuilderChat(
  message: string,
  history: ChatMessage[] = [],
): Promise<ChatResponse> {
  try {
    const classified = await classifyIntent(message, history);

    if (classified.intent === 'task' && classified.title && classified.goal) {
      const db = getDb();
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

      void runDialogEngine(created.id).catch((error) => {
        console.error('[fusion] dialog engine error:', error);
      });

      return {
        type: 'task_created',
        message: `Ich starte: "${classified.title}". Claude plant, ChatGPT prueft. Ich melde mich wenn es fertig ist.`,
        taskId: created.id,
        taskTitle: classified.title,
      };
    }

    if (classified.intent === 'status') {
      const db = getDb();
      const tasks = await db
        .select()
        .from(builderTasks)
        .orderBy(desc(builderTasks.updatedAt))
        .limit(3);

      if (tasks.length === 0) {
        return { type: 'task_status', message: 'Keine aktiven Tasks vorhanden.' };
      }

      const statusLines = tasks.map(
        (task) => `• ${task.title}: ${task.status}${task.commitHash ? ` (Commit: ${task.commitHash.slice(0, 7)})` : ''}`,
      );

      return {
        type: 'task_status',
        message: `Aktuelle Tasks:\n${statusLines.join('\n')}`,
      };
    }

    return {
      type: 'chat',
      message: classified.message || 'Ich bin der Builder-Assistent. Beschreibe was du aendern willst, und ich kuemmere mich darum.',
    };
  } catch (error) {
    console.error('[fusion] chat error:', error);
    return {
      type: 'error',
      message: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}