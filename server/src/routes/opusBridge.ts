import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';
import { getDb } from '../db.js';
import { runScoutPhase } from '../lib/opusScoutRunner.js';
import { builderTasks } from '../schema/builder.js';

export const opusBridgeRouter = Router();

opusBridgeRouter.use(requireOpusToken);

opusBridgeRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const { instruction, scope } = req.body as { instruction?: string; scope?: string[] };

    if (!instruction || typeof instruction !== 'string') {
      res.status(400).json({ error: 'instruction is required' });
      return;
    }

    const db = getDb();
    const [task] = await db
      .insert(builderTasks)
      .values({
        title: instruction.slice(0, 100),
        goal: instruction,
        scope: Array.isArray(scope) ? scope : [],
        status: 'scouting',
      })
      .returning();

    const scoutMessages = await runScoutPhase({
      id: task.id,
      goal: instruction,
      scope: Array.isArray(scope) ? scope : [],
    });

    res.json({
      taskId: task.id,
      status: 'scouted',
      scoutMessages: scoutMessages.map((message) => ({
        actor: message.actor,
        model: message.model,
        content: message.content.slice(0, 500),
        tokensUsed: message.tokensUsed,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

opusBridgeRouter.get('/observe/:taskId', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
});

opusBridgeRouter.post('/override/:taskId', (_req: Request, res: Response) => {
  res.json({ status: 'stub' });
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