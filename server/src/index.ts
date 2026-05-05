import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { installOutboundHttpDefaults } from './lib/outboundHttp.js';

// Load environment variables before anything else
dotenv.config();

// DNS hardening against long-lived outbound GitHub/Render request churn.
installOutboundHttpDefaults();

import { startKeepAlive } from './lib/keepAlive.js';
import { arcanaRouter } from './routes/arcana.js';
import { studioRouter } from './routes/studio.js';
import { guideRouter } from './routes/guide.js';
import { devRouter } from './routes/dev.js';
import { profileRouter } from './routes/profile.js';
import { geoRouter } from './routes/geo.js';
import { astrologyRouter } from './routes/astro.js';
import { numerologyRouter } from './routes/numerology.js';
import { scoringRouter } from './routes/scoring.js';
import { matchRouter } from './routes/match.js';
import { architectRouter } from './routes/architect.js';
import { contextBrokerRouter } from './routes/contextBroker.js';
import { healthRouter, initializeAsyncJobsCache } from './routes/health.js';
import { metaRouter } from './routes/meta.js';
import { journeyRouter } from './routes/journey.js';
import { zimageRouter } from './routes/zimage.js';
import { builderRouter } from './routes/builder.js';
import { initializePoolState } from './lib/poolState.js';
import { opusBridgeRouter } from './routes/opusBridge.js';
import { devLogger } from './devLogger.js';
import { startStaleDetector } from './lib/builderStaleDetector.js';
import { patrolRouter, startPatrol } from './lib/scoutPatrol.js';
import { seedBuilderSandboxIfNeeded } from './lib/sandboxSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(express.json());

// Debug middleware: Log all incoming requests
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// API routes
app.use('/api', studioRouter);
app.use('/api', arcanaRouter);
app.use('/api', guideRouter);
app.use('/api/dev', devRouter);
app.use('/api/profile', profileRouter);
app.use('/api/geo', geoRouter);
app.use('/api/astro', astrologyRouter);
app.use('/api/numerology', numerologyRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/match', matchRouter);
app.use('/api/architect', architectRouter);
app.use('/api/context', contextBrokerRouter);
app.use('/api/health', healthRouter);
app.use('/api/meta', metaRouter);
app.use('/api/journey', journeyRouter);
app.use('/api', zimageRouter);
app.use('/api/builder/opus-bridge', opusBridgeRouter);
app.use('/api/builder/patrol', patrolRouter);
app.use('/api/builder', builderRouter);

devLogger.info('system', 'Server starting', { port: PORT });

// Serve client dist
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA fallback - exclude /api routes
app.get('*', (req, res, next) => {
  // Don't intercept API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Serve index.html for all other routes
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startKeepAlive();
  startStaleDetector();
  startPatrol();
  // F7: load persisted pool state (fire-and-forget; code defaults apply until loaded)
  void initializePoolState();
  // F10: hydrate async opus jobs from DB best-effort; in-memory fallback remains active.
  void initializeAsyncJobsCache();
  void seedBuilderSandboxIfNeeded()
    .then((result) => {
      if (result.seeded) {
        console.log(`[sandbox-seed] inserted ${result.taskCount} synthetic builder tasks`);
      } else if (result.reason === 'tasks_present') {
        console.log('[sandbox-seed] skipped because builder tasks already exist');
      }
    })
    .catch((error) => {
      console.warn('[sandbox-seed] skipped due to error:', error);
    });
});
