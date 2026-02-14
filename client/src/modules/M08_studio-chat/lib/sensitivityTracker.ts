import type { LilithIntensity } from './lilithGate';

const SENSITIVITY_KEY = 'soulmatch.lilith.sensitivity';

export interface SensitivityState {
  score: number;           // 0-100, lower = more sensitive / overwhelmed
  autoDowngraded: boolean; // true if intensity was auto-reduced
  lastChecked: string;     // ISO timestamp
}

const DISTRESS_PATTERNS: readonly RegExp[] = [
  /\bzu hart\b/i,
  /\bzu viel\b/i,
  /\bzu krass\b/i,
  /\bzu direkt\b/i,
  /\bstop\b/i,
  /\bhör auf\b/i,
  /\blass mich\b/i,
  /\bnicht so\b/i,
  /\bzu aggressiv\b/i,
  /\btut weh\b/i,
  /\bwill nicht\b/i,
  /\bbitte nicht\b/i,
  /\bbin fertig\b/i,
  /\büberfordert\b/i,
  /\bgenug\b/i,
];

const ENGAGEMENT_PATTERNS: readonly RegExp[] = [
  /\bmehr\b/i,
  /\bweiter\b/i,
  /\bgib mir\b/i,
  /\bkrass\b.*\bgut\b/i,
  /\bdanke\b/i,
  /\bgenau\b/i,
  /\bstimmt\b/i,
  /\brecht\b/i,
  /\bwow\b/i,
  /\bheftig\b.*\baber\b.*\bwahr\b/i,
  /\bvoller power\b/i,
  /\bbrutal ehrlich\b/i,
];

function loadState(): SensitivityState {
  const raw = localStorage.getItem(SENSITIVITY_KEY);
  if (!raw) return { score: 70, autoDowngraded: false, lastChecked: new Date().toISOString() };
  try {
    return JSON.parse(raw) as SensitivityState;
  } catch {
    return { score: 70, autoDowngraded: false, lastChecked: new Date().toISOString() };
  }
}

function saveState(state: SensitivityState): void {
  localStorage.setItem(SENSITIVITY_KEY, JSON.stringify(state));
}

export function getSensitivityState(): SensitivityState {
  return loadState();
}

export function analyzeMessage(userText: string): { distressHits: number; engagementHits: number } {
  let distressHits = 0;
  let engagementHits = 0;

  for (const pattern of DISTRESS_PATTERNS) {
    if (pattern.test(userText)) distressHits++;
  }
  for (const pattern of ENGAGEMENT_PATTERNS) {
    if (pattern.test(userText)) engagementHits++;
  }

  return { distressHits, engagementHits };
}

export function updateSensitivity(userText: string): SensitivityState {
  const state = loadState();
  const { distressHits, engagementHits } = analyzeMessage(userText);

  // Each distress signal reduces score by 12, each engagement signal recovers 5
  const delta = (engagementHits * 5) - (distressHits * 12);
  state.score = Math.max(0, Math.min(100, state.score + delta));

  // Natural recovery: +1 per check (slow drift back to baseline)
  if (distressHits === 0 && engagementHits === 0) {
    state.score = Math.min(100, state.score + 1);
  }

  state.autoDowngraded = false;
  state.lastChecked = new Date().toISOString();
  saveState(state);
  return state;
}

export function shouldDowngradeIntensity(currentIntensity: LilithIntensity): LilithIntensity | null {
  const state = loadState();

  if (currentIntensity === 'brutal' && state.score < 40) {
    state.autoDowngraded = true;
    saveState(state);
    return 'ehrlich';
  }
  if (currentIntensity === 'ehrlich' && state.score < 20) {
    state.autoDowngraded = true;
    saveState(state);
    return 'mild';
  }

  return null;
}

export function shouldTriggerMayaHandoff(): boolean {
  const state = loadState();
  return state.score < 15;
}

export function resetSensitivity(): void {
  saveState({ score: 70, autoDowngraded: false, lastChecked: new Date().toISOString() });
}
