import { Router, type Request, type Response } from 'express';
import { devLogger } from '../devLogger.js';
import {
  type AstroSnapshot,
  calculateUnifiedScore,
  type ConnectionType,
  type NumerologyNumbers,
  type RelationshipType,
} from '../shared/scoring.js';
import { applyNarrativeGate } from '../lib/studioQuality.js';
import type { NarrativeQualityDebug, StudioNarrativePayload } from '../shared/narrative/types.js';
import { calculateAstrologyForMatch } from './astro.js';

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

interface MatchAccuracy {
  astrologyActive: boolean;
  missing: string[];
  unknownTime: boolean;
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
  astroAspects?: AstroAspect[];
  anchorsProvided: string[];
  keyReasons: string[];
  claims: ExplainClaim[];
  warnings: string[];
  accuracy: MatchAccuracy;
}

type AstroBodyKey = 'sun' | 'moon' | 'venus' | 'mars';
type AstroAspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

interface AstroAspect {
  aBody: AstroBodyKey;
  bBody: AstroBodyKey;
  aspect: AstroAspectType;
  orbDeg: number;
}

interface AspectRule {
  type: AstroAspectType;
  angle: number;
  maxOrb: number;
  score: number;
}

const SYNASTRY_BODIES: AstroBodyKey[] = ['sun', 'moon', 'venus', 'mars'];
const ASPECT_RULES: AspectRule[] = [
  { type: 'conjunction', angle: 0, maxOrb: 8, score: 3 },
  { type: 'opposition', angle: 180, maxOrb: 8, score: -2 },
  { type: 'trine', angle: 120, maxOrb: 6, score: 4 },
  { type: 'square', angle: 90, maxOrb: 6, score: -3 },
  { type: 'sextile', angle: 60, maxOrb: 4, score: 2 },
];

const ASPECT_CAP = 8;
const ASPECT_SCORE_CAP = 10;

interface MatchNarrativeRequest {
  profileA?: { id?: string; name?: string };
  profileB?: { id?: string; name?: string };
  matchOverall?: number;
  connectionType?: ConnectionType;
  scoringEngineVersion?: string;
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
    scoringEngineVersion?: string;
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
  astroAnchors: string[] = [],
  breakdownOverride?: MatchBreakdown,
  matchOverallOverride?: number,
): string[] {
  const breakdown = breakdownOverride ?? response.breakdown;
  const matchOverall = typeof matchOverallOverride === 'number' ? matchOverallOverride : response.scoreOverall;
  const anchors = new Set<string>();
  for (const anchor of astroAnchors) {
    anchors.add(anchor);
  }
  anchors.add(`matchOverall:${matchOverall}`);
  anchors.add(`breakdown:numerology:${breakdown.numerology}`);
  anchors.add(`breakdown:astrology:${breakdown.astrology}`);
  anchors.add(`breakdown:fusion:${breakdown.fusion}`);
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

  return Array.from(anchors).slice(0, 16);
}

type MatchAstroResult = Awaited<ReturnType<typeof calculateAstrologyForMatch>>;

function toAstroSnapshot(result: MatchAstroResult): AstroSnapshot {
  const sun = result.planets.find((planet) => planet.key === 'sun');
  const moon = result.planets.find((planet) => planet.key === 'moon');

  return {
    sunSign: sun?.signDe,
    moonSign: moon?.signDe,
    elements: result.elements,
    meta: {
      engine: result.meta.engine,
      engineVersion: result.meta.engineVersion,
    },
  };
}

function getDominantElement(elements: MatchAstroResult['elements']): { key: string; count: number } {
  const pairs: Array<{ key: string; count: number }> = [
    { key: 'earth', count: elements.earth },
    { key: 'water', count: elements.water },
    { key: 'fire', count: elements.fire },
    { key: 'air', count: elements.air },
  ];

  pairs.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.key.localeCompare(b.key);
  });

  return pairs[0];
}

