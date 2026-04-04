import { Router, type Request, type Response } from 'express';
import { and, eq, desc, asc } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderArtifacts,
  builderTasks,
} from '../schema/builder.js';
import { TASK_TYPE_TO_PROFILE, type TaskType } from '../lib/builderPolicyProfiles.js';
import { readFile, listFiles } from '../lib/builderFileIO.js';
import { getRepoRoot } from '../lib/builderExecutor.js';
import { extractTextContent } from '../lib/builderBdlParser.js';
import { runDialogEngine } from '../lib/builderDialogEngine.js';
import { getPrototypeHtml, promotePrototype } from '../lib/builderPrototypeLane.js';
import { requireDevToken } from '../lib/requireDevToken.js';

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

    res.json(updated);
  } catch (err) {
    console.error('[builder] POST /tasks/:id/revert error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export { router as builderRouter };
