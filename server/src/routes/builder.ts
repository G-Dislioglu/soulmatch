// Phase 3: Memory CRUD endpoints added 2026-04-12
import { Router, type Request, type Response } from 'express';
import { and, eq, desc, asc, sql, inArray } from 'drizzle-orm';
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
import { WORKER_PROFILES, pickWorker } from '../lib/workerProfiles.js';
import { getActivePools, updatePools, pickFromPool } from '../lib/poolState.js';

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
    const { message, history = [], file } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      file?: { data: string; mime: string; name: string };
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

    const taskSummary = tasks.map(t => `[${t.status}] ${t.title} (risk:${t.risk}, id:${t.id})`).join('\n');
    const lastNote = continuity[0]?.summary || 'Keine Continuity Note.';

    // Build compact worker summary for system prompt
    const workerSummary = WORKER_PROFILES.map(w =>
      `• ${w.id} (${w.costTier}/${w.speedTier}) — ${w.role}: ${w.bestFor.slice(0, 3).join(', ')}. Qualität: ${w.codeQuality}/100`
    ).join('\n');

    const systemPrompt = `Du bist Maya — die zentrale Steuereinheit des Opus-Bridge Builder-Systems im Soulmatch-Projekt. Du sprichst Deutsch.

DEIN LIVE-KONTEXT:
Continuity (letzte Session): ${lastNote}

Aktive Tasks (mit IDs):
${taskSummary || 'Keine Tasks.'}

WORKER-POOL (wähle den besten für jede Aufgabe):
${workerSummary}

AKTIVE POOL-ZUSAMMENSETZUNG:
Maya KI: ${getActivePools().maya.join(', ') || 'leer'}
Master Council: ${getActivePools().council.join(', ') || 'leer'}
Destillierer: ${getActivePools().distiller.join(', ') || 'leer'}
Worker Pool: ${getActivePools().worker.join(', ') || 'leer'}
Scout Pool: ${getActivePools().scout.join(', ') || 'leer'}
Du kannst die Pools per Action-Block aendern:
[ACTION: endpoint=/maya/pools, risk=safe]
pools: { maya: ["opus"], council: ["opus", "sonnet"], distiller: ["glm-flash", "deepseek-scout"], worker: ["glm-turbo", "kimi"], scout: ["glm-flash", "gemini-flash"] }
[/ACTION]

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
- /tasks/:id — Task löschen (method: DELETE)
- /maya/memory — Continuity/Episode Note erstellen (POST, body: { layer, key, summary })
- /maya/memory/:id — Note bearbeiten (PUT) oder löschen (DELETE)
- /batch-delete-tasks — Mehrere Tasks auf einmal löschen (POST, body: { ids: string[] })

REGELN:
- Sei direkt, kritisch, keine Floskeln
- Erkläre in Alltagssprache mit Metaphern
- Bewerte Ideen auf 0-100% Skala mit Schwächen zuerst
- Du bist Partnerin und Architektin, nicht Tool
- Bei klaren Aufträgen ("fix den Bug", "build Feature X") handle SOFORT mit Action-Blöcken — frag nicht nach Bestätigung für safe/staging Aktionen
- Wähle den Worker basierend auf Task-Typ (siehe WORKER-POOL oben)
- Für Task-Details: Nutze /tasks/:id/dialog und /tasks/:id/evidence

VERFÜGBARE AKTIONEN:

VERFÜGBARE AKTIONEN:
Wenn du eine Builder-Aktion ausführen willst, antworte mit einem Action-Block:
[ACTION: endpoint=/build, branch=staging, worker=glm-turbo, risk=safe]
Beschreibung was passieren wird
[/ACTION]

Für destruktive Aktionen (push main, deploy, revert):
[ACTION: endpoint=/push, branch=main, risk=destructive]
Beschreibung
[/ACTION]

PROAKTIVES HANDELN:
- Bei "fix Bug X" → sofort /build Action-Block mit passendem Worker
- Bei "was macht Task X" → direkt die Details abrufen und zusammenfassen
- Bei "deploy" → /push + /render/redeploy Action-Blöcke
- Bei "zeig Worker" → Tabelle mit allen Workern und ihrer Performance`;

    // Route to Opus for complex reasoning, cheaper model for simple status queries
    // If file attached → always use Gemini (multimodal)
    const hasFile = !!file?.data;
    const isSimpleQuery = !hasFile && /^(status|was läuft|health|wie viele|zeig|list)/i.test(message.trim());

    if (hasFile && file.mime.startsWith('image/')) {
      // Multimodal path → Gemini with inline image
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) { res.status(500).json({ error: 'GEMINI_API_KEY not set' }); return; }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const contents = [
        ...history.slice(-12).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.mime, data: file.data } },
            { text: `[Datei: ${file.name}]\n\n${message}` },
          ],
        },
      ];

      const geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      });

      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        throw new Error(`Gemini API ${geminiResp.status}: ${errText.slice(0, 200)}`);
      }

      const geminiData = await geminiResp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Keine Antwort von Gemini.';

      res.json({
        response: geminiText,
        model: 'gemini' as const,
        contextUsed: { tasksLoaded: tasks.length, hasContinuity: !!continuity[0] },
      });
      return;
    }

    // Non-image file → append content as text
    let userContent = message;
    if (hasFile && !file.mime.startsWith('image/')) {
      try {
        const decoded = Buffer.from(file.data, 'base64').toString('utf-8');
        userContent = `[Datei: ${file.name}]\n\`\`\`\n${decoded.slice(0, 8000)}\n\`\`\`\n\n${message}`;
      } catch {
        userContent = `[Datei: ${file.name} — konnte nicht gelesen werden]\n\n${message}`;
      }
    }

    const provider = isSimpleQuery
      ? (pickFromPool('scout', false)?.provider ?? 'zhipu')
      : (pickFromPool('maya', true)?.provider ?? 'anthropic');
    const model = isSimpleQuery
      ? (pickFromPool('scout', false)?.model ?? 'glm-4.7-flashx')
      : (pickFromPool('maya', true)?.model ?? 'claude-opus-4-6');
    const modelLabel = isSimpleQuery
      ? (pickFromPool('scout', false)?.id ?? 'flash')
      : (pickFromPool('maya', true)?.id ?? 'opus');

    const messages = [
      ...history.slice(-16),
      { role: 'user' as const, content: userContent },
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
      model: modelLabel,
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
      action: { endpoint: string; method?: string; branch?: string; worker?: string; params?: Record<string, unknown> };
      confirmed?: boolean;
    };

    if (!action?.endpoint) {
      res.status(400).json({ error: 'action.endpoint required' });
      return;
    }

    const ALLOWED = ['/build', '/push', '/git-push', '/render/redeploy', '/self-test', '/repo-query', '/execute', '/maya/pools'];
    const BUILDER_ROUTES = ['/batch-delete-tasks']; // routes under /api/builder (not opus-bridge)
    // Also allow task and memory endpoints with dynamic IDs
    const isTaskDelete = /^\/tasks\/[\w-]+$/.test(action.endpoint);
    const isMemoryOp = /^\/maya\/memory(\/[\w-]+)?$/.test(action.endpoint);
    if (!ALLOWED.includes(action.endpoint) && !BUILDER_ROUTES.includes(action.endpoint) && !isTaskDelete && !isMemoryOp) {
      res.status(400).json({ error: `Endpoint ${action.endpoint} not allowed.` });
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

    // For opus-bridge routes: use server-side secret (trusted internal call)
    // For builder routes: forward user token from query
    const userToken = (req.query.opus_token || req.query.token || '') as string;
    const port = process.env.PORT || 10000;
    // Task/memory/batch endpoints are under /api/builder, opus-bridge endpoints under /api/builder/opus-bridge
    const isBuilderRoute = isTaskDelete || isMemoryOp || BUILDER_ROUTES.includes(action.endpoint);
    const baseUrl = `http://localhost:${port}/api/builder${isBuilderRoute ? '' : '/opus-bridge'}`;
    const authToken = isBuilderRoute ? userToken : (process.env.OPUS_BRIDGE_SECRET || userToken);

    const method = action.method || (isTaskDelete ? 'DELETE' : 'POST');
    const body: Record<string, unknown> = { ...action.params };
    if (action.branch) body.branch = action.branch;
    if (action.worker) body.worker = action.worker;

    const fetchOpts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    };
    if (method !== 'DELETE') fetchOpts.body = JSON.stringify(body);

    const sep = action.endpoint.includes('?') ? '&' : '?';
    const proxyRes = await fetch(`${baseUrl}${action.endpoint}${sep}opus_token=${encodeURIComponent(authToken)}`, fetchOpts);

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

