import { useState, useEffect, useLayoutEffect, useRef } from 'react';

const SPEECH_RATE_KEY_PREFIX = 'soulmatch_voice_rate_';
const MIN_SPEECH_RATE = 0.75;
const MAX_SPEECH_RATE = 1.5;
const DEFAULT_SPEECH_RATE = 1;

export function getPersonaSpeechRate(personaId: string): number {
  try {
    const raw = localStorage.getItem(`${SPEECH_RATE_KEY_PREFIX}${personaId}`);
    const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
    if (Number.isNaN(parsed)) return DEFAULT_SPEECH_RATE;
    return Math.max(MIN_SPEECH_RATE, Math.min(MAX_SPEECH_RATE, parsed));
  } catch {
    return DEFAULT_SPEECH_RATE;
  }
}

export interface MoodParameters {
  empathy: number;
  mysticism: number;
  provocation: number;
  intellect: number;
  humor: number;
  accentProfile: AccentProfile;
}

export type AccentProfile = 'off' | 'subtle' | 'strict';

export const DEFAULT_MOOD: MoodParameters = {
  empathy: 0.5,
  mysticism: 0.5,
  provocation: 0.5,
  intellect: 0.5,
  humor: 0.35,
  accentProfile: 'subtle',
};

// Hook for managing Persona Tuning State
export function usePersonaTuning(personaId: string) {
  const storageKey = `soulmatch_tuning_${personaId}`;
  const [mood, setMood] = useState<MoodParameters>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MoodParameters>;
        return {
          ...DEFAULT_MOOD,
          ...parsed,
          accentProfile: parsed.accentProfile === 'off' || parsed.accentProfile === 'strict' ? parsed.accentProfile : 'subtle',
          humor: typeof parsed.humor === 'number' ? Math.max(0, Math.min(1, parsed.humor)) : DEFAULT_MOOD.humor,
        };
      }
    } catch {}
    return DEFAULT_MOOD;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(mood));
  }, [mood, storageKey]);

  return { mood, setMood };
}

export function getPersonaHumorLevel(personaId: string): number {
  try {
    const raw = localStorage.getItem(`soulmatch_tuning_${personaId}`);
    const parsed = raw ? (JSON.parse(raw) as Partial<MoodParameters>) : null;
    const value = typeof parsed?.humor === 'number' ? parsed.humor : DEFAULT_MOOD.humor;
    return Math.max(0, Math.min(1, value));
  } catch {
    return DEFAULT_MOOD.humor;
  }
}

export function getPersonaAccentProfile(personaId: string): AccentProfile {
  try {
    const raw = localStorage.getItem(`soulmatch_tuning_${personaId}`);
    const parsed = raw ? (JSON.parse(raw) as Partial<MoodParameters>) : null;
    if (parsed?.accentProfile === 'off' || parsed?.accentProfile === 'strict') return parsed.accentProfile;
    return 'subtle';
  } catch {
    return 'subtle';
  }
}

interface PersonaTuningBarProps {
  seat: string;
  accentColor: string;
}

const TUNING_LABELS: Record<'empathy' | 'mysticism' | 'provocation' | 'intellect', { icon: string; left: string; right: string }> = {
  empathy: { icon: '🤍', left: 'Analytisch', right: 'Warmherzig' },
  mysticism: { icon: '🔮', left: 'Direkt', right: 'Orakelhaft' },
  provocation: { icon: '🔥', left: 'Zustimmend', right: 'Herausfordernd' },
  intellect: { icon: '🧠', left: 'Leicht', right: 'Philosophisch' },
};

export function PersonaTuningBar({ seat, accentColor }: PersonaTuningBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mood, setMood } = usePersonaTuning(seat);
  const [speechRate, setSpeechRate] = useState<number>(() => getPersonaSpeechRate(seat));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setSpeechRate(getPersonaSpeechRate(seat));
  }, [seat]);

  useEffect(() => {
    localStorage.setItem(`${SPEECH_RATE_KEY_PREFIX}${seat}`, speechRate.toFixed(2));
  }, [seat, speechRate]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !popupRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const popupRect = popupRef.current?.getBoundingClientRect();
      if (!triggerRect || !popupRect) return;

      const gap = 8;
      const topSafeArea = 72;
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
      if (top < topSafeArea + gap) top = topSafeArea + gap;

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
            maxHeight: `calc(100vh - ${72 + 16}px)`,
            overflowY: 'auto',
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

          {(Object.keys(TUNING_LABELS) as Array<'empathy' | 'mysticism' | 'provocation' | 'intellect'>).map((key) => (
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#a8a298' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>😄</span>
                Ernst
              </span>
              <span>Humor · {Math.round(mood.humor * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={mood.humor}
              onChange={(e) => setMood({ ...mood, humor: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                appearance: 'none',
                height: 4,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                outline: 'none',
                cursor: 'pointer',
                backgroundImage: `linear-gradient(${accentColor}, ${accentColor})`,
                backgroundSize: `${mood.humor * 100}% 100%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: '#a8a298', display: 'flex', justifyContent: 'space-between' }}>
              <span>🗣️ Akzent</span>
              <span>{mood.accentProfile}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(['off', 'subtle', 'strict'] as AccentProfile[]).map((option) => {
                const active = mood.accentProfile === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMood({ ...mood, accentProfile: option })}
                    style={{
                      border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.18)'}`,
                      background: active ? `${accentColor}25` : 'rgba(255,255,255,0.04)',
                      color: active ? '#fff' : '#c7c2b5',
                      borderRadius: 8,
                      padding: '6px 4px',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#a8a298' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>🗣️</span>
                Langsamer
              </span>
              <span>Schneller · {speechRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={MIN_SPEECH_RATE}
              max={MAX_SPEECH_RATE}
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(Number.parseFloat(e.target.value))}
              style={{
                width: '100%',
                appearance: 'none',
                height: 4,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                outline: 'none',
                cursor: 'pointer',
                backgroundImage: `linear-gradient(${accentColor}, ${accentColor})`,
                backgroundSize: `${((speechRate - MIN_SPEECH_RATE) / (MAX_SPEECH_RATE - MIN_SPEECH_RATE)) * 100}% 100%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          </div>

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
