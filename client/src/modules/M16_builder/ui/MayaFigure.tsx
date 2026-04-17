import { useEffect, useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { createPortal } from 'react-dom';

import { TOKENS } from '../../../design/tokens';
import {
  MAYA_LAYOUT,
  MAYA_TIMING,
  MAYA_Z_INDEX,
  type MayaPhase,
} from '../lib/mayaTransitions';

export type MayaFigureState = MayaPhase;

export interface MayaFigureProps {
  phase: MayaPhase;
  figureRef: RefObject<HTMLDivElement>;
  bubbleText?: string;
  isFixedSupported: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function getMayaFigureColor(phase: MayaPhase) {
  switch (phase) {
    case 'dragging':
      return '#f7d67f';
    case 'navigating':
    case 'atTarget':
    case 'returning':
      return '#f0c35b';
    case 'idle':
    default:
      return TOKENS.gold;
  }
}

function getPulseDuration(phase: MayaPhase) {
  switch (phase) {
    case 'dragging':
      return '1.05s';
    case 'navigating':
      return '1.25s';
    case 'atTarget':
      return '1.1s';
    case 'returning':
      return '1.35s';
    case 'idle':
    default:
      return '2.4s';
  }
}

type BubblePosition = 'above' | 'below' | 'left' | 'right';

export function MayaFigure(props: MayaFigureProps) {
  const {
    phase,
    figureRef,
    bubbleText,
    isFixedSupported,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = props;
  const accentColor = getMayaFigureColor(phase);
  const pulseDuration = getPulseDuration(phase);
  const [bubblePosition, setBubblePosition] = useState<BubblePosition>('above');

  useEffect(() => {
    if (!bubbleText || !figureRef.current || typeof window === 'undefined') {
      return;
    }

    const rect = figureRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth - 320) {
      setBubblePosition('left');
      return;
    }

    if (rect.top < 140) {
      setBubblePosition('below');
      return;
    }

    setBubblePosition('above');
  }, [bubbleText, figureRef, phase]);

  const bubbleStyle = useMemo(() => {
    switch (bubblePosition) {
      case 'below':
        return { top: 34, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { right: 34, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { left: 34, top: '50%', transform: 'translateY(-50%)' };
      case 'above':
      default:
        return { bottom: 34, left: '50%', transform: 'translateX(-50%)' };
    }
  }, [bubblePosition]);

  if (typeof document === 'undefined') {
    return null;
  }

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitionDuration = prefersReducedMotion
    ? 0
    : phase === 'returning'
      ? MAYA_TIMING.returnMs
      : MAYA_TIMING.navigateMs;
  const isTransitioning = phase === 'navigating' || phase === 'returning';

  return createPortal(
    <div
      ref={figureRef}
      aria-hidden="true"
      data-maya-phase={phase}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      className={isFixedSupported ? undefined : 'maya-figure-absolute-fallback'}
      style={{
        position: isFixedSupported ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        width: MAYA_LAYOUT.figureSizePx,
        height: MAYA_LAYOUT.figureSizePx,
        transform: `translate(${MAYA_LAYOUT.idleFallbackX}px, ${MAYA_LAYOUT.idleFallbackY}px)`,
        transition: isTransitioning ? `transform ${transitionDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)` : 'none',
        touchAction: 'none',
        pointerEvents: 'auto',
        cursor: phase === 'dragging' ? 'grabbing' : 'grab',
        willChange: isTransitioning ? 'transform' : 'auto',
        zIndex: MAYA_Z_INDEX,
        userSelect: 'none',
      }}
    >
      <style>
        {`@keyframes mayaFigurePulse {
            0% { transform: scale(0.9); opacity: 0.42; }
            55% { transform: scale(1.14); opacity: 0.85; }
            100% { transform: scale(1.34); opacity: 0.16; }
          }
          @keyframes mayaFigureFlicker {
            0%, 100% { opacity: 0.76; }
            50% { opacity: 1; }
          }`}
      </style>

      <div style={{ position: 'relative', width: MAYA_LAYOUT.figureSizePx, height: MAYA_LAYOUT.figureSizePx }}>
        <span
          style={{
            position: 'absolute',
            inset: -5,
            borderRadius: '50%',
            border: `1px solid ${accentColor}55`,
            boxShadow: `0 0 18px ${accentColor}40`,
            animation: `mayaFigurePulse ${pulseDuration} ease-out infinite`,
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.98), #f6dfa1 32%, ${accentColor} 100%)`,
            boxShadow: `0 0 20px ${accentColor}55, 0 0 8px rgba(212,175,55,0.42) inset`,
            animation: phase === 'navigating' ? 'mayaFigureFlicker 1.35s ease-in-out infinite' : undefined,
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,0.95), ${TOKENS.gold})`,
            boxShadow: `0 0 10px ${TOKENS.gold}50`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            maxWidth: 240,
            minWidth: bubbleText ? 160 : 0,
            opacity: bubbleText ? 1 : 0,
            pointerEvents: 'none',
            transition: 'opacity 0.22s ease',
            borderRadius: 16,
            border: `1px solid ${accentColor}55`,
            background: TOKENS.card,
            boxShadow: `0 12px 32px rgba(0,0,0,0.38), 0 0 0 1px ${accentColor}18`,
            padding: bubbleText ? '10px 12px' : 0,
            color: TOKENS.text,
            ...bubbleStyle,
          }}
        >
          {bubbleText ? (
            <>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.gold, fontWeight: 700, marginBottom: 4 }}>
                Maya
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.5, color: TOKENS.text2 }}>
                {bubbleText}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}