import { useEffect, useRef, useState, useCallback } from 'react';

export interface MayaPointerProps {
  targetElementId: string | null;
  active: boolean;
  onArrived?: () => void;
}

export function MayaPointer({ targetElementId, active, onArrived }: MayaPointerProps) {
  const pointerRef = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const arrivedCb = useCallback(() => { onArrived?.(); }, [onArrived]);

  useEffect(() => {
    if (!active || !targetElementId) {
      setArrived(false);
      return;
    }

    const target = document.getElementById(targetElementId);
    if (!target) return;

    // Add ring-glow class to target
    target.classList.add('maya-guide-target');

    const rect = target.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    // Small delay before flying
    const flyTimer = setTimeout(() => {
      setPos({ x: targetX, y: targetY });
    }, 80);

    // Mark arrived after transition completes
    const arriveTimer = setTimeout(() => {
      setArrived(true);
      arrivedCb();
    }, 950);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(arriveTimer);
      target.classList.remove('maya-guide-target');
      setArrived(false);
    };
  }, [targetElementId, active, arrivedCb]);

  // Clean up target class when deactivated
  useEffect(() => {
    if (!active && targetElementId) {
      const el = document.getElementById(targetElementId);
      el?.classList.remove('maya-guide-target');
    }
  }, [active, targetElementId]);

  if (!active) return null;

  return (
    <div
      ref={pointerRef}
      className={`maya-pointer ${active ? 'active' : ''} ${arrived ? 'arrived' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
      }}
    />
  );
}
