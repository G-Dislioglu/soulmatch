// ═══════════════════════════════════════════════════
// MayaGuideBubble – Smart-positioned Tooltip
// ═══════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { GuideState } from './guideTypes';
import { guideEngine } from './guideEngine';

interface Props {
  state: GuideState;
}

const ACCENT = '#d4af37';

const MayaGuideBubble: React.FC<Props> = ({ state }) => {
  const [pulsing, setPulsing] = useState(false);

  // Pulse-Animation nach Timeout
  useEffect(() => {
    if (!state.active) return;
    setPulsing(false);
    const timer = setTimeout(() => setPulsing(true), 6000);
    return () => clearTimeout(timer);
  }, [state.currentStepIndex, state.active]);

  if (!state.active || (!state.bubbleText && !state.loading)) return null;

  const pos = state.bubblePosition;
  const isOnboarding = state.mode === 'onboarding';

  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    ...(pos.top !== undefined && { top: pos.top }),
    ...(pos.bottom !== undefined && { bottom: pos.bottom }),
    ...(pos.left !== undefined && { left: pos.left }),
    ...(pos.right !== undefined && { right: pos.right }),
    width: 280,
    maxWidth: 'calc(100vw - 32px)',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    border: `1px solid ${ACCENT}4d`,
    borderRadius: 16,
    padding: '16px 18px',
    color: '#e8e0d0',
    fontSize: 14,
    lineHeight: 1.5,
    fontFamily: "'Outfit', sans-serif",
    zIndex: 9999,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    animation: 'mayaBubbleFadeIn 0.3s ease-out',
  };

  const arrowStyle = getArrowStyle(pos.arrowDirection);

  return (
    <div className="maya-guide-bubble" style={bubbleStyle}>
      {/* Pfeil */}
      <div style={arrowStyle} />

      {/* Maya Label */}
      <div style={{
        fontSize: 11,
        color: `${ACCENT}b3`,
        marginBottom: 6,
        fontWeight: 600,
        letterSpacing: '0.5px',
      }}>
        ✦ MAYA
        {isOnboarding && state.totalSteps > 0 && (
          <span style={{ float: 'right', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
            {state.currentStepIndex + 1}/{state.totalSteps}
          </span>
        )}
      </div>

      {/* Text */}
      <div style={{ marginBottom: 14, minHeight: 20 }}>
        {state.loading ? (
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>…</span>
        ) : (
          state.bubbleText
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={() => guideEngine.stop()}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 12,
            cursor: 'pointer',
            padding: '4px 8px',
            fontFamily: "'Outfit', sans-serif",
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
        >
          {isOnboarding ? 'Guide beenden' : 'OK'}
        </button>

        {isOnboarding && (
          <button
            onClick={() => guideEngine.next()}
            className={pulsing ? 'maya-guide-next-pulse' : ''}
            style={{
              background: `${ACCENT}26`,
              border: `1px solid ${ACCENT}66`,
              color: ACCENT,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              padding: '6px 16px',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${ACCENT}3d`;
              e.currentTarget.style.borderColor = `${ACCENT}99`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${ACCENT}26`;
              e.currentTarget.style.borderColor = `${ACCENT}66`;
            }}
          >
            Weiter →
          </button>
        )}
      </div>
    </div>
  );
};

function getArrowStyle(direction: string): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 12,
    height: 12,
    background: '#1a1a2e',
    border: `1px solid ${ACCENT}4d`,
    transform: 'rotate(45deg)',
  };

  switch (direction) {
    case 'down':
      return { ...base, bottom: -7, left: '50%', marginLeft: -6,
               borderTop: 'none', borderLeft: 'none' };
    case 'up':
      return { ...base, top: -7, left: '50%', marginLeft: -6,
               borderBottom: 'none', borderRight: 'none' };
    case 'left':
      return { ...base, left: -7, top: '50%', marginTop: -6,
               borderTop: 'none', borderRight: 'none' };
    case 'right':
      return { ...base, right: -7, top: '50%', marginTop: -6,
               borderBottom: 'none', borderLeft: 'none' };
    default:
      return base;
  }
}

export default MayaGuideBubble;
