import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { convertBdlPatchesToPayload, triggerGithubAction } from './builderGithubBridge.js';
import { getDb } from '../db.js';
import { checkBudget, getSessionState, recordTaskUsage } from './opusBudgetGate.js';
import { generateErrorCard } from './opusErrorLearning.js';
import { findRelevantErrorCards, updateGraphAfterTask } from './opusGraphIntegration.js';
import { getChatPoolForTask } from './opusChatPool.js';
import { buildBuilderMemoryContext, syncBuilderMemoryForTask } from './builderMemory.js';
import { buildCouncilContext, buildDistillerContext, buildWorkerContext } from './memoryBus.js';
import {
  determineCrushIntensity,
  runAmbientCrush,
  runCaseCrush,
  type AmbientCrushResult,
  type CaseCrushResult,
  type CrushIntensity,
} from './opusPulseCrush.js';
import { runScoutPhase } from './opusScoutRunner.js';
import { runDistiller } from './opusDistiller.js';
import { getAllFromPool, pickFromPool } from './poolState.js';
import { callProvider } from './providers.js';
import {
  DEFAULT_ROUNDTABLE_CONFIG,
  runRoundtable,
  validatePatch,
  type PatchValidation,
  type RoundtableParticipant,
  type RoundtableConfig,
  type RoundtableAssignment,
  type RoundModerator,
} from './opusRoundtable.js';
import {
  runWorkerSwarm,
  runMeisterValidation,
  saveWorkerScores,
  type WorkerAssignment,
} from './opusWorkerSwarm.js';
import { decompose } from './opusDecomposer.js';
import { builderOpusLog, builderTasks } from '../schema/builder.js';

const CODE_WRITER_PRESETS: Record<string, RoundtableParticipant> = {
  opus: {
    actor: 'opus', model: 'claude-opus-4-6', provider: 'anthropic',
    strengths: 'Architektur, Systemdesign, komplexe Logik, saubere Abstraktionen',
    maxTokensPerRound: 2500,
  },
  sonnet: {
    actor: 'sonnet', model: 'claude-sonnet-4-6', provider: 'anthropic',
    strengths: 'Schneller Code-Schreiber, gutes Kosten-Leistungs-Verhaeltnis',
    maxTokensPerRound: 2500,
  },
  gpt: {
    actor: 'gpt-5.4', model: 'gpt-5.4', provider: 'openai',
    strengths: 'Edge-Cases, Fehlersuche, alternative Ansaetze',
    maxTokensPerRound: 2000,
  },
  glm: {
    actor: 'glm-turbo', model: 'glm-5-turbo', provider: 'zhipu',
    strengths: 'Agent-optimiert, niedrigste Tool-Error Rate',
    maxTokensPerRound: 1500,
  },
  grok: {
    actor: 'grok', model: 'grok-4-1-fast', provider: 'xai',
    strengths: 'Schnell und guenstig, guter Code-Scout',
    maxTokensPerRound: 1500,
  },
  deepseek: {
    actor: 'deepseek', model: 'deepseek-chat', provider: 'deepseek',
    strengths: 'Sehr guenstig, gutes Reasoning fuer Standard-Tasks',
    maxTokensPerRound: 1500,
  },
  minimax: {
    actor: 'minimax', model: 'minimax/minimax-m2.7', provider: 'openrouter',
    strengths: 'Schneller Utility- und Glue-Code, gut fuer guenstige Standard-Tasks',
    maxTokensPerRound: 1500,
  },
  qwen: {
    actor: 'qwen', model: 'qwen/qwen3.6-plus', provider: 'openrouter',
    strengths: 'Stark bei TypeScript- und Service-Code, guenstig fuer Mid-Complexity',
    maxTokensPerRound: 1500,
  },
  kimi: {
    actor: 'kimi', model: 'moonshotai/kimi-k2.5', provider: 'openrouter',
    strengths: 'Sauber bei laengerem Kontext und mehrteiligen Datei-Aenderungen',
    maxTokensPerRound: 1500,
  },
};

