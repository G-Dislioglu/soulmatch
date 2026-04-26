import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';
import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { convertBdlPatchesToPayload, triggerGithubAction, triggerGithubActionChunked, formatSessionLogEntry, buildSessionLogBlob } from '../lib/builderGithubBridge.js';
import { deleteBuilderMemoryForTask } from '../lib/builderMemory.js';
import { buildBuilderMemoryContext } from '../lib/builderMemory.js';
import { getSessionState, resetSession } from '../lib/opusBudgetGate.js';
import { executeTask } from '../lib/opusBridgeController.js';
import { runBuildPipeline, type BuildInput } from '../lib/opusBuildPipeline.js';
import { selfVerify, selfHealthCheck, type SelfTestCheck } from '../lib/opusSelfTest.js';
import { runChain, type ChainConfig } from '../lib/opusChainController.js';
import { runRoutinePatrol, runDeepPatrol, getPatrolStatus } from '../lib/scoutPatrol.js';
import {
  WORKER_MAX_TOKEN_CAP,
  runMeisterValidation,
  saveWorkerScores,
  runWorkerSwarm,
  type WorkerAssignment,
} from '../lib/opusWorkerSwarm.js';
import { getDb } from '../db.js';
import { addChatPoolMessage, getChatPoolForTask } from '../lib/opusChatPool.js';
import { callProvider } from '../lib/providers.js';
import { getTaskStats, getRecentCompletedTasks } from '../lib/builderMetrics.js';
import { findPattern, readFile } from '../lib/builderFileIO.js';
import { getRepoRoot } from '../lib/builderExecutor.js';
import { regenerateRepoIndex } from '../lib/opusIndexGenerator.js';
import { outboundFetch } from '../lib/outboundHttp.js';
import repoFileRouter from './repoFile.js';
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
  builderWorkerScores,
} from '../schema/builder.js';

export const opusBridgeRouter = Router();

opusBridgeRouter.use(requireOpusToken);
opusBridgeRouter.use(repoFileRouter);

type PatrolSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

function normalizePatrolSeverity(value: string | null | undefined): PatrolSeverity {
  const raw = typeof value === 'string' ? value.toLowerCase() : '';

  if (raw === 'critical' || raw === 'high' || raw === 'medium' || raw === 'low' || raw === 'info') {
    return raw;
  }

  if (raw === 'warning') {
    return 'medium';
  }

  return 'info';
}

function normalizePatrolTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function isPatrolTriaged(card: typeof builderErrorCards.$inferSelect): boolean {
  const tags = normalizePatrolTags(card.tags);
  return Boolean(card.rootCause || card.solution || card.prevention || card.resolvedAt || tags.includes('triaged'));
}

function toPatrolFinding(card: typeof builderErrorCards.$inferSelect) {
  return {
    id: card.id,
    severity: normalizePatrolSeverity(card.severity),
    category: card.category,
    title: card.title,
    problem: card.problem,
    solution: card.solution,
    affectedFiles: Array.isArray(card.affectedFiles) ? card.affectedFiles : [],
    tags: normalizePatrolTags(card.tags),
    createdAt: card.createdAt,
    foundBy: card.foundBy,
  };
}

type DirectGitPushFile = {
  file: string;
  content?: string;
  delete?: boolean;
};

type DirectGitPushAction = 'create' | 'update' | 'delete';

type DirectGitPushResult = {
  file: string;
  action: DirectGitPushAction;
  ok: boolean;
  error?: string;
  commitSha?: string;
};

type GitHubRefResponse = {
  object?: {
    sha?: string;
  };
};

type GitHubCommitResponse = {
  sha?: string;
  tree?: {
    sha?: string;
  };
};

type GitHubTreeEntry = {
  path?: string;
  type?: string;
  sha?: string | null;
};

type GitHubTreeResponse = {
  sha?: string;
  tree?: GitHubTreeEntry[];
  truncated?: boolean;
};

type GitHubBlobResponse = {
  sha?: string;
};

function normalizeDirectGitPushFiles(files: DirectGitPushFile[]): DirectGitPushFile[] {
  return files.map((file) => ({
    ...file,
    file: file.file.replace(/\\/g, '/'),
  }));
}

function findDuplicateGitPushPath(files: DirectGitPushFile[]): string | null {
  const seen = new Set<string>();

  for (const file of files) {
    if (seen.has(file.file)) {
      return file.file;
    }

    seen.add(file.file);
  }

  return null;
}

function buildGitPushActions(
  files: DirectGitPushFile[],
  existingPaths?: Set<string>,
): DirectGitPushResult[] {
  return files.map((file) => ({
    file: file.file,
    action: file.delete ? 'delete' : existingPaths?.has(file.file) ? 'update' : 'create',
    ok: false,
  }));
}

function buildGitPushFailureResults(
  planned: DirectGitPushResult[],
  error: string,
): DirectGitPushResult[] {
  return planned.map((result) => ({
    ...result,
    ok: false,
    error,
    commitSha: undefined,
  }));
}

async function githubGitRequest<T>(
  url: string,
  pat: string,
  stage: string,
  init: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT'; body?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github.v3+json',
  };

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await outboundFetch(url, {
    method: init.method,
    headers,
    body: init.body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText || 'unknown error');
    throw new Error(`${stage}: GitHub API ${response.status} ${detail.slice(0, 200)}`);
  }

  return await response.json() as T;
}

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
      action?: 'approve' | 'block' | 'retry' | 'delete' | 'cancel';
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

    if (action === 'cancel') {
      newStatus = 'cancelled';
      await db
        .update(builderTasks)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));
    }

    if (action === 'delete') {
      await db.delete(builderChatpool).where(eq(builderChatpool.taskId, taskId));
      await db.delete(builderActions).where(eq(builderActions.taskId, taskId));
      await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, taskId));
      await db.delete(builderTestResults).where(eq(builderTestResults.taskId, taskId));
      await db.delete(builderReviews).where(eq(builderReviews.taskId, taskId));
      await db.delete(builderWorkerScores).where(eq(builderWorkerScores.taskId, taskId));
      await db.delete(builderOpusLog).where(eq(builderOpusLog.taskId, taskId));
      await db.update(builderErrorCards).set({ sourceTaskId: null }).where(eq(builderErrorCards.sourceTaskId, taskId));
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
            : action === 'cancel'
              ? 'cancelled'
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

