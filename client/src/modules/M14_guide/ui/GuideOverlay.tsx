import { useState, useEffect } from 'react';

export interface GuideOverlayProps {
  text: string | null;
  progress?: { current: number; total: number };
  onSkip: () => void;
}

const ACCENT = '#d4af37';

export function GuideOverlay({ text, progress, onSkip }: GuideOverlayProps) {
  const [animKey, setAnimKey] = useState(0);

  // Re-trigger animation on text change
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [text]);

  if (!text) return null;

  return (
    <div
      key={animKey}
      className="guide-overlay"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `${ACCENT}18`,
          border: `1.5px solid ${ACCENT}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>
          ◇
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>Maya</div>
        {progress && (
          <div style={{ fontSize: 10, color: '#5a5550', marginLeft: 'auto' }}>
            {progress.current}/{progress.total}
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{
        fontSize: 14, color: '#b0a898', lineHeight: 1.7,
        fontFamily: "'Outfit', sans-serif",
      }}>
        {text}
      </div>

      {/* Skip */}
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none', border: 'none',
            color: '#6b6560', fontSize: 11, cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            padding: '4px 8px', borderRadius: 6,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#a09a8e'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6b6560'; }}
        >
          Tour überspringen
        </button>
      </div>
    </div>
  );
}
