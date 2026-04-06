import { Router, type Request, type Response } from 'express';
import { requireOpusToken } from '../lib/opusBridgeAuth.js';

export const opusBridgeRouter = Router();

opusBridgeRouter.use(requireOpusToken);

opusBridgeRouter.post('/execute', (_req: Request, res: Response) => {
  res.json({ status: 'stub', message: 'execute not implemented' });
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