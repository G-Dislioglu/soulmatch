interface BackButtonProps {
  onClick: () => void;
  /** 'light' für dunkle Hintergründe (Aetheria), 'dark' für helle Seiten */
  variant?: 'light' | 'dark';
  style?: React.CSSProperties;
}

/**
 * Universal back button — mystical arrow SVG, no text, works in any language.
 * variant='light': frosted glass for dark/image backgrounds (Aetheria rooms)
 * variant='dark': subtle gold for card backgrounds (Settings, Match etc.)
 */
export function BackButton({ onClick, variant = 'dark', style }: BackButtonProps) {
  const isLight = variant === 'light';
  const arrowColor = isLight ? 'rgba(255,255,255,0.9)' : '#d4af37';

  return (
    <button
      onClick={onClick}
      aria-label="Zurück"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: isLight
          ? '1px solid rgba(255,255,255,0.25)'
          : '1px solid rgba(212,175,55,0.25)',
        background: isLight
          ? 'rgba(0,0,0,0.50)'
          : 'rgba(212,175,55,0.07)',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.22s ease',
        flexShrink: 0,
        padding: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isLight
          ? 'rgba(255,255,255,0.15)'
          : 'rgba(212,175,55,0.16)';
        e.currentTarget.style.transform = 'scale(1.1) translateX(-1px)';
        e.currentTarget.style.boxShadow = isLight
          ? '0 0 12px rgba(255,255,255,0.15)'
          : '0 0 12px rgba(212,175,55,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isLight
          ? 'rgba(0,0,0,0.50)'
          : 'rgba(212,175,55,0.07)';
        e.currentTarget.style.transform = 'scale(1) translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Mystical feather-arrow SVG */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main arrow shaft */}
        <line x1="14" y1="9" x2="4" y2="9" stroke={arrowColor} strokeWidth="1.5" strokeLinecap="round"/>
        {/* Arrow head */}
        <polyline points="8,5 4,9 8,13" fill="none" stroke={arrowColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Mystical sparkle top */}
        <line x1="13" y1="6" x2="14" y2="5" stroke={arrowColor} strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        {/* Mystical sparkle bottom */}
        <line x1="13" y1="12" x2="14" y2="13" stroke={arrowColor} strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        {/* Center dot glow */}
        <circle cx="14" cy="9" r="1.2" fill={arrowColor} opacity="0.7"/>
      </svg>
    </button>
  );
}
