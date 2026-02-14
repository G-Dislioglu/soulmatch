import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

const ACCENT = '#d4af37';

type CosmicVariant = 'gold' | 'outline' | 'ghost';

interface CosmicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CosmicVariant;
  children: ReactNode;
}

const baseStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 0',
  borderRadius: 14,
  fontFamily: "'Outfit', sans-serif",
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};

const variants: Record<CosmicVariant, { normal: React.CSSProperties; hover: React.CSSProperties }> = {
  gold: {
    normal: {
      ...baseStyle,
      border: 'none',
      background: `linear-gradient(135deg, ${ACCENT}, #ffe8a0, ${ACCENT})`,
      backgroundSize: '200% 200%',
      animation: 'scoreShine 4s ease-in-out infinite',
      color: '#1a1a1a',
      boxShadow: `0 0 20px ${ACCENT}30`,
    },
    hover: {
      boxShadow: `0 0 32px ${ACCENT}50`,
      transform: 'translateY(-1px)',
    },
  },
  outline: {
    normal: {
      ...baseStyle,
      fontWeight: 500,
      border: `1px solid ${ACCENT}20`,
      background: 'rgba(10,8,18,0.8)',
      color: '#f0eadc',
    },
    hover: {
      borderColor: `${ACCENT}40`,
      background: `${ACCENT}08`,
      boxShadow: `0 0 16px ${ACCENT}15`,
    },
  },
  ghost: {
    normal: {
      ...baseStyle,
      padding: '12px 0',
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 500,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.03)',
      color: '#a09a8e',
    },
    hover: {
      borderColor: 'rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      color: '#f0eadc',
    },
  },
};

export function CosmicButton({ variant = 'gold', children, disabled, style, ...rest }: CosmicButtonProps) {
  const [hovered, setHovered] = useState(false);
  const v = variants[variant];

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        ...v.normal,
        ...(hovered && !disabled ? v.hover : {}),
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
