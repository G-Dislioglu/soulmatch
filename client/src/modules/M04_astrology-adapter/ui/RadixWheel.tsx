import { useState } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const CX = 160, CY = 160;
const R_SIGN_OUT = 148, R_SIGN_IN = 128, R_PLANET = 108, R_ASPECT = 94;

const SIGNS = [
  { name: 'Widder',     glyph: '♈', el: 'fire'  },
  { name: 'Stier',      glyph: '♉', el: 'earth' },
  { name: 'Zwillinge',  glyph: '♊', el: 'air'   },
  { name: 'Krebs',      glyph: '♋', el: 'water' },
  { name: 'Löwe',       glyph: '♌', el: 'fire'  },
  { name: 'Jungfrau',   glyph: '♍', el: 'earth' },
  { name: 'Waage',      glyph: '♎', el: 'air'   },
  { name: 'Skorpion',   glyph: '♏', el: 'water' },
  { name: 'Schütze',    glyph: '♐', el: 'fire'  },
  { name: 'Steinbock',  glyph: '♑', el: 'earth' },
  { name: 'Wassermann', glyph: '♒', el: 'air'   },
  { name: 'Fische',     glyph: '♓', el: 'water' },
];

const EL_COLOR: Record<string, string> = {
  fire: '#f97316', earth: '#84cc16', air: '#38bdf8', water: '#818cf8',
};

const PLANET_SYMBOL: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', chiron: '⚷', lilith: '⚸',
};
const PLANET_COLOR: Record<string, string> = {
  sun: '#fbbf24', moon: '#c084fc', mercury: '#38bdf8', venus: '#f472b6',
  mars: '#ef4444', jupiter: '#d4af37', saturn: '#a3a3a3', uranus: '#34d399', neptune: '#818cf8', pluto: '#f87171',
  chiron: '#fb923c', lilith: '#e879f9',
};

