import { Router, type Request, type Response } from 'express';
import { swissEphemerisProbe } from '../lib/swissEphemerisProbe.js';
import fs from 'fs';
import path from 'path';

export const healthRouter = Router();

// GET /api/health
healthRouter.get('/', (_req: Request, res: Response) => {
  console.log('🏥 Health endpoint hit - sweph test running...');
  const swephProbe = swissEphemerisProbe();
  console.log(`🏥 Swiss Ephemeris available: ${swephProbe.available}`);
  
  res.json({
    status: 'ok',
    commit: process.env.RENDER_GIT_COMMIT || 'unknown',
    timestamp: new Date().toISOString(),
    sweph: swephProbe.available,
    swephError: swephProbe.error,
    runtime: swephProbe.runtime,
    pipelineVersion: "S25"
  });
});

// GET /api/health/pipeline
healthRouter.get('/pipeline', (_req: Request, res: Response) => {
  res.json({
    pipelineOk: true,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health/detailed
healthRouter.get('/detailed', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 10) / 10;
  
  res.json({
    version: '0.1.0',
    uptimeSeconds: Math.round(process.uptime()),
    memoryMB: heapUsedMB,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health/read-file
healthRouter.get('/read-file', (req: Request, res: Response) => {
  const token = req.query.opus_token as string;
  if (token !== process.env.OPUS_BRIDGE_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const filePath = req.query.path as string;
  if (!filePath || filePath.includes('..')) {
    return res.status(400).json({ error: 'invalid path' });
  }

  try {
    const resolved = path.resolve(process.cwd(), filePath);
    const content = fs.readFileSync(resolved, 'utf-8');
    res.json({ path: filePath, content });
  } catch (e: any) {
    res.status(404).json({ error: 'Not found', detail: e.message });
  }
});
