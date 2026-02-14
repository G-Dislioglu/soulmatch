import { ResponsiveArtwork } from '../../M02_ui-kit';

interface MayaPortraitProps {
  size?: number;
  baseName?: string;
}

const PORTRAIT_SIZES = '(max-width: 480px) 86vw, (max-width: 640px) 78vw, (max-width: 1024px) 340px, 260px';

/**
 * Maya Portrait with artwork, warm gold glow, and vignette.
 * Uses ResponsiveArtwork (srcset+sizes), no Canvas, no JS loops.
 */
export function MayaPortrait({ size = 260, baseName = 'maya' }: MayaPortraitProps) {
  return (
    <div style={{ position: 'relative', width: size, maxWidth: '100%', aspectRatio: '3 / 4.5' }}>
      {/* Background warm glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(ellipse at 50% 55%, rgba(212,175,55,0.12) 0%, transparent 60%)',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      {/* Artwork — responsive srcset, no JS switching */}
      <ResponsiveArtwork
        baseName={baseName}
        alt="Maya"
        sizes={PORTRAIT_SIZES}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          borderRadius: 12, display: 'block', position: 'relative', zIndex: 1,
        }}
      />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(8,6,15,0.35) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Subtle border */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: 13,
        border: '1px solid rgba(212,175,55,0.1)',
        pointerEvents: 'none', zIndex: 4,
      }} />
    </div>
  );
}
