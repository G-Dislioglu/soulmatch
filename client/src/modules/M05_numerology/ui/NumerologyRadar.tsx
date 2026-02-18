import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality, reduceToNumber } from '../lib/calc';

const W = 200, H = 200, CX = 100, CY = 100, R = 70;
const GOLD = '#d4af37';

function toRad(deg: number): number { return (deg * Math.PI) / 180; }

function polyPath(values: number[], max: number): string {
  const n = values.length;
  return values.map((v, i) => {
    const angle = (360 / n) * i - 90;
    const r = (Math.min(v, max) / max) * R;
    return `${CX + r * Math.cos(toRad(angle))},${CY + r * Math.sin(toRad(angle))}`;
  }).join(' ');
}

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

interface Axis { label: string; value: number; short: string; color: string; }

interface NumerologyRadarProps { name: string; birthDate: string; }

export function NumerologyRadar({ name, birthDate }: NumerologyRadarProps) {
  const lp  = calcLifePath(birthDate).value;
  const su  = calcSoulUrge(name).value;
  const ex  = calcExpression(name).value;
  const pe  = calcPersonality(name).value;
  const py  = personalYear(birthDate);

  const axes: Axis[] = [
    { label: 'Lebenspfad',    value: lp,  short: 'LP',  color: GOLD },
    { label: 'Seelendrang',   value: su,  short: 'SU',  color: '#c084fc' },
    { label: 'Ausdruck',      value: ex,  short: 'EX',  color: '#38bdf8' },
    { label: 'Persönlichkeit',value: pe,  short: 'PE',  color: '#34d399' },
    { label: 'Pers. Jahr',    value: py,  short: 'PJ',  color: '#f472b6' },
  ];

  const MAX = 11; // values 1-11 (master numbers capped)
  const n = axes.length;

  // Grid circles
  const gridLevels = [3, 6, 9, 11];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* SVG chart */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
        {/* Grid circles */}
        {gridLevels.map((lvl) => (
          <circle key={lvl} cx={CX} cy={CY} r={(lvl / MAX) * R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}

        {/* Axis lines + labels */}
        {axes.map((ax, i) => {
          const angle = (360 / n) * i - 90;
          const x2 = CX + R * Math.cos(toRad(angle));
          const y2 = CY + R * Math.sin(toRad(angle));
          const lx = CX + (R + 16) * Math.cos(toRad(angle));
          const ly = CY + (R + 16) * Math.sin(toRad(angle));
          return (
            <g key={i}>
              <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={ax.color} fontWeight="600">{ax.short}</text>
            </g>
          );
        })}

        {/* Filled polygon */}
        <polygon
          points={polyPath(axes.map((a) => a.value), MAX)}
          fill={`${GOLD}18`}
          stroke={GOLD}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Dots + value labels */}
        {axes.map((ax, i) => {
          const angle = (360 / n) * i - 90;
          const r = (Math.min(ax.value, MAX) / MAX) * R;
          const dx = CX + r * Math.cos(toRad(angle));
          const dy = CY + r * Math.sin(toRad(angle));
          return (
            <g key={i}>
              <circle cx={dx} cy={dy} r="3" fill={ax.color} stroke="#08060f" strokeWidth="1" />
              <text x={dx} y={dy - 6} textAnchor="middle" fontSize="7.5" fill={ax.color} fontWeight="700">{ax.value}</text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ flex: 1 }}>
        {axes.map((ax) => (
          <div key={ax.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ax.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6a6458' }}>{ax.label}</div>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: ax.color, minWidth: 22, textAlign: 'right' }}>{ax.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
