import { parseBdl, type BdlCommand } from './builderBdlParser.js';
import { addChatPoolMessage } from './opusChatPool.js';
import { loadProjectDna } from './opusGraphIntegration.js';
import { callProvider } from './providers.js';
import { getDb } from '../db.js';
import { builderWorkerScores } from '../schema/builder.js';

interface WorkerPreset {
  actor: string;
  provider: string;
  model: string;
  maxTokens: number;
}

interface MeisterCouncilMember {
  actor: string;
  provider: string;
  model: string;
  maxTokens: number;
}

export interface WorkerAssignment {
  file: string;
  writer: string;
  reason: string;
  dependsOn?: string;
}

export interface WorkerResult {
  assignment: WorkerAssignment;
  patch?: { file: string; body: string };
  error?: string;
  durationMs: number;
  tokensUsed: number;
}

export interface MeisterScore {
  worker: string;
  quality: number;
  notes: string;
}

export interface MeisterResult {
  validatedPatches: Array<{ file: string; body: string }>;
  scores: MeisterScore[];
  repairs: Array<{ file: string; body: string }>;
  tokensUsed: number;
}

interface MeisterCouncilResponse {
  actor: string;
  model: string;
  commands: BdlCommand[];
  scores: MeisterScore[];
  repairs: Array<{ file: string; body: string }>;
  tokensUsed: number;
}

const FILE_START_MARKER = '---FILE_START---';
const FILE_END_MARKER = '---FILE_END---';
const WORKER_TOKEN_HEADROOM = 900;
const WORKER_MAX_TOKEN_CAP = 7000;

const WORKER_PRESETS: Record<string, WorkerPreset> = {
  deepseek: { actor: 'deepseek', provider: 'deepseek', model: 'deepseek-chat', maxTokens: 1800 },
  sonnet: { actor: 'sonnet', provider: 'anthropic', model: 'claude-sonnet-4-6', maxTokens: 2200 },
  gpt: { actor: 'gpt', provider: 'openai', model: 'gpt-5.4', maxTokens: 1800 },
  glm: { actor: 'glm', provider: 'zhipu', model: 'glm-5-turbo', maxTokens: 1800 },
  'glm-flash': { actor: 'glm-flash', provider: 'zhipu', model: 'glm-4.7-flash', maxTokens: 1600 },
  grok: { actor: 'grok', provider: 'xai', model: 'grok-4-1-fast', maxTokens: 1800 },
  opus: { actor: 'opus', provider: 'anthropic', model: 'claude-opus-4-6', maxTokens: 2500 },
  minimax: { actor: 'minimax', provider: 'openrouter', model: 'minimax/minimax-m2.7', maxTokens: 1800 },
  qwen: { actor: 'qwen', provider: 'openrouter', model: 'qwen/qwen3.6-plus', maxTokens: 1800 },
  kimi: { actor: 'kimi', provider: 'openrouter', model: 'moonshotai/kimi-k2.5', maxTokens: 1800 },
};

const MEISTER_COUNCIL: MeisterCouncilMember[] = [
  { actor: 'meister-opus', provider: 'anthropic', model: 'claude-opus-4-6', maxTokens: 2500 },
  { actor: 'meister-gpt', provider: 'openai', model: 'gpt-5.4', maxTokens: 2000 },
  { actor: 'meister-glm', provider: 'zhipu', model: 'glm-5-turbo', maxTokens: 1800 },
  { actor: 'meister-minimax', provider: 'openrouter', model: 'minimax/minimax-m2.7', maxTokens: 1800 },
];

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function resolveWorkerMaxTokens(
  preset: WorkerPreset,
  fileContent?: string,
  dependencyPatch?: { file: string; body: string },
): number {
  const estimatedOutputTokens = estimateTokens(fileContent ?? '');
  const dependencyTokens = estimateTokens(dependencyPatch?.body ?? '');
  const suggestedTokens = estimatedOutputTokens + dependencyTokens + WORKER_TOKEN_HEADROOM;

  return Math.min(
    WORKER_MAX_TOKEN_CAP,
    Math.max(preset.maxTokens, suggestedTokens),
  );
}