// POST /api/builder/batch-delete-tasks — delete multiple tasks at once
router.post('/batch-delete-tasks', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids[] required' });
      return;
    }
    const db = getDb();
    let deleted = 0;
    for (const id of ids) {
      try {
        await db.delete(builderTasks).where(eq(builderTasks.id, id));
        deleted++;
      } catch { /* skip FK constraint errors */ }
    }
    res.json({ success: true, deleted, total: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Batch delete failed: ' + String(err) });
  }
});

// GET /api/builder/maya/workers — worker profiles for Maya's selection
router.get('/maya/workers', (_req: Request, res: Response) => {
  res.json(WORKER_PROFILES.map(w => ({
    id: w.id, provider: w.provider, model: w.model, role: w.role,
    strengths: w.strengths, weaknesses: w.weaknesses,
    bestFor: w.bestFor, avoidFor: w.avoidFor,
    costTier: w.costTier, speedTier: w.speedTier,
    codeQuality: w.codeQuality, reliability: w.reliability,
  })));
});

// POST /api/builder/maya/pick-worker — Maya asks for best worker for a task
router.post('/maya/pick-worker', (req: Request, res: Response) => {
  const { description } = req.body as { description?: string };
  if (!description) { res.status(400).json({ error: 'description required' }); return; }
  const worker = pickWorker(description);
  res.json({ recommended: worker });
});

