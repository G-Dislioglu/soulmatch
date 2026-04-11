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
import {
  buildBuilderMemoryContext,
  deleteBuilderMemoryForTask,
  rememberBuilderAssistantMessage,
  rememberBuilderChatHistory,
  rememberBuilderUserMessage,
  setActiveBuilderTask,
} from './builderMemory.js';
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
  intent: 'task' | 'status' | 'approve' | 'revert' | 'delete' | 'detail' | 'retry' | 'chat';
  title?: string;
  goal?: string;
  risk?: string;
  taskType?: string;
  taskId?: string;
  message?: string;
}

const CHAT_VISIBLE_BLACKLIST = [
  'server/src/index.ts',
  'server/src/app.ts',
  'server/src/routes/builder.ts',
  'server/src/schema/builder.ts',
  'server/src/schema/arcana.ts',
  'server/src/schema/personaMemories.ts',
  'server/src/lib/builderFusionChat.ts',
  'server/src/lib/builderDialogEngine.ts',
  'server/src/lib/builderMemory.ts',
  'server/src/lib/builderEngine.ts',
  'server/src/lib/builderGates.ts',
  'server/src/lib/builderFileIO.ts',
  'server/src/lib/builderExecutor.ts',
  'server/src/db.ts',
  '.env',
  '.env.example',
  'package.json',
  'server/package.json',
  'node_modules/',
  'server/src/routes/opusBridge.ts',
  'server/src/lib/opusBridgeAuth.ts',
  'server/src/lib/opusBridgeController.ts',
  'server/src/lib/opusChainController.ts',
  'server/src/lib/opusChatPool.ts',
  'server/src/lib/opusErrorLearning.ts',
  'server/src/lib/opusGraphIntegration.ts',
  'server/src/lib/opusRoundtable.ts',
  'server/src/lib/opusScoutRunner.ts',
  'server/src/lib/opusVerification.ts',
  'server/src/schema/opusBridge.ts',
] as const;

const RETRYABLE_TASK_STATUSES = new Set(['blocked', 'review_needed', 'needs_human_review']);

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

Auch Aenderungen an BESTEHENDEN Dateien sind Tasks.
Beispiele:
- "Fuege getVersion() zu server/src/lib/builderMetrics.ts hinzu" => intent=task
- "Aendere die bestehende Audio-Logik in client/src/..." => intent=task
- "Refaktoriere das bestehende Voice-System" => intent=task
- Nur Fragen wie "Was kannst du?" oder "Wie ist der Status?" sind KEINE task-intents.

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

TASK ERNEUT STARTEN — wenn der User sagt "retry", "nochmal", "erneut starten":
{"intent":"retry","taskId":"ID oder 'latest'"}

CHAT — fuer alles andere (Fragen, Smalltalk, Hilfe):
{"intent":"chat","message":"Deine Antwort"}