// ─── Council Pool → Participants ───
// Maps activePools.council to RoundtableParticipant[], using CODE_WRITER_PRESETS for strengths.
function buildCouncilParticipants(): RoundtableParticipant[] {
  const councilModels = getAllFromPool('council');
  if (councilModels.length === 0) {
    console.warn('[council] No council models in pool, using default config');
    return DEFAULT_ROUNDTABLE_CONFIG.participants;
  }

  return councilModels.map((m) => {
    const preset = CODE_WRITER_PRESETS[m.id];
    if (preset) return preset;
    // Fallback for models not in presets
    return {
      actor: m.id,
      model: m.model,
      provider: m.provider,
      strengths: 'Council Member',
      maxTokensPerRound: 1500,
    };
  });
}

// ─── Maya Moderator ───
// After each council round, Maya evaluates and decides: continue / focus / conclude.
// Uses the Maya pool model (user's chosen chat model).
const MAYA_MODERATOR_CEILING = 5;

function createMayaModerator(taskGoal: string): RoundModerator {
  return async (round, roundMessages, _allMessages, approvalCount, blockCount) => {
    // Hard ceiling
    if (round >= MAYA_MODERATOR_CEILING) {
      return { action: 'conclude', reason: `Hard-Ceiling erreicht (${MAYA_MODERATOR_CEILING} Runden)` };
    }

    // If strong consensus already, no need for moderation
    if (approvalCount >= 2 && blockCount === 0) {
      return { action: 'conclude', reason: 'Konsens bereits erreicht' };
    }

    // Pick Maya's model from pool
    const mayaModel = pickFromPool('maya', true);
    if (!mayaModel) {
      return { action: 'continue', reason: 'Kein Maya-Modell verfuegbar, weiter ohne Moderation' };
    }

    try {
      const roundSummary = roundMessages
        .filter((m) => m.actor !== 'system' && m.actor !== 'file-reader')
        .map((m) => `[${m.actor}]: ${m.content.slice(0, 400)}`)
        .join('\n\n');

      const response = await callProvider(mayaModel.provider, mayaModel.model, {
        system: `Du bist Maya, die Moderatorin des Council Roundtable.
Nach jeder Diskussionsrunde entscheidest du:

1. CONTINUE — Die Diskussion laeuft gut, naechste Runde ohne besonderen Fokus
2. FOCUS — Du hast etwas entdeckt das vertieft werden muss. Gib den Fokus an.
3. CONCLUDE — Genug diskutiert, Konsens ist klar oder wird nicht besser.

Bewerte:
- Gibt es ungeklaerte Widersprueche?
- Hat jemand einen Punkt gebracht den die anderen ignoriert haben?
- Dreht sich die Diskussion im Kreis?
- Gibt es ein Potenzial das noch nicht ausgeschoepft ist?

Antworte NUR mit JSON (kein Markdown, keine Backticks):
{"action":"continue","reason":"..."}
oder {"action":"focus","focusPrompt":"...","reason":"..."}
oder {"action":"conclude","reason":"..."}`,
        messages: [{
          role: 'user',
          content: `TASK: ${taskGoal}
RUNDE: ${round}
APPROVALS: ${approvalCount}, BLOCKS: ${blockCount}

--- BEITRAEGE DIESER RUNDE ---
${roundSummary}

Deine Entscheidung:`,
        }],
        maxTokens: 300,
        temperature: 0.3,
        forceJsonObject: false,
      });

      const parsed = JSON.parse(response) as Record<string, unknown>;
      const action = parsed.action;
      const reason = typeof parsed.reason === 'string' ? parsed.reason : 'Maya Entscheidung';
      const focusPrompt = typeof parsed.focusPrompt === 'string' ? parsed.focusPrompt : undefined;

      if (action === 'focus' && focusPrompt) {
        return { action: 'focus', focusPrompt, reason };
      }
      if (action === 'conclude') {
        return { action: 'conclude', reason };
      }
      return { action: 'continue', reason };
    } catch (error) {
      console.error('[maya-moderator] Failed, continuing:', error);
      return { action: 'continue', reason: 'Moderation fehlgeschlagen, weiter' };
    }
  };
}

