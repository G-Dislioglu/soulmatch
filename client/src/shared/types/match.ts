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
    anchorsRequired?: string[];
    anchorsUsed?: string[];
  };
  anchorsProvided: string[];
  anchorsUsed: string[];
  meta: {
    engine: 'match_narrative';
    engineVersion: string;
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
  anchorsProvided?: string[];
  keyReasons?: string[];
  narrative?: MatchNarrativeResult;
  claims: ExplainClaim[];
}
