import type { StudioSeat } from '../../../shared/types/studio';
import { ResponsiveArtwork } from '../../M02_ui-kit';

interface PersonaPreviewProps {
  seat: StudioSeat;
  onStartChat: () => void;
  onClose: () => void;
}

const PERSONA_INFO: Record<StudioSeat, {
  name: string;
  title: string;
  traits: string[];
  accent: string;
  glow: string;
  glyph: string;
  baseName?: string;
}> = {
  maya: {
    name: 'Maya',
    title: 'Die Strukturgeberin',
    traits: ['Numerologische Präzision', 'Kosmische Ordnung', 'Chakra-Alignierung'],
    accent: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
    glyph: '◇',
    baseName: 'maya',
  },
  lilith: {
    name: 'Lilith',
    title: 'Die Schatten-Jägerin',
    traits: ['Unbequeme Wahrheiten', 'Schatten-Arbeit', 'Transformative Konfrontation'],
    accent: '#d49137',
    glow: 'rgba(212,145,55,0.15)',
    glyph: '☾',
    baseName: 'lilith',
  },
  luna: {
    name: 'Luna',
    title: 'Die Intuitive',
    traits: ['Emotionale Intelligenz', 'Traumdeutung', 'Sanfte Führung'],
    accent: '#c084fc',
    glow: 'rgba(192,132,252,0.15)',
    glyph: '☽',
  },
  orion: {
    name: 'Orion',
    title: 'Der Analytiker',
    traits: ['Logische Klarheit', 'Muster-Erkennung', 'Strategische Planung'],
    accent: '#38bdf8',
    glow: 'rgba(56,189,248,0.15)',
    glyph: '△',
  },
};

/**
 * Click-to-Preview Lightbox — large portrait + traits + "Solo-Chat starten" button.
 * Pure CSS, no Canvas.
 */
export function PersonaPreview({ seat, onStartChat, onClose }: PersonaPreviewProps) {
  const info = PERSONA_INFO[seat];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${info.glow} 0%, rgba(8,6,15,0.98) 40%, rgba(8,6,15,0.95) 100%)`,
          border: `1px solid ${info.accent}20`,
          boxShadow: `0 0 60px ${info.glow}, inset 0 1px 0 ${info.accent}15`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            color: '#a09a8e', fontSize: 20, background: 'rgba(0,0,0,0.4)',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f0eadc')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#a09a8e')}
        >
          ✕
        </button>

        {/* Portrait area */}
        <div style={{
          width: '100%', aspectRatio: '3 / 3.5', position: 'relative',
          overflow: 'hidden',
        }}>
          {info.baseName ? (
            <ResponsiveArtwork
              baseName={info.baseName}
              alt={info.name}
              sizes="(max-width: 480px) 90vw, 420px"
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `radial-gradient(ellipse at 50% 40%, ${info.accent}15 0%, transparent 60%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 80, opacity: 0.3,
            }}>
              {info.glyph}
            </div>
          )}

          {/* Vignette overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(8,6,15,0.95) 0%, rgba(8,6,15,0.3) 40%, transparent 60%)',
            pointerEvents: 'none',
          }} />

          {/* Name overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px 24px 16px',
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 28, fontWeight: 700, color: info.accent,
              letterSpacing: '0.04em',
            }}>
              {info.name}
            </div>
            <div style={{
              fontSize: 11, color: '#a09a8e',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              marginTop: 2,
            }}>
              {info.title}
            </div>
          </div>
        </div>

        {/* Traits + CTA */}
        <div style={{ padding: '16px 24px 24px' }}>
          {/* Traits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {info.traits.map((trait, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  backgroundColor: info.accent, opacity: 0.6,
                  boxShadow: `0 0 6px ${info.accent}60`,
                }} />
                <span style={{
                  fontSize: 13, color: '#c8c2b6', letterSpacing: '0.02em',
                }}>
                  {trait}
                </span>
              </div>
            ))}
          </div>

          {/* Start Chat button */}
          <button
            onClick={onStartChat}
            style={{
              width: '100%', padding: '12px 0',
              background: `linear-gradient(135deg, ${info.accent}30 0%, ${info.accent}15 100%)`,
              border: `1px solid ${info.accent}40`,
              borderRadius: 10, cursor: 'pointer',
              color: info.accent, fontWeight: 600,
              fontSize: 14, letterSpacing: '0.04em',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `linear-gradient(135deg, ${info.accent}50 0%, ${info.accent}25 100%)`;
              e.currentTarget.style.boxShadow = `0 0 20px ${info.accent}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `linear-gradient(135deg, ${info.accent}30 0%, ${info.accent}15 100%)`;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Solo-Chat starten
          </button>
        </div>
      </div>
    </div>
  );
}
