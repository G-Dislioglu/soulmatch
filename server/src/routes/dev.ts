import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { devLogger } from '../devLogger.js';
import type { LogLevel, LogCategory } from '../devLogger.js';

export const devRouter = Router();

const BUILTIN_PASSWORD = 'David ist cool';

// Auth middleware: accepts built-in password or optional DEV_TOKEN env override
function requireDevToken(req: Request, res: Response, next: NextFunction): void {
  const validPassword = process.env.DEV_TOKEN || BUILTIN_PASSWORD;

  const provided =
    (req.query.token as string) ||
    req.headers.authorization?.replace('Bearer ', '');

  if (provided !== validPassword) {
    res.status(401).json({ error: 'Falsches Passwort' });
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
