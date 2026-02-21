import { useState } from 'react';
import { LilithEyes } from './LilithEyes';
import type { LilithEyeState, LilithEyeIntensity } from './LilithEyes';
import { ResponsiveArtwork } from '../../M02_ui-kit';
import { useAssetImage } from '../../M15_aetheria/lib/useAssetImage';

interface LilithPortraitProps {
  state?: LilithEyeState;
  intensity?: LilithEyeIntensity;
  size?: number;
  baseName?: string;
}

const PORTRAIT_SIZES = '(max-width: 480px) 86vw, (max-width: 640px) 78vw, (max-width: 1024px) 340px, 260px';

/**
 * Lilith Portrait with artwork, SVG eye overlay, ember glow, and vignette.
 * Spec: WebP asset (512/1024/1536), srcset+sizes, lazy+async, 0 Canvas, 0 JS loops, <0.5ms/frame.
 */
export function LilithPortrait({ state = 'idle', intensity, size = 260, baseName = 'lilith' }: LilithPortraitProps) {
  const isActive = state === 'active' || state === 'truth' || !!intensity;
  const isTruth = state === 'truth';
  const isShadow = intensity === 'brutal';
  const [imgError, setImgError] = useState(false);
  const { url: generatedUrl } = useAssetImage('persona', 'lilith', imgError);

  return (
    <div style={{ position: 'relative', width: size, maxWidth: '100%', aspectRatio: '3 / 4.5' }}>
      {/* Background ember glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(ellipse at 50% 55%, rgba(180,100,20,0.18) 0%, transparent 60%)',
        opacity: isTruth ? 1 : isShadow ? 0.85 : isActive ? 0.7 : 0.15,
        transition: 'opacity 0.8s ease', pointerEvents: 'none',
      }} />

      {imgError && generatedUrl ? (
        <img src={generatedUrl} alt="Lilith" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, position: 'relative', zIndex: 1, animation: 'aetheriaFadeIn 1s ease' }} />
      ) : imgError ? (
        <div style={{
          width: '100%', height: '100%', borderRadius: 12, position: 'relative', zIndex: 1,
          background: 'linear-gradient(160deg, rgba(154,52,18,0.12) 0%, rgba(120,40,10,0.18) 50%, rgba(15,10,10,0.95) 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ fontSize: size * 0.28, opacity: 0.6 }}>☾</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: size * 0.1, fontWeight: 700, color: '#d49137', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>Lilith</div>
          <div style={{ fontSize: size * 0.04, color: '#6b5530', opacity: 0.5 }}>Wird gemalt…</div>
        </div>
      ) : (
        <ResponsiveArtwork
          baseName={baseName}
          alt={baseName.charAt(0).toUpperCase() + baseName.slice(1)}
          sizes={PORTRAIT_SIZES}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, display: 'block', position: 'relative', zIndex: 1 }}
        />
      )}

      {/* Ember overlay — CSS animation only, no JS */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 80%, rgba(212,145,55,0.08) 0%, transparent 50%)',
        pointerEvents: 'none', zIndex: 2,
        animation: isActive ? `lilithEmber ${isTruth ? '2s' : isShadow ? '1.5s' : '3.5s'} ease-in-out infinite` : 'none',
        opacity: isTruth ? 0.25 : isShadow ? 0.2 : isActive ? 0.15 : 0,
        transition: 'opacity 0.6s ease',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(8,6,15,0.4) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* SVG Eye Overlay */}
      <LilithEyes state={state} intensity={intensity} size={size} />

      {/* Subtle border */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: 13,
        border: `1px solid ${isTruth ? 'rgba(212,145,55,0.35)' : isActive ? 'rgba(212,145,55,0.15)' : 'rgba(212,145,55,0.06)'}`,
        pointerEvents: 'none', zIndex: 4, transition: 'border-color 0.5s ease',
      }} />
    </div>
  );
}
