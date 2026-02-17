import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';
import {
  calculateUnifiedScore,
  type ConnectionType,
  type NumerologyNumbers,
  type RelationshipType,
} from '../shared/scoring.js';
import { applyNarrativeGate } from '../lib/studioQuality.js';
import type { NarrativeQualityDebug, StudioNarrativePayload } from '../shared/narrative/types.js';

// Types from shared contract (copied from client/src/shared/types/match.ts)
interface ExplainClaim {
  id: string;
  level: 'info' | 'positive' | 'caution';
  title: string;
  detail: string;
  weight: number;
  evidence: {
    source: 'numerology' | 'astrology' | 'fusion';
    refs: string[];
  };
}

interface MatchRequest {
  aProfileId: string;
  bProfileId: string;
}

interface MatchMeta {
  engine: 'local';
  engineVersion: string;
  computedAt: string;
  warnings?: string[];
}

interface MatchBreakdown {
  numerology: number;
  astrology: number;
  fusion: number;
}

interface MatchScoreResult {
  aProfileId: string;
  bProfileId: string;
  meta: MatchMeta;
  matchOverall: number;
  breakdown: MatchBreakdown;
  claims: ExplainClaim[];
}

interface MatchSingleProfile {
  id?: string;
  name?: string;
  birthDate: string;
  birthTime?: string;
  birthLocation?: {
    label?: string;
    lat?: number;
    lon?: number;
    countryCode?: string;
    timezone?: string;
  };
}

interface MatchSingleRequest {
  profileA: MatchSingleProfile;
  profileB: MatchSingleProfile;
  relationshipType?: RelationshipType;
}

interface MatchSingleResponse {
  profileA: { id: string; name: string };
  profileB: { id: string; name: string };
  engine: 'unified_match';
  engineVersion: 'v1';
  scoringEngineVersion: 'v3.1';
  computedAt: string;
  matchOverall: number;
  breakdown: MatchBreakdown;
  connectionType: ConnectionType;
  anchorsProvided: string[];
  keyReasons: string[];
  claims: ExplainClaim[];
  warnings: string[];
}

interface MatchNarrativeRequest {
  profileA?: { id?: string; name?: string };
  profileB?: { id?: string; name?: string };
  matchOverall?: number;
  connectionType?: ConnectionType;
  keyReasons?: string[];
  anchorsProvided?: string[];
  anchorsUsed?: string[];
  forceFallback?: boolean;
}

interface MatchNarrativeResponse {
  status: 'ok';
  narrative: StudioNarrativePayload;
  qualityDebug: NarrativeQualityDebug;
  anchorsProvided: string[];
  anchorsUsed: string[];
  meta: {
    engine: 'match_narrative';
    engineVersion: 'v1';
    computedAt: string;
    warnings: string[];
  };
}

function reduceToDigit(value: number): number {
  let n = Math.abs(value);
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n)
      .split('')
      .reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

function deriveNumerologyFromBirthDate(birthDate: string): NumerologyNumbers {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) {
    throw new Error('birthDate must be YYYY-MM-DD');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const digits = birthDate.replace(/\D/g, '').split('').map(Number);
  const lifePathRaw = digits.reduce((sum, d) => sum + d, 0);
  const lifePath = reduceToDigit(lifePathRaw);

  const karmicDebts: string[] = [];
  if (day === 13) karmicDebts.push('13/4');
  if (day === 14) karmicDebts.push('14/5');
  if (day === 16) karmicDebts.push('16/7');
  if (day === 19) karmicDebts.push('19/1');

  return {
    lifePath,
    expression: reduceToDigit(year),
    soulUrge: reduceToDigit(month),
    personality: reduceToDigit(day + month),
    birthday: day,
    lifePathIsMaster: lifePath === 11 || lifePath === 22 || lifePath === 33,
    karmicDebts,
    personalYear: reduceToDigit(year + month + day),
  };
}

