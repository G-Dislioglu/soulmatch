import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderReviews,
  builderTasks,
  builderTestResults,
} from '../schema/builder.js';
import { TASK_TYPE_TO_PROFILE, type TaskType } from './builderPolicyProfiles.js';
import { executeTask } from './opusBridgeController.js';
import { runBuildPipeline } from './opusBuildPipeline.js';
import {
  buildBuilderMemoryContext,
  deleteBuilderMemoryForTask,
  rememberBuilderAssistantMessage,
  rememberBuilderChatHistory,
  rememberBuilderUserMessage,
  setActiveBuilderTask,
} from './builderMemory.js';
import { callProvider } from './providers.js';
import { assembleBuilderContext } from './builderContextAssembler.js';
import { resolveScope } from './builderScopeResolver.js';

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
  intent: 'task' | 'status' | 'approve' | 'revert' | 'delete' | 'detail' | 'retry' | 'cancel' | 'chat';
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

TASK ABBRECHEN — wenn der User sagt "cancel", "abbrechen", "stopp", "blockiere":
{"intent":"cancel","taskId":"ID oder 'latest' oder 'all_stuck'"}
- 'all_stuck' = alle Tasks die seit >10 Minuten in planning/consensus haengen

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
- Die Engine kann neue Dateien erstellen und bestehende aendern (ausser Blacklist)

=== CONTEXT AWARENESS (Gaps & Conflicts) ===
Du erhaeltst im Kontext GAPS, CONFLICTS und PIPELINE-STATUS. Nutze sie AKTIV:

GAPS:
- [INFO] = Hinweis beilaeuifg erwaehnen
- [WARNING] = Proaktiv warnen und Massnahme vorschlagen
- [CRITICAL] = Sofort ansprechen, Builder-Aktionen ggf. blockieren bis behoben

CONFLICTS:
- Bei blocked Tasks: Biete IMMER Recovery-Optionen an (retry/revert/delete)
- Bei Conflicts: Warne BEVOR ein neuer Task gestartet wird der betroffen sein koennte

PIPELINE IDLE + keine Gaps/Conflicts:
- Kurzes positives Feedback: "Pipeline sauber, bereit fuer den naechsten Task."

