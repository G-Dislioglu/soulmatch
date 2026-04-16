import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface MayaTargetRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function useMayaTargetRegistry(containerRef: RefObject<HTMLElement | null>) {
  const targetsRef = useRef<Record<string, MayaTargetRect>>({});
  const [targets, setTargets] = useState<Record<string, MayaTargetRect>>({});
  const frameRef = useRef<number | null>(null);

  const refreshTargets = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      targetsRef.current = {};
      setTargets({});
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextTargets: Record<string, MayaTargetRect> = {};

    container.querySelectorAll<HTMLElement>('[data-maya-target]').forEach((element) => {
      const id = element.dataset.mayaTarget?.trim();
      if (!id) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const x = rect.left - containerRect.left + container.scrollLeft;
      const y = rect.top - containerRect.top + container.scrollTop;

      nextTargets[id] = {
        id,
        x,
        y,
        width: rect.width,
        height: rect.height,
        centerX: x + rect.width / 2,
        centerY: y + rect.height / 2,
      };
    });

    targetsRef.current = nextTargets;
    setTargets(nextTargets);
  }, [containerRef]);

  const getTargetRect = useCallback((id: string) => {
    return targetsRef.current[id] ?? null;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scheduleRefresh = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        refreshTargets();
      });
    };

    refreshTargets();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => scheduleRefresh())
      : null;
    resizeObserver?.observe(container);

    const mutationObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => scheduleRefresh())
      : null;
    mutationObserver?.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-maya-target', 'class', 'open', 'aria-expanded'],
    });

    window.addEventListener('resize', scheduleRefresh);

    return () => {
      window.removeEventListener('resize', scheduleRefresh);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [containerRef, refreshTargets]);

  return {
    targets,
    getTargetRect,
    refreshTargets,
  };
}