import { Router, type Request, type Response } from 'express';
import { swissEphemerisProbe } from '../lib/swissEphemerisProbe.js';

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