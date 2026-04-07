import * as fs from 'fs';
import * as path from 'path';
import { asc, desc, eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { convertBdlPatchesToPayload, triggerGithubAction } from '../lib/builderGithubBridge.js';
import { deleteBuilderMemoryForTask } from '../lib/builderMemory.js';
import { buildBuilderMemoryContext } from '../lib/builderMemory.js';
import { getSessionState, resetSession } from '../lib/opusBudgetGate.js';
import { executeTask } from '../lib/opusBridgeController.js';
import { runChain, type ChainConfig } from '../lib/opusChainController.js';
import {
  runMeisterValidation,
  saveWorkerScores,
  runWorkerSwarm,
  type WorkerAssignment,
} from '../lib/opusWorkerSwarm.js';
import { getDb } from '../db.js';
import { addChatPoolMessage, getChatPoolForTask } from '../lib/opusChatPool.js';
import { callProvider } from '../lib/providers.js';
import {
  builderActions,
  builderArtifacts,
  builderChatpool,
  builderErrorCards,
  builderMemory,
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

      const patchCommands: Array<{ kind: string; params: { file?: string }; body?: string; raw: string }> = [];
      for (const message of patchMessages) {
        const commands = Array.isArray(message.commands) ? message.commands : [];
        for (const command of commands as Array<{ kind?: string; params?: { file?: string }; body?: string }>) {
          if (command.kind === 'PATCH' && command.params?.file && command.body) {
            patchCommands.push({
              kind: 'PATCH',
              params: { file: command.params.file },
              body: command.body,
              raw: command.body,
            });
          }
        }
      }

      const allPatches = convertBdlPatchesToPayload(patchCommands);

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

opusBridgeRouter.get('/audit', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const tasks = await db.select().from(builderTasks).orderBy(desc(builderTasks.createdAt));

    const byStatus: Record<string, number> = {};
    let totalTokens = 0;
    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      totalTokens += task.tokenCount || 0;
    }

    const errorCards = await db.select().from(builderErrorCards).orderBy(desc(builderErrorCards.createdAt));
    const opusLogs = await db.select().from(builderOpusLog).orderBy(desc(builderOpusLog.createdAt));
    const totalLogTokens = opusLogs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);

    res.json({
      summary: {
        totalTasks: tasks.length,
        byStatus,
        totalTokens,
        avgTokensPerTask: tasks.length > 0 ? Math.round(totalTokens / tasks.length) : 0,
      },
      errorCards: errorCards.map((card) => ({
        id: card.id,
        title: card.title,
        category: card.category,
        severity: card.severity,
        affectedFiles: card.affectedFiles,
        createdAt: card.createdAt,
      })),
      recentTasks: tasks.slice(0, 20).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        tokenCount: task.tokenCount,
        createdAt: task.createdAt,
      })),
      opusLogCount: opusLogs.length,
      totalOpusTokens: totalLogTokens,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/worker-direct', async (req: Request, res: Response) => {
  try {
    const { worker, model, system, message, maxTokens } = req.body as {
      worker?: string;
      model?: string;
      system?: string;
      message?: string;
      maxTokens?: number;
    };

    if (!worker || !model || !message) {
      res.status(400).json({ error: 'worker, model, and message are required' });
      return;
    }

    const providerMap: Record<string, string> = {
      opus: 'anthropic',
      claude: 'anthropic',
      'gpt-5.4': 'openai',
      gpt: 'openai',
      gemini: 'gemini',
      deepseek: 'deepseek',
    };
    const provider = providerMap[worker] || worker;

    const startedAt = Date.now();
    const responseText = await callProvider(provider, model, {
      system: system || 'Du bist ein hilfreicher Assistent.',
      messages: [{ role: 'user', content: message }],
      maxTokens: maxTokens || 2000,
      temperature: 0.7,
      forceJsonObject: false,
    });
    const durationMs = Date.now() - startedAt;
    const tokensUsed = Math.ceil(responseText.length / 4);

    const db = getDb();
    await db.insert(builderOpusLog).values({
      action: 'worker_direct',
      input: { worker, model, messagePreview: message.slice(0, 200) },
      output: { responsePreview: responseText.slice(0, 200), tokensUsed, durationMs },
      tokensUsed,
    });

    res.json({ worker, model, response: responseText, tokensUsed, durationMs });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/memory', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const memories = await db.select().from(builderMemory).orderBy(desc(builderMemory.updatedAt));

    const byLayer: Record<string, Array<{
      key: string;
      summary: string;
      taskId: string | null;
      worker: string | null;
      updatedAt: Date;
    }>> = {};

    for (const memory of memories) {
      const layer = memory.layer;
      if (!byLayer[layer]) {
        byLayer[layer] = [];
      }

      byLayer[layer].push({
        key: memory.key,
        summary: memory.summary,
        taskId: memory.taskId ?? null,
        worker: memory.worker ?? null,
        updatedAt: memory.updatedAt,
      });
    }

    const context = await buildBuilderMemoryContext();

    res.json({
      totalEntries: memories.length,
      layers: byLayer,
      context,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/reset-session', (_req: Request, res: Response) => {
  resetSession();
  const state = getSessionState();
  res.json({
    message: 'Session reset',
    session: state,
  });
});

opusBridgeRouter.post('/swarm', async (req: Request, res: Response) => {
  try {
    const { goal, assignments, fileContents, skipMeister } = req.body as {
      goal?: string;
      assignments?: WorkerAssignment[];
      fileContents?: Record<string, string>;
      skipMeister?: boolean;
    };

    if (!goal || !Array.isArray(assignments) || assignments.length === 0) {
      res.status(400).json({ error: 'goal and assignments[] are required' });
      return;
    }

    const db = getDb();
    const [task] = await db
      .insert(builderTasks)
      .values({
        title: goal.slice(0, 100),
        goal,
        scope: assignments.map((assignment: { file: string }) => assignment.file),
        risk: 'low',
        status: 'swarm',
      })
      .returning();
    const id = task.id;

    const autoFileContents = new Map<string, string>();
    if (fileContents) {
      for (const [key, value] of Object.entries(fileContents)) {
        autoFileContents.set(key, value);
      }
    }
    for (const assignment of assignments) {
      if (!autoFileContents.has(assignment.file)) {
        const candidates = [
          path.resolve(process.cwd(), assignment.file),
          path.resolve(process.cwd(), '..', assignment.file),
        ];
        for (const candidate of candidates) {
          try {
            const content = fs.readFileSync(candidate, 'utf-8');
            autoFileContents.set(assignment.file, content);
            break;
          } catch {
            // file not found, skip
          }
        }
      }
    }

    const fileContentsObj = Object.fromEntries(autoFileContents);
    const workerResults = await runWorkerSwarm(id, assignments, goal, fileContentsObj);
    const meister = skipMeister
      ? null
      : await runMeisterValidation(id, goal, workerResults, fileContentsObj);

    if (meister?.scores) {
      await saveWorkerScores(id, meister.scores);
    }

    const patches = meister?.validatedPatches ?? workerResults
      .filter((result) => result.patch)
      .map((result) => result.patch as { file: string; body: string });

    let githubAction: { triggered: boolean; error?: string } | undefined;
    if (patches.length > 0) {
      const patchPayloads = convertBdlPatchesToPayload(
        patches.map((patch) => ({ kind: 'PATCH', params: { file: patch.file }, body: patch.body, raw: patch.body })),
      );
      githubAction = await triggerGithubAction(id, patchPayloads);
      await db
        .update(builderTasks)
        .set({ status: githubAction.triggered ? 'applying' : 'error' })
        .where(eq(builderTasks.id, id));
    }

    res.json({
      taskId: id,
      goal,
      workerResults,
      meister,
      patches,
      githubAction,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});