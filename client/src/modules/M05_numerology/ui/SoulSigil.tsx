import { calcLifePath, calcExpression, calcSoulUrge } from '../lib/calc';

const W = 200, CX = 100, CY = 100, R = 75;
const GOLD = '#d4af37';

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function numToPoints(nums: number[]): { x: number; y: number }[] {
  return nums.map((n) => {
    const angle = ((n - 1) / 9) * 360 - 90;
    return { x: CX + R * Math.cos(toRad(angle)), y: CY + R * Math.sin(toRad(angle)) };
  });
}

function pathFromPoints(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  return `M ${pts[0]!.x} ${pts[0]!.y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ') + ' Z';
}

interface SoulSigilProps { name: string; birthDate: string; }

export function SoulSigil({ name, birthDate }: SoulSigilProps) {
  const lp = calcLifePath(birthDate).value;
  const su = calcSoulUrge(name).value;
  const ex = calcExpression(name).value;

  // Create digit sequences for sigil lines
  // LP: draw path through its digit sequence
  const lpDigits = String(lp).split('').map(Number).filter((n) => n > 0);
  const suDigits = String(su).split('').map(Number).filter((n) => n > 0);

  // Add connections between LP, SU, EX values
  const corePoints = numToPoints([lp > 9 ? lp % 9 || 9 : lp, su > 9 ? su % 9 || 9 : su, ex > 9 ? ex % 9 || 9 : ex]);
  const lpPoints = numToPoints(lpDigits.map((d) => d === 0 ? 9 : d));
  const suPoints = numToPoints(suDigits.map((d) => d === 0 ? 9 : d));

  // Circle positions (1-9 around the circle)
  const circlePositions = Array.from({ length: 9 }, (_, i) => {
    const angle = (i / 9) * 360 - 90;
    return { x: CX + R * Math.cos(toRad(angle)), y: CY + R * Math.sin(toRad(angle)), n: i + 1 };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`} style={{ filter: `drop-shadow(0 0 12px ${GOLD}30)` }}>
        <defs>
          <radialGradient id="sigilBg" cx="50%" cy="50%">
            <stop offset="0%" stopColor={`${GOLD}08`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Background */}
        <circle cx={CX} cy={CY} r={R + 5} fill="url(#sigilBg)" />

        {/* Outer circle */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={`${GOLD}20`} strokeWidth="0.5" />
        <circle cx={CX} cy={CY} r={R * 0.5} fill="none" stroke={`${GOLD}10`} strokeWidth="0.5" />

        {/* Number positions */}
        {circlePositions.map(({ x, y, n }) => (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fill={`${GOLD}40`} fontFamily="Cormorant Garamond, serif" fontWeight="600">
            {n}
          </text>
        ))}

        {/* Core triangle LP–SU–EX */}
        {corePoints.length >= 3 && (
          <polygon
            points={corePoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={`${GOLD}08`}
            stroke={GOLD}
            strokeWidth="1"
            strokeOpacity="0.6"
          />
        )}

        {/* LP path */}
        {lpPoints.length >= 2 && (
          <path d={pathFromPoints(lpPoints)} fill="none" stroke="#c084fc" strokeWidth="0.8" strokeOpacity="0.5" strokeLinejoin="round" />
        )}

        {/* SU path */}
        {suPoints.length >= 2 && (
          <path d={pathFromPoints(suPoints)} fill="none" stroke="#f472b6" strokeWidth="0.8" strokeOpacity="0.5" strokeLinejoin="round" />
        )}

        {/* Core number dots with glow */}
        {corePoints.map((p, i) => {
          const colors = [GOLD, '#c084fc', '#38bdf8'];
          const c = colors[i] ?? GOLD;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill={c} fillOpacity="0.15" />
              <circle cx={p.x} cy={p.y} r="3" fill={c} />
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={CX} cy={CY} r="4" fill={GOLD} fillOpacity="0.4" />
        <circle cx={CX} cy={CY} r="1.5" fill={GOLD} />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {[{ label: `LP ${lp}`, color: GOLD }, { label: `SU ${su}`, color: '#c084fc' }, { label: `EX ${ex}`, color: '#38bdf8' }].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 9, color: '#5a5448' }}>{label}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 10, color: '#4a4540', textAlign: 'center', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
        Dein persönliches Seelen-Sigil — einzigartig wie deine Zahlen
      </p>
    </div>
  );
}
