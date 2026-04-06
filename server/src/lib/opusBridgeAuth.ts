import type { NextFunction, Request, Response } from 'express';

function getBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function requireOpusToken(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.OPUS_BRIDGE_SECRET;
  const queryToken = typeof req.query.opus_token === 'string' ? req.query.opus_token : null;
  const headerToken = getBearerToken(req.header('authorization'));
  const providedToken = queryToken ?? headerToken;

  if (!expectedToken || !providedToken || providedToken !== expectedToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}