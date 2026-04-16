import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MayaFigureState } from '../ui/MayaFigure';
import type { MayaTargetRect } from './useMayaTargetRegistry';

interface MayaTargetRegistryLike {
  targets: Record<string, MayaTargetRect>;
  getTargetRect: (id: string) => MayaTargetRect | null;
  refreshTargets: () => void;
}

export interface MayaGuideAPI {
  figureX: number;
  figureY: number;
  state: MayaFigureState;
  visible: boolean;
  bubbleText?: string;
  activeTargetId?: string;
  guideTo: (targetId: string, text?: string) => void;
  clearGuide: () => void;
  setThinking: () => void;
  hide: () => void;
  show: () => void;
}

function getIdlePosition(targets: Record<string, MayaTargetRect>) {
  const anchor = targets['maya-chat'] ?? targets['task-detail'] ?? targets.session ?? null;

  if (!anchor) {
    return { x: 84, y: 84 };
  }

  return {
    x: anchor.x + Math.min(anchor.width - 24, Math.max(28, anchor.width - 34)),
    y: anchor.y + Math.min(anchor.height, 28),
  };
}

export function useMayaFigureGuide(targetRegistry: MayaTargetRegistryLike): MayaGuideAPI {
  const idlePosition = useMemo(() => getIdlePosition(targetRegistry.targets), [targetRegistry.targets]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [figureX, setFigureX] = useState(idlePosition.x);
  const [figureY, setFigureY] = useState(idlePosition.y);
  const [state, setState] = useState<MayaFigureState>('idle');
  const [visible, setVisible] = useState(true);
  const [bubbleText, setBubbleText] = useState<string | undefined>(undefined);
  const [activeTargetId, setActiveTargetId] = useState<string | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const moveToIdle = useCallback(() => {
    setFigureX(idlePosition.x);
    setFigureY(idlePosition.y);
    setState('idle');
    setActiveTargetId(undefined);
  }, [idlePosition.x, idlePosition.y]);

  const clearGuide = useCallback(() => {
    clearTimer();
    setBubbleText(undefined);
    setVisible(true);
    moveToIdle();
  }, [clearTimer, moveToIdle]);

  const guideTo = useCallback((targetId: string, text?: string) => {
    targetRegistry.refreshTargets();
    const target = targetRegistry.getTargetRect(targetId);
    if (!target) {
      return;
    }

    clearTimer();
    setVisible(true);
    setState('guiding');
    setFigureX(target.centerX);
    setFigureY(target.centerY);
    setActiveTargetId(targetId);
    setBubbleText(text);

    timerRef.current = setTimeout(() => {
      setBubbleText(undefined);
      moveToIdle();
      timerRef.current = null;
    }, 5000);
  }, [clearTimer, moveToIdle, targetRegistry]);

  const setThinking = useCallback(() => {
    clearTimer();
    setVisible(true);
    setBubbleText(undefined);
    setActiveTargetId(undefined);
    setFigureX(idlePosition.x);
    setFigureY(idlePosition.y);
    setState('thinking');
  }, [clearTimer, idlePosition.x, idlePosition.y]);

  const hide = useCallback(() => {
    clearTimer();
    setBubbleText(undefined);
    setActiveTargetId(undefined);
    setVisible(false);
  }, [clearTimer]);

  const show = useCallback(() => {
    clearTimer();
    setVisible(true);
    setBubbleText(undefined);
    moveToIdle();
  }, [clearTimer, moveToIdle]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (activeTargetId) {
      const target = targetRegistry.getTargetRect(activeTargetId);
      if (target) {
        setFigureX(target.centerX);
        setFigureY(target.centerY);
      }
      return;
    }

    setFigureX(idlePosition.x);
    setFigureY(idlePosition.y);
  }, [activeTargetId, idlePosition.x, idlePosition.y, targetRegistry, visible]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    figureX,
    figureY,
    state,
    visible,
    bubbleText,
    activeTargetId,
    guideTo,
    clearGuide,
    setThinking,
    hide,
    show,
  };
}