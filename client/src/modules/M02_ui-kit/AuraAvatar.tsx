const ACCENT = '#d4af37';

interface AuraAvatarProps {
  sign: string;
  size?: number;
  colors?: [string, string, string];
  label?: string;
}

export function AuraAvatar({ sign, size = 80, colors = [ACCENT, '#c084fc', '#f472b6'], label }: AuraAvatarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {colors.map((c, i) => (
          <div key={i} style={{
            position: 'absolute', inset: -10 - i * 5, borderRadius: '50%',
            background: `radial-gradient(circle at ${40 + i * 15}% ${35 + i * 10}%, ${c}30 0%, transparent 65%)`,
            animation: `auraPulse ${3 + i * 0.7}s ease-in-out ${i * 0.5}s infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: -6, borderRadius: '50%',
          border: `1px dashed ${colors[0]}22`,
          animation: 'orbitalSpin 20s linear infinite',
        }}>
          <div style={{
            position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)',
            width: 5, height: 5, borderRadius: '50%',
            background: colors[0], boxShadow: `0 0 8px ${colors[0]}90`,
          }} />
        </div>
        <div style={{
          position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
          background: 'rgba(12,10,20,0.9)', border: `2px solid ${colors[0]}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.38, zIndex: 2,
          boxShadow: `0 0 24px ${colors[0]}15, inset 0 0 16px ${colors[0]}06`,
        }}>
          {sign}
        </div>
      </div>
      {label && (
        <div style={{ fontSize: 10, color: '#6b6560', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
    </div>
  );
}
