import { Router, type Request, type Response } from 'express';
import { and, eq, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderReviews,
  builderTasks,
  builderTestResults,
  builderMemory,
} from '../schema/builder.js';
import { TASK_TYPE_TO_PROFILE, type TaskType } from '../lib/builderPolicyProfiles.js';
import { readFile, listFiles } from '../lib/builderFileIO.js';
import { getRepoRoot } from '../lib/builderExecutor.js';
import { extractTextContent } from '../lib/builderBdlParser.js';
import { buildTaskAudit, getCanaryPromotionStatus, getCurrentCanaryStage } from '../lib/builderCanary.js';
import { handleBuilderChat, type ChatMessage } from '../lib/builderFusionChat.js';
import { runDialogEngine } from '../lib/builderDialogEngine.js';
import { deleteBuilderMemoryForTask, syncBuilderMemoryForTask } from '../lib/builderMemory.js';
import { getPrototypeHtml, promotePrototype } from '../lib/builderPrototypeLane.js';
import { requireDevToken } from '../lib/requireDevToken.js';
import { callProvider } from '../lib/providers.js';

const router = Router();

// GET /api/builder/preview/:taskId — prototype preview without dev token
router.get('/preview/:taskId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select({ id: builderTasks.id })
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.taskId))
      .limit(1);

    if (!task) {
      res.status(404).send('Task not found');
      return;
    }

    const html = await getPrototypeHtml(req.params.taskId);
    if (!html) {
      res.status(404).send('No preview available');
      return;
    }

    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[builder] GET /preview/:taskId error:', err);
    res.status(500).send('Preview error');
  }
});

router.use(requireDevToken);

// POST /api/builder/chat — natural language chat with Gemini
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

        const userId = req.body?.userId ?? (req as any).user?.id ?? (req as any).session?.userId ?? undefined;
    const response = await handleBuilderChat(message, history ?? [], userId);
    res.json(response);
  } catch (err) {
    console.error('[builder] POST /chat error:', err);
    res.status(500).json({ error: 'Chat error' });
  }
});

