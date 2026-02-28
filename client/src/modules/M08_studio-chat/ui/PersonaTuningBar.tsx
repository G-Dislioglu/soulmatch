import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { StudioSeat } from '../../../shared/types/studio';

export interface MoodParameters {
  empathy: number;
  mysticism: number;
  provocation: number;
  intellect: number;
}

export const DEFAULT_MOOD: MoodParameters = {
  empathy: 0.5,
  mysticism: 0.5,
  provocation: 0.5,
  intellect: 0.5,
};

// Hook for managing Persona Tuning State
export function usePersonaTuning(seat: StudioSeat) {
  const storageKey = `soulmatch_tuning_${seat}`;
  const [mood, setMood] = useState<MoodParameters>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored) as MoodParameters;
    } catch {}
    return DEFAULT_MOOD;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(mood));
  }, [mood, storageKey]);

  return { mood, setMood };
}

interface PersonaTuningBarProps {
  seat: StudioSeat;
  accentColor: string;
}

const TUNING_LABELS: Record<keyof MoodParameters, { icon: string; left: string; right: string }> = {
  empathy: { icon: '🤍', left: 'Analytisch', right: 'Warmherzig' },
  mysticism: { icon: '🔮', left: 'Direkt', right: 'Orakelhaft' },
  provocation: { icon: '🔥', left: 'Zustimmend', right: 'Herausfordernd' },
  intellect: { icon: '🧠', left: 'Leicht', right: 'Philosophisch' },
};

export function PersonaTuningBar({ seat, accentColor }: PersonaTuningBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mood, setMood } = usePersonaTuning(seat);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !popupRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const popupRect = popupRef.current?.getBoundingClientRect();
      if (!triggerRect || !popupRect) return;

      const gap = 8;
      let left = triggerRect.right + gap;
      let top = triggerRect.bottom + gap;

      if (left < gap) left = gap;
      if (left + popupRect.width > window.innerWidth - gap) {
        left = triggerRect.left - popupRect.width - gap;
      }
      if (left < gap) {
        left = window.innerWidth - popupRect.width - gap;
      }

      if (top + popupRect.height > window.innerHeight - gap) {
        top = triggerRect.top - popupRect.height - gap;
      }
      if (top < gap) top = gap;

      setPopupPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', zIndex: 60 }}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Soul-Tuning anpassen"
        style={{
          background: isOpen ? `${accentColor}30` : 'rgba(0,0,0,0.55)',
          border: `1px solid ${isOpen ? accentColor : 'rgba(255,255,255,0.2)'}`,
          color: isOpen ? '#fff' : 'rgba(255,255,255,0.85)',
          borderRadius: '50%',
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? `0 0 10px ${accentColor}40` : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(0,0,0,0.55)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
          }
        }}
      >
        <span style={{ fontSize: 16 }}>⚙️</span>
      </button>

      {/* Glassmorphism Dropdown/Overlay */}
      {isOpen && (
        <div
          ref={popupRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: popupPosition.top,
            left: popupPosition.left,
            width: 260,
            zIndex: 9999,
            background: 'rgba(15, 12, 25, 0.65)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${accentColor}40`,
            borderRadius: 12,
            padding: '16px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 15px ${accentColor}20`,
            animation: 'fadeInSlideDown 0.2s ease-out forwards',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 12, color: accentColor, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
            Soul-Tuning
          </div>

          {(Object.keys(TUNING_LABELS) as Array<keyof MoodParameters>).map((key) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#a8a298' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{TUNING_LABELS[key].icon}</span>
                  {TUNING_LABELS[key].left}
                </span>
                <span>{TUNING_LABELS[key].right}</span>
              </div>
              
              {/* Custom Range Slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={mood[key]}
                onChange={(e) => setMood({ ...mood, [key]: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  appearance: 'none',
                  height: 4,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundImage: `linear-gradient(${accentColor}, ${accentColor})`,
                  backgroundSize: `${mood[key] * 100}% 100%`,
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>
          ))}

          {/* Injecting CSS for slider thumb and animation */}
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              appearance: none;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #fff;
              border: 2px solid ${accentColor};
              box-shadow: 0 0 8px ${accentColor}80;
              cursor: pointer;
              transition: transform 0.1s;
            }
            input[type=range]::-webkit-slider-thumb:hover {
              transform: scale(1.2);
              box-shadow: 0 0 12px ${accentColor};
            }
            @keyframes fadeInSlideDown {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
