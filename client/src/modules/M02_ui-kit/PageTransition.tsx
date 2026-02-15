import { useState } from 'react';

const ACCENT = '#d4af37';

export interface PageDef {
  label: string;
  icon: string;
  color: string;
}

interface PageTransitionProps {
  pages: PageDef[];
  activePage: number;
  onPageChange: (idx: number) => void;
}

interface BurstParticle {
  x: number;
  y: number;
  delay: number;
}

export function PageTransition({ pages, activePage, onPageChange }: PageTransitionProps) {
  const [transitioning, setTransitioning] = useState(false);
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([]);

  const goTo = (idx: number) => {
    if (idx === activePage || transitioning) return;
    setTransitioning(true);

    const particles: BurstParticle[] = Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      const dist = 25 + Math.random() * 70;
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, delay: i * 0.02 };
    });
    setBurstParticles(particles);

    setTimeout(() => {
      onPageChange(idx);
      setTransitioning(false);
      setBurstParticles([]);
    }, 550);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
        {pages.map((p, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
            background: activePage === i ? `${p.color}12` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${activePage === i ? `${p.color}30` : 'rgba(255,255,255,0.05)'}`,
            color: activePage === i ? '#f0eadc' : '#6b6560',
            fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
            transition: 'all 0.3s ease',
          }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Color bar under tabs */}
      <div style={{
        height: 2, borderRadius: 1, marginTop: 4,
        background: `linear-gradient(90deg, ${pages[activePage]?.color ?? ACCENT}, ${ACCENT})`,
        transition: 'background 0.8s ease',
        opacity: 0.6,
      }} />

      {transitioning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: `radial-gradient(circle, ${pages[activePage]?.color ?? ACCENT}25 0%, transparent 70%)`,
              animation: 'burstGlow 0.5s ease-out forwards',
            }} />
            {burstParticles.map((p, i) => (
              <div key={i} style={{
                position: 'absolute', left: '50%', top: '50%',
                width: 3, height: 3, borderRadius: '50%',
                background: pages[activePage]?.color ?? ACCENT,
                transform: `translate(${p.x}px, ${p.y}px)`,
                opacity: 0,
                animation: `starTrail 0.5s ease-out ${p.delay}s forwards`,
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
