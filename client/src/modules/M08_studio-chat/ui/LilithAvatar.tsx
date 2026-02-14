import { useState } from 'react';

interface LilithAvatarProps {
  size?: number;
  imageSrc?: string;
}

export function LilithAvatar({ size = 52, imageSrc = '/assets/lilith.webp' }: LilithAvatarProps) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col items-center gap-2 cursor-pointer"
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Aura rings */}
        {['bg-orange-900/20', 'bg-orange-700/15', 'bg-orange-800/10'].map((bg, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${bg} lilith-aura-pulse`}
            style={{
              inset: -(6 + i * 3),
              animationDuration: `${3 + i * 0.7}s`,
              animationDelay: `${i * 0.5}s`,
              opacity: hover ? 0.7 : 0.35,
              transition: 'opacity 0.4s',
            }}
          />
        ))}
        {/* Orbital ring */}
        <div
          className="absolute rounded-full border border-dashed border-orange-600/12 lilith-orbital-spin"
          style={{ inset: -4 }}
        >
          <div
            className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500"
            style={{ boxShadow: '0 0 6px rgba(212,145,55,0.5)' }}
          />
        </div>
        {/* Avatar circle */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden z-[2]"
          style={{
            border: `2px solid ${hover ? 'rgba(212,145,55,0.3)' : 'rgba(212,145,55,0.12)'}`,
            boxShadow: hover ? '0 0 20px rgba(212,145,55,0.15)' : '0 0 8px rgba(212,145,55,0.05)',
            transition: 'all 0.4s',
          }}
        >
          {imgError ? (
            <div className="w-full h-full flex items-center justify-center bg-orange-950/40 text-orange-400 text-lg">
              🔥
            </div>
          ) : (
            <img
              src={imageSrc}
              alt="Lilith"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              style={{
                width: '150%',
                height: '150%',
                objectFit: 'cover',
                objectPosition: '50% 20%',
                marginLeft: '-25%',
                marginTop: '-5%',
              }}
            />
          )}
        </div>
      </div>
      <div
        className="text-[10px] tracking-wide uppercase font-semibold transition-colors duration-400"
        style={{ color: hover ? '#d49137' : '#6b5530' }}
      >
        Lilith
      </div>
    </div>
  );
}
