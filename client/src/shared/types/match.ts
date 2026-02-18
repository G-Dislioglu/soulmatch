import type { ExplainClaim } from './scoring';

export interface MatchRequest {
  aProfileId: string;
  bProfileId: string;
}

export interface MatchMeta {
  engine: 'local' | 'unified_match';
  engineVersion: string;
  scoringEngineVersion?: string;
  computedAt: string;
  warnings?: string[];
}

export interface MatchBreakdown {
  numerology: number;
  astrology: number;
  fusion: number;
}

export type AstroBodyKey = 'sun' | 'moon' | 'venus' | 'mars';
export type AstroAspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

export interface AstroAspect {
  aBody: AstroBodyKey;
  bBody: AstroBodyKey;
  aspect: AstroAspectType;
  orbDeg: number;
}

export interface MatchAccuracy {
  astrologyActive: boolean;
  missing: string[];
  unknownTime: boolean;
}

export interface MatchNarrativeResult {
  status: 'ok';
  narrative: {
    turns: Array<{ seat: string; text: string }>;
    nextSteps: string[];
    watchOut: string;
  };
  qualityDebug: {
    pass: boolean;
    reasons: string[];
    fallbackUsed: boolean;
    version: string;
    anchorsExpected?: boolean;
    anchorsMinRequired?: number;
    anchorsUsedCount?: number;
    anchorsUsed?: string[];
  };
  anchorsProvided: string[];
  anchorsUsed: string[];
  meta: {
    engine: 'match_narrative';
    engineVersion: string;
    scoringEngineVersion?: string;
    computedAt: string;
    warnings?: string[];
  };
}

export interface MatchScoreResult {
  aProfileId: string;
  bProfileId: string;
  meta: MatchMeta;
  matchOverall: number;
  breakdown: MatchBreakdown;
  connectionType?: string;
  astroAspects?: AstroAspect[];
  anchorsProvided?: string[];
  accuracy?: MatchAccuracy;
  keyReasons?: string[];
  narrative?: MatchNarrativeResult;
  claims: ExplainClaim[];
}
