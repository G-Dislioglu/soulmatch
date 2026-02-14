import { useState } from 'react';

interface LilithAvatarProps {
  size?: number;
  imageSrc?: string;
  onClick?: () => void;
}

/**
 * Lilith persona avatar for the Studio persona row.
 * Shows artwork thumbnail in a circular frame with ember aura rings.
 */
export function LilithAvatar({ size = 52, imageSrc = '/assets/lilith.webp', onClick }: LilithAvatarProps) {
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
        {/* Aura pulse rings */}
        {[
          'rgba(154,52,18,0.20)',
          'rgba(194,65,12,0.15)',
          'rgba(154,52,18,0.10)',
        ].map((bg, i) => (
          <div
            key={i}
            className="absolute rounded-full lilith-aura-pulse"
            style={{
              inset: -(6 + i * 3),
              background: bg,
              '--duration': `${3 + i * 0.7}s`,
              animationDelay: `${i * 0.5}s`,
              opacity: hover ? 0.7 : 0.35,
              transition: 'opacity 0.4s',
            } as React.CSSProperties}
          />
        ))}
        {/* Orbital ring */}
        <div
          className="absolute rounded-full lilith-orbital-spin"
          style={{
            inset: -4,
            border: '1px dashed rgba(194,65,12,0.12)',
          }}
        >
          <div
            className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
            style={{ background: '#d49137', boxShadow: '0 0 6px rgba(212,145,55,0.5)' }}
          />
        </div>
        {/* Avatar circle with artwork */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden z-[2]"
          style={{
            border: `2px solid ${hover ? 'rgba(212,145,55,0.35)' : 'rgba(212,145,55,0.12)'}`,
            boxShadow: hover
              ? '0 0 20px rgba(212,145,55,0.2), inset 0 0 8px rgba(212,145,55,0.1)'
              : '0 0 8px rgba(212,145,55,0.06)',
            transition: 'all 0.4s',
          }}
        >
          {imgError ? (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'rgba(154,52,18,0.3)', color: '#d49137', fontSize: size * 0.35 }}>
              ☾
            </div>
          ) : (
            <img
              src={imageSrc}
              alt="Lilith"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              style={{
                width: '140%',
                height: '140%',
                objectFit: 'cover',
                objectPosition: '50% 22%',
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
          color: hover ? '#d49137' : '#6b5530',
          transition: 'color 0.4s',
        }}
      >
        Lilith
      </div>
    </div>
  );
}
