import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

import {
  CLICK_TO_RETURN_ARM_DELAY,
  MAYA_LAYOUT,
  MAYA_TIMING,
  NAVIGATE_SETTLE_DEADLINE,
  RETURN_SETTLE_DEADLINE,
  canTransition,
  type MayaPhase,
} from '../lib/mayaTransitions';
import type { MayaTargetRect } from './useMayaTargetRegistry';

interface MayaTargetRegistryLike {
  targets: Record<string, MayaTargetRect>;
  refreshTargets: () => void;
}

export interface MayaGuideAPI {
  phase: MayaPhase;
  figureRef: RefObject<HTMLDivElement>;
  bubbleText?: string;
  guideTo: (targetId: string, text?: string) => void;
  clearGuide: () => void;
  returnToIdle: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  isFixedSupported: boolean;
}

interface MayaPoint {
  x: number;
  y: number;
}

interface DragStartState {
  px: number;
  py: number;
  mx: number;
  my: number;
}

interface PhaseSettlerOptions {
  targetPhase: MayaPhase;
  generation: number;
  controller: AbortController;
  deadlineMs: number;
  immediate?: boolean;
  propertyName?: string;
}

const UNMOUNTED_GENERATION = -1;

function escapeTargetId(targetId: string) {
  const globalCss = typeof CSS !== 'undefined' ? CSS : null;
  if (globalCss?.escape) {
    return globalCss.escape(targetId);
  }

  return targetId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function findTargetElement(targetId: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.querySelector<HTMLElement>(`[data-maya-target="${escapeTargetId(targetId)}"]`);
}

function clampToViewport(position: MayaPoint) {
  if (typeof window === 'undefined') {
    return position;
  }

  const maxX = Math.max(
    MAYA_LAYOUT.viewportMarginPx,
    window.innerWidth - MAYA_LAYOUT.figureSizePx - MAYA_LAYOUT.viewportMarginPx,
  );
  const maxY = Math.max(
    MAYA_LAYOUT.viewportMarginPx,
    window.innerHeight - MAYA_LAYOUT.figureSizePx - MAYA_LAYOUT.viewportMarginPx,
  );

  return {
    x: Math.max(MAYA_LAYOUT.viewportMarginPx, Math.min(position.x, maxX)),
    y: Math.max(MAYA_LAYOUT.viewportMarginPx, Math.min(position.y, maxY)),
  };
}

function readIdlePosition(targets: Record<string, MayaTargetRect>) {
  const anchorId = ['maya-idle', 'maya-chat', 'task-detail', 'session'].find((candidate) => candidate in targets) ?? 'maya-idle';
  const anchor = findTargetElement(anchorId);

  if (!anchor) {
    return clampToViewport({
      x: MAYA_LAYOUT.idleFallbackX,
      y: MAYA_LAYOUT.idleFallbackY,
    });
  }

  const rect = anchor.getBoundingClientRect();

  return clampToViewport({
    x: rect.right - MAYA_LAYOUT.idleOffsetXPx,
    y: rect.top + MAYA_LAYOUT.idleOffsetYPx,
  });
}

export function useMayaFigureGuide(targetRegistry: MayaTargetRegistryLike): MayaGuideAPI {
  const idlePosition = useMemo(() => readIdlePosition(targetRegistry.targets), [targetRegistry.targets]);
  const [phase, setPhaseRaw] = useState<MayaPhase>('idle');
  const [bubbleText, setBubbleText] = useState<string | undefined>(undefined);
  const [isFixedSupported] = useState(() => {
    if (typeof document === 'undefined') {
      return true;
    }

    const bodyTransform = getComputedStyle(document.body).transform;
    const htmlTransform = getComputedStyle(document.documentElement).transform;
    return (!bodyTransform || bodyTransform === 'none')
      && (!htmlTransform || htmlTransform === 'none')
      && !document.fullscreenElement;
  });

  const figureRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<MayaPhase>('idle');
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const currentPositionRef = useRef<MayaPoint | null>(null);
  const originIdleRef = useRef<MayaPoint>(idlePosition);
  const followIdleAnchorRef = useRef(true);
  const lastHighlightedRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<DragStartState | null>(null);
  const draggingStartedRef = useRef(false);

  const clearHighlight = useCallback(() => {
    lastHighlightedRef.current?.classList.remove('maya-highlight');
    lastHighlightedRef.current = null;
  }, []);

  const applyPosition = useCallback((position: MayaPoint) => {
    const next = clampToViewport(position);
    const translateX = isFixedSupported ? next.x : next.x + window.scrollX;
    const translateY = isFixedSupported ? next.y : next.y + window.scrollY;

    currentPositionRef.current = next;

    if (figureRef.current) {
      figureRef.current.style.transform = `translate(${Math.round(translateX)}px, ${Math.round(translateY)}px)`;
    }
  }, [isFixedSupported]);

  const forcePhase = useCallback((next: MayaPhase) => {
    phaseRef.current = next;
    setPhaseRaw((current) => (current === next ? current : next));
  }, []);

  const setPhase = useCallback((next: MayaPhase) => {
    if (phaseRef.current === next) {
      return true;
    }

    if (!canTransition(phaseRef.current, next)) {
      if (import.meta.env.DEV) {
        console.warn('[Maya] invalid transition', phaseRef.current, '->', next);
      }

      return false;
    }

    phaseRef.current = next;
    setPhaseRaw(next);
    return true;
  }, []);

  const beginGeneration = useCallback(() => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    generationRef.current += 1;

    return {
      generation: generationRef.current,
      controller,
    };
  }, []);

  const attachPhaseSettler = useCallback((options: PhaseSettlerOptions) => {
    const {
      targetPhase,
      generation,
      controller,
      deadlineMs,
      immediate = false,
      propertyName = 'transform',
    } = options;

    const settle = () => {
      if (generation !== generationRef.current || generationRef.current === UNMOUNTED_GENERATION) {
        return;
      }

      setPhase(targetPhase);
    };

    if (immediate) {
      queueMicrotask(settle);
      return;
    }

    const element = figureRef.current;
    if (!element) {
      queueMicrotask(settle);
      return;
    }

    const handler = (event: Event) => {
      const transitionEvent = event as TransitionEvent;
      if (transitionEvent.target !== element) {
        return;
      }

      if (transitionEvent.propertyName !== propertyName) {
        return;
      }

      settle();
    };

    element.addEventListener('transitionend', handler, { signal: controller.signal });
    element.addEventListener('transitioncancel', handler, { signal: controller.signal });

    const timeoutId = window.setTimeout(settle, deadlineMs);
    controller.signal.addEventListener('abort', () => window.clearTimeout(timeoutId), { once: true });
  }, [setPhase]);

  const resetDragSession = useCallback(() => {
    const element = figureRef.current;
    const pointerId = pointerIdRef.current;

    if (element && pointerId !== null && element.hasPointerCapture(pointerId)) {
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // ignore release failures from stale StrictMode remounts
      }
    }

    pointerIdRef.current = null;
    dragStartRef.current = null;
    draggingStartedRef.current = false;
  }, []);

  const returnToIdle = useCallback(() => {
    if (phaseRef.current !== 'atTarget' && phaseRef.current !== 'returning') {
      return;
    }

    const origin = originIdleRef.current ?? idlePosition;
    clearHighlight();
    setBubbleText(undefined);

    const { generation, controller } = beginGeneration();
    if (!setPhase('returning')) {
      forcePhase('returning');
    }

    const currentRect = figureRef.current?.getBoundingClientRect();
    const immediate = !currentRect
      || Math.abs(currentRect.left - origin.x) + Math.abs(currentRect.top - origin.y) < MAYA_TIMING.positionDeltaThreshold;

    applyPosition(origin);
    attachPhaseSettler({
      targetPhase: 'idle',
      generation,
      controller,
      deadlineMs: RETURN_SETTLE_DEADLINE,
      immediate,
    });
  }, [applyPosition, attachPhaseSettler, beginGeneration, clearHighlight, forcePhase, idlePosition, setPhase]);

  const clearGuide = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearHighlight();
    setBubbleText(undefined);
    followIdleAnchorRef.current = true;
    forcePhase('idle');
    applyPosition(idlePosition);
  }, [applyPosition, clearHighlight, forcePhase, idlePosition]);

  const guideTo = useCallback((targetId: string, text?: string) => {
    targetRegistry.refreshTargets();
    const target = findTargetElement(targetId);
    if (!target) {
      if (import.meta.env.DEV) {
        console.warn('[Maya] target not found:', targetId);
      }

      return;
    }

    clearHighlight();
    followIdleAnchorRef.current = false;
    originIdleRef.current = currentPositionRef.current ?? idlePosition;
    setBubbleText(text);
    forcePhase('idle');

    const { generation, controller } = beginGeneration();

    target.scrollIntoView({
      behavior: 'instant' as ScrollBehavior,
      block: 'center',
      inline: 'nearest',
    });

    let stableCount = 0;
    let retries = 0;
    let lastRect = target.getBoundingClientRect();

    const performNavigate = (rect: DOMRect) => {
      if (controller.signal.aborted || generation !== generationRef.current) {
        return;
      }

      if (!setPhase('navigating')) {
        forcePhase('navigating');
      }

      const next = clampToViewport({
        x: rect.right + MAYA_LAYOUT.targetOffsetPx,
        y: rect.top + rect.height / 2 - MAYA_LAYOUT.figureSizePx / 2,
      });
      const currentRect = figureRef.current?.getBoundingClientRect();
      const reducedMotion = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const immediate = reducedMotion
        || !currentRect
        || Math.abs(currentRect.left - next.x) + Math.abs(currentRect.top - next.y) < MAYA_TIMING.positionDeltaThreshold;

      lastHighlightedRef.current = target;
      applyPosition(next);
      attachPhaseSettler({
        targetPhase: 'atTarget',
        generation,
        controller,
        deadlineMs: NAVIGATE_SETTLE_DEADLINE,
        immediate,
      });
    };

    const checkStable = () => {
      if (controller.signal.aborted || generationRef.current === UNMOUNTED_GENERATION) {
        return;
      }

      retries += 1;
      const currentRect = target.getBoundingClientRect();
      const delta = Math.abs(currentRect.top - lastRect.top) + Math.abs(currentRect.left - lastRect.left);

      stableCount = delta < MAYA_TIMING.positionDeltaThreshold ? stableCount + 1 : 0;
      lastRect = currentRect;

      if (stableCount >= MAYA_TIMING.rAFStabilizeFrames || retries >= MAYA_TIMING.rAFMaxRetries) {
        if (retries >= MAYA_TIMING.rAFMaxRetries && import.meta.env.DEV) {
          console.warn('[Maya] rAF cap reached, using last stable target rect');
        }

        performNavigate(currentRect);
        return;
      }

      const frameId = window.requestAnimationFrame(checkStable);
      controller.signal.addEventListener('abort', () => window.cancelAnimationFrame(frameId), { once: true });
    };

    const frameId = window.requestAnimationFrame(checkStable);
    controller.signal.addEventListener('abort', () => window.cancelAnimationFrame(frameId), { once: true });
  }, [applyPosition, attachPhaseSettler, beginGeneration, clearHighlight, forcePhase, idlePosition, setPhase, targetRegistry]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current === 'navigating' || phaseRef.current === 'returning') {
      return;
    }

    if (pointerIdRef.current !== null) {
      return;
    }

    const element = figureRef.current;
    if (!element) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    const rect = element.getBoundingClientRect();
    dragStartRef.current = {
      px: rect.left,
      py: rect.top,
      mx: event.clientX,
      my: event.clientY,
    };
    draggingStartedRef.current = false;

    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // ignore capture failures on stale browsers
    }
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointerIdRef.current || !dragStartRef.current) {
      return;
    }

    const dx = event.clientX - dragStartRef.current.mx;
    const dy = event.clientY - dragStartRef.current.my;

    if (!draggingStartedRef.current) {
      if (Math.hypot(dx, dy) < MAYA_TIMING.dragDeadzonePx) {
        return;
      }

      draggingStartedRef.current = true;
      followIdleAnchorRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
      clearHighlight();
      setBubbleText(undefined);
      if (!setPhase('dragging')) {
        forcePhase('dragging');
      }
    }

    applyPosition({
      x: dragStartRef.current.px + dx,
      y: dragStartRef.current.py + dy,
    });
  }, [applyPosition, clearHighlight, forcePhase, setPhase]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointerIdRef.current) {
      return;
    }

    const wasDragging = draggingStartedRef.current;
    resetDragSession();

    if (!wasDragging) {
      return;
    }

    if (!setPhase('idle')) {
      forcePhase('idle');
    }
  }, [forcePhase, resetDragSession, setPhase]);

  useEffect(() => {
    if (currentPositionRef.current === null || (phaseRef.current === 'idle' && followIdleAnchorRef.current)) {
      applyPosition(idlePosition);
    }
  }, [applyPosition, idlePosition]);

  useEffect(() => {
    if (phase !== 'atTarget') {
      return;
    }

    const target = lastHighlightedRef.current;
    target?.classList.add('maya-highlight');

    const controller = abortRef.current;
    if (!controller) {
      return;
    }

    const autoReturnId = window.setTimeout(returnToIdle, MAYA_TIMING.autoReturnMs);
    controller.signal.addEventListener('abort', () => window.clearTimeout(autoReturnId), { once: true });

    const armTimerId = window.setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }

      const handleOutsidePointerDown = (pointerEvent: PointerEvent) => {
        if (figureRef.current?.contains(pointerEvent.target as Node)) {
          return;
        }

        returnToIdle();
      };

      document.addEventListener('pointerdown', handleOutsidePointerDown, {
        capture: true,
        signal: controller.signal,
      });
    }, CLICK_TO_RETURN_ARM_DELAY);
    controller.signal.addEventListener('abort', () => window.clearTimeout(armTimerId), { once: true });

    return () => {
      target?.classList.remove('maya-highlight');
    };
  }, [phase, returnToIdle]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      generationRef.current = UNMOUNTED_GENERATION;
      clearHighlight();
      resetDragSession();
    };
  }, [clearHighlight, resetDragSession]);

  return {
    phase,
    figureRef,
    bubbleText,
    guideTo,
    clearGuide,
    returnToIdle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isFixedSupported,
  };
}