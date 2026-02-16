import type { ExplainClaim } from './scoring';

export interface MatchRequest {
  aProfileId: string;
  bProfileId: string;
}

export interface MatchMeta {
  engine: 'local' | 'unified_match';
  engineVersion: string;
  computedAt: string;
  warnings?: string[];
}

export interface MatchBreakdown {
  numerology: number;
  astrology: number;
  fusion: number;
}

export interface MatchScoreResult {
  aProfileId: string;
  bProfileId: string;
  meta: MatchMeta;
  matchOverall: number;
  scoreOverall?: number;
  breakdown: MatchBreakdown;
  connectionType?: string;
  anchorsProvided?: string[];
  keyReasons?: string[];
  claims: ExplainClaim[];
}
