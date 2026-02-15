// ═══════════════════════════════════════════════════
// Guide Engine – State Machine
// ═══════════════════════════════════════════════════

import type { GuideState, GuideStep, AppStateCondition, AppStateSnapshot, GuideBubblePosition } from './guideTypes';
import { ONBOARDING_STEPS } from './guideSteps';
import { captureAppState } from './guideContext';
import { generateGuideText, generateContextualGuide } from './guideLLM';

type GuideListener = (state: GuideState) => void;

function defaultState(): GuideState {
  return {
    active: false,
    mode: 'onboarding',
    currentStepIndex: 0,
    totalSteps: 0,
    currentStepId: '',
    bubbleText: '',
    bubblePosition: { arrowDirection: 'up' },
    targetRect: null,
    skippedSteps: [],
    loading: false,
  };
}

class GuideEngineClass {
  private state: GuideState = defaultState();
  private listeners: Set<GuideListener> = new Set();
  private activeSteps: GuideStep[] = [];
  private timeoutId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // ─── Public getState ───

  getState(): GuideState {
    return { ...this.state };
  }

  // ─── Subscriptions ───

  subscribe(listener: GuideListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = { ...this.state };
    this.listeners.forEach(fn => fn(snapshot));
  }

  // ─── Start / Stop ───

  async startOnboarding() {
    const appState = captureAppState();

    // Filter Steps basierend auf App-State
    this.activeSteps = ONBOARDING_STEPS.filter(step => {
      if (!step.requiredState) return true;
      return this.checkCondition(step.requiredState, appState);
    });

    // Prüfe ob Target-Elemente existieren (für skipIfMissing Steps)
    this.activeSteps = this.activeSteps.filter(step => {
      if (!step.skipIfMissing) return true;
      const el = document.querySelector(step.targetSelector)
                || document.querySelector(step.fallbackSelector || '');
      return !!el;
    });

    this.state = {
      ...defaultState(),
      active: true,
      mode: 'onboarding',
      totalSteps: this.activeSteps.length,
    };

    this.emit();
    await this.executeStep(0);
  }

  async startContextual(query: string) {
    const appState = captureAppState();

    this.state = {
      ...defaultState(),
      active: true,
      mode: 'contextual',
      totalSteps: 1,
      currentStepId: 'contextual',
      contextualQuery: query,
      loading: true,
    };
    this.emit();

    try {
      const result = await generateContextualGuide(query, appState);

      this.state.bubbleText = result.text;
      this.state.loading = false;

      const target = document.querySelector(result.targetSelector);
      if (target) {
        this.state.targetRect = target.getBoundingClientRect();
        this.state.bubblePosition = this.calculateBubblePosition(target);
      }
    } catch {
      this.state.bubbleText = 'Schreib mir im Chat was du wissen willst ✦';
      this.state.loading = false;
    }

    this.emit();
    this.scheduleTimeout(12000);
  }

  stop() {
    const wasOnboarding = this.state.mode === 'onboarding' && this.state.active;
    this.state = defaultState();
    this.clearTimeout();
    this.disconnectResizeObserver();
    this.emit();

    if (wasOnboarding) {
      localStorage.setItem('soulmatch_guide_completed', 'true');
    }
  }

  // ─── Step Execution ───

  private async executeStep(index: number) {
    if (index >= this.activeSteps.length) {
      this.stop();
      return;
    }

    const step = this.activeSteps[index]!;
    const appState = captureAppState();

    // Finde Target-Element
    const target = document.querySelector(step.targetSelector)
                  || document.querySelector(step.fallbackSelector || '');

    if (!target && step.skipIfMissing) {
      this.state.skippedSteps.push(step.id);
      await this.executeStep(index + 1);
      return;
    }

    // Loading state
    this.state.currentStepIndex = index;
    this.state.currentStepId = step.id;
    this.state.loading = true;

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.state.targetRect = target.getBoundingClientRect();
      this.state.bubblePosition = this.calculateBubblePosition(target);
      this.observeResize(target as HTMLElement);
    }

    this.emit();

