// ═══════════════════════════════════════════════════
// MayaGuideRing – Goldener Ring-Pulse um Ziel
// ═══════════════════════════════════════════════════

import React from 'react';

interface Props {
  targetRect: DOMRect | null;
  active: boolean;
}

const PADDING = 8;

const MayaGuideRing: React.FC<Props> = ({ targetRect, active }) => {
  if (!active || !targetRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.top - PADDING,
    left: targetRect.left - PADDING,
    width: targetRect.width + PADDING * 2,
    height: targetRect.height + PADDING * 2,
    borderRadius: 12,
    border: '2px solid rgba(212, 175, 55, 0.8)',
    boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.4)',
    animation: 'mayaRingPulse 2s ease-in-out infinite',
    pointerEvents: 'none',
    zIndex: 9998,
    transition: 'top 0.4s ease, left 0.4s ease, width 0.4s ease, height 0.4s ease',
  };

  return <div className="maya-guide-ring" style={style} />;
};

export default MayaGuideRing;
