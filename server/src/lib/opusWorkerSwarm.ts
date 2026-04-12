import { desc, sql } from 'drizzle-orm';
import { parseBdl, type BdlCommand } from './builderBdlParser.js';
import { addChatPoolMessage } from './opusChatPool.js';
import { loadProjectDna } from './opusGraphIntegration.js';
import { callProvider } from './providers.js';
import { getDb } from '../db.js';
import { builderWorkerScores } from '../schema/builder.js';
import { getAllFromPool } from './poolState.js';
import { buildWorkerContext } from './memoryBus.js';
import { buildAgentBrief } from './agentHabitat.js';

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
const WORKER_MAX_TOKEN_CAP = 10000;

const WORKER_PRESETS: Record<string, WorkerPreset> = {
  deepseek: { actor: 'deepseek', provider: 'deepseek', model: 'deepseek-chat', maxTokens: 6000 },
  sonnet: { actor: 'sonnet', provider: 'anthropic', model: 'claude-sonnet-4-6', maxTokens: 6000 },
  gpt: { actor: 'gpt', provider: 'openai', model: 'gpt-5.4', maxTokens: 6000 },
  glm: { actor: 'glm', provider: 'zhipu', model: 'glm-5-turbo', maxTokens: 6000 },
  'glm-flash': { actor: 'glm-flash', provider: 'zhipu', model: 'glm-4.7-flashx', maxTokens: 6000 },
  grok: { actor: 'grok', provider: 'xai', model: 'grok-4-1-fast', maxTokens: 6000 },
  opus: { actor: 'opus', provider: 'anthropic', model: 'claude-opus-4-6', maxTokens: 6000 },
  minimax: { actor: 'minimax', provider: 'openrouter', model: 'minimax/minimax-m2.7', maxTokens: 6000 },
  qwen: { actor: 'qwen', provider: 'openrouter', model: 'qwen/qwen3.6-plus', maxTokens: 6000 },
  kimi: { actor: 'kimi', provider: 'openrouter', model: 'moonshotai/kimi-k2.5', maxTokens: 6000 },
  // Pool ID aliases (pool uses 'glm-turbo', preset uses 'glm', etc.)
  'glm-turbo': { actor: 'glm', provider: 'zhipu', model: 'glm-5-turbo', maxTokens: 6000 },
  'gpt-5.4': { actor: 'gpt', provider: 'openai', model: 'gpt-5.4', maxTokens: 6000 },
};

const MEISTER_COUNCIL: MeisterCouncilMember[] = [
  { actor: 'meister-opus', provider: 'anthropic', model: 'claude-opus-4-6', maxTokens: 6000 },
  { actor: 'meister-gpt', provider: 'openai', model: 'gpt-5.4', maxTokens: 6000 },
  { actor: 'meister-glm', provider: 'zhipu', model: 'glm-5-turbo', maxTokens: 6000 },
  { actor: 'meister-minimax', provider: 'openrouter', model: 'minimax/minimax-m2.7', maxTokens: 6000 },
  { actor: 'meister-deepseek-r', provider: 'deepseek', model: 'deepseek-reasoner', maxTokens: 6000 },
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

function extractRelevantScope(fileContent: string, hints: string): string {
  const lines = fileContent.split('\n');
  const totalLines = lines.length;
  if (totalLines <= 200) return '=== AKTUELLER DATEI-INHALT ===\n' + fileContent;

  const ranges: Array<[number, number]> = [];
  const addRange = (s: number, e: number) => {
    const cs = Math.max(0, s);
    const ce = Math.min(totalLines - 1, e);
    if (cs <= ce) ranges.push([cs, ce]);
  };

  // Immer: Imports (0-19) + Exports (letzte 10)
  addRange(0, 19);
  addRange(totalLines - 10, totalLines - 1);

  // 1. Zeilennummern aus hints ("Zeile 150", "line 150-160")
  const lineRx = /(?:Zeile|line|Line)\s*(\d+)(?:\s*[-–]\s*(\d+))?/gi;
  let m: RegExpExecArray | null;
  while ((m = lineRx.exec(hints)) !== null) {
    const start = parseInt(m[1], 10) - 1;
    const end = m[2] ? parseInt(m[2], 10) - 1 : start;
    addRange(start - 30, end + 30);
  }

  // 2. Code-Identifier (camelCase/PascalCase — require mixed case to filter natural language)
  const identRx = /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b|\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/g;
  const identifiers: string[] = [...(hints.match(identRx) || [])];

  // 3. Quoted strings
  const quotedRx = /['"`]([^'"`]{3,})['"`]/g;
  while ((m = quotedRx.exec(hints)) !== null) identifiers.push(m[1]);

  // Keyword-Search in Datei
  for (const kw of identifiers) {
    for (let i = 0; i < totalLines; i++) {
      if (lines[i].includes(kw)) {
        addRange(i - 30, i + 30);
      }
    }
  }

  // Merge overlapping/adjacent ranges (gap <=5)
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    if (merged.length === 0) {
      merged.push([...r]);
    } else {
      const last = merged[merged.length - 1];
      if (r[0] <= last[1] + 5) {
        last[1] = Math.max(last[1], r[1]);
      } else {
        merged.push([...r]);
      }
    }
  }

  // Fallback: nur Imports+Exports gefunden → zeige 60+40
  if (merged.length === 2 && merged[0][1] <= 19 && merged[1][0] >= totalLines - 10) {
    return [
      '=== AKTUELLER DATEI-INHALT (gekuerzt, kein Scope-Match) ===',
      '// --- ANFANG (Zeile 1-60) ---',
      lines.slice(0, 60).join('\n'),
      '',
      `// --- ENDE (Zeile ${totalLines - 39}-${totalLines}) ---`,
      lines.slice(-40).join('\n'),
    ].join('\n');
  }

  // Max ~200 Zeilen: Ranges beschneiden
  let totalSelected = merged.reduce((s, r) => s + (r[1] - r[0] + 1), 0);
  if (totalSelected > 200) {
    const limited: Array<[number, number]> = [];
    let count = 0;
    for (const r of merged) {
      const size = r[1] - r[0] + 1;
      if (count + size <= 200) {
        limited.push(r);
        count += size;
      } else {
        const remaining = 200 - count;
        if (remaining > 10) limited.push([r[0], r[0] + remaining - 1]);
        break;
      }
    }
    // Sicherstellen: Exports am Ende
    const lastLimited = limited[limited.length - 1];
    if (lastLimited && lastLimited[1] < totalLines - 10) {
      limited.push([totalLines - 10, totalLines - 1]);
    }
    merged.length = 0;
    merged.push(...limited);
  }

  // Output formatieren
  const out: string[] = ['=== AKTUELLER DATEI-INHALT (scope-basiert) ==='];
  for (const [s, e] of merged) {
    out.push(`// --- BEREICH (Zeile ${s + 1}-${e + 1}) ---`);
    out.push(lines.slice(s, e + 1).join('\n'));
    out.push('');
  }
  out.push(`// --- GESAMT: ${totalLines} Zeilen ---`);
  return out.join('\n');
}