export interface ExecuteInput {
  instruction: string;
  scope?: string[];
  risk?: string;
  opusHints?: string;
  skipRoundtable?: boolean;
  useDecomposer?: boolean;  // Skip Roundtable, go direct: Decompose → Swarm → Meister → GitHub
  skipGithub?: boolean;     // If true, produce patches but do NOT push to GitHub
  codeWriter?: string;
  roundtableConfig?: Partial<RoundtableConfig>;
}

export interface ExecuteResult {
  taskId: string;
  title: string;
  status: string;
  consensusType: string | null;
  rounds: number;
  totalTokens: number;
  patches: Array<{ file: string; body: string }>;
  patchValidation: PatchValidation | null;
  approvals: string[];
  blocks: string[];
  githubAction?: { triggered: boolean; error?: string };
  session?: { tasksUsed: number; tasksRemaining: number; tokensUsed: number; tokensRemaining: number };
  crush?: {
    intensity: CrushIntensity;
    ambient: AmbientCrushResult;
    caseCrush: CaseCrushResult | null;
  };
}

function toPatchPayloads(patches: Array<{ file: string; body: string }>) {
  return convertBdlPatchesToPayload(
    patches.map((patch) => ({
      kind: 'PATCH',
      params: { file: patch.file },
      body: patch.body,
      raw: patch.body,
    })),
  );
}

/**
 * For large files: apply SEARCH/REPLACE patches in memory and produce
 * full-file overwrite payloads. This avoids the empty-SEARCH bug where
 * the GitHub Action overwrites the file with just the snippet.
 */
function toSafeOverwritePayloads(
  patches: Array<{ file: string; body: string }>,
): Array<{ file: string; action: 'overwrite'; content: string }> | null {
  const results: Array<{ file: string; action: 'overwrite'; content: string }> = [];

  for (const patch of patches) {
    // Read original file
    let original = '';
    for (const base of [process.cwd(), path.resolve(process.cwd(), '..')]) {
      try {
        original = fs.readFileSync(path.resolve(base, patch.file), 'utf-8');
        break;
      } catch { /* skip */ }
    }

    if (!original) {
      console.error(`[toSafeOverwrite] could not read ${patch.file}`);
      return null; // Fall back to normal path
    }

    // Parse SEARCH/REPLACE from body
    const searchMatch = patch.body.match(/<<<SEARCH\n?([\s\S]*?)\n?===REPLACE\n?([\s\S]*?)\n?>>>/);
    if (!searchMatch) {
      // Not a SEARCH/REPLACE patch — might be full-file content
      if (patch.body.length > original.length * 0.5) {
        results.push({ file: patch.file, action: 'overwrite', content: patch.body });
      } else {
        return null; // Unknown format, fall back
      }
      continue;
    }

    const searchBlock = searchMatch[1].trim();
    const replaceBlock = searchMatch[2]; // Don't trim — preserve indentation

    if (!searchBlock) {
      // Empty SEARCH = new code to add. Try to find insertion point from context.
      // Default: append before last line
      const lines = original.split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine?.trim() === '') {
        lines.splice(lines.length - 1, 0, replaceBlock);
      } else {
        lines.push(replaceBlock);
      }
      results.push({ file: patch.file, action: 'overwrite', content: lines.join('\n') });
      continue;
    }

    // Apply SEARCH/REPLACE in memory
    if (!original.includes(searchBlock)) {
      console.error(`[toSafeOverwrite] SEARCH block not found in ${patch.file}`);
      return null; // Fall back to normal path
    }

    const updated = original.replace(searchBlock, replaceBlock);
    results.push({ file: patch.file, action: 'overwrite', content: updated });
  }

  return results;
}

