import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality } from '../lib/calc';

const SEGMENT_COLORS: Record<string, string> = {
  LP: '#ef4444', EX: '#fbbf24', SU: '#818cf8', PE: '#22c55e',
};

const AREAS = [
  { key: 'Liebe', color: '#f472b6' },
  { key: 'Karriere', color: '#d4af37' },
  { key: 'Gesundheit', color: '#22c55e' },
  { key: 'Finanzen', color: '#fbbf24' },
  { key: 'Spiritualität', color: '#c084fc' },
  { key: 'Familie', color: '#38bdf8' },
  { key: 'Kreativität', color: '#f97316' },
  { key: 'Persönlichkeit', color: '#818cf8' },
];

function getScore(num: number, areaIdx: number): number {
  const base = ((num + areaIdx * 3) % 9) + 1;
  return Math.round(50 + base * 5);
}

interface LifeWheelProps { name: string; birthDate: string; }

export function LifeWheel({ name, birthDate }: LifeWheelProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;
  const pe = calcPersonality(name).value;

  const coreNums = [
    { label: 'LP', val: lp, color: SEGMENT_COLORS['LP']! },
    { label: 'EX', val: ex, color: SEGMENT_COLORS['EX']! },
    { label: 'SU', val: su, color: SEGMENT_COLORS['SU']! },
    { label: 'PE', val: pe, color: SEGMENT_COLORS['PE']! },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Lebens-Rad</div>
        <div style={{ fontSize: 9, color: '#3a3530' }}>LP {lp} · EX {ex} · SU {su} · PE {pe}</div>
      </div>

      {/* Core numbers strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 14 }}>
        {coreNums.map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}30` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'Cormorant Garamond', serif" }}>{val}</div>
            <div style={{ fontSize: 7, color, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Life areas wheel bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {AREAS.map(({ key, color }, idx) => {
          const score = getScore(lp + ex, idx);
          const scoreB = getScore(su + pe, idx);
          const avg = Math.round((score + scoreB) / 2);
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ fontSize: 8, color, minWidth: 72, textAlign: 'right' }}>{key}</div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${avg}%`, background: `linear-gradient(90deg, ${color}60, ${color})`, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 7, color: '#3a3530', minWidth: 26 }}>{avg}%</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        Basiert auf LP, EX, SU & PE — zeigt numerologische Tendenzen je Lebensbereich
      </div>
    </div>
  );
}
