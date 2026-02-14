import { useState } from 'react';
import { ResponsiveArtwork } from '../../M02_ui-kit';

interface MayaAvatarProps {
  size?: number;
  baseName?: string;
  onClick?: () => void;
}

/**
 * Maya persona avatar for the Studio persona row.
 * Shows artwork thumbnail via srcset (512w/1024w) in a circular frame with warm gold aura.
 */
export function MayaAvatar({ size = 52, baseName = 'maya', onClick }: MayaAvatarProps) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer"
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Aura pulse rings — warm gold tones */}
        {[
          'rgba(212,175,55,0.18)',
          'rgba(251,191,36,0.12)',
          'rgba(251,146,60,0.08)',
        ].map((bg, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              inset: -(6 + i * 3),
              background: bg,
              animation: `auraPulse ${3 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
              opacity: hover ? 0.7 : 0.35,
              transition: 'opacity 0.4s',
            }}
          />
        ))}
        {/* Orbital ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -4,
            border: '1px dashed rgba(212,175,55,0.12)',
            animation: 'orbitalSpin 12s linear infinite',
          }}
        >
          <div
            className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
            style={{ background: '#d4af37', boxShadow: '0 0 6px rgba(212,175,55,0.5)' }}
          />
        </div>
        {/* Avatar circle with artwork thumbnail */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden z-[2]"
          style={{
            border: `2px solid ${hover ? 'rgba(212,175,55,0.35)' : 'rgba(212,175,55,0.12)'}`,
            boxShadow: hover
              ? '0 0 20px rgba(212,175,55,0.2), inset 0 0 8px rgba(212,175,55,0.1)'
              : '0 0 8px rgba(212,175,55,0.06)',
            transition: 'all 0.4s',
          }}
        >
          {imgError ? (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', fontSize: size * 0.35 }}>
              ◇
            </div>
          ) : (
            <ResponsiveArtwork
              baseName={baseName}
              alt="Maya"
              variant="thumb"
              sizes="96px"
              onError={() => setImgError(true)}
              style={{
                width: '140%',
                height: '140%',
                objectFit: 'cover',
                objectPosition: '50% 25%',
                marginLeft: '-20%',
                marginTop: '-8%',
              }}
            />
          )}
        </div>
      </div>
      <div
        className="text-[10px] tracking-wide uppercase font-semibold"
        style={{
          color: hover ? '#d4af37' : '#6b6530',
          transition: 'color 0.4s',
        }}
      >
        Maya
      </div>
    </div>
  );
}
