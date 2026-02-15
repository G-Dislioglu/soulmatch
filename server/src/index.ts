import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { studioRouter } from './routes/studio.js';
import { guideRouter } from './routes/guide.js';
import { devRouter } from './routes/dev.js';
import { profileRouter } from './routes/profile.js';
import { astrologyRouter } from './routes/astro.js';
import { numerologyRouter } from './routes/numerology.js';
import { scoringRouter } from './routes/scoring.js';
import { matchRouter } from './routes/match.js';
import { healthRouter } from './routes/health.js';
import { devLogger } from './devLogger.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fail-fast: Check database connection
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL in Render Environment Variables');
  process.exit(1);
}

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
app.use('/api', guideRouter);
app.use('/api/dev', devRouter);
app.use('/api/profile', profileRouter);
app.use('/api/astro', astrologyRouter);
app.use('/api/numerology', numerologyRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/match', matchRouter);
app.use('/api/health', healthRouter);

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
});
