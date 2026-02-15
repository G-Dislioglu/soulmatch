export type LilithEyeState = 'idle' | 'active' | 'truth';
export type LilithEyeIntensity = 'mild' | 'ehrlich' | 'brutal';

interface LilithEyesProps {
  state?: LilithEyeState;
  intensity?: LilithEyeIntensity;
  size?: number;
  className?: string;
}

export function LilithEyes({ state = 'idle', intensity, size, className = '' }: LilithEyesProps) {
  // If intensity is provided and state is not truth, use intensity-coupled classes
  let stateClass: string;
  if (state === 'truth') {
    stateClass = 'lilith-eye-truth';
  } else if (intensity) {
    stateClass = intensity === 'brutal' ? 'lilith-eye-shadow'
      : intensity === 'ehrlich' ? 'lilith-eye-sharp'
      : 'lilith-eye-gentle';
  } else {
    stateClass = state === 'active' ? 'lilith-eye-active' : 'lilith-eye-idle';
  }

  // Scale eyes up for small portraits so they remain visible
  const eyeWidth = size && size < 120 ? `${Math.max(28, size * 0.45)}%` : '11%';

  return (
    <svg
      className={`${stateClass} ${className}`}
      viewBox="0 0 80 30"
      style={{
        position: 'absolute',
        top: '22.3%',
        left: '50.5%',
        transform: 'translateX(-50%)',
        width: eyeWidth,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <defs>
        <filter id="lilithEyeGlow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
          <feColorMatrix
            in="blur1"
            type="matrix"
            values="1.3 0.2 0 0 0.15  0.3 0.7 0 0 0.05  0 0 0.2 0 0  0 0 0 1 0"
            result="warm"
          />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="sharp" />
          <feMerge>
            <feMergeNode in="warm" />
            <feMergeNode in="sharp" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="lilithEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3d0" />
          <stop offset="25%" stopColor="#ffe0a0" />
          <stop offset="55%" stopColor="#d49137" />
          <stop offset="85%" stopColor="#a05a10" />
          <stop offset="100%" stopColor="#603008" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <g filter="url(#lilithEyeGlow)">
        {/* Left eye */}
        <ellipse cx="28" cy="15" rx="7" ry="4" fill="url(#lilithEyeGrad)" />
        <ellipse cx="28" cy="15" rx="2.8" ry="1.8" fill="#fff3d0" opacity="0.9" />
        {/* Right eye */}
        <ellipse cx="52" cy="15" rx="7" ry="4" fill="url(#lilithEyeGrad)" />
        <ellipse cx="52" cy="15" rx="2.8" ry="1.8" fill="#fff3d0" opacity="0.9" />
      </g>
    </svg>
  );
}
