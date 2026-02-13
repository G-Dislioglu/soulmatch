// --- Claim Types ---

export type ClaimLevel = 'info' | 'positive' | 'caution';

export interface ExplainClaim {
  id: string;
  level: ClaimLevel;
  title: string;
  detail: string;
  weight: number;
  evidence: {
    source: 'numerology' | 'astrology' | 'fusion';
    refs: string[];
  };
}

// --- Score Types ---

export interface ScoreBreakdown {
  numerology: number;
  astrology: number;
  fusion: number;
}

export interface ScoreMeta {
  engine: 'local';
  engineVersion: string;
  computedAt: string;
  warnings?: string[];
}

export interface ScoreRequest {
  profileId: string;
  numerologyProfileId?: string;
  astrologyProfileId?: string;
}

export interface ScoreResult {
  profileId: string;
  meta: ScoreMeta;
  scoreOverall: number;
  breakdown: ScoreBreakdown;
  claims: ExplainClaim[];
}