const ASPECTS = [
  { name: 'Konjunktion', angle: 0,   orb: 8,  color: '#d4af37', style: 'solid',  width: 1.5 },
  { name: 'Sextil',      angle: 60,  orb: 6,  color: '#38bdf8', style: 'dashed', width: 1 },
  { name: 'Quadrat',     angle: 90,  orb: 7,  color: '#ef4444', style: 'solid',  width: 1 },
  { name: 'Trigon',      angle: 120, orb: 8,  color: '#34d399', style: 'solid',  width: 1.5 },
  { name: 'Opposition',  angle: 180, orb: 8,  color: '#f87171', style: 'dashed', width: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function lonToXY(lon: number, r: number): { x: number; y: number } {
  const a = (90 + lon) * (Math.PI / 180);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

function arcPath(r: number, startDeg: number, endDeg: number): string {
  const s = lonToXY(startDeg, r);
  const e = lonToXY(endDeg, r);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

function detectAspects(planets: { key: string; lon: number }[]): { a: string; b: string; name: string; color: string; style: string; width: number }[] {
  const result: { a: string; b: string; name: string; color: string; style: string; width: number }[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const pA = planets[i];
      const pB = planets[j];
      if (!pA || !pB) continue;
      let diff = Math.abs(pA.lon - pB.lon);
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECTS) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          result.push({ a: pA.key, b: pB.key, name: asp.name, color: asp.color, style: asp.style, width: asp.width });
          break;
        }
      }
    }
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Planet { key: string; lon: number; signDe?: string; degreeInSign?: number; }

const R_PLANET_B = 82;
const R_ASPECT_X = 58;
const SYNASTRY_COLOR = '#fb7185';

function detectCrossAspects(planetsA: Planet[], planetsB: Planet[]): { a: string; b: string; name: string; color: string; style: string; width: number }[] {
  const result: { a: string; b: string; name: string; color: string; style: string; width: number }[] = [];
  for (const pA of planetsA) {
    for (const pB of planetsB) {
      let diff = Math.abs(pA.lon - pB.lon);
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECTS) {
        if (Math.abs(diff - asp.angle) <= asp.orb) {
          result.push({ a: pA.key, b: `B_${pB.key}`, name: asp.name, color: SYNASTRY_COLOR, style: asp.style, width: asp.width });
          break;
        }
      }
    }
  }
  return result;
}

function collisionOffset(planets: Planet[]): ({ adjLon: number } & Planet)[] {
  const lonMap: Record<string, number> = {};
  return planets.map((p) => {
    let lon = p.lon;
    for (const [, existingLon] of Object.entries(lonMap)) {
      let diff = Math.abs(lon - existingLon);
      if (diff > 180) diff = 360 - diff;
      if (diff < 10) lon = lon + (lon > existingLon ? 6 : -6);
    }
    lonMap[p.key] = lon;
    return { ...p, adjLon: lon };
  });
}

interface RadixWheelProps {
  planets: Planet[];
  planetsB?: Planet[];
  labelA?: string;
  labelB?: string;
  size?: number;
}

export function RadixWheel({ planets, planetsB, labelA, labelB, size = 320 }: RadixWheelProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [hoveredAspect, setHoveredAspect] = useState<string | null>(null);
  const isSynastry = Boolean(planetsB && planetsB.length > 0);
  const aspects = isSynastry ? [] : detectAspects(planets);
  const crossAspects = isSynastry && planetsB ? detectCrossAspects(planets, planetsB) : [];
  const adjusted = collisionOffset(planets);
  const adjustedB = planetsB ? collisionOffset(planetsB) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg
        width={size} height={size}
        viewBox="0 0 320 320"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Background */}
        <circle cx={CX} cy={CY} r={R_SIGN_OUT} fill="#08060f" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />

        {/* Sign segments */}
        {SIGNS.map((sign, i) => {
          const startLon = i * 30;
          const endLon = startLon + 30;
          const midLon = startLon + 15;
          const gPos = lonToXY(midLon, (R_SIGN_IN + R_SIGN_OUT) / 2);
          const color = EL_COLOR[sign.el];
          return (
            <g key={sign.name}>
              {/* Segment arc (outer) */}
              <path
                d={`${arcPath(R_SIGN_OUT, startLon, endLon)} L ${lonToXY(endLon, R_SIGN_IN).x} ${lonToXY(endLon, R_SIGN_IN).y} ${arcPath(R_SIGN_IN, endLon, startLon)} Z`}
                fill={`${color}14`}
                stroke={`${color}30`}
                strokeWidth="0.5"
              />
              {/* Degree tick at boundary */}
              {(() => {
                const outer = lonToXY(startLon, R_SIGN_OUT);
                const inner = lonToXY(startLon, R_SIGN_IN);
                return <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={`${color}50`} strokeWidth="1" />;
              })()}
              {/* Sign glyph */}
              <text x={gPos.x} y={gPos.y + 4} textAnchor="middle" fontSize="11" fill={color} opacity="0.8" style={{ fontFamily: 'serif', userSelect: 'none' }}>
                {sign.glyph}
              </text>
            </g>
          );
        })}

        {/* Inner circle background */}
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="#08060f" />
        <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="0.5" />

        {/* Planet track ring — Person A */}
        <circle cx={CX} cy={CY} r={R_PLANET + 10} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={R_PLANET - 10} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        {/* Planet track ring — Person B (synastry inner) */}
        {isSynastry && (
          <>
            <circle cx={CX} cy={CY} r={R_PLANET_B + 8} fill="none" stroke={`${SYNASTRY_COLOR}18`} strokeWidth="0.5" />
            <circle cx={CX} cy={CY} r={R_PLANET_B - 8} fill="none" stroke={`${SYNASTRY_COLOR}18`} strokeWidth="0.5" />
          </>
        )}

        {/* Aspect lines */}
        {aspects.map((asp) => {
          const pa = adjusted.find((p) => p.key === asp.a);
          const pb = adjusted.find((p) => p.key === asp.b);
          if (!pa || !pb) return null;
          const aXY = lonToXY(pa.adjLon, R_ASPECT);
          const bXY = lonToXY(pb.adjLon, R_ASPECT);
          const isHovered = hoveredAspect === `${asp.a}-${asp.b}` || hoveredPlanet === asp.a || hoveredPlanet === asp.b;
          return (
            <line key={`${asp.a}-${asp.b}`}
              x1={aXY.x} y1={aXY.y} x2={bXY.x} y2={bXY.y}
              stroke={asp.color}
              strokeWidth={isHovered ? asp.width * 2.5 : asp.width * 0.6}
              strokeDasharray={asp.style === 'dashed' ? '4 3' : undefined}
              opacity={isHovered ? 0.9 : 0.25}
              style={{ transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredAspect(`${asp.a}-${asp.b}`)}
              onMouseLeave={() => setHoveredAspect(null)}
            />
          );
        })}

        {/* Cross-aspect lines (synastry: A↔B) */}
        {isSynastry && crossAspects.map((asp) => {
          const pA = adjusted.find((p) => p.key === asp.a);
          const pBKey = asp.b.replace('B_', '');
          const pB = adjustedB.find((p) => p.key === pBKey);
          if (!pA || !pB) return null;
          const aXY = lonToXY(pA.adjLon, R_ASPECT_X);
          const bXY = lonToXY(pB.adjLon, R_ASPECT_X);
          const isHov = hoveredAspect === `${asp.a}-${asp.b}`;
          return (
            <line key={`x-${asp.a}-${asp.b}`}
              x1={aXY.x} y1={aXY.y} x2={bXY.x} y2={bXY.y}
              stroke={SYNASTRY_COLOR}
              strokeWidth={isHov ? 2 : 0.7}
              strokeDasharray={asp.style === 'dashed' ? '3 3' : undefined}
              opacity={isHov ? 0.9 : 0.3}
              style={{ transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredAspect(`${asp.a}-${asp.b}`)}
              onMouseLeave={() => setHoveredAspect(null)}
            />
          );
        })}

        {/* Person B planets (synastry inner ring) */}
        {isSynastry && adjustedB.map((planet) => {
          const pos = lonToXY(planet.adjLon, R_PLANET_B);
          const sym = PLANET_SYMBOL[planet.key] ?? '●';
          const color = SYNASTRY_COLOR;
          const isHov = hoveredPlanet === `B_${planet.key}`;
          return (
            <g key={`B_${planet.key}`}
              onMouseEnter={() => setHoveredPlanet(`B_${planet.key}`)}
              onMouseLeave={() => setHoveredPlanet(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={pos.x} cy={pos.y} r={isHov ? 10 : 8}
                fill={`${color}15`} stroke={`${color}40`}
                strokeWidth={isHov ? 1.5 : 0.5}
                style={{ transition: 'all 0.2s' }}
              />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="10"
                fill={color} opacity={isHov ? 1 : 0.7}
                style={{ fontFamily: 'serif', userSelect: 'none' }}>
                {sym}
              </text>
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={CX} cy={CY} r="3" fill="#d4af3760" stroke="#d4af37" strokeWidth="0.5" />

        {/* Planet symbols */}
        {adjusted.map((planet) => {
          const pos = lonToXY(planet.adjLon, R_PLANET);
          const sym = PLANET_SYMBOL[planet.key] ?? '●';
          const color = PLANET_COLOR[planet.key] ?? '#a09a8e';
          const isHovered = hoveredPlanet === planet.key;
          const isInAspect = hoveredAspect?.includes(planet.key);
          return (
            <g key={planet.key}
              onMouseEnter={() => setHoveredPlanet(planet.key)}
              onMouseLeave={() => setHoveredPlanet(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Halo */}
              <circle cx={pos.x} cy={pos.y} r={isHovered ? 12 : 9}
                fill={`${color}18`} stroke={`${color}50`}
                strokeWidth={isHovered || isInAspect ? 1.5 : 0.5}
                style={{ transition: 'all 0.2s' }}
              />
              {/* Tick line to ring */}
              {(() => {
                const outer = lonToXY(planet.adjLon, R_SIGN_IN - 4);
                return <line x1={pos.x} y1={pos.y} x2={outer.x} y2={outer.y} stroke={`${color}30`} strokeWidth="0.5" />;
              })()}
              {/* Symbol */}
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="12"
                fill={color} opacity={isHovered ? 1 : 0.85}
                style={{ fontFamily: 'serif', userSelect: 'none', transition: 'opacity 0.2s' }}>
                {sym}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Synastry legend */}
      {isSynastry && (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11 }}>
          <span style={{ color: '#a09a8e' }}><span style={{ color: PLANET_COLOR['sun'] }}>●</span> {labelA ?? 'Person A'}</span>
          <span style={{ color: '#a09a8e' }}><span style={{ color: SYNASTRY_COLOR }}>●</span> {labelB ?? 'Person B'}</span>
        </div>
      )}

      {/* Hover tooltip */}
      <div style={{ minHeight: 40, textAlign: 'center' }}>
        {hoveredPlanet && (() => {
          const p = planets.find((pl) => pl.key === hoveredPlanet);
          if (!p) return null;
          const color = PLANET_COLOR[hoveredPlanet] ?? '#a09a8e';
          const pAspects = aspects.filter((a) => a.a === hoveredPlanet || a.b === hoveredPlanet);
          return (
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'Cormorant Garamond', serif" }}>
                {PLANET_SYMBOL[hoveredPlanet]} {hoveredPlanet.charAt(0).toUpperCase() + hoveredPlanet.slice(1)}
              </span>
              <span style={{ fontSize: 11, color: '#a09a8e', marginLeft: 6 }}>
                {p.signDe ?? ''} {p.degreeInSign !== undefined ? `${p.degreeInSign.toFixed(1)}°` : ''}
              </span>
              {pAspects.length > 0 && (
                <div style={{ fontSize: 10, color: '#7a7468', marginTop: 2 }}>
                  {pAspects.slice(0, 3).map((a) => (
                    <span key={`${a.a}-${a.b}`} style={{ marginRight: 8, color: a.color }}>
                      {a.name} mit {a.a === hoveredPlanet ? a.b : a.a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        {hoveredAspect && !hoveredPlanet && (() => {
          const asp = aspects.find((a) => `${a.a}-${a.b}` === hoveredAspect);
          if (!asp) return null;
          return (
            <span style={{ fontSize: 12, color: asp.color }}>
              {asp.name}: {asp.a} — {asp.b}
            </span>
          );
        })()}
      </div>

      {/* Scale */}
      <style>{`@media (prefers-reduced-motion: reduce) { svg * { transition: none !important; } }`}</style>
    </div>
  );
}
