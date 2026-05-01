import { Router, type Request, type Response } from 'express';
import { createRequire } from 'module';
import { getAppEnv, getAppEnvLabel } from '../lib/appEnv.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

export const metaRouter = Router();

// GET /api/meta
metaRouter.get('/', (_req: Request, res: Response) => {
  const buildSha =
    process.env.RENDER_GIT_COMMIT?.slice(0, 7) ??
    process.env.GIT_SHA ??
    'dev';

  res.json({
    serverVersion: pkg.version,
    scoringEngineVersion: 'v3.1',
    matchEngineVersion: 'v1',
    buildSha,
    buildAt: process.env.BUILD_AT ?? null,
    appEnv: getAppEnv(),
    appEnvLabel: getAppEnvLabel(),
  });
});
