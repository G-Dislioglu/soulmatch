import { useState, useRef, useCallback, type ReactNode } from 'react';

const ACCENT = '#d4af37';

export interface CardSettings {
  glowIntensity: number;
  plasmaIntensity: number;
  pulseIntensity: number;
  tiltIntensity: number;
  saturation: number;
  cursorAuraIntensity: number;
  cosmicTrail: boolean;
}

export const DEFAULT_CARD_SETTINGS: CardSettings = {
  glowIntensity: 90,
  plasmaIntensity: 45,
  pulseIntensity: 65,
  tiltIntensity: 45,
  saturation: 150,
  cursorAuraIntensity: 70,
  cosmicTrail: true,
};

interface EdgeGlow {
  x: number;
  y: number;
  intensity: number;
}

interface SoulmatchCardProps {
  children: ReactNode;
  accent?: string;
  settings?: CardSettings;
}

function gh(v: number): string {
  return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
}

export function SoulmatchCard({ children, accent = ACCENT, settings }: SoulmatchCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);
  const [edgeGlows, setEdgeGlows] = useState<EdgeGlow[]>([]);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    setPos({ x, y });
    const edges = [
      { ex: px, ey: 0 }, { ex: px, ey: h },
      { ex: 0, ey: py }, { ex: w, ey: py },
    ]
      .map((edge) => ({
        x: (edge.ex / w) * 100,
        y: (edge.ey / h) * 100,
        dist: Math.hypot(edge.ex - px, edge.ey - py),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2)
      .map((edge) => ({
        x: edge.x,
        y: edge.y,
        intensity: Math.max(0, 1 - edge.dist / 220),
      }));
    setEdgeGlows(edges);
  }, []);

  const handleLeave = () => {
    setActive(false);
    setPos({ x: 50, y: 50 });
    setEdgeGlows([]);
  };

  const {
    glowIntensity = 90,
    plasmaIntensity = 45,
    pulseIntensity = 65,
    tiltIntensity = 45,
    saturation = 150,
  } = settings ?? {};

  const gf = glowIntensity / 100;
  const pf = plasmaIntensity / 100;
  const puf = pulseIntensity / 100;
  const tf = tiltIntensity / 100;
  const tiltX = active ? -(pos.y - 50) / (14 - tf * 8) : 0;
  const tiltY = active ? (pos.x - 50) / (14 - tf * 8) : 0;

  return (
    <div style={{ position: 'relative', borderRadius: 20, padding: 2, filter: `saturate(${saturation}%)` }}>
      {/* Plasma border */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: 20, overflow: 'hidden',
        opacity: active ? 0.25 + pf * 0.55 : 0.08 + pf * 0.25,
        transition: 'opacity 0.5s ease',
      }}>
        <div style={{
          position: 'absolute', inset: -30,
          background: `conic-gradient(from 0deg at 50% 50%, ${accent}00 0deg, ${accent}dd 45deg, #c084fccc 90deg, ${accent}00 135deg, #f472b6aa 200deg, ${accent}cc 270deg, ${accent}00 360deg)`,
          animation: `plasmaRotate ${8 - pf * 4}s linear infinite`,
          filter: `blur(${5 + pf * 5}px)`,
        }} />
      </div>

      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: 'absolute', inset: -3 - i * 5, borderRadius: 22 + i * 4,
          border: `1px solid ${accent}`,
          opacity: 0,
          animation: `borderPulse ${4 - puf}s ease-out ${i * 1.2}s infinite`,
          pointerEvents: 'none',
          // @ts-expect-error CSS custom property
          '--pulse-max-opacity': 0.12 + puf * 0.5,
        }} />
      ))}

      {/* Card body */}
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={handleLeave}
        style={{
          position: 'relative', borderRadius: 18,
          background: 'rgba(10,8,18,0.95)', padding: '24px 26px',
          overflow: 'hidden', cursor: 'default',
          transform: `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transition: active
            ? 'transform 0.1s ease-out, box-shadow 0.3s'
            : 'transform 0.5s ease-out, box-shadow 0.5s',
          boxShadow: active
            ? `0 16px 48px rgba(0,0,0,0.35), 0 0 ${20 + gf * 35}px ${accent}${gh(gf * 22)}`
            : '0 6px 20px rgba(0,0,0,0.25)',
        }}
      >
        {/* Glow follow */}
        <div style={{
          position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
          width: 280 + gf * 100, height: 280 + gf * 100,
          transform: 'translate(-50%,-50%)',
          background: active
            ? `radial-gradient(circle, ${accent}${gh(gf * 55)} 0%, ${accent}${gh(gf * 25)} 25%, ${accent}${gh(gf * 10)} 50%, transparent 70%)`
            : 'none',
          pointerEvents: 'none',
          transition: active ? 'left 0.06s linear, top 0.06s linear' : 'opacity 0.3s',
        }} />

        {/* Warm aura */}
        <div style={{
          position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
          width: 200, height: 200, transform: 'translate(-50%,-50%)',
          background: active
            ? `radial-gradient(circle, rgba(255,190,80,${gf * 0.1}) 0%, transparent 60%)`
            : 'none',
          pointerEvents: 'none', filter: 'blur(10px)',
          transition: active ? 'left 0.1s linear, top 0.1s linear' : 'opacity 0.3s',
        }} />

        {/* Edge glows */}
        {edgeGlows.map((g, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${g.x}%`, top: `${g.y}%`,
            width: 200, height: 200, transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, ${accent}${gh(g.intensity * gf * 55)} 0%, transparent 60%)`,
            pointerEvents: 'none',
            transition: 'left 0.12s ease-out, top 0.12s ease-out',
            filter: 'blur(8px)',
          }} />
        ))}

        {/* Border glow */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18,
          border: '1px solid transparent',
          background: active
            ? `linear-gradient(rgba(10,8,18,0),rgba(10,8,18,0)) padding-box, radial-gradient(circle 180px at ${pos.x}% ${pos.y}%, ${accent}${gh(gf * 80)} 0%, ${accent}${gh(gf * 18)} 40%, transparent 70%) border-box`
            : `linear-gradient(rgba(10,8,18,0),rgba(10,8,18,0)) padding-box, linear-gradient(135deg, ${accent}20, ${accent}0c) border-box`,
          pointerEvents: 'none',
          transition: active ? 'background 0.08s' : 'background 0.5s ease',
        }} />

        {/* Top edge line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          pointerEvents: 'none',
          background: active
            ? `linear-gradient(90deg, transparent 0%, ${accent}${gh(gf * 50)} ${pos.x - 12}%, ${accent}${gh(gf * 90)} ${pos.x}%, ${accent}${gh(gf * 50)} ${pos.x + 12}%, transparent 100%)`
            : `linear-gradient(90deg, transparent 0%, ${accent}18 50%, transparent 100%)`,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
      </div>
    </div>
  );
}