function buildWorkerPrompt(
  taskGoal: string,
  assignment: WorkerAssignment,
  fileContent?: string,
  dependencyPatch?: { file: string; body: string },
  memoryContext?: string,
  agentBrief?: string,
): string {
  const isOpusOrSonnet = assignment.writer === 'opus' || assignment.writer === 'sonnet';
  const projectDna = isOpusOrSonnet ? loadProjectDna() : null;

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

  if (memoryContext) {
    sections.push('', '=== MEMORY-KONTEXT ===', memoryContext);
  }

  if (agentBrief) {
    sections.push('', '=== AGENT BRIEF ===', agentBrief);
  }

  if (projectDna) {
    sections.push('', '=== PROJECT DNA ===', projectDna);
  }

  if (fileContent) {
    const hints = [taskGoal, assignment?.reason].filter(Boolean).join(' ');
    sections.push('', extractRelevantScope(fileContent, hints));
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
    'Erforderliches Format: Nutze ausschliesslich das SEARCH/REPLACE-Format (BDL) fuer alle Aenderungen.',
    'Beispiel:',
    patchExample,
    '',
    'Antworte NUR mit dem PATCH-Format. Kein Fliesstext, keine Erklaerung.',
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
      const truncated = extractRelevantScope(content, taskGoal);
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

function isFullFileOverwritePatchBody(body: string): boolean {
  return body.startsWith('<<<SEARCH\n===REPLACE\n') || body.startsWith('<<<SEARCH\r\n===REPLACE\r\n');
}

function buildFullFilePatchBody(_previousContent: string | undefined, nextContent: string): string {
  return ['<<<SEARCH', '===REPLACE', nextContent, '>>>'].join('\n');
}

const KNOWN_WORKERS = new Set(Object.keys(WORKER_PRESETS));

function resolveWorkerName(params: Record<string, string>): string {
  // Direct match: @SCORE worker:deepseek
  if (params.worker && KNOWN_WORKERS.has(params.worker)) {
    return params.worker;
  }
  // Worker name might be in a positional arg: @SCORE deepseek quality:95
  for (const key of ['arg1', 'arg2']) {
    const val = params[key];
    if (val && KNOWN_WORKERS.has(val)) {
      return val;
    }
  }
  // If worker param exists but is not a known preset (e.g. "58"), check if
  // any positional arg is a known worker
  if (params.worker && !KNOWN_WORKERS.has(params.worker)) {
    // Maybe quality landed in worker field: @SCORE worker:58 deepseek ...
    for (const key of ['arg1', 'arg2', 'arg3']) {
      const val = params[key];
      if (val && KNOWN_WORKERS.has(val)) {
        return val;
      }
    }
  }
  // Fallback: return whatever was in worker, or unknown
  return params.worker || 'unknown';
}

function extractScores(commands: BdlCommand[]): MeisterScore[] {
  return commands
    .filter((command) => command.kind === 'SCORE')
    .map((command) => ({
      worker: resolveWorkerName(command.params),
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
  const protectedFullFilePatches = new Set<string>();

  for (const result of workerResults) {
    if (result.patch) {
      patchMap.set(result.patch.file, result.patch);
      if (isFullFileOverwritePatchBody(result.patch.body)) {
        protectedFullFilePatches.add(result.patch.file);
      }
    }
  }

  for (const response of responses.filter((item) => item.actor !== 'meister-opus')) {
    for (const repair of response.repairs) {
      if (protectedFullFilePatches.has(repair.file)) {
        continue;
      }
      patchMap.set(repair.file, repair);
    }
  }

  for (const response of responses.filter((item) => item.actor === 'meister-opus')) {
    for (const repair of response.repairs) {
      if (protectedFullFilePatches.has(repair.file)) {
        continue;
      }
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
    // Memory-Bus: Error Cards + Council-Begründung für diese Datei
    let memoryContext: string | undefined;
    try {
      memoryContext = await buildWorkerContext([assignment.file], assignment.reason);
      if (memoryContext && memoryContext.trim().length < 10) memoryContext = undefined;
    } catch (e) {
      console.warn('[worker-swarm] Memory context failed, continuing without:', e);
    }

    // Agent Brief: persistent profile + file experience
    let agentBrief: string | undefined;
    try {
      agentBrief = await buildAgentBrief(assignment.writer, taskGoal, [assignment.file]);
      if (agentBrief && agentBrief.includes('Erster Einsatz')) agentBrief = undefined; // Skip for new agents
    } catch (e) {
      console.warn('[worker-swarm] Agent brief failed, continuing without:', e);
    }

    const response = await callProvider(preset.provider, preset.model, {
      system: buildWorkerPrompt(taskGoal, assignment, fileContents?.[assignment.file], dependencyPatch, memoryContext, agentBrief),
      messages: [{ role: 'user', content: assignment.reason }],
      maxTokens: requestedMaxTokens,
      temperature: 0.2,
      forceJsonObject: false,
      thinking: preset.provider === 'zhipu' ? 'enabled' : undefined,
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

// ─── Worker Pool Remapping ───
// Ensures all worker assignments use models from the active worker pool.
// If an assigned writer is not in the pool, remap to a pool worker (round-robin).
function remapWorkersToPool(assignments: WorkerAssignment[]): WorkerAssignment[] {
  const poolModels = getAllFromPool('worker');
  if (poolModels.length === 0) {
    console.warn('[worker-swarm] No worker models in pool, using assignments as-is');
    return assignments;
  }

  const poolIds = new Set(poolModels.map((m) => m.id));
  let roundRobinIndex = 0;

  return assignments.map((assignment) => {
    // Check if the assigned writer is in the active pool
    if (poolIds.has(assignment.writer)) {
      return assignment;
    }

    // Also check preset aliases (e.g., 'glm' might map to pool 'glm-turbo')
    const presetToPool: Record<string, string> = { glm: 'glm-turbo', gpt: 'gpt-5.4' };
    const poolAlias = presetToPool[assignment.writer];
    if (poolAlias && poolIds.has(poolAlias)) {
      return { ...assignment, writer: poolAlias };
    }

    // Writer not in pool — remap via round-robin
    const replacement = poolModels[roundRobinIndex % poolModels.length]!;
    roundRobinIndex += 1;
    console.log(`[worker-swarm] Remapped writer '${assignment.writer}' → '${replacement.id}' (not in active pool)`);
    return { ...assignment, writer: replacement.id };
  });
}

export async function runWorkerSwarm(
  taskId: string,
  assignments: WorkerAssignment[],
  taskGoal: string,
  fileContents?: Record<string, string>,
): Promise<WorkerResult[]> {
  // Remap workers to active pool — ensures only pool-selected models are used
  const pooledAssignments = remapWorkersToPool(assignments);
  const independentAssignments = pooledAssignments.filter((assignment) => !assignment.dependsOn);
  const dependentAssignments = pooledAssignments.filter((assignment) => assignment.dependsOn);

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

export async function getWorkerRanking(): Promise<Array<{ worker: string; avgScore: number; taskCount: number }>> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        worker: builderWorkerScores.worker,
        avgScore: sql<number>`round(avg(${builderWorkerScores.quality})::numeric, 1)`,
        taskCount: sql<number>`count(*)`,
      })
      .from(builderWorkerScores)
      .groupBy(builderWorkerScores.worker)
      .orderBy(desc(sql`avg(${builderWorkerScores.quality})`));

    return rows.map((r) => ({
      worker: r.worker,
      avgScore: Number(r.avgScore) || 0,
      taskCount: Number(r.taskCount) || 0,
    }));
  } catch (err) {
    console.error('[getWorkerRanking] failed:', err);
    return [];
  }
}

export function getRecommendedWriter(complexity: string): string {
  const map: Record<string, string[]> = {
    trivial: ['deepseek', 'glm'],
    simple: ['minimax', 'glm', 'deepseek'],
    medium: ['glm', 'minimax'],
    complex: ['opus'],
  };
  const candidates = map[complexity] || ['minimax'];
  // Round-robin via timestamp to distribute load
  return candidates[Math.floor(Date.now() / 1000) % candidates.length];
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