=== BUILDER-WISSEN ===
- Die Engine nutzt Claude als Architect (plant Code), ChatGPT als Reviewer (prueft), Claude als Secondary Reviewer
- Bei @APPLY wird ein GitHub Action getriggert der den Code baut, testet und committed
- Status-Flow: queued -> classifying -> planning -> reviewing -> push_candidate/done
- blocked = ein Reviewer hat geblockt oder Build fehlgeschlagen
- review_needed = GitHub Action hatte Probleme
- Dateien in der GLOBAL_BLACKLIST koennen nicht geaendert werden (builder eigene Dateien)
- Namentlich gesperrt sind aktuell: ${CHAT_VISIBLE_BLACKLIST.join(', ')}
- Wenn der User eine gesperrte Datei nennt, antworte mit intent=chat und blocke SOFORT im Chat. Erzeuge dann KEINEN Task.
- Die Engine kann neue Dateien erstellen und bestehende aendern (ausser Blacklist)`;

async function buildSystemPrompt() {
  let memoryContext = "";
  try {
    memoryContext = await buildBuilderMemoryContext();
  } catch (err: any) {
    console.warn("[maya-memory] Builder memory unavailable:", err?.message);
    memoryContext = "[Builder-Memory nicht verfuegbar - RAM-Modus aktiv]";
  }
  if (!memoryContext) {
    return SYSTEM_PROMPT;
  }

  const parts = [SYSTEM_PROMPT];
  parts.push(`\n\n=== MAYA MEMORY ===\n${memoryContext}`);
  
  const operationalContext = ""; // Placeholder for OPERATIONAL CONTEXT
  if (operationalContext) {
    parts.push(`\n\n=== OPERATIONAL CONTEXT ===\n${operationalContext}`);
  }
  
  const conversationContext = ""; // Placeholder for CONVERSATION CONTEXT
  if (conversationContext) {
    parts.push(`\n\n=== CONVERSATION CONTEXT ===\n${conversationContext}`);
  }
  
  const result = { gaps: [] as string[] }; // Placeholder for result object
  if (result.gaps && result.gaps.length > 0) {
    parts.push(`\n\n=== CONTEXT GAPS ===\n${result.gaps.map(g => "- " + g).join('\n')}`);
  }
  
  return parts.join('');
}

function inferTaskTypeFromMessage(message: string): TaskType {
  const normalized = message.toLowerCase();

  if (/\b(refactor|refaktoriere|refaktor|umbau|strukturier|aufr[aä]um)\b/.test(normalized)) {
    return 'D';
  }

  if (/\b(prototype|preview|mockup|wireframe)\b/.test(normalized)) {
    return 'P';
  }

  const mentionsClient = /\b(client\/src|frontend|ui|layout|component|react|vite)\b/.test(normalized);
  const mentionsServer = /\b(server\/src|backend|api|route|express|endpoint|middleware)\b/.test(normalized);

  if (mentionsClient && mentionsServer) {
    return 'C';
  }

  if (mentionsClient) {
    return 'B';
  }

  return 'A';
}

function inferRiskFromMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (/\b(architektur|architecture|audio-system|voice-system|core|auth|migration|schema|datenbank|db)\b/.test(normalized)) {
    return 'high';
  }

  if (/\b(refactor|refaktoriere|mehrere dateien|mehrere module|system|pipeline|workflow|flow|bestehende logik)\b/.test(normalized)) {
    return 'medium';
  }

  return 'low';
}

function looksLikeTaskRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const taskVerb = /\b(fueg|füge|add|aendere|ändere|modify|update|fix|baue|bau|erstelle|create|schreib|patch|implement|refaktor|refactor|erg[aä]nz|rename|verschieb|entfern)\b/;
  const fileHint = /\b[\w./-]+\.(ts|tsx|js|jsx|mjs|json|css|md)\b/;

  return taskVerb.test(normalized) || fileHint.test(normalized);
}

function normalizeForPathMatching(value: string): string {
  return value.toLowerCase().replace(/\\/g, '/');
}

function toBlacklistAlias(entry: string): string {
  const normalized = normalizeForPathMatching(entry).replace(/\/+$/, '');
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}

function findBlacklistedTargets(text: string): string[] {
  const normalized = normalizeForPathMatching(text);
  const matches = new Set<string>();

  for (const entry of CHAT_VISIBLE_BLACKLIST) {
    const normalizedEntry = normalizeForPathMatching(entry).replace(/\/+$/, '');
    const alias = toBlacklistAlias(entry);

    if (normalized.includes(normalizedEntry) || normalized.includes(alias)) {
      matches.add(entry);
    }
  }

  return Array.from(matches);
}

function buildBlacklistBlockMessage(targets: string[]): string {
  const listedTargets = targets.join(', ');
  return `Das blocke ich direkt im Chat: ${listedTargets} steht auf der Builder-Blacklist. Beschreibe die Aenderung bitte ueber erlaubte Dateien oder als Ziel statt ueber diese geschuetzten Builder-Dateien.`;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function summarizeFailureReason(reason: string): string {
  const normalized = reason.toLowerCase();
  const compactReason = collapseWhitespace(reason);

  if (normalized.includes('path is globally blocked') || normalized.includes('scope_violation') || normalized.includes('outside task scope')) {
    return 'Task blockiert - Ziel lag auf einer geschuetzten oder ausserhalb des erlaubten Scopes liegenden Datei.';
  }

  if (normalized.includes('token_budget_exceeded')) {
    return 'Task blockiert - Token-Budget ueberschritten.';
  }

  if (normalized.includes('observer_blocked') || normalized.includes('dual_review_blocked') || normalized.includes('counterexample_blocked')) {
    return 'Task blockiert - Review hat einen echten Blocker gefunden.';
  }

  if (normalized.includes('browser_lane_error') || normalized.includes('browser lane')) {
    return 'Browser-Pruefung fehlgeschlagen - der Fix ist in der Laufzeitpruefung haengengeblieben.';
  }

  if (
    normalized.includes('syntax')
    || normalized.includes('unexpected token')
    || normalized.includes('parse error')
    || normalized.includes('parsing error')
    || /\bts\d{3,5}\b/.test(normalized)
  ) {
    return 'Build fehlgeschlagen - vermutlich Syntax- oder TypeScript-Fehler.';
  }

  if (
    normalized.includes('build')
    || normalized.includes('tsc')
    || normalized.includes('typecheck')
    || normalized.includes('compile')
    || normalized.includes('vite')
  ) {
    return 'Build fehlgeschlagen - vermutlich Syntax-, TypeScript- oder Build-Fehler.';
  }

  if (normalized.includes('canary')) {
    return 'Task blockiert - Canary-Gate hat den Lauf gestoppt.';
  }

  if (compactReason.length === 0) {
    return 'Task blockiert - Ursache noch unklar.';
  }

  return `Task blockiert - ${compactReason.slice(0, 220)}${compactReason.length > 220 ? '...' : ''}`;
}

async function explainRetryableTask(taskId: string, status: string): Promise<string | null> {
  const db = getDb();
  const actions = await db
    .select({ kind: builderActions.kind, result: builderActions.result, createdAt: builderActions.createdAt })
    .from(builderActions)
    .where(eq(builderActions.taskId, taskId))
    .orderBy(desc(builderActions.createdAt))
    .limit(12);

  const reviews = await db
    .select({ verdict: builderReviews.verdict, notes: builderReviews.notes, dissentPoints: builderReviews.dissentPoints })
    .from(builderReviews)
    .where(eq(builderReviews.taskId, taskId))
    .orderBy(desc(builderReviews.createdAt))
    .limit(3);

  const tests = await db
    .select({ testName: builderTestResults.testName, passed: builderTestResults.passed, details: builderTestResults.details })
    .from(builderTestResults)
    .where(eq(builderTestResults.taskId, taskId))
    .orderBy(desc(builderTestResults.createdAt))
    .limit(3);

  const explicitError = actions.find((action) => typeof action.result?.error === 'string')?.result?.error;
  if (typeof explicitError === 'string' && explicitError.trim().length > 0) {
    return `${summarizeFailureReason(explicitError)} Sag "retry" oder beschreibe den Task nochmal.`;
  }

  const githubAction = actions.find((action) => action.kind === 'GITHUB_ACTION_RESULT');
  if (githubAction?.result) {
    const tscOk = githubAction.result.tsc_ok as boolean | undefined;
    const buildOk = githubAction.result.build_ok as boolean | undefined;
    const actionError = githubAction.result.error;

    if (tscOk === false || buildOk === false) {
      return 'Build fehlgeschlagen - vermutlich Syntax-, TypeScript- oder Build-Fehler. Sag "retry" oder beschreibe den Task nochmal.';
    }

    if (typeof actionError === 'string' && actionError.trim().length > 0) {
      return `${summarizeFailureReason(actionError)} Sag "retry" oder beschreibe den Task nochmal.`;
    }
  }

  const failedTest = tests.find((test) => test.passed !== 'true');
  if (failedTest) {
    const details = failedTest.details ? ` ${collapseWhitespace(failedTest.details).slice(0, 180)}` : '';
    return `Test fehlgeschlagen - ${failedTest.testName}.${details} Sag "retry" oder beschreibe den Task nochmal.`;
  }

  const blockingReview = reviews.find((review) => review.verdict === 'block');
  if (blockingReview) {
    const notes = [blockingReview.notes, ...(blockingReview.dissentPoints ?? [])]
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => collapseWhitespace(entry));

    if (notes.length > 0) {
      return `Task blockiert - Review meldet: ${notes.join(' | ').slice(0, 220)}${notes.join(' | ').length > 220 ? '...' : ''} Sag "retry" oder beschreibe den Task nochmal.`;
    }

    return 'Task blockiert - Review hat einen echten Blocker gefunden. Sag "retry" oder beschreibe den Task nochmal.';
  }

  if (status === 'review_needed') {
    return 'Task braucht Nacharbeit - der letzte Lauf ist in Review oder Runtime-Pruefung haengengeblieben. Sag "retry" oder beschreibe den Task nochmal.';
  }

  if (status === 'needs_human_review') {
    return 'Task braucht menschliche Sichtung - die Engine hat keinen sauberen Abschluss gefunden. Sag "retry" oder beschreibe den Task nochmal.';
  }

  return null;
}

function buildFallbackTaskIntent(message: string): ClassifiedIntent {
  const title = message
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return {
    intent: 'task',
    title: title.length > 0 ? title : 'Builder-Task aus Chat',
    goal: message.trim(),
    risk: inferRiskFromMessage(message),
    taskType: inferTaskTypeFromMessage(message),
  };
}

function normalizeClassifiedIntent(message: string, classified: ClassifiedIntent): ClassifiedIntent {
  const blockedTargets = findBlacklistedTargets([
    message,
    classified.title,
    classified.goal,
    classified.message,
  ].filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).join('\n'));

  if (blockedTargets.length > 0) {
    return {
      intent: 'chat',
      message: buildBlacklistBlockMessage(blockedTargets),
    };
  }

  if (classified.intent === 'task') {
    return {
      ...classified,
      title: classified.title?.trim() || message.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Builder-Task aus Chat',
      goal: classified.goal?.trim() || message.trim(),
      risk: classified.risk?.trim() || inferRiskFromMessage(message),
      taskType: classified.taskType?.trim() || inferTaskTypeFromMessage(message),
    };
  }

  if (looksLikeTaskRequest(message)) {
    return buildFallbackTaskIntent(message);
  }

  return classified;
}

async function classifyIntent(
  message: string,
  history: ChatMessage[] = [],
): Promise<ClassifiedIntent> {
  const systemPrompt = await buildSystemPrompt();
  const response = await callProvider('gemini', 'gemini-3-flash-preview', {
    system: systemPrompt,
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
      return looksLikeTaskRequest(message)
        ? buildFallbackTaskIntent(message)
        : { intent: 'chat', message: response };
    }

    return normalizeClassifiedIntent(message, JSON.parse(jsonMatch[0]) as ClassifiedIntent);
  } catch {
    return looksLikeTaskRequest(message)
      ? buildFallbackTaskIntent(message)
      : { intent: 'chat', message: response };
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

async function resolveRetryableTask(taskId: string | undefined): Promise<string | null> {
  if (taskId && taskId !== 'latest') {
    return taskId;
  }

  const db = getDb();
  const tasks = await db
    .select({ id: builderTasks.id, status: builderTasks.status })
    .from(builderTasks)
    .orderBy(desc(builderTasks.updatedAt))
    .limit(10);

  const retryableTask = tasks.find((task) => RETRYABLE_TASK_STATUSES.has(task.status));
  return retryableTask?.id ?? tasks[0]?.id ?? null;
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
  userId?: string,
): Promise<ChatResponse> {
  try {
    rememberBuilderChatHistory(history);
    rememberBuilderUserMessage(message);
    const classified = await classifyIntent(message, history);
    const db = getDb();
    // userId is passed through but not used yet

    if (classified.intent === 'task' && classified.title && classified.goal) {
      const blockedTargets = findBlacklistedTargets(`${classified.title}\n${classified.goal}`);
      if (blockedTargets.length > 0) {
        const blockedMessage = buildBlacklistBlockMessage(blockedTargets);
        rememberBuilderAssistantMessage(blockedMessage);
        return {
          type: 'chat',
          message: blockedMessage,
        };
      }

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

      setActiveBuilderTask(created.id);
      rememberBuilderAssistantMessage(`Task erstellt: ${classified.title}`);

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

      const retryableTask = tasks.find((task) => RETRYABLE_TASK_STATUSES.has(task.status));
      const retryHint = retryableTask
        ? await explainRetryableTask(retryableTask.id, retryableTask.status)
        : null;

      return {
        type: 'task_status',
        message: `Aktuelle Tasks:\n${lines.join('\n')}${retryHint ? `\n\n${retryHint}` : ''}`,
      };
    }

    if (classified.intent === 'retry') {
      const taskId = await resolveRetryableTask(classified.taskId);
      if (!taskId) {
        return { type: 'error', message: 'Kein retry-faehiger Task gefunden.' };
      }

      const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
      if (!task) {
        return { type: 'error', message: 'Task nicht gefunden.' };
      }

      if (!RETRYABLE_TASK_STATUSES.has(task.status)) {
        return {
          type: 'error',
          message: `"${task.title}" ist aktuell ${task.status} und nicht retry-faehig.`,
          taskId,
        };
      }

      await db
        .update(builderTasks)
        .set({ status: 'classifying', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      void runDialogEngine(taskId).catch((err) => {
        console.error('[fusion] retry engine error:', err);
      });

      setActiveBuilderTask(taskId);
      rememberBuilderAssistantMessage(`Task erneut gestartet: ${task.title}`);

      return {
        type: 'task_action',
        message: `Ich starte "${task.title}" erneut. Ich melde mich, sobald der neue Lauf durch ist.`,
        taskId,
      };
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

      setActiveBuilderTask(taskId);
      rememberBuilderAssistantMessage(`Task genehmigt: ${task.title}`);

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

      setActiveBuilderTask(taskId);
      rememberBuilderAssistantMessage(`Task revertiert: ${task.title}`);

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
          await deleteBuilderMemoryForTask(task.id);
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

  await deleteBuilderMemoryForTask(taskId);
      await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, taskId));
      await db.delete(builderActions).where(eq(builderActions.taskId, taskId));
      await db.delete(builderTestResults).where(eq(builderTestResults.taskId, taskId));
      await db.delete(builderReviews).where(eq(builderReviews.taskId, taskId));
      await db.delete(builderTasks).where(eq(builderTasks.id, taskId));

      if (taskId === task.id) {
        setActiveBuilderTask(null);
      }
      rememberBuilderAssistantMessage(`Task geloescht: ${task.title}`);

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
      setActiveBuilderTask(taskId);
      rememberBuilderAssistantMessage(summary);
      return { type: 'task_status', message: summary, taskId };
    }

    const fallbackMessage = classified.message || 'Ich bin Maya, dein Builder-Assistent. Sag mir was du aendern willst!';
    rememberBuilderAssistantMessage(fallbackMessage);

    return {
      type: 'chat',
      message: fallbackMessage,
    };
  } catch (error) {
    console.error('[fusion] chat error:', error);
    rememberBuilderAssistantMessage(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    return {
      type: 'error',
      message: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}