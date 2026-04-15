import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

// GET /api/builder/repo-file?path=server/src/lib/providers.ts
router.get('/repo-file', (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'path query param required' });

  // Security: only allow reading from server/src, client/src, docs
  const allowed = ['server/src/', 'client/src/', 'docs/', 'STATE.md', 'FEATURES.md', 'RADAR.md', 'AGENTS.md'];
  const isAllowed = allowed.some(prefix => filePath.startsWith(prefix));
  if (!isAllowed) return res.status(403).json({ error: 'Path not in allowed directories' });

  // Prevent path traversal
  const resolved = path.resolve(process.cwd(), filePath);
  const cwd = process.cwd();
  if (!resolved.startsWith(cwd)) return res.status(403).json({ error: 'Path traversal blocked' });

  if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'File not found', path: filePath });

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    const lines = content.split('\n').length;
    res.json({ path: filePath, lines, chars: content.length, content });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
