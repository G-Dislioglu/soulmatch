import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';
import {
  calculateUnifiedScore,
  type UnifiedScoringRequest,
  type UnifiedScoringResult,
} from '../shared/scoring.js';

// Main scoring calculation
function calculateScore(request: UnifiedScoringRequest): UnifiedScoringResult {
  return calculateUnifiedScore(request);
}

export const scoringRouter = Router();

// POST /api/scoring/calc
scoringRouter.post('/calc', (req: Request, res: Response) => {
  try {
    const request: UnifiedScoringRequest = req.body;
    const profileId = (request.profileId ?? '').trim();
    
    // Validation
    if (!profileId || !request.numerologyA || !request.numerologyB) {
      return res.status(400).json({ 
        error: 'profileId, numerologyA, and numerologyB are required' 
      });
    }

    if (!request.numerologyA.numbers || !request.numerologyB.numbers) {
      return res.status(400).json({ 
        error: 'numerologyA.numbers and numerologyB.numbers are required' 
      });
    }

    const result = calculateScore({ ...request, profileId });
    devLogger.info('api', 'Score calculated', { 
      profileId, 
      scoreOverall: result.scoreOverall,
      astroAvailable: !result.warnings.includes('astro_unavailable_using_numerology_only')
    });
    
    res.json(result);
  } catch (error) {
    devLogger.error('api', 'Failed to calculate score', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});
