import { LilithEyes } from './LilithEyes';
import type { LilithEyeState } from './LilithEyes';

interface LilithPortraitProps {
  state?: LilithEyeState;
  size?: number;
  imageSrc?: string;
}

/**
 * Lilith Portrait with artwork, SVG eye overlay, ember glow, and vignette.
 * Spec: WebP asset (512/1024/1536), lazy+async, 0 Canvas, 0 JS loops, <0.5ms/frame.
 */
export function LilithPortrait({ state = 'idle', size = 260, imageSrc = '/assets/lilith.webp' }: LilithPortraitProps) {
  const isActive = state === 'active' || state === 'truth';
  const isTruth = state === 'truth';

  return (
    <div style={{ position: 'relative', width: size, maxWidth: '100%', aspectRatio: '3 / 4.5' }}>
      {/* Background ember glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(ellipse at 50% 55%, rgba(180,100,20,0.18) 0%, transparent 60%)',
        opacity: isTruth ? 1 : isActive ? 0.7 : 0.15,
        transition: 'opacity 0.8s ease', pointerEvents: 'none',
      }} />

      {/* Artwork */}
      <img
        src={imageSrc} alt="Lilith" loading="lazy" decoding="async"
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          borderRadius: 12, display: 'block', position: 'relative', zIndex: 1,
        }}
      />

      {/* Ember overlay — CSS animation only, no JS */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 80%, rgba(212,145,55,0.08) 0%, transparent 50%)',
        pointerEvents: 'none', zIndex: 2,
        animation: isActive ? `lilithEmber ${isTruth ? '2s' : '3.5s'} ease-in-out infinite` : 'none',
        opacity: isTruth ? 0.25 : isActive ? 0.15 : 0,
        transition: 'opacity 0.6s ease',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(8,6,15,0.4) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* SVG Eye Overlay */}
      <LilithEyes state={state} />

      {/* Subtle border */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: 13,
        border: `1px solid ${isTruth ? 'rgba(212,145,55,0.35)' : isActive ? 'rgba(212,145,55,0.15)' : 'rgba(212,145,55,0.06)'}`,
        pointerEvents: 'none', zIndex: 4, transition: 'border-color 0.5s ease',
      }} />
    </div>
  );
}
