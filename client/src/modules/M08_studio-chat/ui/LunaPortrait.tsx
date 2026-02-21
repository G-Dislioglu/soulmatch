import { useState } from 'react';
import { useAssetImage } from '../../M15_aetheria/lib/useAssetImage';

interface LunaPortraitProps {
  size?: number;
}

export function LunaPortrait({ size = 260 }: LunaPortraitProps) {
  const { url, loading } = useAssetImage('persona', 'luna', true);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{ position: 'relative', width: size, maxWidth: '100%', aspectRatio: '3 / 4.5' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(ellipse at 50% 55%, rgba(192,132,252,0.14) 0%, transparent 60%)',
        opacity: 0.5, pointerEvents: 'none',
      }} />

      {url && !imgFailed ? (
        <img
          src={url}
          alt="Luna"
          onError={() => setImgFailed(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            borderRadius: 12, display: 'block', position: 'relative', zIndex: 1,
            animation: 'aetheriaFadeIn 1s ease',
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%', borderRadius: 12, position: 'relative', zIndex: 1,
          background: 'linear-gradient(160deg, rgba(192,132,252,0.12) 0%, rgba(88,28,135,0.18) 50%, rgba(15,10,30,0.95) 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ fontSize: size * 0.28, opacity: loading ? 0.3 : 0.6 }}>☽</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: size * 0.1, fontWeight: 700,
            color: '#c084fc', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7,
          }}>Luna</div>
          <div style={{ fontSize: size * 0.04, color: '#7c5a9e', opacity: 0.5 }}>
            {loading ? 'Wird gemalt…' : 'Die Intuitive'}
          </div>
        </div>
      )}

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(8,6,15,0.35) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Border */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: 13,
        border: '1px solid rgba(192,132,252,0.1)',
        pointerEvents: 'none', zIndex: 4,
      }} />
    </div>
  );
}
