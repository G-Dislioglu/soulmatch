import type { GuideStep, GuideAppState } from './types';

export interface GuideEngineConfig {
  steps: GuideStep[];
  onStepChange: (step: GuideStep, index: number) => void;
  onMayaMessage: (text: string) => void;
  onPointTo: (elementId: string | null) => void;
  onComplete: () => void;
  getAppState: () => GuideAppState;
}

export class GuideEngine {
  private steps: GuideStep[];
  private currentIndex = -1;
  private config: GuideEngineConfig;
  private active = false;
  private eventCleanups: (() => void)[] = [];

  constructor(config: GuideEngineConfig) {
    this.steps = config.steps;
    this.config = config;
  }

  start() {
    this.active = true;
    this.currentIndex = -1;
    this.advance();
  }

  stop() {
    this.active = false;
    this.cleanup();
    this.config.onPointTo(null);
    this.config.onComplete();
  }

  advance() {
    if (!this.active) return;
    this.cleanup();
    this.currentIndex++;

    // Skip steps whose skipIf returns true
    while (this.currentIndex < this.steps.length) {
      const step = this.steps[this.currentIndex]!;
      if (step.skipIf && step.skipIf()) {
        this.currentIndex++;
        continue;
      }
      break;
    }

    if (this.currentIndex >= this.steps.length) {
      this.stop();
      return;
    }

    const step = this.steps[this.currentIndex]!;

    // Maya speaks
    this.config.onMayaMessage(step.mayaText);

    // Pointer shows target (delayed so text appears first)
    setTimeout(() => {
      if (!this.active) return;
      // Scroll target into view if needed
      const el = document.getElementById(step.targetElementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      this.config.onPointTo(step.targetElementId);
    }, 600);

    // Step-change callback
    this.config.onStepChange(step, this.currentIndex);

    // Wait for completion
    this.waitForCompletion(step);
  }

  private waitForCompletion(step: GuideStep) {
    switch (step.waitFor) {
      case 'timer': {
        const timer = setTimeout(() => this.advance(), step.timerMs || 3000);
        this.eventCleanups.push(() => clearTimeout(timer));
        break;
      }

      case 'click': {
        const el = document.getElementById(step.targetElementId);
        if (el) {
          const handler = () => {
            setTimeout(() => this.advance(), 500);
          };
          el.addEventListener('click', handler, { once: true });
          this.eventCleanups.push(() => el.removeEventListener('click', handler));
        } else {
          // Element not found — fall back to timer
          const timer = setTimeout(() => this.advance(), 4000);
          this.eventCleanups.push(() => clearTimeout(timer));
        }
        break;
      }

      case 'navigate': {
        const checkInterval = setInterval(() => {
          const state = this.config.getAppState();
          if (state.currentPage === step.waitForValue) {
            clearInterval(checkInterval);
            setTimeout(() => this.advance(), 600);
          }
        }, 200);
        this.eventCleanups.push(() => clearInterval(checkInterval));
        break;
      }

      case 'expand': {
        const checkInterval = setInterval(() => {
          const state = this.config.getAppState();
          if (state.expandedCard === step.waitForValue) {
            clearInterval(checkInterval);
            setTimeout(() => this.advance(), 600);
          }
        }, 200);
        this.eventCleanups.push(() => clearInterval(checkInterval));
        break;
      }

      case 'any': {
        const handler = () => {
          setTimeout(() => this.advance(), 300);
        };
        document.addEventListener('click', handler, { once: true });
        this.eventCleanups.push(() => document.removeEventListener('click', handler));
        break;
      }
    }
  }

  private cleanup() {
    this.eventCleanups.forEach((fn) => fn());
    this.eventCleanups = [];
  }

  notifyAction(action: string, value?: string) {
    if (!this.active) return;
    const step = this.steps[this.currentIndex];
    if (!step) return;

    if (step.waitFor === 'navigate' && action === 'navigate' && value === step.waitForValue) {
      this.cleanup();
      setTimeout(() => this.advance(), 400);
    }
    if (step.waitFor === 'expand' && action === 'expand' && value === step.waitForValue) {
      this.cleanup();
      setTimeout(() => this.advance(), 400);
    }
  }

  getCurrentStep(): GuideStep | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.steps.length) return null;
    return this.steps[this.currentIndex]!;
  }

  getProgress(): { current: number; total: number } {
    return { current: Math.max(0, this.currentIndex + 1), total: this.steps.length };
  }

  isActive(): boolean {
    return this.active;
  }
}