// POST /api/builder/maya/brief — compile an active brief for a task
router.post('/maya/brief', async (req: Request, res: Response) => {
  try {
    const { taskGoal } = req.body as { taskGoal?: string };
    if (!taskGoal) { res.status(400).json({ error: 'taskGoal required' }); return; }

    const db = getDb();
    const [tasks, continuity, workerStats] = await Promise.all([
      db.select({ id: builderTasks.id, title: builderTasks.title, status: builderTasks.status, risk: builderTasks.risk })
        .from(builderTasks).orderBy(desc(builderTasks.updatedAt)).limit(5),
      db.select({ summary: builderMemory.summary })
        .from(builderMemory).where(eq(builderMemory.layer, 'continuity')).orderBy(desc(builderMemory.updatedAt)).limit(1),
      db.execute(sql`SELECT worker, ROUND(AVG(quality)) as avg_quality, COUNT(*) as task_count FROM builder_worker_scores GROUP BY worker ORDER BY avg_quality DESC LIMIT 5`).catch(() => ({ rows: [] })),
    ]);

    const worker = pickWorker(taskGoal);

    res.json({
      brief: {
        taskGoal,
        recommendedWorker: { id: worker.id, model: worker.model, strengths: worker.strengths, reliability: worker.reliability },
        activeTasks: tasks.map(t => `[${t.status}] ${t.title}`),
        lastSession: continuity[0]?.summary || 'Keine Continuity Note.',
        workerPerformance: workerStats.rows,
        risks: worker.avoidFor,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Brief compilation failed: ' + String(err) });
  }
});

// POST /api/builder/maya/pools — receive pool configuration from frontend
router.post('/maya/pools', (req: Request, res: Response) => {
  const { pools } = req.body as { pools?: { maya?: string[]; council?: string[]; distiller?: string[]; worker?: string[]; scout?: string[] } };
  if (!pools) { res.status(400).json({ error: 'pools required' }); return; }
  updatePools(pools);
  const current = getActivePools();
  console.log('[maya] Pools updated:', { maya: current.maya.length, council: current.council.length, distiller: current.distiller.length, worker: current.worker.length, scout: current.scout.length });
  res.json({ success: true, pools: current });
});

export { router as builderRouter };