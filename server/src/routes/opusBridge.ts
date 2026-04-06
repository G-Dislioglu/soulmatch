import { and, asc, eq, gt } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { triggerGithubAction, type PatchPayload } from '../lib/builderGithubBridge.js';
import { deleteBuilderMemoryForTask } from '../lib/builderMemory.js';
import { getDb } from '../db.js';
import { runScoutPhase } from '../lib/opusScoutRunner.js';
import { addChatPoolMessage, getChatPoolForTask } from '../lib/opusChatPool.js';
import {
  DEFAULT_ROUNDTABLE_CONFIG,
  runRoundtable,
  validatePatch,
  type PatchValidation,
  type RoundtableConfig,
} from '../lib/opusRoundtable.js';
import {
  builderActions,
  builderArtifacts,
  builderChatpool,
  builderOpusLog,
  builderReviews,
  builderTasks,
  builderTestResults,
} from '../schema/builder.js';

export const opusBridgeRouter = Router();

opusBridgeRouter.use(requireOpusToken);

function toWritePatchPayloads(patches: Array<{ file: string; body: string }>): PatchPayload[] {
  return patches.map((patch) => ({
    file: patch.file,
    action: 'write',
    content: patch.body,
  }));
}

opusBridgeRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const {
      instruction,
      scope,
      risk,
      opusHints,
      skipRoundtable,
      roundtableConfig,
    } = req.body as {
      instruction?: string;
      scope?: string[];
      risk?: string;
      opusHints?: string;
      skipRoundtable?: boolean;
      roundtableConfig?: Partial<RoundtableConfig>;
    };

    if (!instruction || typeof instruction !== 'string') {
      res.status(400).json({ error: 'instruction is required' });
      return;
    }

    const normalizedScope = Array.isArray(scope) ? scope : [];
    const db = getDb();
    const [task] = await db
      .insert(builderTasks)
      .values({
        title: instruction.slice(0, 100),
        goal: instruction,
        scope: normalizedScope,
        risk: risk ?? 'low',
        status: 'scouting',
      })
      .returning();

    const scoutMessages = await runScoutPhase({
      id: task.id,
      goal: instruction,
      scope: normalizedScope,
    });

    let status: 'consensus' | 'no_consensus' | 'validation_failed' | 'scouted' | 'applying' | 'error' = 'scouted';
    let consensusType: 'unanimous' | 'majority' | null = null;
    let rounds = 0;
    let totalTokens = 0;
    let patches: Array<{ file: string; body: string }> = [];
    let patchValidation: PatchValidation | null = null;
    let approvals: string[] = [];
    let blocks: string[] = [];
    let githubAction: { triggered: boolean; error?: string } | null = null;

    if (!skipRoundtable) {
      const mergedConfig: RoundtableConfig = {
        participants: roundtableConfig?.participants ?? DEFAULT_ROUNDTABLE_CONFIG.participants,
        maxRounds: roundtableConfig?.maxRounds ?? DEFAULT_ROUNDTABLE_CONFIG.maxRounds,
        consensusThreshold:
          roundtableConfig?.consensusThreshold ?? DEFAULT_ROUNDTABLE_CONFIG.consensusThreshold,
      };

      const roundtableResult = await runRoundtable(
        {
          id: task.id,
          title: task.title,
          goal: task.goal,
          scope: normalizedScope,
          risk: risk ?? 'low',
        },
        scoutMessages,
        mergedConfig,
        opusHints,
      );

      rounds = roundtableResult.rounds;
      totalTokens = roundtableResult.totalTokens;
      patches = roundtableResult.patches;
      approvals = roundtableResult.approvals;
      blocks = roundtableResult.blocks;
      consensusType = roundtableResult.consensusType ?? null;

      if (roundtableResult.status === 'consensus') {
        if (patches.length > 0) {
          patchValidation = await validatePatch(
            patches,
            { goal: instruction, scope: normalizedScope },
            [
              ...scoutMessages.map((message) => `[${message.actor}] ${message.content}`),
            ].join('\n\n'),
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
    }

    if (status === 'consensus' && patches.length > 0) {
      const patchPayloads = toWritePatchPayloads(patches);
      githubAction = await triggerGithubAction(task.id, patchPayloads);
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
      input: { instruction, scope: normalizedScope, opusHints: opusHints ?? null },
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

    const storedRoundtableMessages = await db
      .select()
      .from(builderChatpool)
      .where(and(eq(builderChatpool.taskId, task.id), gt(builderChatpool.round, 0)))
      .orderBy(asc(builderChatpool.round), asc(builderChatpool.createdAt));

    res.json({
      taskId: task.id,
      status,
      title: task.title,
      consensusType,
      rounds,
      totalTokens,
      scoutMessages: scoutMessages.map((message) => ({
        actor: message.actor,
        content: message.content.slice(0, 500),
      })),
      roundtableMessages: storedRoundtableMessages.map((message) => ({
        actor: message.actor,
        round: message.round,
        content: message.content.slice(0, 500),
      })),
      patches,
      patchValidation,
      githubAction,
      approvals,
      blocks,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/observe/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId;
    const db = getDb();

    const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const chatPool = await getChatPoolForTask(taskId);
    const actions = await db
      .select()
      .from(builderActions)
      .where(eq(builderActions.taskId, taskId))
      .orderBy(asc(builderActions.createdAt));
    const opusLogs = await db
      .select()
      .from(builderOpusLog)
      .where(eq(builderOpusLog.taskId, taskId))
      .orderBy(asc(builderOpusLog.createdAt));

    res.json({
      task: {
        id: task.id,
        title: task.title,
        goal: task.goal,
        status: task.status,
        scope: task.scope,
        risk: task.risk,
        commitHash: task.commitHash,
        tokenCount: task.tokenCount,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
      chatPool: chatPool.map((message) => ({
        round: message.round,
        phase: message.phase,
        actor: message.actor,
        model: message.model,
        content: message.content,
        tokensUsed: message.tokensUsed,
        createdAt: message.createdAt,
      })),
      actions: actions.map((action) => ({
        lane: action.lane,
        kind: action.kind,
        actor: action.actor,
        payload: action.payload,
        result: action.result,
        createdAt: action.createdAt,
      })),
      opusLogs: opusLogs.map((log) => ({
        action: log.action,
        input: log.input,
        output: log.output,
        tokensUsed: log.tokensUsed,
        createdAt: log.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/override/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId;
    const { action, reason, retryHints } = req.body as {
      action?: 'approve' | 'block' | 'retry' | 'delete';
      reason?: string;
      retryHints?: string;
    };

    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    const db = getDb();
    const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const previousStatus = task.status;
    let newStatus = previousStatus;

    if (action === 'approve') {
      const chatPool = await getChatPoolForTask(taskId);
      const patchMessages = chatPool.filter((message) =>
        message.phase === 'roundtable' && message.content.includes('@PATCH'),
      );

      const allPatches: PatchPayload[] = [];
      for (const message of patchMessages) {
        const commands = Array.isArray(message.commands) ? message.commands : [];
        for (const command of commands as Array<{ kind?: string; params?: { file?: string }; body?: string }>) {
          if (command.kind === 'PATCH' && command.params?.file && command.body) {
            allPatches.push({ file: command.params.file, action: 'write', content: command.body });
          }
        }
      }

      if (allPatches.length > 0) {
        const ghResult = await triggerGithubAction(taskId, allPatches);
        newStatus = ghResult.triggered ? 'applying' : 'error';
        await db
          .update(builderTasks)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(builderTasks.id, taskId));
      } else {
        newStatus = 'done';
        await db
          .update(builderTasks)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(builderTasks.id, taskId));
      }
    }

    if (action === 'block') {
      newStatus = 'blocked';
      await db
        .update(builderTasks)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));
    }

    if (action === 'retry') {
      newStatus = 'queued';
      await db
        .update(builderTasks)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));

      if (retryHints) {
        await addChatPoolMessage({
          taskId,
          round: 99,
          phase: 'chain_decision',
          actor: 'opus-override',
          model: 'manual',
          content: `[OPUS OVERRIDE — RETRY]\nGrund: ${reason || 'k.A.'}\nHinweise für nächsten Versuch: ${retryHints}`,
          tokensUsed: 0,
          durationMs: 0,
        });
      }
    }

    if (action === 'delete') {
      await db.delete(builderChatpool).where(eq(builderChatpool.taskId, taskId));
      await db.delete(builderActions).where(eq(builderActions.taskId, taskId));
      await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, taskId));
      await db.delete(builderTestResults).where(eq(builderTestResults.taskId, taskId));
      await db.delete(builderReviews).where(eq(builderReviews.taskId, taskId));
      await db.delete(builderOpusLog).where(eq(builderOpusLog.taskId, taskId));
      await deleteBuilderMemoryForTask(taskId);
      await db.delete(builderTasks).where(eq(builderTasks.id, taskId));
      newStatus = 'deleted';
    }

    await db.insert(builderOpusLog).values({
      action: `override_${action}`,
      taskId: action === 'delete' ? undefined : taskId,
      input: { action, reason, retryHints },
      output: {
        previousStatus,
        newStatus:
          action === 'delete'
            ? 'deleted'
            : action === 'approve'
              ? newStatus
              : action === 'block'
                ? 'blocked'
                : 'queued',
      },
      tokensUsed: 0,
    });

    const [updatedTask] = action !== 'delete'
      ? await db.select().from(builderTasks).where(eq(builderTasks.id, taskId))
      : [];

    res.json({
      taskId,
      action,
      previousStatus,
      newStatus: updatedTask?.status ?? 'deleted',
      reason: reason || null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/chain', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.get('/audit', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.post('/worker-direct', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.get('/memory', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});