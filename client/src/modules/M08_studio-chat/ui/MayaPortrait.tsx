import { useState } from 'react';
import { ResponsiveArtwork } from '../../M02_ui-kit';
import { useAssetImage } from '../../M15_aetheria/lib/useAssetImage';

interface MayaPortraitProps {
  size?: number;
  baseName?: string;
}

const PORTRAIT_SIZES = '(max-width: 480px) 86vw, (max-width: 640px) 78vw, (max-width: 1024px) 340px, 260px';

/**
 * Maya Portrait with artwork, cosmic purple glow, and vignette.
 * Uses ResponsiveArtwork (srcset+sizes), no Canvas, no JS loops.
 */
export function MayaPortrait({ size = 260, baseName = 'maya' }: MayaPortraitProps) {
  const [imgError, setImgError] = useState(false);
  const { url: generatedUrl } = useAssetImage('persona', 'maya', imgError);

  return (
    <div style={{ position: 'relative', width: size, maxWidth: '100%', aspectRatio: '3 / 4.5' }}>
      {/* Background cosmic purple glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(ellipse at 50% 55%, rgba(168,85,247,0.14) 0%, transparent 60%)',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      {imgError && generatedUrl ? (
        <img src={generatedUrl} alt="Maya" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, position: 'relative', zIndex: 1, animation: 'aetheriaFadeIn 1s ease' }} />
      ) : imgError ? (
        <div style={{
          width: '100%', height: '100%', borderRadius: 12, position: 'relative', zIndex: 1,
          background: 'linear-gradient(160deg, rgba(168,85,247,0.12) 0%, rgba(88,28,135,0.18) 50%, rgba(15,10,30,0.95) 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ fontSize: size * 0.28, opacity: 0.6 }}>◇</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: size * 0.1, fontWeight: 700, color: '#a855f7', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>Maya</div>
          <div style={{ fontSize: size * 0.04, color: '#6b5a80', opacity: 0.5 }}>Wird gemalt…</div>
        </div>
      ) : (
        <ResponsiveArtwork
          baseName={baseName}
          alt="Maya"
          sizes={PORTRAIT_SIZES}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, display: 'block', position: 'relative', zIndex: 1 }}
        />
      )}

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(8,6,15,0.35) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Subtle border */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: 13,
        border: '1px solid rgba(168,85,247,0.1)',
        pointerEvents: 'none', zIndex: 4,
      }} />
    </div>
  );
}