    // LLM-Text generieren (async – Fallback ist sofort da)
    const bubbleText = await generateGuideText(
      step.id,
      index,
      this.activeSteps.length,
      appState,
      step.contextKeys
    );

    // Re-check: guide could have been stopped during LLM call
    if (!this.state.active) return;

    // Recalculate position (element may have moved after scroll)
    if (target) {
      this.state.targetRect = target.getBoundingClientRect();
      this.state.bubblePosition = this.calculateBubblePosition(target);
    }

    this.state.bubbleText = bubbleText;
    this.state.loading = false;
    this.emit();

    // Timeout für "Weiter pulsiert"
    this.scheduleTimeout(step.waitTimeout);
  }

  // ─── Navigation ───

  async next() {
    this.clearTimeout();
    this.disconnectResizeObserver();
    await this.executeStep(this.state.currentStepIndex + 1);
  }

  async previous() {
    if (this.state.currentStepIndex > 0) {
      this.clearTimeout();
      this.disconnectResizeObserver();
      await this.executeStep(this.state.currentStepIndex - 1);
    }
  }

  // ─── Bubble Positioning ───

  private calculateBubblePosition(target: Element): GuideBubblePosition {
    const rect = target.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const BUBBLE_HEIGHT = 120;
    const BUBBLE_WIDTH = 280;
    const MARGIN = 16;

    const spaceAbove = rect.top;
    const spaceBelow = viewportH - rect.bottom;

    let position: GuideBubblePosition;

    if (spaceAbove > BUBBLE_HEIGHT + MARGIN * 2) {
      position = {
        bottom: viewportH - rect.top + MARGIN,
        left: Math.max(MARGIN, Math.min(
          rect.left + rect.width / 2 - BUBBLE_WIDTH / 2,
          viewportW - BUBBLE_WIDTH - MARGIN
        )),
        arrowDirection: 'down',
      };
    } else if (spaceBelow > BUBBLE_HEIGHT + MARGIN * 2) {
      position = {
        top: rect.bottom + MARGIN,
        left: Math.max(MARGIN, Math.min(
          rect.left + rect.width / 2 - BUBBLE_WIDTH / 2,
          viewportW - BUBBLE_WIDTH - MARGIN
        )),
        arrowDirection: 'up',
      };
    } else {
      const spaceRight = viewportW - rect.right;

      if (spaceRight > BUBBLE_WIDTH + MARGIN * 2) {
        position = {
          top: Math.max(MARGIN, rect.top + rect.height / 2 - BUBBLE_HEIGHT / 2),
          left: rect.right + MARGIN,
          arrowDirection: 'left',
        };
      } else {
        position = {
          top: Math.max(MARGIN, rect.top + rect.height / 2 - BUBBLE_HEIGHT / 2),
          right: viewportW - rect.left + MARGIN,
          arrowDirection: 'right',
        };
      }
    }

    return position;
  }

  // ─── State Condition Check ───

  private checkCondition(condition: AppStateCondition, state: AppStateSnapshot): boolean {
    if (condition.hasProfile !== undefined && condition.hasProfile !== state.hasProfile) return false;
    if (condition.hasScore !== undefined && condition.hasScore !== state.hasScore) return false;
    if (condition.hasReport !== undefined && condition.hasReport !== state.hasReport) return false;
    if (condition.hasSoulCards !== undefined && condition.hasSoulCards !== state.hasSoulCards) return false;
    if (condition.minTimelineEntries !== undefined &&
        state.timelineEntryCount < condition.minTimelineEntries) return false;
    return true;
  }

  // ─── Utilities ───

  private scheduleTimeout(ms: number) {
    this.clearTimeout();
    this.timeoutId = window.setTimeout(() => {
      // After timeout the "Weiter" button pulses (handled in component)
      this.emit();
    }, ms);
  }

  private clearTimeout() {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private observeResize(element: HTMLElement) {
    this.disconnectResizeObserver();
    this.resizeObserver = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      this.state.targetRect = rect;
      this.state.bubblePosition = this.calculateBubblePosition(element);
      this.emit();
    });
    this.resizeObserver.observe(element);
  }

  private disconnectResizeObserver() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}

// Singleton Export
export const guideEngine = new GuideEngineClass();
