import { asc, eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { triggerGithubAction, type PatchPayload } from '../lib/builderGithubBridge.js';
import { deleteBuilderMemoryForTask } from '../lib/builderMemory.js';
import { executeTask } from '../lib/opusBridgeController.js';
import { runChain, type ChainConfig } from '../lib/opusChainController.js';
import { getDb } from '../db.js';
import { addChatPoolMessage, getChatPoolForTask } from '../lib/opusChatPool.js';
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

opusBridgeRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const result = await executeTask(req.body);
    const chatPool = await getChatPoolForTask(result.taskId);
    const scoutMessages = chatPool.filter((message) => message.round === 0);
    const roundtableMessages = chatPool.filter((message) => message.round > 0);

    res.json({
      ...result,
      scoutMessages: scoutMessages.map((message) => ({
        actor: message.actor,
        content: message.content.slice(0, 500),
      })),
      roundtableMessages: roundtableMessages.map((message) => ({
        actor: message.actor,
        round: message.round,
        content: message.content.slice(0, 500),
      })),
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

opusBridgeRouter.post('/chain', async (req: Request, res: Response) => {
  try {
    const config = req.body as ChainConfig;
    if (!config.name || !config.tasks || !Array.isArray(config.tasks) || config.tasks.length === 0) {
      res.status(400).json({ error: 'name and tasks[] are required' });
      return;
    }
    const result = await runChain(config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
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