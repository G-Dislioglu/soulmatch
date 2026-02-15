// Public API for module M14_guide (V2)

// Types
export type {
  GuideStep,
  GuideState,
  GuideMode,
  AppStateSnapshot,
  GuideBubblePosition,
} from './guideTypes';

// Engine (singleton)
export { guideEngine } from './guideEngine';

// Steps
export { ONBOARDING_STEPS } from './guideSteps';

// Context
export { captureAppState, buildStepContext } from './guideContext';

// LLM
export { generateGuideText, generateContextualGuide } from './guideLLM';

// React Integration
export { GuideProvider, useGuide } from './GuideProvider';
