import { Router, type Request, type Response } from 'express';
import { swissEphemerisAvailable } from '../lib/swissEphemerisProbe.js';

export const healthRouter = Router();

// GET /api/health
healthRouter.get('/', (req: Request, res: Response) => {
  console.log('🏥 Health endpoint hit - sweph test running...');
  const swephAvailable = swissEphemerisAvailable();
  console.log(`🏥 Swiss Ephemeris available: ${swephAvailable}`);
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sweph: swephAvailable,
  });
});