function normalizeAssignmentReason(value: string | undefined): string {
  return value?.trim() || 'Kein Grund angegeben';
}

function buildWorkerPrompt(
  taskGoal: string,
  assignment: WorkerAssignment,
  fileContent?: string,
  dependencyPatch?: { file: string; body: string },
): string {
  const projectDna = loadProjectDna();
  const fullFileExample = [
    FILE_START_MARKER,
    'export const value = newCall();',
    FILE_END_MARKER,
  ].join('\n');
  const patchExample = [
    `@PATCH file:"${assignment.file}"`,
    '<<<SEARCH',
    'const value = oldCall();',
    '===REPLACE',
    'const value = newCall();',
    '>>>',
  ].join('\n');
  const sections = [
    'Du bist ein Worker im Opus Worker-Swarm.',
    'Arbeite nur an deiner zugewiesenen Datei.',
    'Erfinde keine weiteren Dateien und aendere keinen Scope.',
    '',
    `TASK-ZIEL: ${taskGoal}`,
    `DATEI: ${assignment.file}`,
    `WRITER: ${assignment.writer}`,
    `GRUND: ${assignment.reason}`,
  ];

  if (assignment.dependsOn) {
    sections.push(`ABHAENGIGKEIT: ${assignment.dependsOn}`);
  }

  if (projectDna) {
    sections.push('', '=== PROJECT DNA ===', projectDna);
  }

  if (fileContent) {
    sections.push('', '=== AKTUELLER DATEI-INHALT ===', fileContent);
  }

  if (dependencyPatch) {
    sections.push(
      '',
      `=== ABHAENGIGKEITS-KONTEXT (${dependencyPatch.file}) ===`,
      dependencyPatch.body,
    );
  }

  sections.push(
    '',
    'BEVORZUGTES FORMAT: Gib den vollstaendigen neuen Datei-Inhalt zwischen den Markern aus. Kein Fliesstext, keine Erklaerung.',
    'Beispiel fuer das bevorzugte Format:',
    fullFileExample,
    '',
    'Falls dein Modell SEARCH/REPLACE sicher beherrscht, ist auch dieses BDL-Format erlaubt:',
    patchExample,
    '',
    'Antworte jetzt nur mit einem der beiden Formate. Bevorzugt ist der vollstaendige Datei-Inhalt mit Markern.',
  );

  return sections.join('\n');
}

