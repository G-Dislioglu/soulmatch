const ACCENT = '#d4af37';

interface EnergyDividerProps {
  color?: string;
  speed?: number;
}

export function EnergyDivider({ color = ACCENT, speed = 3 }: EnergyDividerProps) {
  return (
    <div style={{ position: 'relative', height: 28, overflow: 'hidden', margin: '20px 0' }}>
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${color}20 25%, ${color}35 50%, ${color}20 75%, transparent 100%)`,
      }} />
      <div style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        width: 50, height: 3, borderRadius: 2,
        background: `linear-gradient(90deg, transparent, ${color}90, transparent)`,
        animation: `waveFlow ${speed}s ease-in-out infinite`,
        filter: 'blur(0.5px)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%) rotate(45deg)',
        width: 5, height: 5, background: color,
        boxShadow: `0 0 10px ${color}70`,
        animation: 'breathe 3s ease-in-out infinite',
      }} />
    </div>
  );
}
