import { useMemo } from 'react';

import { TOKENS } from '../../../design/tokens';

export type MayaFigureState = 'idle' | 'guiding' | 'thinking' | 'speaking' | 'warning';

export interface MayaFigureProps {
  x: number;
  y: number;
  state: MayaFigureState;
  visible: boolean;
  bubbleText?: string;
  bubblePosition?: 'above' | 'below' | 'left' | 'right';
}

export function getMayaFigureColor(state: MayaFigureState) {
  switch (state) {
    case 'guiding':
      return '#22c55e';
    case 'thinking':
      return '#06b6d4';
    case 'speaking':
      return '#d4af37';
    case 'warning':
      return '#ef4444';
    case 'idle':
    default:
      return '#a78bfa';
  }
}

function getPulseDuration(state: MayaFigureState) {
  switch (state) {
    case 'guiding':
      return '1.2s';
    case 'thinking':
      return '1.5s';
    case 'speaking':
      return '1s';
    case 'warning':
      return '0.72s';
    case 'idle':
    default:
      return '2.4s';
  }
}

export function MayaFigure(props: MayaFigureProps) {
  const { x, y, state, visible, bubbleText, bubblePosition } = props;
  const accentColor = getMayaFigureColor(state);
  const pulseDuration = getPulseDuration(state);

  const resolvedBubblePosition = useMemo(() => {
    if (bubblePosition) {
      return bubblePosition;
    }

    if (typeof window === 'undefined') {
      return 'right';
    }

    if (x > window.innerWidth - 320) {
      return 'left';
    }

    if (y < 140) {
      return 'below';
    }

    return 'above';
  }, [bubblePosition, x, y]);

  const bubbleStyle = useMemo(() => {
    switch (resolvedBubblePosition) {
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
  }, [resolvedBubblePosition]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
        transition: [
          'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          'top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          'opacity 0.3s ease',
        ].join(', '),
        zIndex: 80,
      }}
    >
      <style>
        {`@keyframes mayaFigurePulse {
            0% { transform: scale(0.9); opacity: 0.42; }
            55% { transform: scale(1.14); opacity: 0.85; }
            100% { transform: scale(1.34); opacity: 0.16; }
          }
          @keyframes mayaFigureFlicker {
            0%, 100% { opacity: 0.72; }
            50% { opacity: 1; }
          }`}
      </style>

      <div style={{ position: 'relative', width: 24, height: 24 }}>
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
            animation: state === 'thinking' ? 'mayaFigureFlicker 1.4s ease-in-out infinite' : undefined,
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
            transition: 'opacity 0.3s ease',
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
    </div>
  );
}