Baue Gaps/Conflicts natuerlich in deine Chat-Antwort ein — nicht als separaten Block, sondern als Teil deiner normalen Antwort.`;

async function buildSystemPrompt(userId?: string) {
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
  
  try {
    const assembledContext = await assembleBuilderContext({ userId });
    if (assembledContext) {
      parts.push(`\n\n${assembledContext}`);
    }
  } catch (err: any) {
    console.warn('[buildSystemPrompt] assembleBuilderContext failed:', err?.message);
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

// ─── MODE ROUTER: Quick (/opus-task) vs Pipeline (/build) ───

type BuildMode = 'quick' | 'pipeline';

function determineBuildMode(message: string, classified: ClassifiedIntent): BuildMode {
  const normalized = message.toLowerCase();

  // Explicit user triggers → pipeline
  if (/\b(deep\s*mode|pipeline|pipeline-modus|volle pipeline|full pipeline)\b/.test(normalized)) {
    return 'pipeline';
  }

  // Architecture tasks → pipeline
  if (classified.taskType === 'S') {
    return 'pipeline';
  }

  // High risk → pipeline
  if (classified.risk === 'high') {
    return 'pipeline';
  }

  // Multi-file signals → pipeline
  if (/\b(mehrere dateien|multi.?file|multiple files|3\+ dateien|cross.?module)\b/.test(normalized)) {
    return 'pipeline';
  }

  // Mentions 3+ distinct file paths → pipeline
  const fileMatches = normalized.match(/\b[\w./-]+\.(ts|tsx|js|jsx)\b/g);
  if (fileMatches && new Set(fileMatches).size >= 3) {
    return 'pipeline';
  }

  // Complex refactoring with multi-file scope → pipeline
  if (classified.taskType === 'D' && classified.risk === 'medium') {
    return 'pipeline';
  }

  // Frontend+Backend combined → pipeline
  if (classified.taskType === 'C') {
    return 'pipeline';
  }

  // Default: quick mode
  return 'quick';
}

function looksLikeTaskRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const taskVerb = /\b(fueg|füge|add|aendere|ändere|modify|update|fix|baue|bau|erstelle|create|schreib|patch|implement|refaktor|refactor|erg[aä]nz|rename|verschieb|entfern|lösch|delete|remove|deploy|push|install|konfigur|configur|import|export|extrah|extract|optimier|optimiz|integrier|integrat|split|trenn|merg|kombin|combin|migrier|migrat|generer|generat|korrigier|correct)\b/;
  const fileHint = /\b[\w./-]+\.(ts|tsx|js|jsx|mjs|json|css|md)\b/;
  const codeHint = /\b(function|const|import|export|interface|type|class|endpoint|route|api|component|hook|modul|service|handler|controller|middleware)\b/;
  const actionPhrase = /\b(mach|mache|sorg|kannst du|bitte|soll|sollte|muss|müsste|wäre gut|brauche|brauch|need|want|should|could you|please)\b.*\b(datei|file|code|funktion|function|endpoint|seite|page|button|component)\b/;

  return taskVerb.test(normalized) || fileHint.test(normalized) || (codeHint.test(normalized) && actionPhrase.test(normalized));
}

function normalizeForPathMatching(value: string): string {
  return value.toLowerCase().replace(/\\/g, '/');
}

function normalizeExplicitPath(value: string): string {
  return value.replace(/\\/g, '/');
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

function extractExplicitScopePaths(text: string): string[] {
  const matches = text.match(/\b(?:client|server|docs|tools|aicos-registry)[\\/][\w./\\-]+\.(?:ts|tsx|js|jsx|mjs|json|css|md)\b/g) ?? [];
  return Array.from(new Set(matches.map(normalizeExplicitPath)));
}

function resolveChatTaskScope(...parts: Array<string | undefined>): string[] {
  const scopeSignal = parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join('\n');

  if (!scopeSignal) {
    return [];
  }

  const explicitPaths = extractExplicitScopePaths(scopeSignal);
  const resolved = resolveScope(scopeSignal).files;
  return Array.from(new Set([...explicitPaths, ...resolved]));
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
  userId?: string,
): Promise<ClassifiedIntent> {
  const systemPrompt = await buildSystemPrompt(userId);
  const response = await callProvider('gemini', 'gemini-3-flash-preview', {
    system: systemPrompt,
    messages: [
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user' as const, content: message },
    ],
    maxTokens: 800,
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
    // JSON.parse failed — likely truncated JSON from LLM.
    // Try to extract the message field from partial JSON.
    const msgExtract = response.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
    if (msgExtract?.[1]) {
      const cleaned = msgExtract[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      return { intent: 'chat', message: cleaned } as ClassifiedIntent;
    }

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
    const classified = await classifyIntent(message, history, userId);
    const db = getDb();

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
      const buildMode = determineBuildMode(message, classified);
      const resolvedScope = resolveChatTaskScope(message, classified.title, classified.goal);

      const [created] = await db
        .insert(builderTasks)
        .values({
          title: classified.title,
          goal: classified.goal,
          risk: classified.risk || 'low',
          taskType,
          policyProfile,
          scope: resolvedScope,
        })
        .returning();

      if (!created) {
        return { type: 'error', message: 'Task konnte nicht erstellt werden.' };
      }

      await db
        .update(builderTasks)
        .set({ status: 'classifying', updatedAt: new Date() })
        .where(eq(builderTasks.id, created.id));

      setActiveBuilderTask(created.id);

      if (buildMode === 'pipeline') {
        // ─── PIPELINE MODE: Scout → Destillierer → Council → Worker → TSC → Push ───
        void (async () => {
          try {
            console.log('[maya-router] ', `Pipeline-Modus gestartet: ${classified.title}`);
            console.log('[maya-router] ', `Resolved scope (${resolvedScope.length}): ${resolvedScope.join(', ') || 'none'}`);
            await db
              .update(builderTasks)
              .set({ status: 'planning', updatedAt: new Date() })
              .where(eq(builderTasks.id, created.id));

            const result = await runBuildPipeline({
              instruction: classified.goal!,
              scope: resolvedScope.length > 0 ? resolvedScope : undefined,
              risk: (classified.risk as 'low' | 'medium' | 'high') || 'medium',
            });

            const finalStatus = result.status === 'success' || result.status === 'deployed' ? 'done' : 'blocked';
            await db
              .update(builderTasks)
              .set({
                status: finalStatus,
                commitHash: result.deploy?.commitId ?? null,
                updatedAt: new Date(),
              })
              .where(eq(builderTasks.id, created.id));

            console.log('[maya-router]',
              finalStatus === 'done'
                ? `Pipeline fertig: ${result.files.join(', ')} deployed (${result.deploy?.commitId?.slice(0, 7) ?? 'n/a'})`
                : `Pipeline fehlgeschlagen: ${result.status}`
            );
          } catch (err) {
            console.error('[fusion] pipeline error:', err);
            await db
              .update(builderTasks)
              .set({ status: 'blocked', updatedAt: new Date() })
              .where(eq(builderTasks.id, created.id));
            console.log('[maya-router] ', `Pipeline-Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
          }
        })();

        rememberBuilderAssistantMessage(`Pipeline-Modus: ${classified.title}`);
        return {
          type: 'task_created',
          message: `Pipeline-Modus fuer: "${classified.title}". Scout analysiert, Council plant, Worker bauen parallel. ~2min.`,
          taskId: created.id,
          taskTitle: classified.title,
        };
      }

      // ─── QUICK MODE: Scope → executeTask controller ───
      void (async () => {
        try {
          console.log('[maya-router] ', `Schnellmodus gestartet: ${classified.title}`);
          console.log('[maya-router] ', `Resolved scope (${resolvedScope.length}): ${resolvedScope.join(', ') || 'none'}`);
          await db
            .update(builderTasks)
            .set({ status: 'planning', updatedAt: new Date() })
            .where(eq(builderTasks.id, created.id));

          const result = await executeTask({
            existingTaskId: created.id,
            instruction: classified.goal!,
            scope: resolvedScope.length > 0 ? resolvedScope : undefined,
            risk: classified.risk,
          });

          const finalStatus = result.status === 'applying'
            ? 'applying'
            : result.status === 'consensus'
              ? 'done'
              : 'blocked';
          await db
            .update(builderTasks)
            .set({
              status: finalStatus,
              updatedAt: new Date(),
            })
            .where(eq(builderTasks.id, created.id));

          console.log('[maya-router]',
            finalStatus === 'done' || finalStatus === 'applying'
              ? `Schnellmodus fertig: ${result.status} (${result.patches.length} patches)`
              : `Schnellmodus fehlgeschlagen: ${result.status}`
          );
        } catch (err) {
          console.error('[fusion] quick-mode error:', err);
          await db
            .update(builderTasks)
            .set({ status: 'blocked', updatedAt: new Date() })
            .where(eq(builderTasks.id, created.id));
          console.log('[maya-router] ', `Schnellmodus-Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
        }
      })();

      rememberBuilderAssistantMessage(`Schnellmodus: ${classified.title}`);
      return {
        type: 'task_created',
        message: `Schnellmodus fuer: "${classified.title}". Scope wird aufgeloest, Worker schreibt Code. ~30-90s.`,
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
        .set({
          status: 'classifying',
          scope: Array.isArray(task.scope) && task.scope.length > 0
            ? task.scope
            : resolveChatTaskScope(task.title, task.goal),
          updatedAt: new Date(),
        })
        .where(eq(builderTasks.id, taskId));

      const retryScope = Array.isArray(task.scope) && task.scope.length > 0
        ? task.scope
        : resolveChatTaskScope(task.title, task.goal);

      // Determine mode from stored task data
      const retryIntent: ClassifiedIntent = {
        intent: 'task',
        title: task.title,
        goal: task.goal,
        risk: task.risk ?? 'low',
        taskType: task.taskType ?? 'A',
      };
      const retryMode = determineBuildMode(task.goal, retryIntent);

      if (retryMode === 'pipeline') {
        void (async () => {
          try {
            await db.update(builderTasks).set({ status: 'planning', updatedAt: new Date() }).where(eq(builderTasks.id, taskId));
            const result = await runBuildPipeline({
              instruction: task.goal,
              scope: retryScope.length > 0 ? retryScope : undefined,
              risk: (task.risk as 'low' | 'medium' | 'high') || 'medium',
            });
            const finalStatus = result.status === 'success' || result.status === 'deployed' ? 'done' : 'blocked';
            await db.update(builderTasks).set({ status: finalStatus, commitHash: result.deploy?.commitId ?? null, updatedAt: new Date() }).where(eq(builderTasks.id, taskId));
          } catch (err) {
            console.error('[fusion] retry pipeline error:', err);
            await db.update(builderTasks).set({ status: 'blocked', updatedAt: new Date() }).where(eq(builderTasks.id, taskId));
          }
        })();
      } else {
        void (async () => {
          try {
            await db.update(builderTasks).set({ status: 'planning', updatedAt: new Date() }).where(eq(builderTasks.id, taskId));
            const result = await executeTask({
              existingTaskId: taskId,
              instruction: task.goal,
              scope: retryScope.length > 0 ? retryScope : undefined,
              risk: task.risk ?? 'low',
            });
            const finalStatus = result.status === 'applying'
              ? 'applying'
              : result.status === 'consensus'
                ? 'done'
                : 'blocked';
            await db.update(builderTasks).set({ status: finalStatus, updatedAt: new Date() }).where(eq(builderTasks.id, taskId));
          } catch (err) {
            console.error('[fusion] retry quick-mode error:', err);
            await db.update(builderTasks).set({ status: 'blocked', updatedAt: new Date() }).where(eq(builderTasks.id, taskId));
          }
        })();
      }

      setActiveBuilderTask(taskId);
      rememberBuilderAssistantMessage(`Task erneut gestartet (${retryMode}): ${task.title}`);

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

    if (classified.intent === 'cancel') {
      if (classified.taskId === 'all_stuck') {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        const stuck = await db
          .select({ id: builderTasks.id, title: builderTasks.title, status: builderTasks.status })
          .from(builderTasks)
          .where(
            and(
              inArray(builderTasks.status, ['planning', 'consensus', 'push_candidate']),
              lt(builderTasks.updatedAt, tenMinAgo),
            ),
          );

        let count = 0;
        for (const task of stuck) {
          await db
            .update(builderTasks)
            .set({ status: 'blocked', updatedAt: new Date() })
            .where(eq(builderTasks.id, task.id));
          count += 1;
        }

        return {
          type: 'task_action',
          message: count > 0
            ? `${count} haengende Tasks blockiert.`
            : 'Keine haengenden Tasks gefunden.',
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

      if (task.status === 'done') {
        return { type: 'error', message: 'Task ist bereits abgeschlossen.' };
      }

      await db
        .update(builderTasks)
        .set({ status: 'blocked', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      return {
        type: 'task_action',
        message: `Task "${task.title}" abgebrochen (blocked).`,
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