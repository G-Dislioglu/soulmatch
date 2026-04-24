import { Router, type Request, type Response } from 'express';
import { getArchitectState } from '../lib/architectPhase1.js';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';

export const architectRouter = Router();

architectRouter.use(requireOpusToken);

architectRouter.get('/state', async (_req: Request, res: Response) => {
  try {
    const state = await getArchitectState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});