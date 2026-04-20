import { Router, type Request, type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { swissEphemerisProbe } from '../lib/swissEphemerisProbe.js';
import { getDb } from '../db.js';
import { asyncJobs as asyncJobsTable } from '../schema/builder.js';
import fs from 'fs';
import path from 'path';

export const healthRouter = Router();

interface AsyncOpusJob {
  id: string;
  status: 'running' | 'done' | 'failed';
  instruction: string;
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

type AsyncOpusJobResponse = {
  id: string;
  status: 'running' | 'done' | 'failed';
  instruction: string;
  result?: unknown;
  error?: string;
};

const asyncOpusJobs = new Map<string, AsyncOpusJob>();

function normalizeJobDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) {
    return value;
  }

  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toAsyncOpusJobResponse(job: AsyncOpusJob): AsyncOpusJobResponse {
  return {
    id: job.id,
    status: job.status,
    instruction: job.instruction,
    ...(job.result !== undefined ? { result: job.result } : {}),
    ...(job.error ? { error: job.error } : {}),
  };
}

function cacheAsyncJob(job: AsyncOpusJob): void {
  asyncOpusJobs.set(job.id, job);
}

function persistAsyncJobAsync(job: AsyncOpusJob): void {
  try {
    const db = getDb();

    void db
      .insert(asyncJobsTable)
      .values({
        id: job.id,
        status: job.status,
        instruction: job.instruction,
        result: job.result ?? null,
        error: job.error ?? null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })
      .onConflictDoUpdate({
        target: asyncJobsTable.id,
        set: {
          status: job.status,
          instruction: job.instruction,
          result: job.result ?? null,
          error: job.error ?? null,
          updatedAt: job.updatedAt,
        },
      })
      .catch((error) => {
        console.error('[async-jobs] persist failed:', error);
      });
  } catch (error) {
    console.error('[async-jobs] persist unavailable, using in-memory only:', error);
  }
}

function updateAsyncJob(
  id: string,
  patch: Partial<Pick<AsyncOpusJob, 'status' | 'result' | 'error'>>,
): void {
  const current = asyncOpusJobs.get(id);
  if (!current) {
    return;
  }

  const next: AsyncOpusJob = {
    ...current,
    ...patch,
    updatedAt: new Date(),
  };

  cacheAsyncJob(next);
  persistAsyncJobAsync(next);
}

function hydrateAsyncJob(row: typeof asyncJobsTable.$inferSelect): AsyncOpusJob {
  return {
    id: row.id,
    status: row.status as AsyncOpusJob['status'],
    instruction: row.instruction,
    ...(row.result !== null ? { result: row.result } : {}),
    ...(row.error ? { error: row.error } : {}),
    createdAt: normalizeJobDate(row.createdAt),
    updatedAt: normalizeJobDate(row.updatedAt),
  };
}

export async function initializeAsyncJobsCache(): Promise<void> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(asyncJobsTable)
      .orderBy(desc(asyncJobsTable.createdAt))
      .limit(100);

    asyncOpusJobs.clear();
    for (const row of rows) {
      cacheAsyncJob(hydrateAsyncJob(row));
    }

    console.log(`[async-jobs] Loaded ${rows.length} persisted jobs into cache`);
  } catch (error) {
    console.warn('[async-jobs] cache init failed, using in-memory only:', error);
  }
}

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

  const { instruction, dryRun, scope, skipDeploy, targetFile } = req.body as {
    instruction?: string;
    dryRun?: boolean;
    scope?: string[];
    skipDeploy?: boolean;
    targetFile?: string;
  };
  if (!instruction?.trim()) {
    res.status(400).json({ error: 'instruction required' });
    return;
  }

  const id = `job-${Date.now().toString(36)}`;
  const job: AsyncOpusJob = {
    id,
    status: 'running',
    instruction,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  cacheAsyncJob(job);
  persistAsyncJobAsync(job);
  res.json({ status: 'accepted', jobId: id });

  void import('../lib/opusTaskOrchestrator.js')
    .then(({ orchestrateTask }) => orchestrateTask({
      instruction,
      dryRun: Boolean(dryRun),
      scope,
      skipDeploy: Boolean(skipDeploy),
      targetFile,
    }))
    .then((result) => {
      updateAsyncJob(id, { status: 'done', result, error: undefined });
    })
    .catch((error) => {
      updateAsyncJob(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    });
});

// GET /api/health/opus-job-status
healthRouter.get('/opus-job-status', async (req: Request, res: Response) => {
  const token = typeof req.query.opus_token === 'string' ? req.query.opus_token : '';
  if (!process.env.OPUS_BRIDGE_SECRET || token !== process.env.OPUS_BRIDGE_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) {
    const jobs = Array.from(asyncOpusJobs.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 20)
      .map(toAsyncOpusJobResponse);

    res.json({ jobs });
    return;
  }

  const job = asyncOpusJobs.get(id);
  if (job) {
    res.json(toAsyncOpusJobResponse(job));
    return;
  }

  try {
    const db = getDb();
    const rows = await db.select().from(asyncJobsTable).where(eq(asyncJobsTable.id, id)).limit(1);
    const persisted = rows[0];

    if (persisted) {
      const hydrated = hydrateAsyncJob(persisted);
      cacheAsyncJob(hydrated);
      res.json(toAsyncOpusJobResponse(hydrated));
      return;
    }
  } catch (error) {
    console.warn('[async-jobs] fallback lookup failed:', error);
  }

  res.status(404).json({ error: 'not found' });
});