function extractConnectionType(claims: ExplainClaim[]): ConnectionType {
  const fusionClaim = claims.find((claim) => claim.id === 'fusion-connection-v31');
  const ref = fusionClaim?.evidence.refs.find((entry) => entry.startsWith('connectionType:'));
  const parsed = ref?.replace('connectionType:', '');
  if (
    parsed === 'spiegel'
    || parsed === 'katalysator'
    || parsed === 'heiler'
    || parsed === 'anker'
    || parsed === 'lehrer'
    || parsed === 'gefaehrte'
  ) {
    return parsed;
  }
  return 'anker';
}

function buildAnchorsProvided(
  response: ReturnType<typeof calculateUnifiedScore>,
  numerologyA: NumerologyNumbers,
  numerologyB: NumerologyNumbers,
): string[] {
  const anchors = new Set<string>();
  anchors.add(`matchOverall:${response.scoreOverall}`);
  anchors.add(`breakdown:numerology:${response.breakdown.numerology}`);
  anchors.add(`breakdown:astrology:${response.breakdown.astrology}`);
  anchors.add(`breakdown:fusion:${response.breakdown.fusion}`);
  anchors.add(`numA:lifePath:${numerologyA.lifePath}`);
  anchors.add(`numB:lifePath:${numerologyB.lifePath}`);
  anchors.add(`numA:soulUrge:${numerologyA.soulUrge}`);
  anchors.add(`numB:soulUrge:${numerologyB.soulUrge}`);
  anchors.add(`numA:master:${numerologyA.lifePathIsMaster ? 1 : 0}`);
  anchors.add(`numB:master:${numerologyB.lifePathIsMaster ? 1 : 0}`);
  if (Array.isArray(numerologyA.karmicDebts) && numerologyA.karmicDebts.length > 0) {
    anchors.add(`numA:karmic:${numerologyA.karmicDebts.join('|')}`);
  }
  if (Array.isArray(numerologyB.karmicDebts) && numerologyB.karmicDebts.length > 0) {
    anchors.add(`numB:karmic:${numerologyB.karmicDebts.join('|')}`);
  }

  for (const claim of response.claims) {
    for (const ref of claim.evidence.refs) {
      anchors.add(ref);
    }
  }

  return Array.from(anchors).slice(0, 12);
}

function buildKeyReasons(claims: ExplainClaim[]): string[] {
  const descriptive = claims
    .filter((claim) => claim.id !== 'astro-unavailable' && claim.level !== 'caution')
    .map((claim) => claim.title);

  const reasons = Array.from(new Set(descriptive));
  const fallback = [
    'Numerologische Kernresonanz analysiert',
    'Verbindungstyp aus Scoring-Signatur abgeleitet',
    'Score wurde konsistent über beide Profile berechnet',
  ];

  while (reasons.length < 3) {
    const next = fallback[reasons.length] ?? 'Zusätzliche Kompatibilitätsauswertung verfügbar';
    reasons.push(next);
  }

  return reasons.slice(0, 3);
}

function normalizeAnchorIds(ids: string[] | undefined): string[] {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)));
}

function buildMatchNarrativePayload(request: MatchNarrativeRequest): StudioNarrativePayload {
  if (request.forceFallback) {
    return {
      turns: [{ seat: 'maya', text: 'ok' }],
      nextSteps: ['...', 'TODO', 'später'],
      watchOut: 'kurz',
    };
  }

  const nameA = request.profileA?.name ?? 'Profil A';
  const nameB = request.profileB?.name ?? 'Profil B';
  const score = typeof request.matchOverall === 'number' ? request.matchOverall : 0;
  const connectionType = request.connectionType ?? 'anker';
  const reasons = Array.isArray(request.keyReasons) ? request.keyReasons.slice(0, 2) : [];
  const reasonText = reasons.length > 0 ? reasons.join(' und ') : 'die numerologische Grundresonanz';

  return {
    turns: [
      {
        seat: 'maya',
        text: `${nameA} und ${nameB} zeigen aktuell einen Match-Score von ${score}. Der Verbindungstyp ${connectionType} deutet darauf hin, dass ${reasonText} eure Dynamik spürbar prägen.`,
      },
    ],
    nextSteps: [
      `Sprecht heute 20 Minuten über den wichtigsten gemeinsamen Fokus für diese Woche.`,
      'Formuliert eine konkrete Vereinbarung, die für beide klar überprüfbar ist.',
      'Reflektiert in drei Tagen kurz, was sich durch diese Vereinbarung verbessert hat.',
    ],
    watchOut: 'Vermeidet vage Erwartungen. Ohne klare Absprachen kippt selbst ein gutes Matching schnell in Missverständnisse.',
  };
}

