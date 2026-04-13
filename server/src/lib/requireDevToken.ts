import type { Request, Response, NextFunction } from 'express';

export function requireDevToken(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.BUILDER_SECRET;
  const opusSecret = process.env.OPUS_BRIDGE_SECRET;

  if (!secret && !opusSecret) {
    console.warn('[requireDevToken] BUILDER_SECRET and OPUS_BRIDGE_SECRET are not set in environment');
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Accept token from query string or Authorization: Bearer header
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
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
