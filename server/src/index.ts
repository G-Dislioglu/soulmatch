import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { studioRouter } from './routes/studio.js';
import { guideRouter } from './routes/guide.js';
import { devRouter } from './routes/dev.js';
import { devLogger } from './devLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(express.json());

// API routes
app.use('/api', studioRouter);
app.use('/api', guideRouter);
app.use('/api/dev', devRouter);

devLogger.info('system', 'Server starting', { port: PORT });

// Serve client dist
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
