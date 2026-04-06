import { callProvider } from './providers.js';
import { webSearch } from './builderSearch.js';
import { addChatPoolMessage, type ChatPoolMessage } from './opusChatPool.js';
import {
  findRelevantErrorCards,
  generateGraphBriefing,
  loadArchitectureGraph,
  loadProjectDna,
} from './opusGraphIntegration.js';

interface ScoutTask {
  id: string;
  goal: string;
  scope?: string[];
}

function buildPromptWithProjectDna(basePrompt: string): string {
  const projectDna = loadProjectDna();
  if (!projectDna) {
    return basePrompt;
  }

  return `${projectDna}\n\n${basePrompt}`;
}

async function runCodebaseScout(task: ScoutTask): Promise<ChatPoolMessage> {
  const startedAt = Date.now();
  const content = await callProvider('deepseek', 'deepseek-chat', {
    system: buildPromptWithProjectDna(
      `Du bist der Codebase-Scout. Dein Job: Durchsuche das Repo und liefere eine Übersicht. Task: ${task.goal}. Liefere: 1) Relevante Dateien, 2) Ähnliche Implementierungen, 3) Patterns/Konventionen, 4) Zu ändernde Dateien. Kein Code schreiben, nur recherchieren.`,
    ),
    messages: [{ role: 'user', content: task.goal }],
    maxTokens: 1500,
    forceJsonObject: false,
  });

  return addChatPoolMessage({
    taskId: task.id,
    round: 0,
    phase: 'scout',
    actor: 'deepseek',
    model: 'deepseek-chat',
    content,
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });
}

async function runPatternScout(task: ScoutTask): Promise<ChatPoolMessage> {
  const startedAt = Date.now();
  const content = await callProvider('openai', 'gpt-5-nano', {
    system: buildPromptWithProjectDna(
      `Du bist der Pattern-Scout. Extrahiere Muster und Konventionen. Liefere: 1) Code-Konventionen, 2) Duplikat-Risiken, 3) Edge-Cases, 4) Komplexität. Kein Code schreiben.`,
    ),
    messages: [{ role: 'user', content: task.goal }],
    maxTokens: 800,
    forceJsonObject: false,
  });

  return addChatPoolMessage({
    taskId: task.id,
    round: 0,
    phase: 'scout',
    actor: 'gpt-nano',
    model: 'gpt-5-nano',
    content,
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });
}

async function runWebScout(task: ScoutTask): Promise<ChatPoolMessage> {
  const startedAt = Date.now();
  const searchResult = await webSearch(`Best practices und bekannte Pitfalls für: ${task.goal}`);
  const content = searchResult.error
    ? `Search error: ${searchResult.error}`
    : searchResult.summary;

  return addChatPoolMessage({
    taskId: task.id,
    round: 0,
    phase: 'scout',
    actor: 'gemini',
    model: 'gemini-3-flash-preview',
    content,
    executionResults: {
      query: searchResult.query,
      error: searchResult.error ?? null,
    },
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });
}

export async function runScoutPhase(task: ScoutTask): Promise<ChatPoolMessage[]> {
  const messages: ChatPoolMessage[] = [];
  const graph = loadArchitectureGraph();
  const errorCards = await findRelevantErrorCards(task.goal, task.scope ?? []);
  const graphBriefing = generateGraphBriefing(graph, task.scope ?? []);
  const errorSection = errorCards.length === 0
    ? ''
    : `\n\nBEKANNTE FEHLER:\n${errorCards
        .map((card) => `  • ${card.id}: ${card.title} — ${card.solution}`)
        .join('\n')}`;

  const graphMessage = await addChatPoolMessage({
    taskId: task.id,
    round: 0,
    phase: 'scout',
    actor: 'graph',
    model: 'programmatic',
    content: `${graphBriefing}${errorSection}`,
    executionResults: {
      scope: task.scope ?? [],
      errorCardIds: errorCards.map((card) => card.id),
    },
    tokensUsed: 0,
    durationMs: 5,
  });
  messages.push(graphMessage);

  const scoutResults = await Promise.allSettled([
    runCodebaseScout(task),
    runPatternScout(task),
    runWebScout(task),
  ]);

  for (const result of scoutResults) {
    if (result.status === 'fulfilled') {
      messages.push(result.value);
      continue;
    }

    const failureMessage = await addChatPoolMessage({
      taskId: task.id,
      round: 0,
      phase: 'scout',
      actor: 'scout-error',
      model: 'system',
      content: `Scout failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      tokensUsed: 0,
      durationMs: 0,
    });
    messages.push(failureMessage);
  }

  return messages;
}