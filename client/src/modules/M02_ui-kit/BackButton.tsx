interface BackButtonProps {
  onClick: () => void;
  /** 'light' für dunkle Hintergründe (Aetheria), 'dark' für helle Seiten */
  variant?: 'light' | 'dark';
  style?: React.CSSProperties;
}

/**
 * Universal back button — uses ◁ symbol, no text, works in any language.
 * variant='light': frosted glass for dark/image backgrounds (Aetheria rooms)
 * variant='dark': subtle for light/card backgrounds (Settings, Match etc.)
 */
export function BackButton({ onClick, variant = 'dark', style }: BackButtonProps) {
  const isLight = variant === 'light';

  return (
    <button
      onClick={onClick}
      aria-label="Zurück"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: isLight
          ? '1px solid rgba(255,255,255,0.22)'
          : '1px solid rgba(212,175,55,0.22)',
        background: isLight
          ? 'rgba(0,0,0,0.45)'
          : 'rgba(212,175,55,0.06)',
        color: isLight ? 'rgba(255,255,255,0.9)' : '#d4af37',
        fontSize: 16,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isLight
          ? 'rgba(255,255,255,0.14)'
          : 'rgba(212,175,55,0.14)';
        e.currentTarget.style.transform = 'scale(1.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isLight
          ? 'rgba(0,0,0,0.45)'
          : 'rgba(212,175,55,0.06)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      ◁
    </button>
  );
}