function buildMeisterPrompt(
  taskGoal: string,
  workerResults: WorkerResult[],
  fileContents?: Record<string, string>,
): string {
  const projectDna = loadProjectDna();
  const firstWorker = workerResults[0]?.assignment.writer || 'worker-a';
  const secondWorker = workerResults[1]?.assignment.writer || 'worker-b';
  const meisterExample = [
    `@SCORE worker:${firstWorker} quality:95 notes:"korrekt"`,
    `@SCORE worker:${secondWorker} quality:82 notes:"kleiner Fix noetig"`,
    '@PATCH file:"server/src/example.ts"',
    '<<<SEARCH',
    'return oldValue;',
    '===REPLACE',
    'return newValue;',
    '>>>',
  ].join('\n');
  const workerSummary = workerResults.map((result) => {
    const header = `[${result.assignment.writer}] ${result.assignment.file}`;
    if (result.error) {
      return `${header}\nERROR: ${result.error}`;
    }
    return `${header}\nPATCH:\n${result.patch?.body ?? '(kein Patch)'}`;
  }).join('\n\n');

  const sections = [
    'Du bist der Meister-Validator fuer den Worker-Swarm.',
    'Pruefe ob die Worker-Patches zusammenpassen.',
    'Gib fuer jeden Worker genau einen @SCORE aus.',
    'Wenn du Reparaturen brauchst, schreibe zusaetzliche @PATCH-Bloecke.',
    'WICHTIG: Deine SEARCH-Bloecke muessen EXAKT zum aktuellen Datei-Inhalt passen (siehe AKTUELLE DATEIEN unten).',
    'SEI KURZ. Antwort nur in BDL, kein Fliesstext.',
    'Wenn kein Repair noetig ist, antworte nur mit den @SCORE-Zeilen.',
    '',
    `TASK-ZIEL: ${taskGoal}`,
  ];

  if (projectDna) {
    sections.push('', '=== PROJECT DNA ===', projectDna);
  }

  if (fileContents && Object.keys(fileContents).length > 0) {
    sections.push('', '=== AKTUELLE DATEIEN (vor Worker-Patches) ===');
    for (const [filePath, content] of Object.entries(fileContents)) {
      const truncated = content.length > 5000 ? `${content.slice(0, 5000)}\n... (truncated)` : content;
      sections.push(`\n[FILE: ${filePath}]\n${truncated}`);
    }
  }

  sections.push('', '=== WORKER-ERGEBNISSE ===', workerSummary);
  sections.push(
    '',
    'FORMAT-BEISPIEL:',
    meisterExample,
    '',
    'REGELN:',
    '@SCORE worker:<writer> quality:<0-100> notes:"Kurzbegruendung"',
    'Nur wenn wirklich noetig: @PATCH file:"..." + SEARCH/REPLACE.',
    '@PATCH file:"..."',
    '<<<SEARCH',
    '===REPLACE',
    '[reparierter Patch]',
    '>>>',
  );

  return sections.join('\n');
}

function extractPatchForAssignment(commands: BdlCommand[], assignment: WorkerAssignment) {
  const directPatch = commands.find((command) =>
    command.kind === 'PATCH' &&
    command.params.file === assignment.file &&
    typeof command.body === 'string' &&
    command.body.trim().length > 0,
  );

  if (directPatch?.body) {
    return { file: assignment.file, body: directPatch.body };
  }

  const firstPatch = commands.find((command) =>
    command.kind === 'PATCH' &&
    typeof command.params.file === 'string' &&
    typeof command.body === 'string' &&
    command.body.trim().length > 0,
  );

  if (!firstPatch?.body || !firstPatch.params.file) {
    return undefined;
  }

  return { file: firstPatch.params.file, body: firstPatch.body };
}

function extractMarkedFullFileContent(response: string): string | null {
  const startIndex = response.indexOf(FILE_START_MARKER);
  const endIndex = response.indexOf(FILE_END_MARKER);

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return null;
  }

  const content = response
    .slice(startIndex + FILE_START_MARKER.length, endIndex)
    .replace(/^\r?\n/, '')
    .replace(/\r?\n$/, '');

  return content.trim().length > 0 ? content : '';
}

function buildFullFilePatchBody(_previousContent: string | undefined, nextContent: string): string {
  return ['<<<SEARCH', '', '===REPLACE', nextContent, '>>>'].join('\n');
}

function extractScores(commands: BdlCommand[]): MeisterScore[] {
  return commands
    .filter((command) => command.kind === 'SCORE')
    .map((command) => ({
      worker: command.params.worker || 'unknown',
      quality: Number.parseInt(command.params.quality || '0', 10) || 0,
      notes: command.params.notes || command.params.reason || '',
    }));
}

