import { Router, type Request, type Response } from 'express';
import { swissEphemerisProbe } from '../lib/swissEphemerisProbe.js';

export const healthRouter = Router();

// GET /api/health
healthRouter.get('/', (req: Request, res: Response) => {
  console.log('🏥 Health endpoint hit - sweph test running...');
  const swephProbe = swissEphemerisProbe();
  console.log(`🏥 Swiss Ephemeris available: ${swephProbe.available}`);
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sweph: swephProbe.available,
    swephError: swephProbe.error,
    runtime: swephProbe.runtime,
  });
});
