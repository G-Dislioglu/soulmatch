import type { StudioSeat } from '../../../shared/types/studio';

export type SigilState = 'idle' | 'typing' | 'speaking' | 'truth';

interface LiveSigilProps {
  seat: StudioSeat;
  state: SigilState;
  height?: number;
}

const MAYA_RUNES = ['◇', '⊹', '✦', '⟡', '◈'];
const LILITH_RUNES = ['☾', '⚶', '♄', '✧', '⛧'];
const CHAKRA_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7'];

function getMayaSigil(state: SigilState) {
  const baseAnim = state === 'idle' ? 'sigilPulse 4s ease-in-out infinite'
    : state === 'typing' ? 'sigilTyping 1.2s ease-in-out infinite'
    : state === 'speaking' ? 'sigilSpeaking 0.8s ease-out'
    : 'sigilPulse 3s ease-in-out infinite';

  return { animation: baseAnim, color: '#a855f7' };
}

function getLilithSigil(state: SigilState) {
  const baseAnim = state === 'idle' ? 'sigilPulse 3.5s ease-in-out infinite'
    : state === 'typing' ? 'sigilTyping 1s ease-in-out infinite'
    : state === 'speaking' ? 'sigilSpeaking 0.6s ease-out'
    : 'sigilTruth 0.4s ease-out forwards';

  return { animation: baseAnim, color: '#d49137' };
}

/**
 * Live Sigil Strip — vertical CSS/SVG strip showing persona state.
 * Pure CSS animations, no Canvas, no JS loops.
 */
export function LiveSigil({ seat, state, height = 320 }: LiveSigilProps) {
  const isLilith = seat === 'lilith';
  const isMaya = seat === 'maya';
  const sigil = isLilith ? getLilithSigil(state) : getMayaSigil(state);
  const runes = isLilith ? LILITH_RUNES : isMaya ? MAYA_RUNES : ['☽', '◇', '△'];
  const accentColor = isLilith ? '#d49137' : isMaya ? '#a855f7' : seat === 'luna' ? '#c084fc' : '#38bdf8';

  const isActive = state !== 'idle';
  const glowOpacity = state === 'truth' ? 0.5 : state === 'speaking' ? 0.3 : state === 'typing' ? 0.2 : 0.05;

  return (
    <div style={{
      width: 48, height, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, transparent 0%, ${accentColor}15 30%, ${accentColor}20 50%, ${accentColor}15 70%, transparent 100%)`,
        opacity: glowOpacity,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }} />

      {/* Center sigil glyph */}
      <div style={{
        fontSize: 28, color: accentColor,
        animation: sigil.animation,
        transition: 'all 0.3s ease',
        textShadow: isActive ? `0 0 12px ${accentColor}80, 0 0 24px ${accentColor}40` : 'none',
        zIndex: 1,
      }}>
        {isLilith ? '☾' : isMaya ? '◇' : seat === 'luna' ? '☽' : '△'}
      </div>

      {/* Floating runes */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-around',
        padding: '12px 0', pointerEvents: 'none',
      }}>
        {runes.map((rune, i) => (
          <div key={i} style={{
            fontSize: 10, color: accentColor,
            animation: `runeFloat ${2.5 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
            opacity: isActive ? 0.35 : 0.1,
            transition: 'opacity 0.5s ease',
          }}>
            {rune}
          </div>
        ))}
      </div>

      {/* Chakra dots (Maya only) */}
      {isMaya && (
        <div style={{
          position: 'absolute', left: '50%', top: '15%', bottom: '15%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          pointerEvents: 'none', zIndex: 2,
        }}>
          {CHAKRA_COLORS.map((color, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              backgroundColor: color,
              animation: isActive ? `chakraPulse ${1.5 + i * 0.2}s ease-in-out ${i * 0.15}s infinite` : 'none',
              opacity: isActive ? 0.7 : 0.15,
              transition: 'opacity 0.5s ease',
              boxShadow: isActive ? `0 0 6px ${color}80` : 'none',
            }} />
          ))}
        </div>
      )}

      {/* Lilith eye flash (truth state) */}
      {isLilith && state === 'truth' && (
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 20, height: 8, borderRadius: '50%',
          background: `radial-gradient(ellipse, #ff8c00 0%, ${accentColor}80 60%, transparent 100%)`,
          animation: 'sigilTruth 0.4s ease-out forwards',
          zIndex: 3,
        }} />
      )}

      {/* Rotating ring (active states) */}
      {isActive && (
        <svg
          viewBox="0 0 48 48"
          style={{
            position: 'absolute', width: 40, height: 40,
            animation: `sigilRotate ${state === 'truth' ? '2s' : '8s'} linear infinite`,
            opacity: state === 'truth' ? 0.5 : 0.2,
            transition: 'opacity 0.5s ease',
          }}
        >
          <circle cx="24" cy="24" r="20" fill="none" stroke={accentColor}
            strokeWidth="0.5" strokeDasharray="4 8" opacity="0.6" />
        </svg>
      )}
    </div>
  );
}
