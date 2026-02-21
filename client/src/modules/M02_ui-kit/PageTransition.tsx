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
        {pages.map((p, i) => {
          const isActive = activePage === i;
          return (
            <button key={i} id={`tab-${p.label.toLowerCase()}`} data-tab={p.label.toLowerCase()} data-active={isActive ? true : undefined} onClick={() => goTo(i)} style={{
              position: 'relative',
              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
              background: isActive ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isActive ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)'}`,
              color: isActive ? '#d4af37' : 'rgba(255,255,255,0.25)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: isActive ? 600 : 400,
              transition: 'all 0.25s ease',
            }}>
              {/* Goldene Linie oben bei aktivem Tab */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: 1,
                  background: '#d4af37',
                  boxShadow: '0 0 6px rgba(212,175,55,0.5)',
                }} />
              )}
              <span style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(212,175,55,0.3))' : 'grayscale(0.5)' }}>
                {p.icon}
              </span>
              {' '}{p.label}
            </button>
          );
        })}
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
