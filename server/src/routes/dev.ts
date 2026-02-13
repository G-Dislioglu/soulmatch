import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { devLogger } from '../devLogger.js';
import type { LogLevel, LogCategory } from '../devLogger.js';

export const devRouter = Router();

// Auth middleware: requires DEV_TOKEN as query param or Authorization header
function requireDevToken(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.DEV_TOKEN;
  if (!token) {
    res.status(503).json({ error: 'DEV_TOKEN not configured on server' });
    return;
  }

  const provided =
    (req.query.token as string) ||
    req.headers.authorization?.replace('Bearer ', '');

  if (provided !== token) {
    res.status(401).json({ error: 'Invalid dev token' });
    return;
  }

  next();
}

devRouter.use(requireDevToken);

// GET /api/dev/health
devRouter.get('/health', (_req: Request, res: Response) => {
  res.json(devLogger.getHealth());
});

// GET /api/dev/logs?limit=50&level=error&category=llm
devRouter.get('/logs', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const level = req.query.level as LogLevel | undefined;
  const category = req.query.category as LogCategory | undefined;
  res.json({ logs: devLogger.getLogs(limit, level, category) });
});

// POST /api/dev/client-error — client-side errors reported here
devRouter.post('/client-error', (req: Request, res: Response) => {
  const { message, stack, url, userAgent } = req.body as Record<string, string>;
  devLogger.error('client', message || 'Unknown client error', {
    stack,
    url,
    userAgent,
  });
  res.json({ ok: true });
});