// Additional types for match calculation
interface NumerologyData {
  numbers: {
    lifePath: number;
    expression: number;
    soulUrge: number;
    personality: number;
    birthday: number;
  };
  meta: {
    engine: string;
    engineVersion: string;
  };
}

interface AstrologyData {
  meta: {
    engine: string;
    engineVersion: string;
  };
}

interface MatchCalculationRequest {
  aProfileId: string;
  bProfileId: string;
  numerologyA: NumerologyData;
  numerologyB: NumerologyData;
  astroA?: AstrologyData;
  astroB?: AstrologyData;
  relationshipType?: 'romantic' | 'friendship' | 'business';
}

// Helper: Check if astrology data is available (not stub)
function isAstroAvailable(astro?: AstrologyData): boolean {
  if (!astro) return false;
  return astro.meta.engine !== 'stub' && !astro.meta.engineVersion.includes('stub');
}

// Helper: Calculate numerology similarity (0-100) - same as scoring
function calculateNumerologySimilarity(numA: NumerologyData['numbers'], numB: NumerologyData['numbers']): number {
  const lifePathDiff = Math.abs(numA.lifePath - numB.lifePath);
  const lifePathScore = Math.max(0, 100 - (lifePathDiff * 20));

  const expressionDiff = Math.abs(numA.expression - numB.expression);
  const expressionScore = Math.max(0, 100 - (expressionDiff * 15));

  const soulUrgeDiff = Math.abs(numA.soulUrge - numB.soulUrge);
  const soulUrgeScore = Math.max(0, 100 - (soulUrgeDiff * 15));

  const personalityDiff = Math.abs(numA.personality - numB.personality);
  const personalityScore = Math.max(0, 100 - (personalityDiff * 15));

  const birthdayDiff = Math.abs(numA.birthday - numB.birthday);
  const birthdayScore = Math.max(0, 100 - (birthdayDiff * 10));

  const weightedScore = (
    lifePathScore * 0.4 +
    expressionScore * 0.2 +
    soulUrgeScore * 0.2 +
    personalityScore * 0.15 +
    birthdayScore * 0.05
  );

  return Math.round(weightedScore);
}

