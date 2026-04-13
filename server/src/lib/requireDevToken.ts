import type { Request, Response, NextFunction } from 'express';

export function requireDevToken(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.BUILDER_SECRET;
  const opusSecret = process.env.OPUS_BRIDGE_SECRET;

  if (!secret && !opusSecret) {
    console.warn('[requireDevToken] Neither BUILDER_SECRET nor OPUS_BRIDGE_SECRET is set');
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Accept token from query string (token or opus_token) or Authorization: Bearer header
  const queryToken = typeof req.query.token === 'string' ? req.query.token
    : typeof req.query.opus_token === 'string' ? req.query.opus_token
    : undefined;
  const authHeader = req.headers['authorization'];
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const token = queryToken ?? bearerToken;

  if (!token || (token !== secret && token !== opusSecret)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  next();
}