async function runSingleMeister(
  taskId: string,
  member: MeisterCouncilMember,
  taskGoal: string,
  workerResults: WorkerResult[],
  fileContents?: Record<string, string>,
): Promise<MeisterCouncilResponse> {
  const startedAt = Date.now();
  const response = await callProvider(member.provider, member.model, {
    system: buildMeisterPrompt(taskGoal, workerResults, fileContents),
    messages: [{ role: 'user', content: 'Pruefe die Worker-Ergebnisse und antworte nur in BDL.' }],
    maxTokens: member.maxTokens,
    temperature: 0.2,
    forceJsonObject: false,
  });

  const commands = parseBdl(response);
  const scores = extractScores(commands);
  const repairs = commands
    .filter((command) => command.kind === 'PATCH' && command.params.file && command.body)
    .map((command) => ({ file: command.params.file, body: command.body as string }));
  const tokensUsed = estimateTokens(response);

  await addChatPoolMessage({
    taskId,
    round: 2,
    phase: 'roundtable',
    actor: member.actor,
    model: member.model,
    content: response,
    commands,
    executionResults: {
      scoreCount: scores.length,
      repairCount: repairs.length,
    },
    tokensUsed,
    durationMs: Date.now() - startedAt,
  });

  return {
    actor: member.actor,
    model: member.model,
    commands,
    scores,
    repairs,
    tokensUsed,
  };
}

function averageCouncilScores(responses: MeisterCouncilResponse[]): MeisterScore[] {
  const grouped = new Map<string, { qualities: number[]; notes: string[] }>();

  for (const response of responses) {
    for (const score of response.scores) {
      const entry = grouped.get(score.worker) ?? { qualities: [], notes: [] };
      entry.qualities.push(score.quality);
      if (score.notes) {
        entry.notes.push(`[${response.actor}] ${score.notes}`);
      }
      grouped.set(score.worker, entry);
    }
  }

  return [...grouped.entries()].map(([worker, entry]) => ({
    worker,
    quality: Math.round(entry.qualities.reduce((sum, value) => sum + value, 0) / Math.max(1, entry.qualities.length)),
    notes: entry.notes.join(' | '),
  }));
}

function mergeCouncilRepairs(
  workerResults: WorkerResult[],
  responses: MeisterCouncilResponse[],
): Array<{ file: string; body: string }> {
  const patchMap = new Map<string, { file: string; body: string }>();

  for (const result of workerResults) {
    if (result.patch) {
      patchMap.set(result.patch.file, result.patch);
    }
  }

  for (const response of responses.filter((item) => item.actor !== 'meister-opus')) {
    for (const repair of response.repairs) {
      patchMap.set(repair.file, repair);
    }
  }

  for (const response of responses.filter((item) => item.actor === 'meister-opus')) {
    for (const repair of response.repairs) {
      patchMap.set(repair.file, repair);
    }
  }

  return [...patchMap.values()];
}

async function runSingleWorker(
  taskId: string,
  assignment: WorkerAssignment,
  taskGoal: string,
  fileContents?: Record<string, string>,
  dependencyPatch?: { file: string; body: string },
): Promise<WorkerResult> {
  const preset = WORKER_PRESETS[assignment.writer] ?? WORKER_PRESETS.deepseek;
  const requestedMaxTokens = resolveWorkerMaxTokens(
    preset,
    fileContents?.[assignment.file],
    dependencyPatch,
  );
  const startedAt = Date.now();

  try {
    const response = await callProvider(preset.provider, preset.model, {
      system: buildWorkerPrompt(taskGoal, assignment, fileContents?.[assignment.file], dependencyPatch),
      messages: [{ role: 'user', content: assignment.reason }],
      maxTokens: requestedMaxTokens,
      temperature: 0.2,
      forceJsonObject: false,
    });

    const fullFileContent = extractMarkedFullFileContent(response);
    const commands = fullFileContent === null ? parseBdl(response) : [];
    const patch = fullFileContent !== null
      ? {
          file: assignment.file,
          body: buildFullFilePatchBody(fileContents?.[assignment.file], fullFileContent),
        }
      : extractPatchForAssignment(commands, assignment);
    const tokensUsed = estimateTokens(response);
    const durationMs = Date.now() - startedAt;

    await addChatPoolMessage({
      taskId,
      round: 1,
      phase: 'roundtable',
      actor: `worker-${preset.actor}`,
      model: preset.model,
      content: response,
      commands,
      executionResults: {
        file: assignment.file,
        writer: assignment.writer,
        hasPatch: Boolean(patch),
        responseFormat: fullFileContent !== null ? 'full-file' : 'bdl',
        requestedMaxTokens,
      },
      tokensUsed,
      durationMs,
    });

    return {
      assignment,
      patch,
      durationMs,
      tokensUsed,
      ...(patch ? {} : { error: 'Worker returned no @PATCH body' }),
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);

    await addChatPoolMessage({
      taskId,
      round: 1,
      phase: 'roundtable',
      actor: `worker-${preset.actor}`,
      model: preset.model,
      content: `Worker failed: ${message}`,
      executionResults: {
        file: assignment.file,
        writer: assignment.writer,
        failed: true,
        requestedMaxTokens,
      },
      tokensUsed: 0,
      durationMs,
    });

    return {
      assignment,
      error: message,
      durationMs,
      tokensUsed: 0,
    };
  }
}

