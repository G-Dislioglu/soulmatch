export interface GuideStep {
  id: string;
  targetElementId: string;
  mayaText: string;
  waitFor: 'click' | 'expand' | 'navigate' | 'timer' | 'any';
  waitForValue?: string;
  timerMs?: number;
  pageMustBe?: string;
  skipIf?: () => boolean;
  onComplete?: () => void;
}

export interface GuideAppState {
  currentPage: string;
  expandedCard: string | null;
}
