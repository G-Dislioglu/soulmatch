import { eq } from 'drizzle-orm';
import { triggerGithubAction, type PatchPayload } from './builderGithubBridge.js';
import { getDb } from '../db.js';
import { checkBudget, getSessionState, recordTaskUsage } from './opusBudgetGate.js';
import { generateErrorCard } from './opusErrorLearning.js';
import { findRelevantErrorCards, updateGraphAfterTask } from './opusGraphIntegration.js';
import { getChatPoolForTask } from './opusChatPool.js';
import { buildBuilderMemoryContext } from './builderMemory.js';
import {
  determineCrushIntensity,
  runAmbientCrush,
  runCaseCrush,
  type AmbientCrushResult,
  type CaseCrushResult,
  type CrushIntensity,
} from './opusPulseCrush.js';
import { runScoutPhase } from './opusScoutRunner.js';
import {
  DEFAULT_ROUNDTABLE_CONFIG,
  runRoundtable,
  validatePatch,
  type PatchValidation,
  type RoundtableConfig,
} from './opusRoundtable.js';
import { builderOpusLog, builderTasks } from '../schema/builder.js';

export interface ExecuteInput {
  instruction: string;
  scope?: string[];
  risk?: string;
  opusHints?: string;
  skipRoundtable?: boolean;
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

function toWritePatchPayloads(patches: Array<{ file: string; body: string }>): PatchPayload[] {
  return patches.map((patch) => ({
    file: patch.file,
    action: 'write',
    content: patch.body,
  }));
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

  const scoutMessages = await runScoutPhase({
    id: task.id,
    goal: instruction,
    scope: normalizedScope,
  });
  const graphBriefing = scoutMessages.find((message) => message.actor === 'graph')?.content || '';
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

  let status: 'consensus' | 'no_consensus' | 'validation_failed' | 'scouted' | 'applying' | 'error' = 'scouted';
  let consensusType: 'unanimous' | 'majority' | null = null;
  let rounds = 0;
  let totalTokens = 0;
  let patches: Array<{ file: string; body: string }> = [];
  let patchValidation: PatchValidation | null = null;
  let approvals: string[] = [];
  let blocks: string[] = [];
  let githubAction: { triggered: boolean; error?: string } | undefined;
  const memoryContext = await buildBuilderMemoryContext().catch(() => '');

  if (!input.skipRoundtable) {
    const mergedConfig: RoundtableConfig = {
      participants: input.roundtableConfig?.participants ?? DEFAULT_ROUNDTABLE_CONFIG.participants,
      maxRounds: input.roundtableConfig?.maxRounds ?? DEFAULT_ROUNDTABLE_CONFIG.maxRounds,
      consensusThreshold:
        input.roundtableConfig?.consensusThreshold ?? DEFAULT_ROUNDTABLE_CONFIG.consensusThreshold,
    };

    const roundtableResult = await runRoundtable(
      {
        id: task.id,
        title: task.title,
        goal: task.goal,
        scope: normalizedScope,
        risk: input.risk ?? 'low',
      },
      scoutMessages,
      mergedConfig,
      [input.opusHints || '', memoryContext ? `\n\n=== BUILDER MEMORY ===\n${memoryContext}` : ''].join('').trim() || undefined,
    );

    rounds = roundtableResult.rounds;
    totalTokens = roundtableResult.totalTokens;
    patches = roundtableResult.patches;
    approvals = roundtableResult.approvals;
    blocks = roundtableResult.blocks;
    consensusType = roundtableResult.consensusType ?? null;

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
          scoutMessages.map((message) => `[${message.actor}] ${message.content}`).join('\n\n'),
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
    githubAction = await triggerGithubAction(task.id, toWritePatchPayloads(patches));
    status = githubAction.triggered ? 'applying' : 'error';
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