// GET /api/builder/canary — current canary config and promotion status
router.get('/canary', async (_req: Request, res: Response) => {
  try {
    const current = getCurrentCanaryStage();
    const promotion = await getCanaryPromotionStatus();
    res.json({
      currentStage: current.stage,
      config: current.config,
      manualPromotion: current.manualPromotion,
      envVar: current.envVar,
      promotion,
    });
  } catch (err) {
    console.error('[builder] GET /canary error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/files — list repo files or a subdirectory
router.get('/files', async (req: Request, res: Response) => {
  try {
    const repoRoot = getRepoRoot();
    const subPath = typeof req.query.path === 'string' ? req.query.path : undefined;
    const files = await listFiles(repoRoot, subPath);
    res.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to list files';
    const status = message.includes('blocked') || message.includes('scope') ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

// GET /api/builder/files/* — read a repo file as text
router.get('/files/*', async (req: Request, res: Response) => {
  try {
    const repoRoot = getRepoRoot();
    const relativePath = req.params[0] ?? '';
    const file = await readFile(repoRoot, relativePath);
    res.json(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to read file';
    const status = message.includes('ENOENT')
      ? 404
      : message.includes('blocked') || message.includes('scope')
        ? 403
        : 500;
    res.status(status).json({ error: message });
  }
});

// GET /api/builder/tasks — list all tasks, optional ?status= filter
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

    const tasks = statusFilter
      ? await db
          .select()
          .from(builderTasks)
          .where(eq(builderTasks.status, statusFilter))
          .orderBy(desc(builderTasks.createdAt))
          .limit(50)
      : await db
          .select()
          .from(builderTasks)
          .orderBy(desc(builderTasks.createdAt))
          .limit(50);

    res.json(tasks);
  } catch (err) {
    console.error('[builder] GET /tasks error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks — create a new task
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { title, goal, risk, taskType } = req.body as {
      title: string;
      goal: string;
      risk?: string;
      taskType: string;
    };

    if (!title || !goal || !taskType) {
      res.status(400).json({ error: 'title, goal and taskType are required' });
      return;
    }

    const policyProfile = TASK_TYPE_TO_PROFILE[taskType as TaskType] ?? null;

    const db = getDb();
    const [created] = await db
      .insert(builderTasks)
      .values({
        title,
        goal,
        risk: risk ?? 'low',
        taskType,
        policyProfile,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('[builder] POST /tasks error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id — task by ID
router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (err) {
    console.error('[builder] GET /tasks/:id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/run — set status to classifying
router.post('/tasks/:id/run', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'queued') {
      res.status(409).json({ error: 'Task is not queued' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'classifying', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    void runDialogEngine(req.params.id).catch((error) => {
      console.error('[builder] dialog engine error:', error);
    });

    res.status(202).json({ taskId: updated.id, status: 'classifying' });
  } catch (err) {
    console.error('[builder] POST /tasks/:id/run error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id/dialog — raw or text-only dialog history
router.get('/tasks/:id/dialog', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const actions = await db
      .select()
      .from(builderActions)
      .where(eq(builderActions.taskId, req.params.id))
      .orderBy(asc(builderActions.createdAt));

    const format = req.query.format === 'text' ? 'text' : 'dsl';
    if (format !== 'text') {
      res.json(actions);
      return;
    }

    const textActions = actions.map((action) => {
      const payload = action.payload as Record<string, unknown> | null;
      const rawResponse = typeof payload?.rawResponse === 'string' ? payload.rawResponse : '';

      return {
        ...action,
        text: extractTextContent(rawResponse),
      };
    });

    res.json(textActions);
  } catch (err) {
    console.error('[builder] GET /tasks/:id/dialog error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id/evidence — latest evidence pack
router.get('/tasks/:id/evidence', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [artifact] = await db
      .select()
      .from(builderArtifacts)
      .where(and(
        eq(builderArtifacts.taskId, req.params.id),
        eq(builderArtifacts.artifactType, 'evidence_pack'),
      ))
      .orderBy(desc(builderArtifacts.createdAt))
      .limit(1);

    if (!artifact) {
      res.status(404).json({ error: 'Evidence pack not found' });
      return;
    }

    res.json(artifact.jsonPayload);
  } catch (err) {
    console.error('[builder] GET /tasks/:id/evidence error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id/audit — canary audit summary for a task
router.get('/tasks/:id/audit', async (req: Request, res: Response) => {
  try {
    const audit = await buildTaskAudit(req.params.id);

    if (!audit) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(audit);
  } catch (err) {
    console.error('[builder] GET /tasks/:id/audit error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/approve — set status to done, store commitHash
router.post('/tasks/:id/approve', async (req: Request, res: Response) => {
  try {
    const { commitHash } = req.body as { commitHash?: string };

    const db = getDb();
    const [task] = await db
      .select({ status: builderTasks.status })
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status === 'prototype_review') {
      res.status(409).json({ error: 'Use approve-prototype for prototype_review tasks' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'done', commitHash: commitHash ?? null, updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await syncBuilderMemoryForTask(req.params.id);

    res.json(updated);
  } catch (err) {
    console.error('[builder] POST /tasks/:id/approve error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/approve-prototype — promote preview and continue code lane
router.post('/tasks/:id/approve-prototype', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select({ status: builderTasks.status })
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'prototype_review') {
      res.status(409).json({ error: 'Task is not waiting for prototype review' });
      return;
    }

    const { approved, exclude } = req.body as { approved?: string[]; exclude?: string[] };
    const result = await promotePrototype(req.params.id, approved ?? [], exclude ?? []);

    if (!result.promoted) {
      res.status(400).json({ error: result.notes });
      return;
    }

    void runDialogEngine(req.params.id).catch((error) => {
      console.error('[builder] engine error:', error);
    });

    res.status(202).json(result);
  } catch (err) {
    console.error('[builder] POST /tasks/:id/approve-prototype error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/revise-prototype — send task back to prototype lane
router.post('/tasks/:id/revise-prototype', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body as { notes?: string };
    const db = getDb();
    const [task] = await db
      .select({ status: builderTasks.status })
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'prototype_review') {
      res.status(409).json({ error: 'Task is not waiting for prototype review' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'prototyping', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    void runDialogEngine(req.params.id).catch((error) => {
      console.error('[builder] engine error:', error);
    });

    res.status(202).json({ status: 'prototyping', notes: notes ?? 'Revision requested' });
  } catch (err) {
    console.error('[builder] POST /tasks/:id/revise-prototype error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/discard — discard a prototype under review
router.post('/tasks/:id/discard', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select({ status: builderTasks.status })
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'prototype_review') {
      res.status(409).json({ error: 'Use revert for non-prototype tasks' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'discarded', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await syncBuilderMemoryForTask(req.params.id);

    res.json(updated);
  } catch (err) {
    console.error('[builder] POST /tasks/:id/discard error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/revert — set status to reverted
router.post('/tasks/:id/revert', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select({ status: builderTasks.status })
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status === 'prototype_review') {
      res.status(409).json({ error: 'Use discard for prototype_review tasks' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'reverted', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await syncBuilderMemoryForTask(req.params.id);

    res.json(updated);
  } catch (err) {
    console.error('[builder] POST /tasks/:id/revert error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/builder/tasks/:id — delete a task and its related data
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const taskId = req.params.id;
    const [task] = await db
      .select({ id: builderTasks.id })
      .from(builderTasks)
      .where(eq(builderTasks.id, taskId));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await deleteBuilderMemoryForTask(taskId);
    await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, taskId));
    await db.delete(builderActions).where(eq(builderActions.taskId, taskId));
    await db.delete(builderTestResults).where(eq(builderTestResults.taskId, taskId));
    await db.delete(builderReviews).where(eq(builderReviews.taskId, taskId));
    await db.delete(builderTasks).where(eq(builderTasks.id, taskId));

    res.json({ deleted: true, taskId });
  } catch (err) {
    console.error('[builder] DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/execution-result — GitHub Actions callback
router.post('/tasks/:id/execution-result', requireDevToken, async (req: Request, res: Response) => {
  try {
    const { tsc, build, diff, run_id, run_url, commit_hash, committed } = req.body;
    const db = getDb();
    const taskId = req.params.id;

    await db.insert(builderActions).values({
      taskId,
      lane: 'code',
      kind: 'GITHUB_ACTION_RESULT',
      actor: 'system',
      payload: { tsc, build, diff, run_id, run_url },
      result: {
        tsc_ok: tsc === 'true',
        build_ok: build === 'true',
        committed: committed || false,
        commit_hash: commit_hash || null,
      },
      tokenCount: 0,
    });

    if (committed && commit_hash) {
      // Commit-confirmation callback (second call from GitHub Action)
      await db
        .update(builderTasks)
        .set({
          status: 'done',
          commitHash: commit_hash,
          updatedAt: new Date(),
        })
        .where(eq(builderTasks.id, taskId));
      await syncBuilderMemoryForTask(taskId);
    } else if (tsc === 'true' && build === 'true') {
      // Build-result callback (first call from GitHub Action)
      await db
        .update(builderTasks)
        .set({
          status: 'push_candidate',
          updatedAt: new Date(),
        })
        .where(eq(builderTasks.id, taskId));
    } else if (tsc || build) {
      // Build failed
      await db
        .update(builderTasks)
        .set({ status: 'review_needed', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));
      await syncBuilderMemoryForTask(taskId);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[builder] POST /tasks/:id/execution-result error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});


// ────────────────────────────────────────────────
// MAYA COMMAND CENTER — Phase 1 Endpoints
// ────────────────────────────────────────────────

// GET /api/builder/maya/context — aggregated dashboard snapshot
router.get('/maya/context', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const [tasks, episodes, continuity, workerStats] = await Promise.all([
      // Active tasks (last 10, newest first)
      db.select({
        id: builderTasks.id,
        title: builderTasks.title,
        status: builderTasks.status,
        risk: builderTasks.risk,
        taskType: builderTasks.taskType,
        updatedAt: builderTasks.updatedAt,
      }).from(builderTasks).orderBy(desc(builderTasks.updatedAt)).limit(10),

      // Recent memory episodes (last 5)
      db.select({
        id: builderMemory.id,
        key: builderMemory.key,
        summary: builderMemory.summary,
        updatedAt: builderMemory.updatedAt,
      }).from(builderMemory)
        .where(eq(builderMemory.layer, 'episodic'))
        .orderBy(desc(builderMemory.updatedAt))
        .limit(5),

      // Latest continuity notes (last 3)
      db.select({
        id: builderMemory.id,
        key: builderMemory.key,
        summary: builderMemory.summary,
        updatedAt: builderMemory.updatedAt,
      }).from(builderMemory)
        .where(eq(builderMemory.layer, 'continuity'))
        .orderBy(desc(builderMemory.updatedAt))
        .limit(3),

      // Worker stats (raw SQL for aggregation)
      db.execute(sql`
        SELECT worker,
          ROUND(AVG(quality)) as avg_quality,
          COUNT(*) as task_count
        FROM builder_worker_scores
        GROUP BY worker
        ORDER BY avg_quality DESC
        LIMIT 8
      `).catch(() => ({ rows: [] })),
    ]);

    res.json({
      tasks,
      memory: { episodes },
      continuityNotes: continuity,
      workerStats: workerStats.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[maya] GET /maya/context error:', err);
    res.status(500).json({ error: 'Context aggregation failed' });
  }
});

// POST /api/builder/maya/chat — Maya command center chat
router.post('/maya/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message) {
      res.status(400).json({ error: 'message required' });
      return;
    }

    const db = getDb();

    // Aggregate hot context (max 2 background calls per Council rule)
    const [tasks, continuity] = await Promise.all([
      db.select({
        id: builderTasks.id,
        title: builderTasks.title,
        status: builderTasks.status,
        risk: builderTasks.risk,
      }).from(builderTasks).orderBy(desc(builderTasks.updatedAt)).limit(8),

      db.select({
        summary: builderMemory.summary,
      }).from(builderMemory)
        .where(eq(builderMemory.layer, 'continuity'))
        .orderBy(desc(builderMemory.updatedAt))
        .limit(1),
    ]);

    const taskSummary = tasks.map(t => `[${t.status}] ${t.title} (risk:${t.risk})`).join('\n');
    const lastNote = continuity[0]?.summary || 'Keine Continuity Note.';

    const systemPrompt = `Du bist Maya — die zentrale Steuereinheit des Opus-Bridge Builder-Systems im Soulmatch-Projekt. Du sprichst Deutsch.

DEIN LIVE-KONTEXT:
Continuity (letzte Session): ${lastNote}

Aktive Tasks:
${taskSummary || 'Keine Tasks.'}

DEINE FÄHIGKEITEN:
- /build — Code-Änderungen am Soulmatch-Repo (Worker: GLM-Turbo, FlashX, GPT-5.4, MiniMax, Kimi)
- /repo-query — Fragen an den Code beantworten
- /git-push — Dateien direkt auf GitHub pushen (main oder staging Branch)
- /push — Code deployen (mit branch Parameter für staging)
- /render/redeploy — Render neu deployen
- /memory — Dein Gedächtnis abrufen
- /task-history — Vergangene Tasks einsehen
- /worker-stats — Worker Performance vergleichen
- /self-test — System Health prüfen

REGELN:
- Sei direkt, kritisch, keine Floskeln
- Erkläre in Alltagssprache mit Metaphern
- Bewerte Ideen auf 0-100% Skala mit Schwächen zuerst
- Du bist Partnerin und Architektin, nicht Tool
- Wenn du eine Aktion vorschlägst, beschreibe sie klar mit Risiko-Level

Wenn du eine Builder-Aktion ausführen willst, antworte mit einem Action-Block:
[ACTION: endpoint=/build, branch=staging, worker=glm-turbo, risk=safe]
Beschreibung was passieren wird
[/ACTION]

Für destruktive Aktionen (push main, deploy, revert):
[ACTION: endpoint=/push, branch=main, risk=destructive]
Beschreibung
[/ACTION]`;

    // Route to Opus for complex reasoning, cheaper model for simple status queries
    const isSimpleQuery = /^(status|was läuft|health|wie viele|zeig|list)/i.test(message.trim());
    const provider = isSimpleQuery ? 'zhipu' : 'anthropic';
    const model = isSimpleQuery ? 'glm-4.7-flashx' : 'claude-opus-4-6';

    const messages = [
      ...history.slice(-16),
      { role: 'user' as const, content: message },
    ];

    const response = await callProvider(provider, model, {
      system: systemPrompt,
      messages,
      maxTokens: 2000,
      temperature: 0.7,
    });

    // Save to continuity if Maya suggests important context
    res.json({
      response,
      model: isSimpleQuery ? 'flash' : 'opus',
      contextUsed: { tasksLoaded: tasks.length, hasContinuity: !!continuity[0] },
    });
  } catch (err) {
    console.error('[maya] POST /maya/chat error:', err);
    res.status(500).json({ error: 'Maya chat failed: ' + String(err) });
  }
});

// POST /api/builder/maya/action — execute a builder action Maya suggested
router.post('/maya/action', async (req: Request, res: Response) => {
  try {
    const { action, confirmed } = req.body as {
      action: { endpoint: string; branch?: string; worker?: string; params?: Record<string, unknown> };
      confirmed?: boolean;
    };

    if (!action?.endpoint) {
      res.status(400).json({ error: 'action.endpoint required' });
      return;
    }

    const ALLOWED = ['/build', '/push', '/git-push', '/render/redeploy', '/self-test', '/repo-query', '/execute'];
    if (!ALLOWED.includes(action.endpoint)) {
      res.status(400).json({ error: `Endpoint ${action.endpoint} not allowed. Use: ${ALLOWED.join(', ')}` });
      return;
    }

    const DESTRUCTIVE = new Set(['/push', '/render/redeploy']);
    const isDestructive = DESTRUCTIVE.has(action.endpoint) && (action.branch === 'main' || !action.branch);
    const risk = isDestructive ? 'destructive' : DESTRUCTIVE.has(action.endpoint) ? 'staging' : 'safe';

    if (isDestructive && !confirmed) {
      res.json({
        success: false,
        needsConfirmation: true,
        risk,
        endpoint: action.endpoint,
        message: `⚠️ ${action.endpoint} (${action.branch || 'main'}) ist destruktiv. Bestätige mit confirmed:true.`,
      });
      return;
    }

    // Forward token from query
    const token = (req.query.opus_token || req.query.token || '') as string;
    const port = process.env.PORT || 10000;
    const baseUrl = `http://localhost:${port}/api/builder/opus-bridge`;

    const body: Record<string, unknown> = { ...action.params, opus_token: token };
    if (action.branch) body.branch = action.branch;
    if (action.worker) body.worker = action.worker;

    const proxyRes = await fetch(`${baseUrl}${action.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await proxyRes.json().catch(() => ({ status: proxyRes.status }));

    res.json({ success: proxyRes.ok, endpoint: action.endpoint, risk, result });
  } catch (err) {
    console.error('[maya] POST /maya/action error:', err);
    res.status(500).json({ error: 'Action execution failed: ' + String(err) });
  }
});

// POST /api/builder/maya/memory — create a memory entry
router.post('/maya/memory', async (req: Request, res: Response) => {
  try {
    const { layer, key, summary } = req.body as { layer?: string; key?: string; summary?: string };
    if (!layer || !key || !summary) { res.status(400).json({ error: 'layer, key, summary required' }); return; }
    const db = getDb();
    const [result] = await db.insert(builderMemory).values({ layer, key, summary }).returning();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Memory create failed: ' + String(err) });
  }
});

// PUT /api/builder/maya/memory/:id — update a memory entry
router.put('/maya/memory/:id', async (req: Request, res: Response) => {
  try {
    const { summary } = req.body as { summary?: string };
    if (!summary) { res.status(400).json({ error: 'summary required' }); return; }
    const db = getDb();
    const [result] = await db.update(builderMemory)
      .set({ summary, updatedAt: new Date() })
      .where(eq(builderMemory.id, req.params.id))
      .returning();
    if (!result) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Memory update failed: ' + String(err) });
  }
});

// DELETE /api/builder/maya/memory/:id — delete a memory entry
router.delete('/maya/memory/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    await db.delete(builderMemory).where(eq(builderMemory.id, req.params.id));
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Memory delete failed: ' + String(err) });
  }
});

export { router as builderRouter };