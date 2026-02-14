export type StudioSeat = 'maya' | 'luna' | 'orion' | 'lilith';

export interface StudioTurn {
  seat: StudioSeat;
  text: string;
}

export interface StudioRequest {
  mode: 'profile' | 'match';
  profileId?: string;
  matchKey?: string;
  userMessage: string;
  seats: StudioSeat[];
  maxTurns: number;
}

export interface StudioMeta {
  engine: 'local-stub' | 'llm';
  engineVersion: string;
  computedAt: string;
  warnings?: string[];
}

export interface StudioResult {
  meta: StudioMeta;
  turns: StudioTurn[];
  nextSteps: string[];
  watchOut: string;
}
