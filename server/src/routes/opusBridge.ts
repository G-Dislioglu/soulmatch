import * as fs from 'fs';
import * as path from 'path';
import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { convertBdlPatchesToPayload, triggerGithubAction, triggerGithubActionChunked } from '../lib/builderGithubBridge.js';
import { deleteBuilderMemoryForTask } from '../lib/builderMemory.js';
import { buildBuilderMemoryContext } from '../lib/builderMemory.js';
import { getSessionState, resetSession } from '../lib/opusBudgetGate.js';
import { executeTask } from '../lib/opusBridgeController.js';
import { runBuildPipeline, type BuildInput } from '../lib/opusBuildPipeline.js';
import { selfVerify, selfHealthCheck, type SelfTestCheck } from '../lib/opusSelfTest.js';
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
import { findPattern, readFile } from '../lib/builderFileIO.js';
import { getRepoRoot } from '../lib/builderExecutor.js';
import { regenerateRepoIndex } from '../lib/opusIndexGenerator.js';
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
      glm: 'glm-5-turbo',
      'glm-flash': 'glm-4.7-flash',
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
      maxTokens: maxTokens || 6000,
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

// ==================== DIRECT PUSH (no LLM, just commit files) ====================
opusBridgeRouter.post('/push', async (req: Request, res: Response) => {
  try {
    const { files, message } = req.body as {
      files?: Array<{ file: string; content?: string; search?: string; replace?: string }>;
      message?: string;
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

    const result = await triggerGithubActionChunked(task.id, patches);

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

    // Auto-Regen Index nach erfolgreichem Push (fire-and-forget)
    if (result.triggered) {
      regenerateRepoIndex().catch(err => console.error('[regen-index] auto-regen failed:', err));
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
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

// ==================== POST /cleanup — Cancel stuck tasks ====================

opusBridgeRouter.post('/cleanup', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const result = await db.update(builderTasks)
      .set({ status: 'cancelled' })
      .where(
        and(
          lt(builderTasks.createdAt, twoHoursAgo),
          inArray(builderTasks.status, [
            'review_needed', 'applying', 'scouting',
            'swarm', 'consensus', 'no_consensus', 'push_candidate',
          ]),
        ),
      )
      .returning({ id: builderTasks.id });

    res.json({ cleaned: result.length, timestamp: new Date().toISOString() });
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
    const { instruction, scope, targetFile, workers, maxTokens, skipDeploy, dryRun } = req.body as {
      instruction: string;
      scope?: string[];
      targetFile?: string;
      workers?: string[];
      maxTokens?: number;
      skipDeploy?: boolean;
      dryRun?: boolean;
    };
    if (!instruction) { res.status(400).json({ error: 'instruction is required' }); return; }
    const { orchestrateTask } = await import('../lib/opusTaskOrchestrator.js');
        const result = await orchestrateTask({ instruction, scope, targetFile, workers, maxTokens, skipDeploy, dryRun });
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
    meisterTokens: 6000,
    workerTokens: 6000,
    features: ['benchmark', 'deploy-wait', 'opus-task', 'build', 'self-test'],
  });
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

    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !['wird','werden','nicht','eine','einen','dieser','diese','welche','warum','soll','kann','haben','sein','ueber','auch','noch','schon','dass'].includes(w));

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

    const response = await callProvider('zhipu', 'glm-4.7-flash', {
      system: 'Du bist ein Repo-Analyst fuer das Soulmatch-Projekt. Beantworte die Frage basierend NUR auf den gezeigten Dateien. Antworte auf Deutsch, kompakt, mit Dateinamen und Zeilennummern wo relevant. Keine Spekulationen ueber nicht gezeigte Dateien.',
      messages: [{ role: 'user', content: 'Frage: ' + query + '\n\nRepo-Dateien:\n' + contextBlock }],
      temperature: 0.2,
      maxTokens: 1000,
    });

    res.json({
      answer: response,
      sources: topFiles,
      filesRead: fileContents.length,
      keywords,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
