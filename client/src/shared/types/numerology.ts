// --- Config Types ---

export type NumerologySystem = 'pythagorean';

// --- Request ---

export interface NumerologyRequest {
  profileId: string;
  name: string;
  birthDate: string;
  system: NumerologySystem;
}

// --- Result Types ---

export interface NumerologyMeta {
  engine: 'local';
  engineVersion: string;
  system: NumerologySystem;
  computedAt: string;
  warnings?: string[];
}

export interface NumerologyCoreNumbers {
  lifePath: number;
  expression: number;
  soulUrge: number;
  personality: number;
  birthday: number;
}

export interface NumerologyResult {
  profileId: string;
  meta: NumerologyMeta;
  numbers: NumerologyCoreNumbers;
  breakdown?: {
    lifePath: string;
    expression: string;
    soulUrge: string;
    personality: string;
  };
}