export async function executeTask(input: ExecuteInput): Promise<ExecuteResult> {
  const instruction = input.instruction;
  if (!instruction || typeof instruction !== 'string') {
    throw new Error('instruction is required');
  }

  const budget = checkBudget();
  if (!budget.allowed) {
    throw new Error(`Budget-Gate: ${budget.reason}`);
  }

  const normalizedScope = Array.isArray(input.scope) ? input.scope : [];
  const db = getDb();
  const [task] = await db
    .insert(builderTasks)
    .values({
      title: instruction.slice(0, 100),
      goal: instruction,
      scope: normalizedScope,
      risk: input.risk ?? 'low',
      status: 'scouting',
    })
    .returning();

  let status: 'consensus' | 'no_consensus' | 'validation_failed' | 'scouted' | 'applying' | 'error' = 'scouted';
  let consensusType: 'unanimous' | 'majority' | null = null;
  let rounds = 0;
  let totalTokens = 0;
  let patches: Array<{ file: string; body: string }> = [];
  let patchValidation: PatchValidation | null = null;
  let approvals: string[] = [];
  let blocks: string[] = [];
  let githubAction: { triggered: boolean; error?: string } | undefined;
  const memoryContext = await buildCouncilContext().catch(() => '');

  const scoutResult = await runScoutPhase({
    id: task.id,
    goal: instruction,
    scope: normalizedScope,
  });
  const graphBriefing = scoutResult.graphBriefing;

  // --- DISTILLER PHASE ---
  // Crush scout outputs into a structured brief for the council.
  // The roundtable sees ONLY the brief, not the raw scout noise.
  let distillerBrief = '';
  const distillerMessages: typeof scoutResult.messages = [];
  try {
    console.log(`[pipeline] Running distiller for task ${task.id}`);
    const distillerMemory = await buildDistillerContext(instruction, normalizedScope).catch(() => '');
    const distillerResult = await runDistiller(task.id, instruction, scoutResult, distillerMemory);
    distillerBrief = distillerResult.brief;
    distillerMessages.push(...distillerResult.messages);
    totalTokens += distillerResult.tokensUsed;
  } catch (distillerError) {
    console.error('[pipeline] Distiller failed, falling back to raw scout output:', distillerError);
    distillerBrief = scoutResult.rawOutputs.map((o) => `[${o.actor}] ${o.content}`).join('\n\n');
  }

  // Build the pool messages for the roundtable:
  // Graph message + distiller brief (not raw scouts)
  const graphMessage = scoutResult.messages.find((m) => m.actor === 'graph');
  const councilPool = graphMessage
    ? [graphMessage, ...distillerMessages]
    : distillerMessages;

  const relevantErrorCards = await findRelevantErrorCards(instruction, normalizedScope);
  let crushIntensity: CrushIntensity = 'ambient';
  let caseCrushResult: CaseCrushResult | null = null;
  const ambientResult = runAmbientCrush(
    graphBriefing,
    relevantErrorCards.map((card) => ({
      title: card.title,
      category: card.category,
      affectedFiles: Array.isArray(card.affectedFiles) ? card.affectedFiles.map(String) : [],
    })),
    normalizedScope,
  );

  // === DIRECT DECOMPOSER PATH ===
  // Skips Roundtable entirely: Decompose → Swarm → Meister → GitHub
  if (input.useDecomposer && normalizedScope.length > 0) {
    console.log(`[decomposer-direct] ${normalizedScope.length} files, goal: ${instruction.slice(0, 80)}`);

    const decomposition = await decompose({
      taskGoal: instruction,
      scope: normalizedScope,
      risk: (input.risk ?? 'low') as 'low' | 'medium' | 'high',
    });

    const fileContents: Record<string, string> = {};
    for (const a of decomposition.assignments) {
      if (!fileContents[a.file]) {
        for (const base of [process.cwd(), path.resolve(process.cwd(), '..')]) {
          try {
            fileContents[a.file] = fs.readFileSync(path.resolve(base, a.file), 'utf-8');
            break;
          } catch { /* not found */ }
        }
      }
    }

    const workerAssignments: WorkerAssignment[] = decomposition.assignments.map((a) => ({
      file: a.file,
      writer: a.writer,
      reason: `${instruction}\n\n=== KONTEXT ===\n${a.cutUnit.context}\n\n=== DEIN BLOCK (Zeilen ${a.cutUnit.blocks[0]?.startLine ?? '?'}-${a.cutUnit.blocks[a.cutUnit.blocks.length - 1]?.endLine ?? '?'}) ===\n${a.cutUnit.blocks.map((b) => b.content).join('\n\n')}`,
      dependsOn: a.dependsOn,
    }));

    const workerResults = await runWorkerSwarm(task.id, workerAssignments, instruction, fileContents);
    const meister = await runMeisterValidation(task.id, instruction, workerResults, fileContents);
    totalTokens = workerResults.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0) + (meister.tokensUsed ?? 0);

    if (meister.scores) {
      await saveWorkerScores(task.id, meister.scores);
    }

    patches = meister.validatedPatches ?? workerResults
      .filter((r) => r.patch)
      .map((r) => r.patch as { file: string; body: string });

    status = patches.length > 0 ? 'consensus' : 'no_consensus';
    consensusType = 'unanimous';
    rounds = 0;

    console.log(`[decomposer-direct] ${decomposition.stats.totalUnits} units → ${patches.length} patches, ${totalTokens} tokens`);
  }

  if (!input.skipRoundtable && !input.useDecomposer) {
    // Build participants from Council Pool (user-selected models)
    const councilParticipants = buildCouncilParticipants();
    const writerPreset = input.codeWriter ? CODE_WRITER_PRESETS[input.codeWriter] : undefined;
    const participants = writerPreset
      ? [writerPreset, ...councilParticipants.filter((p) => p.actor !== writerPreset.actor)]
      : councilParticipants;

    const mergedConfig: RoundtableConfig = {
      participants,
      maxRounds: input.roundtableConfig?.maxRounds ?? MAYA_MODERATOR_CEILING,
      consensusThreshold:
        input.roundtableConfig?.consensusThreshold ?? Math.max(2, Math.ceil(participants.length * 0.6)),
    };

    // Maya moderates between rounds — dynamic focus, early conclude
    const moderator = createMayaModerator(instruction);
    console.log(`[council] Starting roundtable: ${participants.map((p) => p.actor).join(', ')} (${participants.length} members, threshold=${mergedConfig.consensusThreshold})`);

    const roundtableResult = await runRoundtable(
      {
        id: task.id,
        title: task.title,
        goal: task.goal,
        scope: normalizedScope,
        risk: input.risk ?? 'low',
      },
      councilPool,
      mergedConfig,
      [input.opusHints || '', distillerBrief ? `\n\n=== DESTILLIERTER BRIEF ===\n${distillerBrief}` : '', memoryContext ? `\n\n=== BUILDER MEMORY ===\n${memoryContext}` : ''].join('').trim() || undefined,
      moderator,
    );

    rounds = roundtableResult.rounds;
    totalTokens = roundtableResult.totalTokens;
    patches = roundtableResult.patches;
    approvals = roundtableResult.approvals;
    blocks = roundtableResult.blocks;
    consensusType = roundtableResult.consensusType ?? null;

    // Phase S2: Auto-Decomposer — wenn Patches große Dateien betreffen (>200 Zeilen),
    // automatisch durch die Decomposer-Pipeline routen statt direkt anwenden.
    // Der Roundtable entscheidet WAS gebaut wird, der Decomposer entscheidet WIE.
    const LARGE_FILE_THRESHOLD = 200;
    if (roundtableResult.status === 'consensus' && patches.length > 0) {
      const largeFilePatches = patches.filter((p) => {
        try {
          for (const base of [process.cwd(), path.resolve(process.cwd(), '..')]) {
            const resolved = path.resolve(base, p.file);
            if (fs.existsSync(resolved)) {
              const lineCount = fs.readFileSync(resolved, 'utf-8').split('\n').length;
              return lineCount > LARGE_FILE_THRESHOLD;
            }
          }
        } catch { /* ignore */ }
        return false;
      });

      if (largeFilePatches.length > 0) {
        console.log(`[S2] Auto-decomposer: ${largeFilePatches.length} patches target large files`);

        const decomposition = await decompose({
          taskGoal: instruction,
          scope: largeFilePatches.map((p) => p.file),
          risk: (input.risk ?? 'low') as 'low' | 'medium' | 'high',
        });

        console.log(`[S2] Decomposer: ${decomposition.stats.totalUnits} units, ${decomposition.stats.totalBlocks} blocks`);

        // Load file contents
        const fileContents: Record<string, string> = {};
        for (const a of decomposition.assignments) {
          if (!fileContents[a.file]) {
            for (const base of [process.cwd(), path.resolve(process.cwd(), '..')]) {
              try {
                fileContents[a.file] = fs.readFileSync(path.resolve(base, a.file), 'utf-8');
                break;
              } catch { /* not found */ }
            }
          }
        }

        // Roundtable patches become specification context for workers
        const patchSpec = largeFilePatches.map((p) => `[PATCH ${p.file}]\n${p.body}`).join('\n\n');

        const workerAssignments: WorkerAssignment[] = decomposition.assignments.map((a) => ({
          file: a.file,
          writer: a.writer,
          reason: `Roundtable-Spezifikation:\n${patchSpec}\n\n=== KONTEXT ===\n${a.cutUnit.context}\n\n=== DEIN BLOCK (Zeilen ${a.cutUnit.blocks[0]?.startLine ?? '?'}-${a.cutUnit.blocks[a.cutUnit.blocks.length - 1]?.endLine ?? '?'}) ===\n${a.cutUnit.blocks.map((b) => b.content).join('\n\n')}`,
          dependsOn: a.dependsOn,
        }));

        const workerResults = await runWorkerSwarm(task.id, workerAssignments, instruction, fileContents);
        const meister = await runMeisterValidation(task.id, instruction, workerResults, fileContents);
        totalTokens += workerResults.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
        totalTokens += meister.tokensUsed ?? 0;

        if (meister.scores) {
          await saveWorkerScores(task.id, meister.scores);
        }

        // Replace patches with decomposer output
        patches = meister.validatedPatches ?? workerResults
          .filter((r) => r.patch)
          .map((r) => r.patch as { file: string; body: string });
      }
    }

    crushIntensity = determineCrushIntensity(
      { risk: input.risk ?? 'low', scope: normalizedScope, instruction },
      {
        hasBlocks: blocks.length > 0,
        hasContradictions: approvals.length > 0 && blocks.length > 0,
        isArchitectural: normalizedScope.length > 2,
        previousFailures: 0,
      },
    );

    if (crushIntensity === 'case' || crushIntensity === 'heavy') {
      try {
        const chatPool = await getChatPoolForTask(task.id);
        const summary = chatPool.map((message) => `[${message.actor}] ${message.content}`).join('\n\n').slice(0, 3000);
        caseCrushResult = await runCaseCrush(
          { goal: instruction, scope: normalizedScope },
          summary,
          blocks.length > 0 ? 'Roundtable hatte Blocks' : undefined,
        );
        totalTokens += caseCrushResult.tokensUsed;
      } catch (error) {
        console.error('[crush] case crush failed:', error);
        caseCrushResult = null;
      }
    }

    if (roundtableResult.status === 'consensus') {
      if (patches.length > 0) {
        patchValidation = await validatePatch(
          patches,
          { goal: instruction, scope: normalizedScope },
          scoutResult.messages.map((message) => `[${message.actor}] ${message.content}`).join('\n\n'),
        );
        totalTokens += patchValidation.tokensUsed;
      }

      const hasCriticalIssues = patchValidation?.issues.some((issue) => issue.severity === 'critical') ?? false;
      status = patchValidation && !patchValidation.passed && hasCriticalIssues ? 'validation_failed' : 'consensus';
    } else if (roundtableResult.status === 'no_consensus') {
      status = 'no_consensus';
    } else {
      status = 'error';
    }

    if (status !== 'consensus') {
      try {
        const chatPool = await getChatPoolForTask(task.id);
        const summary = chatPool.map((message) => `[${message.actor}] ${message.content}`).join('\n\n');
        await generateErrorCard({
          taskId: task.id,
          taskTitle: task.title,
          taskGoal: instruction,
          blockReason: status,
          chatPoolSummary: summary.slice(0, 3000),
          affectedFiles: normalizedScope,
        });
      } catch (error) {
        console.error('[opusBridge] error card generation failed:', error);
      }
    }
  }

  if (status === 'consensus' && patches.length > 0) {
    if (input.skipGithub) {
      // skipGithub: keep patches in DB but do NOT push to GitHub (used by /build with skipDeploy)
      githubAction = { triggered: false };
    } else {
      // Try safe in-memory patch application first (prevents empty-SEARCH overwrites)
      const safePayloads = toSafeOverwritePayloads(patches);
      githubAction = safePayloads
        ? await triggerGithubAction(task.id, safePayloads)
        : await triggerGithubAction(task.id, toPatchPayloads(patches));
      status = githubAction.triggered ? 'applying' : 'error';
    }
  }

  await db
    .update(builderTasks)
    .set({
      status,
      tokenCount: totalTokens,
      updatedAt: new Date(),
    })
    .where(eq(builderTasks.id, task.id));

  await db.insert(builderOpusLog).values({
    action: 'execute',
    taskId: task.id,
    input: { instruction, scope: normalizedScope, opusHints: input.opusHints ?? null },
    output: {
      status,
      rounds,
      totalTokens,
      approvals,
      blocks,
      patchValidation: patchValidation ?? null,
      githubAction: githubAction ?? null,
    },
    tokensUsed: totalTokens,
  });

  recordTaskUsage(totalTokens);

  // Sync builder memory (episodes, semantic aggregations, worker profiles)
  await syncBuilderMemoryForTask(task.id).catch((err) =>
    console.error('[executeTask] syncBuilderMemoryForTask error:', err),
  );

  if (status === 'consensus') {
    await updateGraphAfterTask({
      taskId: task.id,
      title: task.title,
      status,
      filesChanged: patches.map((patch) => patch.file),
    });
  }

  const sessionState = getSessionState();

  return {
    taskId: task.id,
    title: task.title,
    status,
    consensusType,
    rounds,
    totalTokens,
    patches,
    patchValidation,
    approvals,
    blocks,
    githubAction,
    session: sessionState,
        crush: {
      intensity: crushIntensity,
      ambient: ambientResult,
      caseCrush: caseCrushResult,
    },
  };
}

export async function getTaskSummary(taskId: string) {
  const db = getDb();
  const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
  if (!task) throw new Error(`Task ${taskId} not found`);
  const chatPool = await getChatPoolForTask(taskId);
  const rounds = chatPool.length > 0 ? Math.max(...chatPool.map((m) => m.round ?? 0)) : 0;
  const participants = [...new Set(chatPool.map((m) => m.actor))];
  return {
    taskId,
    title: task.title,
    status: task.status,
    rounds,
    participants,
    tokenCount: task.tokenCount ?? 0,
    createdAt: task.createdAt,
  };
}