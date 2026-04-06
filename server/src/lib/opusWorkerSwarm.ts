import { parseBdl, type BdlCommand } from './builderBdlParser.js';
import { addChatPoolMessage } from './opusChatPool.js';
import { loadProjectDna } from './opusGraphIntegration.js';
import { callProvider } from './providers.js';

interface WorkerPreset {
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

const WORKER_PRESETS: Record<string, WorkerPreset> = {
  deepseek: { actor: 'deepseek', provider: 'deepseek', model: 'deepseek-chat', maxTokens: 1800 },
  sonnet: { actor: 'sonnet', provider: 'anthropic', model: 'claude-sonnet-4-6', maxTokens: 2200 },
  gpt: { actor: 'gpt', provider: 'openai', model: 'gpt-5.4', maxTokens: 1800 },
  glm: { actor: 'glm', provider: 'zhipu', model: 'glm-5-turbo', maxTokens: 1800 },
  grok: { actor: 'grok', provider: 'xai', model: 'grok-4-1-fast', maxTokens: 1800 },
  opus: { actor: 'opus', provider: 'anthropic', model: 'claude-opus-4-6', maxTokens: 2500 },
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
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
    'ANTWORTE NUR IN BDL.',
    'Genau ein @PATCH fuer deine Datei. Kein Fliesstext.',
    `@PATCH file:"${assignment.file}"`,
    '<<<SEARCH',
    '===REPLACE',
    '[vollstaendiger Datei-Inhalt oder gezielter Replace-Block]',
    '>>>',
  );

  return sections.join('\n');
}

function buildMeisterPrompt(taskGoal: string, workerResults: WorkerResult[]): string {
  const projectDna = loadProjectDna();
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
    'Antwort nur in BDL, kein Fliesstext.',
    '',
    `TASK-ZIEL: ${taskGoal}`,
  ];

  if (projectDna) {
    sections.push('', '=== PROJECT DNA ===', projectDna);
  }

  sections.push('', '=== WORKER-ERGEBNISSE ===', workerSummary);
  sections.push(
    '',
    'FORMAT:',
    '@SCORE worker:<writer> quality:<0-100> notes:"Kurzbegruendung"',
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

function extractScores(commands: BdlCommand[]): MeisterScore[] {
  return commands
    .filter((command) => command.kind === 'SCORE')
    .map((command) => ({
      worker: command.params.worker || 'unknown',
      quality: Number.parseInt(command.params.quality || '0', 10) || 0,
      notes: command.params.notes || command.params.reason || '',
    }));
}

async function runSingleWorker(
  taskId: string,
  assignment: WorkerAssignment,
  taskGoal: string,
  fileContents?: Record<string, string>,
  dependencyPatch?: { file: string; body: string },
): Promise<WorkerResult> {
  const preset = WORKER_PRESETS[assignment.writer] ?? WORKER_PRESETS.deepseek;
  const startedAt = Date.now();

  try {
    const response = await callProvider(preset.provider, preset.model, {
      system: buildWorkerPrompt(taskGoal, assignment, fileContents?.[assignment.file], dependencyPatch),
      messages: [{ role: 'user', content: assignment.reason }],
      maxTokens: preset.maxTokens,
      temperature: 0.2,
      forceJsonObject: false,
    });

    const commands = parseBdl(response);
    const patch = extractPatchForAssignment(commands, assignment);
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

export async function runMeisterValidation(
  taskId: string,
  taskGoal: string,
  workerResults: WorkerResult[],
): Promise<MeisterResult> {
  const startedAt = Date.now();
  const response = await callProvider('anthropic', 'claude-opus-4-6', {
    system: buildMeisterPrompt(taskGoal, workerResults),
    messages: [{ role: 'user', content: 'Pruefe die Worker-Ergebnisse und antworte nur in BDL.' }],
    maxTokens: 2500,
    temperature: 0.2,
    forceJsonObject: false,
  });

  const commands = parseBdl(response);
  const scores = extractScores(commands);
  const repairs = commands
    .filter((command) => command.kind === 'PATCH' && command.params.file && command.body)
    .map((command) => ({ file: command.params.file, body: command.body as string }));

  const validatedPatchMap = new Map<string, { file: string; body: string }>();
  for (const result of workerResults) {
    if (result.patch) {
      validatedPatchMap.set(result.patch.file, result.patch);
    }
  }
  for (const repair of repairs) {
    validatedPatchMap.set(repair.file, repair);
  }

  const tokensUsed = estimateTokens(response);

  await addChatPoolMessage({
    taskId,
    round: 2,
    phase: 'roundtable',
    actor: 'meister-opus',
    model: 'claude-opus-4-6',
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
    validatedPatches: [...validatedPatchMap.values()],
    scores,
    repairs,
    tokensUsed,
  };
}