opusBridgeRouter.get('/patrol-status', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const errorCards = await db.select().from(builderErrorCards).orderBy(desc(builderErrorCards.createdAt));

    const bySeverity: Record<PatrolSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    let triaged = 0;
    let crossConfirmed = 0;

    for (const card of errorCards) {
      const severity = normalizePatrolSeverity(card.severity);
      bySeverity[severity] += 1;

      if (isPatrolTriaged(card)) {
        triaged += 1;
      }

      if (normalizePatrolTags(card.tags).includes('cross-confirmed')) {
        crossConfirmed += 1;
      }
    }

    res.json({
      totalFindings: errorCards.length,
      lastRound: errorCards[0]?.createdAt ?? null,
      triaged,
      crossConfirmed,
      bySeverity,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/patrol-findings', async (req: Request, res: Response) => {
  try {
    const rawLimit = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 500)) : 100;

    const db = getDb();
    const findings = await db
      .select()
      .from(builderErrorCards)
      .orderBy(desc(builderErrorCards.createdAt))
      .limit(limit);

    res.json({
      findings: findings.map(toPatrolFinding),
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


// GET /metrics — builder task stats and recent completions
opusBridgeRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const [stats, recentTasks] = await Promise.all([
      getTaskStats(),
      getRecentCompletedTasks(),
    ]);
    res.json({ stats, recentTasks });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /cleanup — bulk-delete old blocked/cancelled/error tasks
opusBridgeRouter.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { statuses = ['blocked', 'cancelled', 'error'], dryRun = false } = req.body as {
      statuses?: string[]; dryRun?: boolean;
    };
    const targets = await db
      .select({ id: builderTasks.id, status: builderTasks.status, title: builderTasks.title })
      .from(builderTasks)
      .where(inArray(builderTasks.status, statuses));

    if (dryRun) {
      res.json({ dryRun: true, count: targets.length, statuses: statuses });
      return;
    }

    const FK_TABLES = [
      builderChatpool, builderActions, builderOpusLog, builderReviews,
      builderWorkerScores, builderErrorCards, builderArtifacts, builderTestResults,
      builderMemory,
    ];

    let deleted = 0;
    const failed: string[] = [];
    for (const task of targets) {
      try {
        for (const table of FK_TABLES) {
          await db.delete(table).where(eq((table as typeof builderChatpool).taskId, task.id)).catch(() => {});
        }
        // Also clear sourceTaskId FK on builderErrorCards
        await db.delete(builderErrorCards).where(eq(builderErrorCards.sourceTaskId, task.id)).catch(() => {});
        // Try Drizzle delete first, raw SQL CASCADE fallback
        try {
          await db.delete(builderTasks).where(eq(builderTasks.id, task.id));
        } catch {
          await db.execute(sql`DELETE FROM builder_tasks WHERE id = ${task.id}`);
        }
        deleted++;
      } catch {
        failed.push(task.id);
      }
    }

    res.json({ deleted, failed: failed.length, failedIds: failed.slice(0, 10), statuses });
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

    if (!worker || !message) {
      res.status(400).json({ error: 'worker and message are required' });
      return;
    }

    const defaultModelMap: Record<string, string> = {
      opus: 'claude-opus-4-6',
      claude: 'claude-opus-4-6',
      sonnet: 'claude-sonnet-4-6',
      gpt: 'gpt-5.4',
      'gpt-5.4': 'gpt-5.4',
      gemini: 'gemini-3-flash-preview',
      deepseek: 'deepseek-chat',
      glm: 'glm-5.1',
      'glm-turbo': 'glm-5-turbo',
      'glm-flash': 'glm-4.7-flashx',
      minimax: 'minimax/minimax-m2.7',
      kimi: 'moonshotai/kimi-k2.5',
      qwen: 'qwen/qwen3.6-plus',
      grok: 'grok-4-1-fast',
    };
    const resolvedModel = model || defaultModelMap[worker] || worker;

    const providerMap: Record<string, string> = {
      opus: 'anthropic',
      claude: 'anthropic',
      sonnet: 'anthropic',
      'gpt-5.4': 'openai',
      gpt: 'openai',
      gemini: 'gemini',
      deepseek: 'deepseek',
      glm: 'zhipu',
      'glm-turbo': 'zhipu',
      'glm-flash': 'zhipu',
      minimax: 'openrouter',
      kimi: 'openrouter',
      qwen: 'openrouter',
      grok: 'xai',
    };
    const provider = providerMap[worker] || worker;

    const startedAt = Date.now();
    const responseText = await callProvider(provider, resolvedModel, {
      system: system || 'Du bist ein hilfreicher Assistent.',
      messages: [{ role: 'user', content: message }],
      maxTokens: maxTokens || WORKER_MAX_TOKEN_CAP,
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

opusBridgeRouter.get('/session-info', (_req: Request, res: Response) => {
  res.json({ ...getSessionState(), serverUptime: process.uptime(), timestamp: new Date().toISOString() });
});

opusBridgeRouter.get('/worker-stats', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT
        worker,
        ROUND(AVG(quality)) as avg_quality,
        COUNT(*) as task_count,
        MIN(quality) as min_quality,
        MAX(quality) as max_quality
      FROM builder_worker_scores
      GROUP BY worker
      ORDER BY avg_quality DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/deploy-status', (_req: Request, res: Response) => {
  res.json({ uptime: process.uptime(), version: process.version });
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

opusBridgeRouter.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

opusBridgeRouter.get('/debug-scope', async (req: Request, res: Response) => {
  try {
    const { resolveScope, invalidateIndexCache } = await import('../lib/builderScopeResolver.js');
    invalidateIndexCache();
    const q = String(req.query.q || 'agentHabitat.ts');
    const start = Date.now();
    const result = resolveScope(q);

    res.json({
      ok: true,
      ms: Date.now() - start,
      query: q,
      filesFound: result.files.length,
      files: result.files.slice(0, 10),
      reasoning: result.reasoning.slice(0, 10),
      method: result.method,
    });
  } catch (err) {
    res.json({
      ok: false,
      error: String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3) : undefined,
    });
  }
});

// ==================== DIRECT PUSH (no LLM, just commit files) ====================
opusBridgeRouter.post('/delete', async (req: Request, res: Response) => {
  try {
    const { files, message, branch } = req.body as {
      files?: Array<{ file: string; delete?: boolean }>;
      message?: string;
      branch?: string;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'files[] required' });
      return;
    }

    const pat = process.env.GITHUB_PAT;
    if (!pat) {
      res.status(500).json({ error: 'GITHUB_PAT not configured' });
      return;
    }

    const repo = process.env.GITHUB_REPO || 'G-Dislioglu/soulmatch';
    const targetBranch = branch || 'main';
    const commitMessage = message || 'delete files via /delete';
    const results: Array<{ file: string; action: string; ok: boolean; error?: string }> = [];

    for (const f of files) {
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${f.file}?ref=${targetBranch}`;

      try {
        let sha: string | undefined;
        const getResp = await outboundFetch(apiUrl, {
          headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github.v3+json' },
        });
        if (getResp.ok) {
          const getData = await getResp.json() as Record<string, unknown>;
          sha = getData.sha as string;
        }

        if (!sha) {
          results.push({ file: f.file, action: 'delete', ok: false, error: 'file not found' });
          continue;
        }

        const delResp = await outboundFetch(`https://api.github.com/repos/${repo}/contents/${f.file}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: commitMessage, sha, branch: targetBranch }),
        });
        results.push({ file: f.file, action: 'delete', ok: delResp.ok, error: delResp.ok ? undefined : `${delResp.status}` });
      } catch (err) {
        results.push({ file: f.file, action: 'error', ok: false, error: String(err) });
      }
    }

    res.json({ results, branch: targetBranch, message: commitMessage });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==================== DIRECT PUSH (no LLM, just commit files) ====================
opusBridgeRouter.post('/push', async (req: Request, res: Response) => {
  try {
    const { files, message, branch } = req.body as {
      files?: Array<{ file: string; content?: string; search?: string; replace?: string }>;
      message?: string;
      branch?: string;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'files[] with {file, content} or {file, search, replace} required' });
      return;
    }

    const patches = files.map((f) => {
      if (f.search !== undefined && f.replace !== undefined) {
        // LEGACY: SEARCH/REPLACE mode — prefer full overwrite via {file, content}
        return {
          file: f.file,
          action: 'replace' as const,
          oldText: f.search,
          newText: f.replace,
        };
      }
      // Full overwrite mode
      return {
        file: f.file,
        action: 'overwrite' as const,
        content: f.content || '',
      };
    });

    const db = getDb();
    const [task] = await db
      .insert(builderTasks)
      .values({
        title: (message || 'direct push').slice(0, 100),
        goal: message || 'Direct file push via /push endpoint',
        scope: files.map((f) => f.file),
        risk: 'low',
        status: 'applying',
      })
      .returning();

    const result = await triggerGithubActionChunked(task.id, patches, branch);

    if (!result.triggered) {
      await db.update(builderTasks).set({ status: 'error' }).where(eq(builderTasks.id, task.id));
    }

    res.json({
      taskId: task.id,
      triggered: result.triggered,
      chunks: result.chunks,
      error: result.error,
      files: files.map((f) => f.file),
      message: message || 'direct push',
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==================== DB MIGRATE (drizzle-kit push) ====================
opusBridgeRouter.post('/migrate', (_req: Request, res: Response) => {
  try {
    // drizzle.config.ts lives in server/ — which is process.cwd() on Render
    const output = execSync('npx drizzle-kit push', {
      cwd: process.cwd(),
      env: { ...process.env },
      encoding: 'utf-8',
      timeout: 30_000,
    });
    res.json({ ok: true, output });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMessage });
  }
});

// ==================== REGEN-INDEX ====================
opusBridgeRouter.get('/regen-index', async (_req: Request, res: Response) => {
  try {
    const result = await regenerateRepoIndex();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ==================== DECOMPOSER (dry-run, $0) ====================
import { decompose } from '../lib/opusDecomposer.js';

opusBridgeRouter.post('/decompose', async (req: Request, res: Response) => {
  try {
    const { goal, scope, risk } = req.body as {
      goal?: string;
      scope?: string[];
      risk?: string;
    };

    if (!goal || !Array.isArray(scope) || scope.length === 0) {
      res.status(400).json({ error: 'goal and scope[] required' });
      return;
    }

    const result = await decompose({
      taskGoal: goal,
      scope,
      risk: (risk ?? 'low') as 'low' | 'medium' | 'high',
    });

    res.json({
      stats: result.stats,
      graphContext: {
        nodesFound: result.graphContext.nodes.length,
        edgesFound: result.graphContext.edges.length,
        entryOrder: result.graphContext.entryOrder,
        reuseCandidates: result.graphContext.reuseCandidates,
        forbiddenZones: result.graphContext.forbiddenZones,
        seams: result.graphContext.seams,
      },
      cutUnits: result.cutUnits.map((u) => ({
        id: u.id,
        file: u.file,
        totalLines: u.totalLines,
        complexity: u.complexity,
        dependsOn: u.dependsOn,
        blocks: u.blocks.map((b) => ({
          name: b.name,
          type: b.blockType,
          lines: `${b.startLine}-${b.endLine}`,
          lineCount: b.lineCount,
        })),
      })),
      assignments: result.assignments.map((a) => ({
        file: a.file,
        writer: a.writer,
        complexity: a.cutUnit.complexity,
        blocks: a.cutUnit.blocks.map((b) => b.name).join(', '),
        dependsOn: a.dependsOn,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/pipeline-info', (_req, res) => res.json({
  canonicalExecutor: '/opus-task',
  pipeline: 'opus-task-v2',
  scopeMethod: 'deterministic-index',
  changeContract: 'json-overwrite',
  judge: 'gpt-5.4',
  workers: ['glm', 'minimax', 'qwen', 'kimi'],  // deepseek removed from code workers (unreliable patches)
  denkerTriade: {
    vordenker: 'opusVordenker.ts',
    meisterPlan: 'opusMeisterPlan.ts',
    nachdenker: 'opusNachdenker.ts',
    orchestrator: 'opusFeatureOrchestrator.ts',
  },
  legacy: ['/opus-task', '/build'],
  promotionNote: 'triggered ≠ committed — Action may reject on red build',
}));

// ==================== DAILY STANDUP ($0, keine LLM-Kosten) ====================
import { runDailyStandup, cleanupInvalidScores } from '../lib/opusDailyStandup.js';

opusBridgeRouter.get('/standup', async (_req: Request, res: Response) => {
  try {
    const report = await runDailyStandup();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/standup/cleanup', async (_req: Request, res: Response) => {
  try {
    const result = await cleanupInvalidScores();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==================== RENDER CONTROL ====================
import {
  getDeployStatus,
  triggerRedeploy,
  listEnvVars,
  updateEnvVar,
  getServerInfo,
} from '../lib/opusRenderBridge.js';

opusBridgeRouter.get('/render/status', async (_req: Request, res: Response) => {
  try {
    const [deploy, server] = await Promise.all([getDeployStatus(), Promise.resolve(getServerInfo())]);
    res.json({ server, deploy });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/render/redeploy', async (_req: Request, res: Response) => {
  try {
    const result = await triggerRedeploy();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/render/env', async (_req: Request, res: Response) => {
  try {
    const result = await listEnvVars();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.put('/render/env/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body as { value?: string };
    if (!value) {
      res.status(400).json({ error: 'value is required' });
      return;
    }
    const result = await updateEnvVar(key, value);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
// ==================== POST /build — LEGACY/SHADOW — Use /opus-task instead ====================
// Kept for: advisory analysis, complex multi-file research, backward compatibility.
// NOT the canonical executor. Do not use for standard deployments.

opusBridgeRouter.post('/build', async (req: Request, res: Response) => {
  try {
    const input = req.body as BuildInput;
    if (!input.instruction) {
      res.status(400).json({ error: 'instruction is required' });
      return;
    }
    // Long-running — increase timeout
    req.setTimeout(300_000); // 5 min
    const result = await runBuildPipeline(input);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==================== POST /self-test — Builder tests itself ====================

opusBridgeRouter.post('/self-test', async (req: Request, res: Response) => {
  try {
    const { checks } = req.body as { checks?: SelfTestCheck[] };
    if (!checks || !Array.isArray(checks)) {
      // Quick health check if no checks provided
      const healthy = await selfHealthCheck();
      res.json({ allPassed: healthy, mode: 'quick-health' });
      return;
    }
    const result = await selfVerify(checks);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});


// ─── /benchmark: Alle Worker parallel, gesammelte Ergebnisse ───
opusBridgeRouter.post('/benchmark', async (req: Request, res: Response) => {
  try {
    const { task, workers, maxTokens, system, featureKeywords, timeoutMs } = req.body as {
      task: string;
      workers?: string[];
      maxTokens?: number;
      system?: string;
      featureKeywords?: string[];
      timeoutMs?: number;
    };
    if (!task) { res.status(400).json({ error: 'task is required' }); return; }
    const { runBenchmark } = await import('../lib/opusAssist.js');
    const { DEFAULT_WORKERS } = await import('../lib/opusWorkerRegistry.js');
    const defaultWorkers = workers || DEFAULT_WORKERS;
    const result = await runBenchmark(task, defaultWorkers, { maxTokens, system, featureKeywords, timeoutMs });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── /deploy-wait: Wartet bis Render-Deploy live ist ───
opusBridgeRouter.post('/deploy-wait', async (_req: Request, res: Response) => {
  try {
    const { waitForDeploy } = await import('../lib/opusAssist.js');
    const serviceId = process.env.RENDER_SERVICE_ID || '';
    const apiKey = process.env.RENDER_API_KEY || '';
    if (!serviceId || !apiKey) { res.status(500).json({ error: 'RENDER_SERVICE_ID or RENDER_API_KEY not set' }); return; }
    const result = await waitForDeploy(serviceId, apiKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── /opus-task: CANONICAL EXECUTOR — deterministic scope, JSON overwrite, validated ───
opusBridgeRouter.post('/opus-task', async (req: Request, res: Response) => {
  try {
    const { instruction, scope, targetFile, workers, maxTokens, skipDeploy, dryRun, approvalId, hasApprovedPlan, metaSourceIds, assumptions, assumptionIds } = req.body as {
      instruction: string;
      scope?: string[];
      targetFile?: string;
      workers?: string[];
      maxTokens?: number;
      skipDeploy?: boolean;
      dryRun?: boolean;
      approvalId?: string;
      hasApprovedPlan?: boolean;
      metaSourceIds?: string[];
      assumptions?: string[];
      assumptionIds?: string[];
    };
    if (!instruction) { res.status(400).json({ error: 'instruction is required' }); return; }
    const { orchestrateTask } = await import('../lib/opusTaskOrchestrator.js');
        const result = await orchestrateTask({ instruction, scope, targetFile, workers, maxTokens, skipDeploy, dryRun, approvalId, hasApprovedPlan, metaSourceIds, assumptions, assumptionIds });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/opus-feature', async (req: Request, res: Response) => {
  try {
    const { intent, requirements, constraints, complexity, dryRun } = req.body as {
      intent?: string;
      requirements?: string[];
      constraints?: string[];
      complexity?: string;
      dryRun?: boolean;
    };

    if (!intent) {
      res.status(400).json({ error: 'intent required' });
      return;
    }

    const featureId = `feat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const { orchestrateFeature } = await import('../lib/opusFeatureOrchestrator.js');
    const result = await orchestrateFeature({
      featureId,
      description: intent,
      context: JSON.stringify({ requirements, constraints, complexity }),
      skipDryRun: !dryRun,
      skipDeploy: !!dryRun,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/version', (_req: Request, res: Response) => {
  res.json({ version: "opus-bridge-v4", uptime: process.uptime() });
});

opusBridgeRouter.get('/opus-status', (_req: Request, res: Response) => {
  res.json({
    endpoints: 36,
    workers: 6,
    meisterTokens: WORKER_MAX_TOKEN_CAP,
    workerTokens: WORKER_MAX_TOKEN_CAP,
    features: ['benchmark', 'deploy-wait', 'opus-task', 'build', 'self-test'],
  });
});


// ==================== COUNCIL DEBATE ENDPOINT ====================
// POST /council-debate — run an architecture debate with 4 AI perspectives
opusBridgeRouter.post('/council-debate', async (req: Request, res: Response) => {
  try {
    const { topic, context, requirements, constraints } = req.body as {
      topic?: string;
      context?: string;
      requirements?: string[];
      constraints?: string[];
    };
    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }
    const { runCouncilDebate } = await import('../lib/councilDebate.js');

    const debateId = `debate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Wait for the task row to exist (fast — just one INSERT), then return
    // the real taskId to the caller. The rest of the debate runs in background.
    let resolveTaskId!: (id: string) => void;
    let rejectTaskId!: (err: unknown) => void;
    const taskIdPromise = new Promise<string>((resolve, reject) => {
      resolveTaskId = resolve;
      rejectTaskId = reject;
    });

    // Fire-and-forget the debate — results land in chatPool
    runCouncilDebate({
      topic,
      context,
      requirements,
      constraints,
      onTaskCreated: (id) => resolveTaskId(id),
    }).catch((err: unknown) => {
      console.error(`[council-debate] ${debateId} failed:`, err);
      // If we never got a taskId, reject the promise so the caller gets a 500
      rejectTaskId(err);
    });

    // Race: if runCouncilDebate fails before creating the task, the catch above
    // rejects taskIdPromise and we return an error. Normal path: we get the id.
    const taskId = await taskIdPromise;

    res.json({
      status: 'started',
      debateId,
      taskId,
      message:
        'Debate running in background. Poll GET /council-debate/status/{taskId} (add ?full=true for round contents) or watch the Council LIVE feed.',
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /council-debate/status/:taskId — check debate progress
// Query: ?full=true returns full `content` per round instead of a 200-char preview.
opusBridgeRouter.get('/council-debate/status/:taskId', async (req: Request, res: Response) => {
  try {
    const db = (await import('../db.js')).getDb();
    const { builderChatpool: cp, builderTasks: bt } = await import('../schema/builder.js');
    const { eq } = await import('drizzle-orm');

    const task = await db.select().from(bt).where(eq(bt.id, req.params.taskId)).limit(1);
    if (!task.length) { res.status(404).json({ error: 'not found' }); return; }

    const rounds = await db.select().from(cp).where(eq(cp.taskId, req.params.taskId)).orderBy(cp.round);

    const wantFull = req.query.full === 'true' || req.query.full === '1';

    res.json({
      taskId: req.params.taskId,
      status: task[0].status,
      title: task[0].title,
      roundsCompleted: rounds.length,
      rounds: rounds.map(r => {
        const base = {
          round: r.round,
          actor: r.actor,
          model: r.model,
          chars: r.content.length,
          durationMs: r.durationMs,
        };
        return wantFull
          ? { ...base, content: r.content }
          : { ...base, preview: r.content.substring(0, 200) };
      }),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==================== PATROL ENDPOINTS ====================
// GET /patrol-status — aggregated patrol statistics
opusBridgeRouter.get('/patrol-status', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // Count all patrol findings by severity
    const allFindings = await db
      .select({ severity: builderErrorCards.severity, tags: builderErrorCards.tags })
      .from(builderErrorCards)
      .where(sql`${builderErrorCards.foundBy} LIKE 'routine-patrol' OR ${builderErrorCards.foundBy} LIKE 'deep-%'`);

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let triaged = 0;
    let crossConfirmed = 0;

    for (const f of allFindings) {
      const sev = (f.severity ?? 'medium') as keyof typeof bySeverity;
      if (sev in bySeverity) bySeverity[sev]++;

      const tags = f.tags ?? [];
      if (tags.includes('triaged') || tags.includes('verified') || tags.includes('fixed')) triaged++;
      if (tags.includes('cross-confirmed')) crossConfirmed++;
    }

    // Get latest round timestamp
    const [latest] = await db
      .select({ createdAt: builderErrorCards.createdAt })
      .from(builderErrorCards)
      .where(sql`${builderErrorCards.foundBy} LIKE 'routine-patrol' OR ${builderErrorCards.foundBy} LIKE 'deep-%'`)
      .orderBy(desc(builderErrorCards.createdAt))
      .limit(1);

    res.json({
      lastRound: latest?.createdAt ?? null,
      totalFindings: allFindings.length,
      bySeverity,
      triaged,
      crossConfirmed,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /patrol-findings — list patrol findings with optional filters
opusBridgeRouter.get('/patrol-findings', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const severity = typeof req.query.severity === 'string' ? req.query.severity : undefined;
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);

    const baseWhere = sql`${builderErrorCards.foundBy} LIKE 'routine-patrol' OR ${builderErrorCards.foundBy} LIKE 'deep-%'`;
    const severityWhere = severity ? sql`${builderErrorCards.severity} = ${severity}` : sql``;

    const findings = await db
      .select()
      .from(builderErrorCards)
      .where(severity ? and(baseWhere, severityWhere) : baseWhere)
      .orderBy(desc(builderErrorCards.createdAt))
      .limit(limit);

    res.json({
      count: findings.length,
      findings: findings.map((f) => ({
        id: f.id,
        title: f.title,
        category: f.category,
        severity: f.severity,
        tags: f.tags,
        problem: f.problem,
        solution: f.solution,
        affectedFiles: f.affectedFiles,
        foundBy: f.foundBy,
        createdAt: f.createdAt,
        resolvedAt: f.resolvedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /patrol-trigger-round — trigger a routine patrol round
opusBridgeRouter.post('/patrol-trigger-round', async (_req: Request, res: Response) => {
  try {
    const result = await runRoutinePatrol();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /patrol-trigger-deep — trigger a deep patrol scan
opusBridgeRouter.post('/patrol-trigger-deep', async (req: Request, res: Response) => {
  try {
    const { models, files } = req.body as { models?: string[]; files?: string[] };

    if (!models?.length || !files?.length) {
      res.status(400).json({ error: 'models[] and files[] are required' });
      return;
    }

    const results = await runDeepPatrol(models, files);
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.post('/repo-query', async (req: Request, res: Response) => {
  try {
    const { query, glob, maxFiles = 8, maxLinesPerFile = 200 } = req.body as {
      query: string;
      glob?: string;
      maxFiles?: number;
      maxLinesPerFile?: number;
    };
    if (!query) { res.status(400).json({ error: 'query required' }); return; }

    const repoRoot = getRepoRoot();

    const keywords = query
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s_-]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !['wird','werden','nicht','eine','einen','dieser','diese','welche','warum','soll','kann','haben','sein','ueber','auch','noch','schon','dass'].includes(w.toLowerCase()));

    const fileHits: Record<string, number> = {};
    for (const kw of keywords.slice(0, 5)) {
      const results = await findPattern(repoRoot, kw, glob || '*.ts');
      for (const r of results) {
        fileHits[r.file] = (fileHits[r.file] || 0) + 1;
      }
    }

    const topFiles = Object.entries(fileHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxFiles)
      .map(([file]) => file);

    const fileContents: Array<{file: string, content: string, lines: number}> = [];
    for (const file of topFiles) {
      try {
        const result = await readFile(repoRoot, file);
        const trimmed = result.content.split('\n').slice(0, maxLinesPerFile).join('\n');
        fileContents.push({ file, content: trimmed, lines: result.lines });
      } catch { /* skip unreadable */ }
    }

    const contextBlock = fileContents
      .map(f => '=== ' + f.file + ' (' + f.lines + ' lines) ===\n' + f.content)
      .join('\n\n');

    const response = await callProvider('zhipu', 'glm-5-turbo', {
      system: 'Du bist ein Repo-Analyst fuer das Soulmatch-Projekt. Beantworte die Frage basierend NUR auf den gezeigten Dateien. Antworte auf Deutsch, kompakt, mit Dateinamen und Zeilennummern wo relevant. Keine Spekulationen ueber nicht gezeigte Dateien. Antworte als reiner Text, NICHT als JSON-Objekt.',
      messages: [{ role: 'user', content: 'Frage: ' + query + '\n\nRepo-Dateien:\n' + contextBlock }],
      temperature: 0.2,
      maxTokens: 1000,
    });

    // Unwrap double-JSON from GLM (e.g. {"answer":"..."} wrapping)
    let cleanAnswer = response;
    if (typeof cleanAnswer === 'string') {
      try {
        const parsed = JSON.parse(cleanAnswer);
        if (parsed && typeof parsed.answer === 'string') cleanAnswer = parsed.answer;
      } catch { /* not JSON, use as-is */ }
    }

    res.json({
      answer: cleanAnswer,
      sources: topFiles,
      filesRead: fileContents.length,
      keywords,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==================== Phase 3: Continuity Memory + UI ====================

// GET /task-history — recent tasks with status, duration, worker info
opusBridgeRouter.get('/task-history', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const tasks = await db
      .select()
      .from(builderTasks)
      .orderBy(desc(builderTasks.createdAt))
      .limit(20);
    res.json({
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        risk: t.risk,
        taskType: t.taskType,
        scope: t.scope,
        commitHash: t.commitHash,
        tokenCount: t.tokenCount,
        durationMs: Math.max(0, new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()),
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /memory — current builder memory state
opusBridgeRouter.get('/memory', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const [episodes, semantic, profiles, continuity] = await Promise.all([
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'episode')).orderBy(desc(builderMemory.updatedAt)).limit(10),
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'semantic')).orderBy(desc(builderMemory.updatedAt)).limit(5),
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'worker_profile')).orderBy(desc(builderMemory.updatedAt)).limit(10),
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'continuity')).orderBy(desc(builderMemory.updatedAt)).limit(5),
    ]);
    const contextString = await buildBuilderMemoryContext();
    res.json({
      episodes: episodes.map((e) => ({ key: e.key, summary: e.summary, worker: e.worker, updatedAt: e.updatedAt })),
      semantic: semantic.map((s) => ({ key: s.key, summary: s.summary, payload: s.payload })),
      workerProfiles: profiles.map((p) => ({ key: p.key, summary: p.summary, payload: p.payload })),
      continuityNotes: continuity.map((c) => ({ key: c.key, summary: c.summary, updatedAt: c.updatedAt })),
      contextString,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /continuity-note — save a session handoff note
opusBridgeRouter.post('/continuity-note', async (req: Request, res: Response) => {
  try {
    const { note, session } = req.body as { note?: string; session?: string };
    if (!note) { res.status(400).json({ error: 'note is required' }); return; }
    const key = `continuity:${session || new Date().toISOString().slice(0, 10)}`;
    const db = getDb();
    const existing = await db.select({ id: builderMemory.id }).from(builderMemory).where(eq(builderMemory.key, key));
    for (const row of existing) { await db.delete(builderMemory).where(eq(builderMemory.id, row.id)); }
    const [inserted] = await db.insert(builderMemory).values({
      layer: 'continuity',
      key,
      summary: note.slice(0, 2000),
      payload: { session: session || null, savedAt: new Date().toISOString() },
      updatedAt: new Date(),
    }).returning();
    res.json({ saved: true, key, id: inserted.id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /continuity-note — read latest continuity notes
opusBridgeRouter.get('/continuity-note', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const notes = await db.select().from(builderMemory).where(eq(builderMemory.layer, 'continuity')).orderBy(desc(builderMemory.updatedAt)).limit(5);
    res.json({ notes: notes.map((n) => ({ key: n.key, note: n.summary, updatedAt: n.updatedAt })) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==================== Direct GitHub Push (no GH Action needed) ====================

// POST /git-push — push files directly via GitHub Git Data API as one atomic commit.
// Bypasses the GH Action pipeline. Use for config files, workflow changes, cleanup.
opusBridgeRouter.post('/git-push', async (req: Request, res: Response) => {
  const { files, message, branch, sessionLog } = req.body as {
    files?: DirectGitPushFile[];
    message?: string;
    branch?: string;
    sessionLog?: { taskId?: string; skip?: boolean };
  };

  const sessionLogSkip: boolean = sessionLog?.skip === true;
  const sessionLogTaskId: string | undefined = sessionLog?.taskId;
  let sessionLogTimestamp: string | null = null;

  const targetBranch = branch || 'main';
  const commitMessage = message || 'direct push via /git-push';

  if (!files || !Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: 'files[] with {file, content} or {file, delete:true} required' });
    return;
  }

  const normalizedFiles = normalizeDirectGitPushFiles(files);
  const duplicatePath = findDuplicateGitPushPath(normalizedFiles);
  if (duplicatePath) {
    res.status(400).json({ error: `duplicate file path in payload: ${duplicatePath}` });
    return;
  }

  let plannedResults = buildGitPushActions(normalizedFiles);

  try {
    const pat = process.env.GITHUB_PAT;
    if (!pat) {
      res.status(500).json({ error: 'GITHUB_PAT not configured' });
      return;
    }

    const repo = process.env.GITHUB_REPO || 'G-Dislioglu/soulmatch';
    const branchRef = encodeURIComponent(targetBranch);
    const ref = await githubGitRequest<GitHubRefResponse>(
      `https://api.github.com/repos/${repo}/git/ref/heads/${branchRef}`,
      pat,
      'ref lookup failed',
    );
    const parentCommitSha = ref.object?.sha;
    if (!parentCommitSha) {
      throw new Error('ref lookup failed: missing parent commit sha');
    }

    const parentCommit = await githubGitRequest<GitHubCommitResponse>(
      `https://api.github.com/repos/${repo}/git/commits/${parentCommitSha}`,
      pat,
      'parent commit lookup failed',
    );
    const baseTreeSha = parentCommit.tree?.sha;
    if (!baseTreeSha) {
      throw new Error('parent commit lookup failed: missing base tree sha');
    }

    const baseTree = await githubGitRequest<GitHubTreeResponse>(
      `https://api.github.com/repos/${repo}/git/trees/${baseTreeSha}?recursive=1`,
      pat,
      'base tree lookup failed',
    );
    const existingPaths = new Set(
      (baseTree.tree ?? [])
        .filter((entry) => entry.type === 'blob' && typeof entry.path === 'string')
        .map((entry) => entry.path as string),
    );
    plannedResults = buildGitPushActions(normalizedFiles, existingPaths);

    const missingDelete = normalizedFiles.find((file) => file.delete && !existingPaths.has(file.file));
    if (missingDelete) {
      res.json({
        results: buildGitPushFailureResults(plannedResults, `delete target not found: ${missingDelete.file}`),
        branch: targetBranch,
        message: commitMessage,
      });
      return;
    }

    const blobShas = new Map<string, string>();
    for (const file of normalizedFiles) {
      if (file.delete) {
        continue;
      }

      const blob = await githubGitRequest<GitHubBlobResponse>(
        `https://api.github.com/repos/${repo}/git/blobs`,
        pat,
        `blob creation failed for ${file.file}`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: Buffer.from(file.content ?? '', 'utf8').toString('base64'),
            encoding: 'base64',
          }),
        },
      );

      if (!blob.sha) {
        throw new Error(`blob creation failed for ${file.file}: missing blob sha`);
      }

      blobShas.set(file.file, blob.sha);
    }

    // Tree-Items für die User-Files vorab bauen, damit wir ggf. Session-Log-Einträge injizieren können.
    const treeItems: Array<{ path: string; mode: string; type: string; sha?: string | null; content?: string }> = normalizedFiles.map((file) => {
      if (file.delete) {
        return { path: file.file, mode: '100644', type: 'blob', sha: null };
      }
      return { path: file.file, mode: '100644', type: 'blob', sha: blobShas.get(file.file) };
    });

    // Session-Log-Injection: fault-tolerant, nutzt bestehende githubGitRequest-Infrastruktur.
    // Kein Rekursions-Problem: docs/SESSION-LOG.md und docs/SESSION-LOG-archive-*.md werden
    // aus der Files-Liste des Log-Eintrags gefiltert.
    if (!sessionLogSkip) {
      try {
        // Aktuellen Inhalt von docs/SESSION-LOG.md holen (404-tolerant).
        let currentLogContent = '';
        try {
          const existing = await githubGitRequest<{ content?: string }>(
            `https://api.github.com/repos/${repo}/contents/docs/SESSION-LOG.md?ref=${branchRef}`,
            pat,
            'session-log read',
          );
          if (existing.content) {
            currentLogContent = Buffer.from(existing.content, 'base64').toString('utf-8');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('404')) {
            console.warn('[session-log] unexpected read error:', msg);
          }
        }

        // Files-Liste für den Log-Eintrag: die Log-Datei selbst und Archiv-Dateien ausschließen.
        const filesForLog = normalizedFiles
          .map((f) => f.file)
          .filter((p) => p !== 'docs/SESSION-LOG.md' && !p.startsWith('docs/SESSION-LOG-archive-'));

        sessionLogTimestamp = new Date().toISOString();
        const newEntry = formatSessionLogEntry({
          commitShaShort: 'pending',
          commitMessage,
          filesChanged: filesForLog,
          timestamp: sessionLogTimestamp,
          taskId: sessionLogTaskId,
          pushedBy: 'opus-bridge',
        });

        const { updatedContent, archiveContent, archiveFileName } = buildSessionLogBlob(
          currentLogContent,
          newEntry,
        );

        // Bei Rotation: ggf. existierendes Archiv holen und neuen Archiv-Content anhängen.
        let finalArchiveContent = archiveContent;
        if (archiveContent && archiveFileName) {
          try {
            const existingArchive = await githubGitRequest<{ content?: string }>(
              `https://api.github.com/repos/${repo}/contents/${archiveFileName}?ref=${branchRef}`,
              pat,
              'archive read',
            );
            if (existingArchive.content) {
              const prior = Buffer.from(existingArchive.content, 'base64').toString('utf-8');
              finalArchiveContent = prior + '\n' + archiveContent;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes('404')) {
              console.warn('[session-log] archive read error:', msg);
            }
          }
        }

        treeItems.push({ path: 'docs/SESSION-LOG.md', mode: '100644', type: 'blob', content: updatedContent });
        if (finalArchiveContent && archiveFileName) {
          treeItems.push({ path: archiveFileName, mode: '100644', type: 'blob', content: finalArchiveContent });
        }

        console.log('[session-log] injected session log entry into commit tree');
      } catch (err) {
        // Fault-tolerant: Log-Fehler blockiert nicht den Haupt-Push.
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[session-log] injection failed, proceeding without log:', msg);
      }
    }

    const tree = await githubGitRequest<GitHubTreeResponse>(
      `https://api.github.com/repos/${repo}/git/trees`,
      pat,
      'tree creation failed',
      {
        method: 'POST',
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      },
    );

    if (!tree.sha) {
      throw new Error('tree creation failed: missing tree sha');
    }

    if (tree.sha === baseTreeSha) {
      res.json({
        results: buildGitPushFailureResults(plannedResults, 'no changes to commit'),
        branch: targetBranch,
        message: commitMessage,
      });
      return;
    }

    const commit = await githubGitRequest<GitHubCommitResponse>(
      `https://api.github.com/repos/${repo}/git/commits`,
      pat,
      'commit creation failed',
      {
        method: 'POST',
        body: JSON.stringify({
          message: commitMessage,
          tree: tree.sha,
          parents: [parentCommitSha],
        }),
      },
    );

    if (!commit.sha) {
      throw new Error('commit creation failed: missing commit sha');
    }

    await githubGitRequest<Record<string, unknown>>(
      `https://api.github.com/repos/${repo}/git/refs/heads/${branchRef}`,
      pat,
      'ref update failed',
      {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: false }),
      },
    );

    res.json({
      results: plannedResults.map((result) => ({
        ...result,
        ok: true,
        error: undefined,
        commitSha: commit.sha,
      })),
      branch: targetBranch,
      message: commitMessage,
      postPushReview: {
        commitSha: commit.sha,
        pushTimestamp: new Date().toISOString(),
        anchors: [
          `https://raw.githubusercontent.com/${repo}/${commit.sha}/STATE.md`,
          `https://raw.githubusercontent.com/${repo}/${commit.sha}/RADAR.md`,
          `https://raw.githubusercontent.com/${repo}/${commit.sha}/docs/CLAUDE-CONTEXT.md`,
          `https://raw.githubusercontent.com/${repo}/${commit.sha}/docs/SESSION-STATE.md`,
        ],
        changedFiles: normalizedFiles
          .filter((file) => !file.delete)
          .map((file) => `https://raw.githubusercontent.com/${repo}/${commit.sha}/${file.file}`),
      },
    });

    // Session-Log-SHA-Nachzug: nach erfolgreichem Hauptcommit den `pending`-Marker
    // durch den echten Commit-SHA ersetzen. Fault-tolerant — Fehler hier blockieren
    // nichts, der User hat schon seine Response. docs/** liegt im paths-ignore der
    // render-deploy.yml, dieser Zweitcommit löst also keinen Render-Deploy aus.
    if (!sessionLogSkip && sessionLogTimestamp && commit.sha) {
      void (async () => {
        try {
          const shortSha = commit.sha!.slice(0, 7);
          const logUrl = `https://api.github.com/repos/${repo}/contents/docs/SESSION-LOG.md?ref=${branchRef}`;
          const fresh = await githubGitRequest<{ content?: string; sha?: string }>(
            logUrl,
            pat,
            'session-log sha-backfill read',
          );
          if (!fresh.content || !fresh.sha) {
            console.warn('[session-log] sha-backfill: empty log content or missing blob sha, skipping');
            return;
          }
          const currentText = Buffer.from(fresh.content, 'base64').toString('utf-8');

          // Finde den Eintrag über den eindeutigen Timestamp und ersetze 'pending'.
          // Der Eintrag hat die Form:  ## <timestamp>\n- **Commit:** `pending` — ...
          const pendingMarker = `## ${sessionLogTimestamp}\n- **Commit:** \`pending\` —`;
          const realMarker = `## ${sessionLogTimestamp}\n- **Commit:** \`${shortSha}\` —`;
          if (!currentText.includes(pendingMarker)) {
            console.warn('[session-log] sha-backfill: pending marker not found, skipping');
            return;
          }
          const updatedText = currentText.replace(pendingMarker, realMarker);

          await githubGitRequest<Record<string, unknown>>(
            `https://api.github.com/repos/${repo}/contents/docs/SESSION-LOG.md`,
            pat,
            'session-log sha-backfill write',
            {
              method: 'PUT',
              body: JSON.stringify({
                message: `session-log: backfill sha ${shortSha}`,
                content: Buffer.from(updatedText, 'utf-8').toString('base64'),
                branch: targetBranch,
                sha: fresh.sha,
              }),
            },
          );
          console.log(`[session-log] sha-backfill: ${shortSha} written`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('[session-log] sha-backfill failed:', msg);
        }
      })();
    }

    // Deploy-Trigger wird ausschließlich von .github/workflows/render-deploy.yml übernommen:
    // Contents-API-Commits lösen push-Events aus → die Action wartet auf Render-Auto-Deploy
    // und fällt bei Bedarf auf den Deploy-Hook zurück. Ein zusätzlicher triggerRedeploy()
    // hier führte zu parallelen Deploys (Doppel-/Triple-Deploy-Bug, S29-Befund).
    // Für explizit erzwungene Redeploys existiert POST /render/redeploy.
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.json({
      results: buildGitPushFailureResults(plannedResults, error),
      branch: targetBranch,
      message: commitMessage,
    });
  }
});
