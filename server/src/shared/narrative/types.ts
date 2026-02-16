export interface GateContext {
  mode?: 'profile' | 'match';
  seat?: string;
  source?: 'studio_turn' | 'studio_next_step' | 'studio_watch_out' | 'probe';
  anchorsExpected?: boolean;
  requiredAnchorIds?: string[];
}

export interface GateResult {
  pass: boolean;
  reasons: string[];
  score?: number;
  version: string;
}

export interface NarrativeQualityDebug {
  pass: boolean;
  reasons: string[];
  fallbackUsed: boolean;
  version: string;
  anchorsExpected?: boolean;
  anchorsRequired?: string[];
  anchorsUsed?: string[];
}

export interface StudioNarrativePayload {
  turns: Array<{ seat: string; text: string }>;
  nextSteps: string[];
  watchOut: string;
}

export interface ApplyGateResult {
  output: StudioNarrativePayload;
  qualityDebug: NarrativeQualityDebug;
}
