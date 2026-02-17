/**
 * Single source of truth for server-side scoring.
 * Do not duplicate scoring rules in route handlers.
 */

export type RelationshipType = 'general' | 'romantic' | 'friendship' | 'family';
export type ConnectionType = 'spiegel' | 'katalysator' | 'heiler' | 'anker' | 'lehrer' | 'gefaehrte';

type ElementType = 'fire' | 'earth' | 'air' | 'water';

export interface ExplainClaim {
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

export interface NumerologyNumbers {
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
  birthday?: number;
  lifePathIsMaster?: boolean;
  soulUrgeIsMaster?: boolean;
  expressionIsMaster?: boolean;
  personalityIsMaster?: boolean;
  karmicDebts?: string[];
  personalYear?: number;
}

export interface AstroSnapshot {
  sunSign?: string;
  moonSign?: string | null;
  risingSign?: string | null;
  elements?: { fire: number; earth: number; air: number; water: number };
  meta?: {
    engine?: string;
    engineVersion?: string;
  };
}

export interface UnifiedScoringRequest {
  profileId: string;
  numerologyA: { numbers: NumerologyNumbers };
  numerologyB: { numbers: NumerologyNumbers };
  astroA?: AstroSnapshot;
  astroB?: AstroSnapshot;
  relationshipType?: RelationshipType | 'business';
}

export interface UnifiedScoringResult {
  profileId: string;
  engine: 'unified_scoring';
  engineVersion: 'v3.1';
  computedAt: string;
  warnings: string[];
  meta: {
    engine: 'unified_scoring';
    engineVersion: 'v3.1';
    computedAt: string;
    warnings: string[];
  };
  scoreOverall: number;
  breakdown: {
    numerology: number;
    astrology: number;
    fusion: number;
  };
  claims: ExplainClaim[];
}

const SIGN_TO_ELEMENT: Record<string, ElementType> = {
  Widder: 'fire', Loewe: 'fire', Löwe: 'fire', Schuetze: 'fire', Schütze: 'fire',
  Stier: 'earth', Jungfrau: 'earth', Steinbock: 'earth',
  Zwillinge: 'air', Waage: 'air', Wassermann: 'air',
  Krebs: 'water', Skorpion: 'water', Fische: 'water',
};

const ELEMENT_COMPAT_MATRIX: Record<ElementType, Record<ElementType, number>> = {
  fire: { fire: 20, earth: 5, air: 15, water: -10 },
  earth: { fire: 5, earth: 20, air: 5, water: 15 },
  air: { fire: 15, earth: 5, air: 20, water: 5 },
  water: { fire: -10, earth: 15, air: 5, water: 20 },
};

const KARMIC_DEBT_INFO: Record<string, { compatModifier: number }> = {
  '13/4': { compatModifier: 0 },
  '14/5': { compatModifier: -3 },
  '16/7': { compatModifier: 5 },
  '19/1': { compatModifier: -5 },
};

const SPECIAL_LP_PAIRS: Record<string, number> = {
  '1-5': 92, '2-6': 90, '4-8': 88, '3-9': 88,
  '1-9': 85, '3-6': 85, '2-4': 82, '5-7': 80,
  '1-7': 78, '2-8': 78, '4-6': 76, '3-5': 75,
};

const FUSION_WEIGHT_NUMEROLOGY = 0.5;
const FUSION_WEIGHT_ASTROLOGY = 0.5;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function normalizeRelationshipType(value: UnifiedScoringRequest['relationshipType']): RelationshipType {
  if (!value || value === 'business') return 'general';
  return value;
}

function getElement(sign?: string | null): ElementType | null {
  if (!sign) return null;
  return SIGN_TO_ELEMENT[sign] ?? null;
}

function isAstroAvailable(astro?: AstroSnapshot): boolean {
  const engine = astro?.meta?.engine ?? '';
  const version = astro?.meta?.engineVersion ?? '';
  return Boolean(engine && engine !== 'stub' && !version.includes('stub'));
}

function computeLifePathCoreScore(lpA?: number | null, lpB?: number | null): number {
  if (!lpA || !lpB) return 60;
  if (lpA === lpB) return 85;

  const reducedA = lpA > 9 && lpA !== 11 && lpA !== 22 && lpA !== 33 ? lpA % 10 : lpA;
  const reducedB = lpB > 9 && lpB !== 11 && lpB !== 22 && lpB !== 33 ? lpB % 10 : lpB;
  const pair = [Math.min(reducedA, reducedB), Math.max(reducedA, reducedB)].join('-');
  if (SPECIAL_LP_PAIRS[pair]) return SPECIAL_LP_PAIRS[pair];

  const bothMaster = [11, 22, 33].includes(lpA) && [11, 22, 33].includes(lpB);
  if (bothMaster) return 88;

  const oneMaster = [11, 22, 33].includes(lpA) || [11, 22, 33].includes(lpB);
  if (oneMaster) return 75;

  const diff = Math.abs(reducedA - reducedB);
  return clamp(80 - diff * 7, 30, 90);
}

function simplePairScore(a?: number | null, b?: number | null): number | undefined {
  if (!a || !b) return undefined;
  const reducedA = a > 9 && a !== 11 && a !== 22 && a !== 33 ? a % 10 : a;
  const reducedB = b > 9 && b !== 11 && b !== 22 && b !== 33 ? b % 10 : b;
  const diff = Math.abs(reducedA - reducedB);
  if (diff === 0) return 90;
  if (diff === 1) return 80;
  if (diff === 2) return 70;
  if (diff === 3) return 60;
  if (diff === 4) return 50;
  return 40;
}

function calculateMasterBonus(a: NumerologyNumbers, b: NumerologyNumbers): number {
  let bonus = 0;
  if (a.lifePathIsMaster && b.lifePathIsMaster) bonus = 5;
  else if (a.lifePathIsMaster || b.lifePathIsMaster) bonus = 2;
  if ((a.soulUrgeIsMaster && b.soulUrgeIsMaster) || (a.expressionIsMaster && b.expressionIsMaster)) {
    bonus = Math.min(5, bonus + 2);
  }
  return bonus;
}

function calculateKarmicAdjustment(a: NumerologyNumbers, b: NumerologyNumbers): { adjustment: number; hasEgoConflict: boolean } {
  let adjustment = 0;
  let hasEgoConflict = false;
  const debtsA = a.karmicDebts ?? [];
  const debtsB = b.karmicDebts ?? [];

  for (const debt of debtsA) adjustment += KARMIC_DEBT_INFO[debt]?.compatModifier ?? 0;
  for (const debt of debtsB) adjustment += KARMIC_DEBT_INFO[debt]?.compatModifier ?? 0;

  if (a.lifePath === b.lifePath) {
    if (debtsA.includes('19/1') || debtsB.includes('19/1')) {
      adjustment -= 8;
      hasEgoConflict = true;
    }
    if (a.lifePath === 1 && !a.lifePathIsMaster && !b.lifePathIsMaster) {
      adjustment -= 5;
      hasEgoConflict = true;
    }
  }

  return { adjustment: clamp(adjustment, -10, 10), hasEgoConflict };
}

function computeAstroScore(a: AstroSnapshot | undefined, b: AstroSnapshot | undefined, relationshipType: RelationshipType): number {
  const sunElementA = getElement(a?.sunSign);
  const sunElementB = getElement(b?.sunSign);
  const moonElementA = getElement(a?.moonSign);
  const moonElementB = getElement(b?.moonSign);

  let sunElementAdj = 0;
  if (sunElementA && sunElementB) sunElementAdj = ELEMENT_COMPAT_MATRIX[sunElementA][sunElementB];

  let moonElementAdj = 0;
  if (moonElementA && moonElementB) moonElementAdj = round2(ELEMENT_COMPAT_MATRIX[moonElementA][moonElementB] * 0.5);

  const aSunToBMoon = a?.sunSign && b?.moonSign && a.sunSign === b.moonSign ? 8 : 0;
  const bSunToAMoon = b?.sunSign && a?.moonSign && b.sunSign === a.moonSign ? 8 : 0;

  let relationshipBonus = 0;
  if (relationshipType === 'romantic' && moonElementA && moonElementB && moonElementA === moonElementB) {
    relationshipBonus += 8;
  }

  return round2(clamp(50 + sunElementAdj + moonElementAdj + aSunToBMoon + bSunToAMoon + relationshipBonus, 0, 100));
}

export function calculateUnifiedScore(request: UnifiedScoringRequest): UnifiedScoringResult {
  const relationshipType = normalizeRelationshipType(request.relationshipType);
  const warnings: string[] = [];

  const astroAvailable = isAstroAvailable(request.astroA) && isAstroAvailable(request.astroB);
  if (!astroAvailable) warnings.push('astro_unavailable_using_numerology_only');

  const a = request.numerologyA.numbers;
  const b = request.numerologyB.numbers;

  const lifePathScore = computeLifePathCoreScore(a.lifePath, b.lifePath);
  const soulUrgeScore = simplePairScore(a.soulUrge, b.soulUrge) ?? 70;
  const expressionScore = simplePairScore(a.expression, b.expression) ?? 70;
  const personalityScore = simplePairScore(a.personality, b.personality) ?? 70;

  const weights = relationshipType === 'family'
    ? { lifePath: 0.4, soulUrge: 0.2, expression: 0.2, personality: 0.2 }
    : relationshipType === 'friendship'
      ? { lifePath: 0.5, soulUrge: 0.2, expression: 0.3, personality: 0 }
      : relationshipType === 'romantic'
        ? { lifePath: 0.5, soulUrge: 0.35, expression: 0.15, personality: 0 }
        : { lifePath: 0.6, soulUrge: 0.25, expression: 0.15, personality: 0 };

  const numeroRaw =
    lifePathScore * weights.lifePath +
    soulUrgeScore * weights.soulUrge +
    expressionScore * weights.expression +
    personalityScore * weights.personality;

  let numeroRelationshipBonus = 0;
  if (relationshipType === 'romantic' && soulUrgeScore >= 85) numeroRelationshipBonus += 5;
  if (relationshipType === 'family' && expressionScore >= 85) numeroRelationshipBonus += 5;
  if (relationshipType === 'friendship' && expressionScore >= 80) numeroRelationshipBonus += 3;

  const masterBonus = calculateMasterBonus(a, b);
  const karmic = calculateKarmicAdjustment(a, b);
  const numerologyScore = round2(clamp(numeroRaw + numeroRelationshipBonus + masterBonus + karmic.adjustment, 10, 95));

  const astrologyScore = astroAvailable
    ? computeAstroScore(request.astroA, request.astroB, relationshipType)
    : 0;

  let overallRaw = astroAvailable
    ? astrologyScore * FUSION_WEIGHT_ASTROLOGY + numerologyScore * FUSION_WEIGHT_NUMEROLOGY
    : numerologyScore;

  if (karmic.adjustment <= -8) overallRaw = Math.min(overallRaw, 65);
  else if (karmic.hasEgoConflict) overallRaw = Math.min(overallRaw, 70);

  const scoreOverall = round2(clamp(overallRaw, 0, 100));

  const connectionType: ConnectionType =
    a.lifePath === b.lifePath
      ? 'spiegel'
      : karmic.adjustment < -5 || karmic.hasEgoConflict
        ? 'katalysator'
        : scoreOverall >= 85
          ? 'gefaehrte'
          : 'anker';

  const claims: ExplainClaim[] = [
    {
      id: 'numerology-core-v31',
      level: numerologyScore >= 75 ? 'positive' : numerologyScore < 50 ? 'caution' : 'info',
      title: 'Numerologie-Kernscore (v3.1)',
      detail: `LifePath ${a.lifePath}/${b.lifePath}, SoulUrge ${a.soulUrge}/${b.soulUrge}, Expression ${a.expression}/${b.expression}.`,
      weight: 0.5,
      evidence: {
        source: 'numerology',
        refs: [`lifePath:${lifePathScore}`, `karmic:${karmic.adjustment}`, `master:${masterBonus}`],
      },
    },
    {
      id: 'fusion-connection-v31',
      level: scoreOverall >= 70 ? 'positive' : scoreOverall < 40 ? 'caution' : 'info',
      title: 'Verbindungstyp',
      detail: `Ermittelte Verbindung: ${connectionType} bei Gesamtscore ${scoreOverall}.`,
      weight: 0.3,
      evidence: {
        source: 'fusion',
        refs: [`connectionType:${connectionType}`, `overall:${scoreOverall}`],
      },
    },
  ];

  if (!astroAvailable) {
    claims.push({
      id: 'astro-unavailable',
      level: 'info',
      title: 'Astrologie nicht verfuegbar',
      detail: 'Astrologische Analyse steht derzeit nicht zur Verfuegung - basiert auf Numerologie.',
      weight: 0.1,
      evidence: {
        source: 'astrology',
        refs: ['stub-engine'],
      },
    });
  }

  const computedAt = new Date().toISOString();

  return {
    profileId: request.profileId,
    engine: 'unified_scoring',
    engineVersion: 'v3.1',
    computedAt,
    warnings,
    meta: {
      engine: 'unified_scoring',
      engineVersion: 'v3.1',
      computedAt,
      warnings,
    },
    scoreOverall,
    breakdown: {
      numerology: numerologyScore,
      astrology: astrologyScore,
      fusion: scoreOverall,
    },
    claims,
  };
}
