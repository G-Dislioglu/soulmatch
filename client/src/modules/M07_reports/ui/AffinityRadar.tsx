// Pure SVG hexagonal radar chart for match compatibility dimensions.

const CX = 120, CY = 120, R = 88;
const W = 240, H = 240;
const GOLD = '#d4af37';

function toRad(deg: number): number { return (deg * Math.PI) / 180; }

function axisPoint(angle: number, r: number): { x: number; y: number } {
  return {
    x: CX + r * Math.cos(toRad(angle - 90)),
    y: CY + r * Math.sin(toRad(angle - 90)),
  };
}

function polygonPath(values: number[]): string {
  const axes = values.map((v, i) => {
    const angle = (360 / values.length) * i - 90;
    const r = (v / 100) * R;
    return `${CX + r * Math.cos(toRad(angle))},${CY + r * Math.sin(toRad(angle))}`;
  });
  return axes.join(' ');
}

interface Axis { label: string; value: number; color: string; }

interface AffinityRadarProps {
  axes: Axis[];
  accentColor?: string;
  overall?: number;
}

export function AffinityRadar({ axes, accentColor = GOLD, overall }: AffinityRadarProps) {
  const n = axes.length;
  const angleStep = 360 / n;

  // Web rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Background */}
        <circle cx={CX} cy={CY} r={R + 12} fill="#08060f" />

        {/* Concentric rings */}
        {rings.map((pct) => {
          const rr = (pct / 100) * R;
          const pts = Array.from({ length: n }, (_, i) => {
            const p = axisPoint(angleStep * i, rr);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <polygon key={pct} points={pts}
              fill="none"
              stroke={pct === 100 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}
              strokeWidth="0.5"
            />
          );
        })}

        {/* Axis spokes */}
        {axes.map((_, i) => {
          const outer = axisPoint(angleStep * i, R);
          return (
            <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          );
        })}

        {/* Filled area */}
        <polygon
          points={polygonPath(axes.map((a) => a.value))}
          fill={`${accentColor}18`}
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Axis dots */}
        {axes.map((axis, i) => {
          const pos = axisPoint(angleStep * i, (axis.value / 100) * R);
          return (
            <circle key={i} cx={pos.x} cy={pos.y} r="3.5"
              fill={axis.color} stroke="#08060f" strokeWidth="1"
              opacity="0.9"
            />
          );
        })}

        {/* Center point */}
        <circle cx={CX} cy={CY} r="4" fill={`${accentColor}40`} stroke={accentColor} strokeWidth="0.5" />

        {/* Overall score in center */}
        {overall !== undefined && (
          <>
            <text x={CX} y={CY - 5} textAnchor="middle" fontSize="18"
              fontWeight="700" fill={accentColor}
              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {overall}%
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize="7"
              fill="rgba(255,255,255,0.3)" style={{ letterSpacing: '0.06em' }}>
              GESAMT
            </text>
          </>
        )}

        {/* Axis labels */}
        {axes.map((axis, i) => {
          const angle = angleStep * i - 90;
          const labelR = R + 18;
          const lx = CX + labelR * Math.cos(toRad(angle));
          const ly = CY + labelR * Math.sin(toRad(angle));
          const anchor = lx < CX - 4 ? 'end' : lx > CX + 4 ? 'start' : 'middle';
          return (
            <g key={i}>
              <text x={lx} y={ly - 3} textAnchor={anchor} fontSize="9"
                fontWeight="600" fill={axis.color} opacity="0.85">
                {axis.label}
              </text>
              <text x={lx} y={ly + 7} textAnchor={anchor} fontSize="8"
                fill="rgba(255,255,255,0.35)">
                {axis.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