function buildAstroAnchors(astroA: MatchAstroResult, astroB: MatchAstroResult): string[] {
  const anchors = new Set<string>();
  const sunA = astroA.planets.find((planet) => planet.key === 'sun');
  const sunB = astroB.planets.find((planet) => planet.key === 'sun');
  const dominantA = getDominantElement(astroA.elements);
  const dominantB = getDominantElement(astroB.elements);

  if (sunA) {
    anchors.add(`astroA:sun:${sunA.signKey}(${sunA.degreeInSign.toFixed(2)}°)`);
  }

  if (sunB) {
    anchors.add(`astroB:sun:${sunB.signKey}(${sunB.degreeInSign.toFixed(2)}°)`);
  }

  anchors.add(`astro:elements:A(${dominantA.key}:${dominantA.count})|B(${dominantB.key}:${dominantB.count})`);

  return Array.from(anchors).slice(0, 4);
}

function normalizeAngleDiff(lonA: number, lonB: number): number {
  let diff = Math.abs(lonA - lonB);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function collectSynastryAspects(astroA: MatchAstroResult, astroB: MatchAstroResult): AstroAspect[] {
  const lonA = new Map<AstroBodyKey, number>();
  const lonB = new Map<AstroBodyKey, number>();

  for (const key of SYNASTRY_BODIES) {
    const planetA = astroA.planets.find((planet) => planet.key === key);
    const planetB = astroB.planets.find((planet) => planet.key === key);
    if (planetA) lonA.set(key, planetA.lon);
    if (planetB) lonB.set(key, planetB.lon);
  }

  const aspects: AstroAspect[] = [];
  for (const aBody of SYNASTRY_BODIES) {
    const aLon = lonA.get(aBody);
    if (typeof aLon !== 'number') continue;
    for (const bBody of SYNASTRY_BODIES) {
      const bLon = lonB.get(bBody);
      if (typeof bLon !== 'number') continue;

      const diff = normalizeAngleDiff(aLon, bLon);
      for (const rule of ASPECT_RULES) {
        const orb = Math.abs(diff - rule.angle);
        if (orb <= rule.maxOrb) {
          aspects.push({
            aBody,
            bBody,
            aspect: rule.type,
            orbDeg: Number(orb.toFixed(1)),
          });
          break;
        }
      }
    }
  }

  aspects.sort((a, b) => a.orbDeg - b.orbDeg);
  return aspects.slice(0, ASPECT_CAP);
}

function computeAspectAdjustment(aspects: AstroAspect[]): number {
  let raw = 0;
  for (const aspect of aspects) {
    const rule = ASPECT_RULES.find((entry) => entry.type === aspect.aspect);
    if (!rule) continue;
    const closeness = Math.max(0, 1 - (aspect.orbDeg / rule.maxOrb));
    raw += rule.score * (0.5 + closeness * 0.5);
  }
  return Math.max(-ASPECT_SCORE_CAP, Math.min(ASPECT_SCORE_CAP, Number(raw.toFixed(2))));
}

function buildAspectAnchors(aspects: AstroAspect[]): string[] {
  return aspects
    .slice(0, 4)
    .map((aspect) => `astro:aspect:${aspect.aBody}-${aspect.aspect}-${aspect.bBody}(orb:${aspect.orbDeg.toFixed(1)})`);
}

const BODY_DE: Record<AstroBodyKey, string> = {
  sun: 'Sonne',
  moon: 'Mond',
  venus: 'Venus',
  mars: 'Mars',
};

const ASPECT_DE: Record<AstroAspectType, string> = {
  conjunction: 'Konjunktion',
  opposition: 'Opposition',
  trine: 'Trigon',
  square: 'Quadrat',
  sextile: 'Sextil',
};

const ASPECT_HARMONIC: Record<AstroAspectType, boolean> = {
  conjunction: true,
  opposition: false,
  trine: true,
  square: false,
  sextile: true,
};

function appendAspectReason(keyReasons: string[], aspects: AstroAspect[]): string[] {
  if (aspects.length === 0) return keyReasons;
  const lead = aspects[0];
  const bodyA = BODY_DE[lead.aBody];
  const bodyB = BODY_DE[lead.bBody];
  const aspectDE = ASPECT_DE[lead.aspect];
  const label = ASPECT_HARMONIC[lead.aspect] ? 'harmonischer Drive' : 'spannungsreicher Drive';
  const reason = `${bodyA} (A) ${aspectDE} ${bodyB} (B), Orb ${lead.orbDeg.toFixed(1)}° → ${label}`;
  const merged = Array.from(new Set([reason, ...keyReasons]));
  return merged.slice(0, 3);
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

interface AspectHighlight {
  anchorId: string;
  sentence: string;
}

function extractTopAspectHighlight(anchorsProvided: string[]): AspectHighlight | null {
  const aspectAnchor = anchorsProvided.find((a) => a.startsWith('astro:aspect:'));
  if (!aspectAnchor) return null;
  const m = /astro:aspect:(\w+)-(\w+)-(\w+)\(orb:([\d.]+)\)/.exec(aspectAnchor);
  if (!m) return null;
  const [, aBodyRaw, aspectTypeRaw, bBodyRaw, orb] = m;
  const bodyA = BODY_DE[aBodyRaw as AstroBodyKey] ?? aBodyRaw;
  const bodyB = BODY_DE[bBodyRaw as AstroBodyKey] ?? bBodyRaw;
  const aspectLabel = ASPECT_DE[aspectTypeRaw as AstroAspectType] ?? aspectTypeRaw;
  return {
    anchorId: aspectAnchor,
    sentence: `Stärkster Synastrie-Aspekt: ${bodyA} (A) ${aspectLabel} ${bodyB} (B), Orb ${parseFloat(orb).toFixed(1)}°.`,
  };
}

interface MatchNarrativeBuildResult {
  payload: StudioNarrativePayload;
  usedAnchorIds: string[];
}

function buildMatchNarrativePayload(request: MatchNarrativeRequest): MatchNarrativeBuildResult {
  const anchorsProvided = Array.isArray(request.anchorsProvided) ? request.anchorsProvided : [];
  const aspectHighlight = extractTopAspectHighlight(anchorsProvided);

  if (request.forceFallback) {
    return {
      payload: {
        turns: [{ seat: 'maya', text: 'ok' }],
        nextSteps: ['...', 'TODO', 'später'],
        watchOut: 'kurz',
      },
      usedAnchorIds: [],
    };
  }

  const nameA = request.profileA?.name ?? 'Profil A';
  const nameB = request.profileB?.name ?? 'Profil B';
  const score = typeof request.matchOverall === 'number' ? request.matchOverall : 0;
  const connectionType = request.connectionType ?? 'anker';
  const reasons = Array.isArray(request.keyReasons) ? request.keyReasons.slice(0, 2) : [];
  const reasonText = reasons.length > 0 ? reasons.join(' und ') : 'die numerologische Grundresonanz';
  const aspectSuffix = aspectHighlight ? ` ${aspectHighlight.sentence}` : '';

  return {
    payload: {
      turns: [
        {
          seat: 'maya',
          text: `${nameA} und ${nameB} zeigen aktuell einen Match-Score von ${score}. Der Verbindungstyp ${connectionType} deutet darauf hin, dass ${reasonText} eure Dynamik spürbar prägen.${aspectSuffix}`,
        },
      ],
      nextSteps: [
        `Sprecht heute 20 Minuten über den wichtigsten gemeinsamen Fokus für diese Woche.`,
        'Formuliert eine konkrete Vereinbarung, die für beide klar überprüfbar ist.',
        'Reflektiert in drei Tagen kurz, was sich durch diese Vereinbarung verbessert hat.',
      ],
      watchOut: 'Vermeidet vage Erwartungen. Ohne klare Absprachen kippt selbst ein gutes Matching schnell in Missverständnisse.',
    },
    usedAnchorIds: aspectHighlight ? [aspectHighlight.anchorId] : [],
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
    const aProfileId = (request.aProfileId ?? '').trim();
    const bProfileId = (request.bProfileId ?? '').trim();
    if (!aProfileId || !bProfileId) {
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

    const result = calculateMatch({ ...request, aProfileId, bProfileId });
    devLogger.info('api', 'Match calculated', { 
      aProfileId,
      bProfileId,
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

    const { payload, usedAnchorIds } = buildMatchNarrativePayload(request);
    for (const id of usedAnchorIds) {
      if (!anchorsUsed.includes(id)) anchorsUsed.push(id);
    }

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
        scoringEngineVersion: request.scoringEngineVersion,
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
matchRouter.post('/single', async (req: Request, res: Response) => {
  try {
    const request = req.body as MatchSingleRequest;
    const profileABirthDate = (request?.profileA?.birthDate ?? '').trim();
    const profileBBirthDate = (request?.profileB?.birthDate ?? '').trim();
    if (!profileABirthDate || !profileBBirthDate) {
      return res.status(400).json({ error: 'profileA.birthDate and profileB.birthDate are required' });
    }

    const numerologyA = deriveNumerologyFromBirthDate(profileABirthDate);
    const numerologyB = deriveNumerologyFromBirthDate(profileBBirthDate);

    const requestWarnings: string[] = [];
    const timezoneA = request.profileA.birthLocation?.timezone?.trim();
    const timezoneB = request.profileB.birthLocation?.timezone?.trim();
    const hasRequiredAstroInput = Boolean(timezoneA && timezoneB);

    let astroA: AstroSnapshot | undefined;
    let astroB: AstroSnapshot | undefined;
    let astroAnchors: string[] = [];
    let astroAspects: AstroAspect[] = [];

    if (hasRequiredAstroInput) {
      try {
        const [astroResultA, astroResultB] = await Promise.all([
          calculateAstrologyForMatch({
            profileId: request.profileA.id ?? 'profile-a',
            birthDate: profileABirthDate,
            birthTime: request.profileA.birthTime,
            timezone: timezoneA!,
            location: request.profileA.birthLocation,
          }),
          calculateAstrologyForMatch({
            profileId: request.profileB.id ?? 'profile-b',
            birthDate: profileBBirthDate,
            birthTime: request.profileB.birthTime,
            timezone: timezoneB!,
            location: request.profileB.birthLocation,
          }),
        ]);

        astroA = toAstroSnapshot(astroResultA);
        astroB = toAstroSnapshot(astroResultB);
        astroAspects = collectSynastryAspects(astroResultA, astroResultB);
        astroAnchors = [...buildAstroAnchors(astroResultA, astroResultB), ...buildAspectAnchors(astroAspects)];

        if (astroResultA.unknownTime || astroResultB.unknownTime) {
          requestWarnings.push('astro_unknown_time_no_houses');
        }
      } catch (error) {
        requestWarnings.push('astro_calc_failed_using_numerology_only');
        devLogger.warn('api', 'Astrology computation failed during /match/single', {
          error: String(error),
          profileA: request.profileA.id,
          profileB: request.profileB.id,
        });
      }
    } else {
      requestWarnings.push('astro_timezone_missing_using_numerology_only');
    }

    const unified = calculateUnifiedScore({
      profileId: [request.profileA.id ?? request.profileA.name ?? 'A', request.profileB.id ?? request.profileB.name ?? 'B'].join('::'),
      relationshipType: request.relationshipType,
      numerologyA: { numbers: numerologyA },
      numerologyB: { numbers: numerologyB },
      astroA,
      astroB,
    });

    const aspectAdjustment = astroAspects.length > 0 ? computeAspectAdjustment(astroAspects) : 0;
    const astrologyWithAspects = Math.max(0, Math.min(100, Number((unified.breakdown.astrology + aspectAdjustment).toFixed(2))));
    const fusionWithAspects = astroA && astroB
      ? Number(((unified.breakdown.numerology * 0.5) + (astrologyWithAspects * 0.5)).toFixed(2))
      : unified.breakdown.fusion;
    const matchOverall = fusionWithAspects;

    if (astroAspects.length > 0) {
      requestWarnings.push('astro_synastry_aspects_active');
    }

    const warnings = Array.from(new Set([...(unified.warnings ?? []), ...requestWarnings]));
    const keyReasons = appendAspectReason(buildKeyReasons(unified.claims), astroAspects);
    const breakdown: MatchBreakdown = {
      numerology: unified.breakdown.numerology,
      astrology: astrologyWithAspects,
      fusion: fusionWithAspects,
    };

    const missingFields: string[] = [];
    if (!timezoneA || !timezoneB) missingFields.push('birthLocation.timezone');
    if (!request.profileA.birthTime || !request.profileB.birthTime) missingFields.push('birthTime');
    const accuracy: MatchAccuracy = {
      astrologyActive: breakdown.astrology > 0,
      missing: missingFields,
      unknownTime: warnings.includes('astro_unknown_time_no_houses'),
    };

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
      matchOverall,
      breakdown,
      connectionType: extractConnectionType(unified.claims),
      astroAspects: astroAspects.length > 0 ? astroAspects : undefined,
      anchorsProvided: buildAnchorsProvided(unified, numerologyA, numerologyB, astroAnchors, breakdown, matchOverall),
      keyReasons,
      claims: unified.claims,
      warnings,
      accuracy,
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