export function parseAssignments(commands: BdlCommand[]): WorkerAssignment[] {
  return commands
    .filter((command) => command.kind === 'ASSIGN' && typeof command.params.file === 'string')
    .map((command) => ({
      file: command.params.file,
      writer: command.params.writer || 'deepseek',
      reason: normalizeAssignmentReason(command.params.reason),
      ...(command.params.depends_on ? { dependsOn: command.params.depends_on } : {}),
    }));
}

export async function runWorkerSwarm(
  taskId: string,
  assignments: WorkerAssignment[],
  taskGoal: string,
  fileContents?: Record<string, string>,
): Promise<WorkerResult[]> {
  const independentAssignments = assignments.filter((assignment) => !assignment.dependsOn);
  const dependentAssignments = assignments.filter((assignment) => assignment.dependsOn);

  const independentResults = await Promise.allSettled(
    independentAssignments.map((assignment) => runSingleWorker(taskId, assignment, taskGoal, fileContents)),
  );

  const results: WorkerResult[] = independentResults.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : {
          assignment: independentAssignments[index],
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          durationMs: 0,
          tokensUsed: 0,
        },
  );

  for (const assignment of dependentAssignments) {
    const dependencyResult = results.find((result) => result.assignment.file === assignment.dependsOn);
    const dependentResult = await runSingleWorker(
      taskId,
      assignment,
      taskGoal,
      fileContents,
      dependencyResult?.patch,
    );
    results.push(dependentResult);
  }

  return results;
}

export async function saveWorkerScores(
  taskId: string,
  scores: Array<{ worker: string; quality: number; notes?: string }>,
): Promise<void> {
  if (!scores || scores.length === 0) {
    return;
  }

  try {
    const db = getDb();
    for (const score of scores) {
      await db.insert(builderWorkerScores).values({
        taskId,
        worker: score.worker,
        quality: Math.max(0, Math.min(100, score.quality)),
        notes: score.notes ?? null,
      });
    }
  } catch (err) {
    console.error('[saveWorkerScores] failed:', err);
  }
}

export async function runMeisterValidation(
  taskId: string,
  taskGoal: string,
  workerResults: WorkerResult[],
  fileContents?: Record<string, string>,
): Promise<MeisterResult> {
  const settledResponses = await Promise.allSettled(
    MEISTER_COUNCIL.map((member) => runSingleMeister(taskId, member, taskGoal, workerResults, fileContents)),
  );

  const responses = settledResponses
    .filter((item): item is PromiseFulfilledResult<MeisterCouncilResponse> => item.status === 'fulfilled')
    .map((item) => item.value);

  if (responses.length === 0) {
    throw new Error('All meister council members failed');
  }

  const scores = averageCouncilScores(responses);
  const validatedPatches = mergeCouncilRepairs(workerResults, responses);
  const repairs = mergeCouncilRepairs([], responses);
  const tokensUsed = responses.reduce((sum, response) => sum + response.tokensUsed, 0);

  return {
    validatedPatches,
    scores,
    repairs,
    tokensUsed,
  };
}