// Main match calculation (wrapper over scoring logic)
function calculateMatch(request: MatchCalculationRequest): MatchScoreResult {
  const now = new Date().toISOString();
  const warnings: string[] = [];

  // Check astrology availability
  const astroAvailable = isAstroAvailable(request.astroA) && isAstroAvailable(request.astroB);
  
  if (!astroAvailable) {
    warnings.push('astro_unavailable_using_numerology_only');
  }

  // Calculate numerology score
  const numerologyScore = calculateNumerologySimilarity(
    request.numerologyA.numbers,
    request.numerologyB.numbers
  );

  // Calculate astrology score (stub-safe)
  let astrologyScore = 0;
  if (astroAvailable) {
    // TODO: Implement real astrology compatibility when Swiss Ephemeris is integrated
    astrologyScore = 75; // Placeholder
  }

  // Calculate fusion/match score
  let matchScore = 0;
  if (astroAvailable) {
    // 60/40 weight when both available
    matchScore = Math.round((numerologyScore * 0.4) + (astrologyScore * 0.6));
  } else {
    // 100% numerology when astrology unavailable
    matchScore = numerologyScore;
  }

  // Generate match-specific claims
  const claims: ExplainClaim[] = [];

  // Match level assessment
  if (matchScore >= 80) {
    claims.push({
      id: 'match-high',
      level: 'positive',
      title: 'Starke Verbindung',
      detail: `Die Kompatibilität zwischen ${request.aProfileId} und ${request.bProfileId} ist sehr hoch (${matchScore}%).`,
      weight: 0.5,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  } else if (matchScore >= 60) {
    claims.push({
      id: 'match-good',
      level: 'positive',
      title: 'Gute Übereinstimmung',
      detail: `Es besteht eine solide Basis für eine Beziehung (${matchScore}%).`,
      weight: 0.4,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  } else if (matchScore >= 40) {
    claims.push({
      id: 'match-moderate',
      level: 'info',
      title: 'Moderate Kompatibilität',
      detail: `Die Verbindung potenziell vielversprechend, erfordert aber Arbeit (${matchScore}%).`,
      weight: 0.3,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  } else {
    claims.push({
      id: 'match-low',
      level: 'caution',
      title: 'Herausfordernde Verbindung',
      detail: `Die Unterschiede überwiegen (${matchScore}%). Klare Kommunikation ist wichtig.`,
      weight: 0.3,
      evidence: {
        source: 'fusion',
        refs: [`match-${matchScore}`]
      }
    });
  }

  // Life Path compatibility claim
  const lifePathDiff = Math.abs(request.numerologyA.numbers.lifePath - request.numerologyB.numbers.lifePath);
  if (lifePathDiff === 0) {
    claims.push({
      id: 'lifePath-same',
      level: 'positive',
      title: 'Gleicher Lebensweg',
      detail: `Beide haben Lebensweg ${request.numerologyA.numbers.lifePath} - tiefe Verständnisbasis.`,
      weight: 0.3,
      evidence: {
        source: 'numerology',
        refs: [`lifePath-${request.numerologyA.numbers.lifePath}`]
      }
    });
  } else if (lifePathDiff <= 2) {
    claims.push({
      id: 'lifePath-compatible',
      level: 'positive',
      title: 'Kompatible Lebenswege',
      detail: `Lebenswege ${request.numerologyA.numbers.lifePath} und ${request.numerologyB.numbers.lifePath} ergänzen sich gut.`,
      weight: 0.2,
      evidence: {
        source: 'numerology',
        refs: [`lifePath-${request.numerologyA.numbers.lifePath}-${request.numerologyB.numbers.lifePath}`]
      }
    });
  }

  // Astrology availability claim
  if (!astroAvailable) {
    claims.push({
      id: 'astro-unavailable',
      level: 'info',
      title: 'Astrologie nicht verfügbar',
      detail: 'Astrologische Analyse steht derzeit nicht zur Verfügung - basiert auf Numerologie.',
      weight: 0.1,
      evidence: {
        source: 'astrology',
        refs: ['stub-engine']
      }
    });
  }

  const breakdown: MatchBreakdown = {
    numerology: numerologyScore,
    astrology: astroAvailable ? astrologyScore : 0,
    fusion: matchScore
  };

  return {
    aProfileId: request.aProfileId,
    bProfileId: request.bProfileId,
    meta: {
      engine: 'local',
      engineVersion: '1.0.0',
      computedAt: now,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    matchOverall: matchScore,
    breakdown,
    claims,
  };
}

export const matchRouter = Router();

// POST /api/match/calc
matchRouter.post('/calc', (req: Request, res: Response) => {
  try {
    const request: MatchCalculationRequest = req.body;
    
    // Validation
    if (!request.aProfileId || !request.bProfileId) {
      return res.status(400).json({ 
        error: 'aProfileId and bProfileId are required' 
      });
    }

    if (!request.numerologyA || !request.numerologyB) {
      return res.status(400).json({ 
        error: 'numerologyA and numerologyB are required' 
      });
    }

    if (!request.numerologyA.numbers || !request.numerologyB.numbers) {
      return res.status(400).json({ 
        error: 'numerologyA.numbers and numerologyB.numbers are required' 
      });
    }

    const result = calculateMatch(request);
    devLogger.info('api', 'Match calculated', { 
      aProfileId: request.aProfileId,
      bProfileId: request.bProfileId,
      matchOverall: result.matchOverall,
      astroAvailable: !result.meta.warnings?.includes('astro_unavailable_using_numerology_only')
    });
    
    res.json(result);
  } catch (error) {
    devLogger.error('api', 'Failed to calculate match', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// POST /api/match/narrative
matchRouter.post('/narrative', (req: Request, res: Response) => {
  try {
    const request = req.body as MatchNarrativeRequest;
    const anchorsProvided = normalizeAnchorIds(request.anchorsProvided);
    const reportedAnchors = normalizeAnchorIds(request.anchorsUsed);
    const anchorsUsed = reportedAnchors.length > 0 ? reportedAnchors : anchorsProvided.slice(0, 2);

    const payload = buildMatchNarrativePayload(request);
    const gated = applyNarrativeGate(payload, {
      mode: 'match',
      seats: payload.turns.map((turn) => turn.seat),
      anchorsExpected: anchorsProvided.length > 0,
      providedAnchorIds: anchorsProvided,
      reportedAnchorIds: anchorsUsed,
    });

    const warnings: string[] = [];
    if (gated.qualityDebug.fallbackUsed) {
      warnings.push('narrative_gate_fallback_applied');
    }
    if (gated.qualityDebug.reasons.includes('anchors_used_outside_provided')) {
      warnings.push('anchors_used_outside_provided');
    }

    const response: MatchNarrativeResponse = {
      status: 'ok',
      narrative: gated.output,
      qualityDebug: gated.qualityDebug,
      anchorsProvided,
      anchorsUsed,
      meta: {
        engine: 'match_narrative',
        engineVersion: 'v1',
        computedAt: new Date().toISOString(),
        warnings,
      },
    };

    res.json(response);
  } catch (error) {
    devLogger.error('api', 'Failed to generate match narrative', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// POST /api/match/single
matchRouter.post('/single', (req: Request, res: Response) => {
  try {
    const request = req.body as MatchSingleRequest;
    if (!request?.profileA?.birthDate || !request?.profileB?.birthDate) {
      return res.status(400).json({ error: 'profileA.birthDate and profileB.birthDate are required' });
    }

    const numerologyA = deriveNumerologyFromBirthDate(request.profileA.birthDate);
    const numerologyB = deriveNumerologyFromBirthDate(request.profileB.birthDate);

    const unified = calculateUnifiedScore({
      profileId: [request.profileA.id ?? request.profileA.name ?? 'A', request.profileB.id ?? request.profileB.name ?? 'B'].join('::'),
      relationshipType: request.relationshipType,
      numerologyA: { numbers: numerologyA },
      numerologyB: { numbers: numerologyB },
    });

    const result: MatchSingleResponse = {
      profileA: {
        id: request.profileA.id ?? 'profile-a',
        name: request.profileA.name ?? 'Profil A',
      },
      profileB: {
        id: request.profileB.id ?? 'profile-b',
        name: request.profileB.name ?? 'Profil B',
      },
      engine: 'unified_match',
      engineVersion: 'v1',
      scoringEngineVersion: unified.engineVersion,
      computedAt: unified.computedAt,
      matchOverall: unified.scoreOverall,
      breakdown: unified.breakdown,
      connectionType: extractConnectionType(unified.claims),
      anchorsProvided: buildAnchorsProvided(unified, numerologyA, numerologyB),
      keyReasons: buildKeyReasons(unified.claims),
      claims: unified.claims,
      warnings: unified.warnings,
    };

    devLogger.info('api', 'Match single calculated', {
      profileA: result.profileA.id,
      profileB: result.profileB.id,
      matchOverall: result.matchOverall,
      connectionType: result.connectionType,
    });

    res.json(result);
  } catch (error) {
    devLogger.error('api', 'Failed to calculate match single', { error: String(error) });
    res.status(500).json({ error: 'internal_server_error' });
  }
});
