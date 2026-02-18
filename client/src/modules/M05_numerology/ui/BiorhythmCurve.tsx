// Biorhythm: Physical (23d), Emotional (28d), Intellectual (33d)
// Pure SVG — no deps.

const W = 320, H = 160, PAD_L = 36, PAD_R = 8, PAD_T = 12, PAD_B = 24;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;
const CX = PAD_L, CY = PAD_T + INNER_H / 2;

const CYCLES = [
  { key: 'physical',      label: 'Körper',    period: 23, color: '#ef4444' },
  { key: 'emotional',     label: 'Emotion',   period: 28, color: '#c084fc' },
  { key: 'intellectual',  label: 'Geist',     period: 33, color: '#38bdf8' },
];

const WINDOW = 32; // days shown: -4 to +28 around today
const TODAY_OFFSET = 4; // today is 4 days from left edge

function daysSinceBirth(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  return Math.floor((now.getTime() - birth.getTime()) / 86400000);
}

function bioValue(daysSince: number, period: number): number {
  return Math.sin((2 * Math.PI * daysSince) / period);
}

function toSvgX(dayIdx: number): number {
  return CX + (dayIdx / (WINDOW - 1)) * INNER_W;
}

function toSvgY(value: number): number {
  return CY - value * (INNER_H / 2) * 0.85;
}

function makePath(daySince0: number, period: number): string {
  const pts: string[] = [];
  for (let i = 0; i < WINDOW; i++) {
    const val = bioValue(daySince0 + i, period);
    const x = toSvgX(i).toFixed(1);
    const y = toSvgY(val).toFixed(1);
    pts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  return pts.join(' ');
}

interface BiorhythmCurveProps {
  birthDate: string;
}

export function BiorhythmCurve({ birthDate }: BiorhythmCurveProps) {
  const dayBase = daysSinceBirth(birthDate) - TODAY_OFFSET;
  const todayX = toSvgX(TODAY_OFFSET);

  // today's values
  const todayDays = dayBase + TODAY_OFFSET;
  const todayVals = CYCLES.map((c) => ({
    ...c,
    val: bioValue(todayDays, c.period),
  }));

  // Day labels (only show a few)
  const labelDays = [-3, 0, 7, 14, 21, 27];

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
        32-Tage-Verlauf · Heute markiert
      </div>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%' }}>
        {/* Gridlines */}
        <line x1={CX} y1={PAD_T} x2={CX + INNER_W} y2={PAD_T} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1={CX} y1={CY} x2={CX + INNER_W} y2={CY} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1={CX} y1={PAD_T + INNER_H} x2={CX + INNER_W} y2={PAD_T + INNER_H} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        {/* +/- labels */}
        <text x={CX - 4} y={PAD_T + 4} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.2)">+</text>
        <text x={CX - 4} y={CY + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.2)">0</text>
        <text x={CX - 4} y={PAD_T + INNER_H + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.2)">−</text>

        {/* Cycle curves */}
        {CYCLES.map((c) => (
          <path key={c.key}
            d={makePath(dayBase, c.period)}
            fill="none"
            stroke={c.color}
            strokeWidth="1.5"
            opacity="0.7"
            strokeLinejoin="round"
          />
        ))}

        {/* Today line */}
        <line x1={todayX} y1={PAD_T} x2={todayX} y2={PAD_T + INNER_H}
          stroke="#d4af37" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />

        {/* Today dots */}
        {todayVals.map((c) => (
          <circle key={c.key}
            cx={todayX} cy={toSvgY(c.val)}
            r="3.5" fill={c.color} opacity="0.9"
            stroke="#08060f" strokeWidth="1"
          />
        ))}

        {/* Day labels */}
        {labelDays.map((offset) => {
          const dayIdx = offset + TODAY_OFFSET;
          if (dayIdx < 0 || dayIdx >= WINDOW) return null;
          const x = toSvgX(dayIdx);
          const label = offset === 0 ? 'Heute' : offset > 0 ? `+${offset}` : String(offset);
          return (
            <text key={offset} x={x} y={H - 4}
              textAnchor="middle" fontSize="8"
              fill={offset === 0 ? '#d4af37' : 'rgba(255,255,255,0.25)'}>
              {label}
            </text>
          );
        })}
      </svg>

      {/* Today's values */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
        {todayVals.map((c) => {
          const pct = Math.round((c.val + 1) * 50);
          const positive = c.val >= 0;
          return (
            <div key={c.key} style={{ textAlign: 'center', padding: '6px 10px', borderRadius: 8, background: `${c.color}0e`, border: `1px solid ${c.color}28`, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.color, fontFamily: "'Cormorant Garamond', serif" }}>{pct}%</div>
              <div style={{ fontSize: 9, color: '#7a7468' }}>{c.label}</div>
              <div style={{ fontSize: 9, color: positive ? '#34d399' : '#f87171', marginTop: 1 }}>{positive ? '↑' : '↓'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
