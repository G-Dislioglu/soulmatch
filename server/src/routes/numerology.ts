import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';

// Types from shared contract (copied from client/src/shared/types/numerology.ts)
type NumerologySystem = 'pythagorean';

interface NumerologyRequest {
  profileId: string;
  name: string;
  birthDate: string;
  system: NumerologySystem;
}

interface NumerologyMeta {
  engine: 'local';
  engineVersion: string;
  system: NumerologySystem;
  computedAt: string;
  warnings?: string[];
}

interface NumerologyCoreNumbers {
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
  birthday: number;
}

interface NumerologyResult {
  profileId: string;
  meta: NumerologyMeta;
  numbers: NumerologyCoreNumbers;
  breakdown?: {
    lifePath: string;
    expression: string;
    soulUrge: string;
    personality: string;
  };
}

// Deterministic numerology calculation - no random, no stubs
function calculateNumerology(request: NumerologyRequest): NumerologyResult {
  const now = new Date().toISOString();

  // Helper: reduce number to single digit, keep master numbers 11, 22, 33
  function reduceToSingle(num: number): number {
    if (num === 11 || num === 22 || num === 33) return num;
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = Math.floor(num / 10) + (num % 10);
    }
    return num;
  }

  // Helper: letter to number (Pythagorean)
  function letterToNumber(letter: string): number {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const index = letters.toLowerCase().indexOf(letter.toLowerCase());
    return index >= 0 ? index + 1 : 0;
  }

  // Life Path Number from birth date (YYYY-MM-DD)
  function calculateLifePath(birthDate: string): number {
    const digits = birthDate.replace(/\D/g, '').split('').map(Number);
    const sum = digits.reduce((acc, digit) => acc + digit, 0);
    return reduceToSingle(sum);
  }

  // Expression/Destiny Number from full name
  function calculateExpression(name: string): number {
    const lettersOnly = name.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const sum = lettersOnly.split('').reduce((acc, letter) => acc + letterToNumber(letter), 0);
    return reduceToSingle(sum);
  }

  // Soul Urge Number from vowels only
  function calculateSoulUrge(name: string): number {
    const lettersOnly = name.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const vowels = lettersOnly.split('').filter(letter => 'aeiou'.includes(letter));
    const sum = vowels.reduce((acc, letter) => acc + letterToNumber(letter), 0);
    return reduceToSingle(sum);
  }

  // Personality Number from consonants only
  function calculatePersonality(name: string): number {
    const lettersOnly = name.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const consonants = lettersOnly.split('').filter(letter => !'aeiou'.includes(letter));
    const sum = consonants.reduce((acc, letter) => acc + letterToNumber(letter), 0);
    return reduceToSingle(sum);
  }

  // Birthday Number from day of month
  function calculateBirthday(birthDate: string): number {
    const dayMatch = birthDate.match(/-(\d{1,2})$/);
    if (!dayMatch) return 0;
    const day = parseInt(dayMatch[1], 10);
    return reduceToSingle(day);
  }

  // Calculate all numbers
  const lifePath = calculateLifePath(request.birthDate);
  const expression = calculateExpression(request.name);
  const soulUrge = calculateSoulUrge(request.name);
  const personality = calculatePersonality(request.name);
  const birthday = calculateBirthday(request.birthDate);

  // Build breakdown explanations
  const breakdown = {
    lifePath: `Life Path ${lifePath}: From birth date ${request.birthDate}`,
    expression: `Expression ${expression}: From full name "${request.name}"`,
    soulUrge: `Soul Urge ${soulUrge}: From vowels in name`,
    personality: `Personality ${personality}: From consonants in name`,
  };

  const warnings: string[] = [];
  if (!request.name || request.name.trim().length === 0) {
    warnings.push('Name is empty - expression, soul urge, and personality may be inaccurate');
  }
  if (!request.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(request.birthDate)) {
    warnings.push('Invalid birth date format - use YYYY-MM-DD');
  }

  return {
    profileId: request.profileId,
    meta: {
      engine: 'local',
      engineVersion: '1.0.0',
      system: request.system,
      computedAt: now,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    numbers: {
      lifePath,
      expression,
      soulUrge,
      personality,
      birthday,
    },
    breakdown,
  };
}

export const numerologyRouter = Router();

// POST /api/numerology/calc
numerologyRouter.post('/calc', (req: Request, res: Response) => {
  try {
    const request: NumerologyRequest = req.body;
    
    // Validation
    if (!request.profileId || !request.name || !request.birthDate || !request.system) {
      return res.status(400).json({ 
        error: 'profileId, name, birthDate, and system are required' 
      });
    }

    if (request.system !== 'pythagorean') {
      return res.status(400).json({ error: 'Only pythagorean system is supported' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(request.birthDate)) {
      return res.status(400).json({ error: 'birthDate must be in YYYY-MM-DD format' });
    }

    const result = calculateNumerology(request);
    devLogger.info('api', 'Numerology calculated', { 
      profileId: request.profileId, 
      system: request.system,
      lifePath: result.numbers.lifePath 
    });
    
    res.json(result);
  } catch (error) {
    devLogger.error('api', 'Failed to calculate numerology', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});
