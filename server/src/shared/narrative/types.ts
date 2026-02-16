export interface GateContext {
  mode?: 'profile' | 'match';
  seat?: string;
  source?: 'studio_turn' | 'studio_next_step' | 'studio_watch_out' | 'probe';
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
