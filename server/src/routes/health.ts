import { Router, type Request, type Response } from 'express';
import { swissEphemerisProbe } from '../lib/swissEphemerisProbe.js';
import fs from 'fs';
import path from 'path';

export const healthRouter = Router();

interface AsyncOpusJob {
  id: string;
  status: 'running' | 'done' | 'failed';
  instruction: string;
  result?: unknown;
  error?: string;
}

const asyncOpusJobs = new Map<string, AsyncOpusJob>();

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

// POST /api/health/opus-task-async
healthRouter.post('/opus-task-async', async (req: Request, res: Response) => {
  const token = typeof req.query.opus_token === 'string' ? req.query.opus_token : '';
  if (!process.env.OPUS_BRIDGE_SECRET || token !== process.env.OPUS_BRIDGE_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { instruction, dryRun } = req.body as { instruction?: string; dryRun?: boolean };
  if (!instruction?.trim()) {
    res.status(400).json({ error: 'instruction required' });
    return;
  }

  const id = `job-${Date.now().toString(36)}`;
  asyncOpusJobs.set(id, { id, status: 'running', instruction });
  res.json({ status: 'accepted', jobId: id });

  void import('../lib/opusTaskOrchestrator.js')
    .then(({ orchestrateTask }) => orchestrateTask({ instruction, dryRun: Boolean(dryRun) }))
    .then((result) => {
      const job = asyncOpusJobs.get(id);
      if (job) {
        job.status = 'done';
        job.result = result;
      }
    })
    .catch((error) => {
      const job = asyncOpusJobs.get(id);
      if (job) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : String(error);
      }
    });
});

// GET /api/health/opus-job-status
healthRouter.get('/opus-job-status', (req: Request, res: Response) => {
  const token = typeof req.query.opus_token === 'string' ? req.query.opus_token : '';
  if (!process.env.OPUS_BRIDGE_SECRET || token !== process.env.OPUS_BRIDGE_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) {
    res.json({ jobs: Array.from(asyncOpusJobs.values()).slice(-20) });
    return;
  }

  const job = asyncOpusJobs.get(id);
  if (!job) {
    res.status(404).json({ error: 'not found' });
    return;
  }

  res.json(job);
});
