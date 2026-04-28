import { callProvider } from './providers.js';
import { webSearch } from './builderSearch.js';
import { addChatPoolMessage, type ChatPoolMessage } from './opusChatPool.js';
import {
  findRelevantErrorCards,
  generateGraphBriefing,
  loadArchitectureGraph,
  loadProjectDna,
} from './opusGraphIntegration.js';
import { getAllFromPool, type ResolvedModel } from './poolState.js';
import { buildTeamAwarenessBrief } from './builderTeamAwareness.js';

export interface ScoutTask {
  id: string;
  goal: string;
  scope?: string[];
}

/** The raw scout outputs before distillation */
export interface ScoutPhaseResult {
  messages: ChatPoolMessage[];
  /** Concatenated scout content for the distiller */
  rawOutputs: Array<{ actor: string; model: string; focus: string; content: string }>;
  graphBriefing: string;
  errorSection: string;
}

// ─── Scout Focus Roles ───
const SCOUT_FOCUSES = [
  {
    key: 'codebase',
    actor: 'scout-code',
    system: (goal: string) =>
      `Du bist der Codebase-Scout. Dein Job: Durchsuche das Repo und liefere eine Uebersicht.
Task: ${goal}
Liefere:
1) RELEVANTE DATEIEN — Pfade + Zeilennummern
2) AEHNLICHE IMPLEMENTIERUNGEN — wo existiert aehnlicher Code
3) PATTERNS/KONVENTIONEN — wie macht der Code es bisher
4) ZU AENDERNDE DATEIEN — was muss angefasst werden
Kein Code schreiben, nur recherchieren. Maximal 600 Woerter.`,
    maxTokens: 1500,
  },
  {
    key: 'pattern',
    actor: 'scout-pattern',
    system: (goal: string) =>
      `Du bist der Pattern-Scout. Analysiere Muster und Risiken.
Task: ${goal}
Liefere:
1) CODE-KONVENTIONEN — Naming, Struktur, Import-Muster
2) DUPLIKAT-RISIKEN — wo koennte doppelter Code entstehen
3) EDGE-CASES — was koennte schiefgehen
4) KOMPLEXITAET — einfach/mittel/komplex mit Begruendung
Kein Code schreiben, nur analysieren. Maximal 500 Woerter.`,
    maxTokens: 800,
  },
  {
    key: 'risk',
    actor: 'scout-risk',
    system: (goal: string) =>
      `Du bist der Risiko-Scout. Pruefe Gefahren und Abhaengigkeiten.
Task: ${goal}
Liefere:
1) ABHAENGIGKEITEN — welche Dateien haengen voneinander ab
2) BREAKING RISKS — was koennte bei der Aenderung brechen
3) TEST-COVERAGE — welche Tests existieren, welche fehlen
4) EMPFEHLUNG — 1-2 Saetze zum sichersten Ansatz
Kein Code schreiben, nur bewerten. Maximal 400 Woerter.`,
    maxTokens: 800,
  },
];

function buildPromptWithContext(basePrompt: string, graphBriefing?: string, teamBriefing?: string): string {
  const projectDna = loadProjectDna();
  const sections = [];

  if (projectDna) {
    sections.push(projectDna);
  }

  if (graphBriefing?.trim()) {
    sections.push(
      [
        '=== REPO-KONTEXT (Architecture Graph) ===',
        'Referenziere NUR Dateien die im Architecture Graph oder in der Project DNA erwaehnt werden. Erfinde keine Pfade.',
        graphBriefing.trim(),
      ].join('\n'),
    );
  }

  if (teamBriefing?.trim()) {
    sections.push(teamBriefing.trim());
  }

  sections.push(basePrompt);
  return sections.join('\n\n');
}

async function runSingleScout(
  task: ScoutTask,
  model: ResolvedModel,
  focus: typeof SCOUT_FOCUSES[number],
  graphBriefing: string,
): Promise<ChatPoolMessage> {
  const startedAt = Date.now();
  const teamBriefing = await buildTeamAwarenessBrief({
      role: 'scout',
      actorId: model.id,
      taskGoal: task.goal,
      scope: task.scope ?? [],
    }, { compact: true });
  const content = await callProvider(model.provider, model.model, {
    system: buildPromptWithContext(focus.system(task.goal), graphBriefing, teamBriefing),
    messages: [{ role: 'user', content: task.goal }],
    maxTokens: focus.maxTokens,
    forceJsonObject: false,
  });

  return addChatPoolMessage({
    taskId: task.id,
    round: 0,
    phase: 'scout',
    actor: focus.actor,
    model: model.model,
    content,
    executionResults: { poolId: model.id, focus: focus.key },
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });
}

async function runWebScout(task: ScoutTask): Promise<ChatPoolMessage> {
  const startedAt = Date.now();
  const searchResult = await webSearch(`Best practices und bekannte Pitfalls fuer: ${task.goal}`);
  const content = searchResult.error
    ? `Search error: ${searchResult.error}`
    : searchResult.summary;

  return addChatPoolMessage({
    taskId: task.id,
    round: 0,
    phase: 'scout',
    actor: 'scout-web',
    model: 'web-search',
    content,
    executionResults: {
      query: searchResult.query,
      error: searchResult.error ?? null,
    },
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  });
}

export async function runScoutPhase(task: ScoutTask): Promise<ScoutPhaseResult> {
  const messages: ChatPoolMessage[] = [];
  const rawOutputs: ScoutPhaseResult['rawOutputs'] = [];

  // 1. Graph + Error Cards (programmatic, always runs)
  const graph = loadArchitectureGraph();
  const errorCards = await findRelevantErrorCards(task.goal, task.scope ?? []);
  const graphBriefing = generateGraphBriefing(graph, task.scope ?? []);
  const errorSection = errorCards.length === 0
    ? ''
    : `\n\nBEKANNTE FEHLER:\n${errorCards
        .map((card) => `  - ${card.id}: ${card.title} -- ${card.solution}`)
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
  rawOutputs.push({
    actor: 'graph',
    model: 'programmatic',
    focus: 'graph',
    content: graphMessage.content,
  });

  // 2. Get active scout models from pool
  const scoutModels = getAllFromPool('scout');
  if (scoutModels.length === 0) {
    console.warn('[scout] No scout models in pool, using fallback');
    scoutModels.push(
      { id: 'glm-flash', provider: 'openrouter', model: 'z-ai/glm-4.7-flash' },
      { id: 'deepseek-scout', provider: 'deepseek', model: 'deepseek-chat' },
    );
  }

  // 3. Assign focus roles to scout models (round-robin)
  const scoutPromises: Promise<ChatPoolMessage>[] = [];
  for (let i = 0; i < scoutModels.length; i++) {
    const focus = SCOUT_FOCUSES[i % SCOUT_FOCUSES.length]!;
    scoutPromises.push(runSingleScout(task, scoutModels[i]!, focus, graphBriefing));
  }

  // 4. Web scout always runs (free, no pool model needed)
  scoutPromises.push(runWebScout(task));

  // 5. Run all in parallel
  const scoutResults = await Promise.allSettled(scoutPromises);

  for (const result of scoutResults) {
    if (result.status === 'fulfilled') {
      messages.push(result.value);
      rawOutputs.push({
        actor: result.value.actor,
        model: result.value.model,
        focus: (result.value.executionResults as Record<string, string>)?.focus ?? 'web',
        content: result.value.content,
      });
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

  console.log(`[scout] Phase complete: ${scoutModels.length} pool scouts + web scout, ${messages.length} messages total`);

  return { messages, rawOutputs, graphBriefing, errorSection };
}
