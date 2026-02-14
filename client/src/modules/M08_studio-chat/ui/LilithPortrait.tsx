import { LilithEyes } from './LilithEyes';
import type { LilithEyeState } from './LilithEyes';

interface LilithPortraitProps {
  state?: LilithEyeState;
  size?: number;
  imageSrc?: string;
}

export function LilithPortrait({ state = 'active', size = 400, imageSrc = '/assets/lilith.webp' }: LilithPortraitProps) {
  const isActive = state === 'active' || state === 'truth';
  const isTruth = state === 'truth';

  return (
    <div style={{ position: 'relative', width: size, maxWidth: '100%', aspectRatio: '3 / 4.5' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: '-8%',
        background: 'radial-gradient(ellipse at 50% 45%, rgba(180,100,20,0.12) 0%, transparent 55%)',
        opacity: isTruth ? 1 : isActive ? 0.6 : 0,
        transition: 'opacity 0.8s ease', pointerEvents: 'none',
      }} />

      {/* Artwork */}
      <img
        src={imageSrc} alt="Lilith" loading="lazy" decoding="async"
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          borderRadius: 14, display: 'block', position: 'relative', zIndex: 1,
        }}
      />

      {/* Ember overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 14,
        background: 'radial-gradient(ellipse at 50% 80%, rgba(212,145,55,0.06) 0%, transparent 45%)',
        opacity: isTruth ? 0.2 : isActive ? 0.1 : 0,
        transition: 'opacity 0.6s ease', pointerEvents: 'none', zIndex: 2,
        ...(isActive && { animation: `lilithEmber ${isTruth ? '2s' : '4s'} ease-in-out infinite` }),
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 14,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(8,6,15,0.3) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Eyes */}
      <LilithEyes state={state} />

      {/* Border */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: 15,
        border: `1px solid ${isTruth ? 'rgba(212,145,55,0.35)' : isActive ? 'rgba(212,145,55,0.15)' : 'rgba(212,145,55,0.05)'}`,
        pointerEvents: 'none', zIndex: 4, transition: 'all 0.5s ease',
      }} />
    </div>
  );
}
