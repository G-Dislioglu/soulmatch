// ═══════════════════════════════════════════════════
// Guide Types – Alle Interfaces
// ═══════════════════════════════════════════════════

export type GuideMode = 'onboarding' | 'contextual';

export type StepCondition = 'click' | 'navigate' | 'timer' | 'any';

export interface GuideStep {
  id: string;
  targetSelector: string;
  fallbackSelector?: string;
  requiredState?: AppStateCondition;
  waitFor: StepCondition;
  waitTimeout: number;
  contextKeys: string[];
  skipIfMissing: boolean;
}

export interface AppStateCondition {
  hasProfile?: boolean;
  hasScore?: boolean;
  hasReport?: boolean;
  hasSoulCards?: boolean;
  hasTimeline?: boolean;
  minTimelineEntries?: number;
}

export interface AppStateSnapshot {
  hasProfile: boolean;
  hasScore: boolean;
  scoreValue: number | null;
  hasReport: boolean;
  reportClaimCount: number;
  hasSoulCards: boolean;
  soulCardCount: number;
  timelineEntryCount: number;
  currentRoute: string;
  userName: string | null;
  isFirstVisit: boolean;
  lastActivePersona: string | null;
  availablePersonas: string[];
}

export interface GuideBubblePosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  arrowDirection: 'up' | 'down' | 'left' | 'right';
}

export interface GuideState {
  active: boolean;
  mode: GuideMode;
  currentStepIndex: number;
  totalSteps: number;
  currentStepId: string;
  bubbleText: string;
  bubblePosition: GuideBubblePosition;
  targetRect: DOMRect | null;
  skippedSteps: string[];
  loading: boolean;
  contextualQuery?: string;
}
