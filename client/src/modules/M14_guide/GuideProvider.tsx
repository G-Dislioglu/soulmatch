// ═══════════════════════════════════════════════════
// GuideProvider – React Integration
// ═══════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GuideState } from './guideTypes';
import { guideEngine } from './guideEngine';
import MayaGuideBubble from './MayaGuideBubble';
import MayaGuideRing from './MayaGuideRing';
import { loadProfile } from '../M03_profile';

interface GuideContextValue {
  guideActive: boolean;
  startOnboarding: () => void;
  startContextual: (query: string) => void;
  stopGuide: () => void;
  nextStep: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export const useGuide = () => {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuide must be inside GuideProvider');
  return ctx;
};

export const GuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GuideState>(guideEngine.getState());

  useEffect(() => {
    const unsubscribe = guideEngine.subscribe(setState);
    return unsubscribe;
  }, []);

  // ─── Auto-Start bei erstem Besuch ───
  useEffect(() => {
    const completed = localStorage.getItem('soulmatch_guide_completed');
    if (completed) return;

    // Only auto-start if user has a profile
    const profile = loadProfile();
    if (!profile || !profile.name) return;

    const timer = setTimeout(() => {
      guideEngine.startOnboarding();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const value: GuideContextValue = {
    guideActive: state.active,
    startOnboarding: useCallback(() => guideEngine.startOnboarding(), []),
    startContextual: useCallback((q: string) => guideEngine.startContextual(q), []),
    stopGuide: useCallback(() => guideEngine.stop(), []),
    nextStep: useCallback(() => guideEngine.next(), []),
  };

  return (
    <GuideContext.Provider value={value}>
      {children}
      {/* Guide UI Layer – rendert über allem */}
      <MayaGuideRing targetRect={state.targetRect} active={state.active} />
      <MayaGuideBubble state={state} />
    </GuideContext.Provider>
  );
};
