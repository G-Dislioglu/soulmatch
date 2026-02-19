import { calcLifePath, calcExpression, calcSoulUrge, reduceToNumber } from '../lib/calc';

function calcPersonalYear(birthDate: string): { value: number } {
  const parts = birthDate.split('-');
  const mm = parseInt(parts[1] ?? '0', 10);
  const dd = parseInt(parts[2] ?? '0', 10);
  const cy = new Date().getFullYear();
  const value = reduceToNumber(mm + dd + Math.floor(cy / 1000) + Math.floor((cy % 1000) / 100) + Math.floor((cy % 100) / 10) + (cy % 10)) || 9;
  return { value };
}

const WHEEL_SEGMENTS = [
  { num: 1, label: 'Pionier', color: '#ef4444', angle: 0 },
  { num: 2, label: 'Diplomat', color: '#38bdf8', angle: 40 },
  { num: 3, label: 'Künstler', color: '#fbbf24', angle: 80 },
  { num: 4, label: 'Baumeister', color: '#a16207', angle: 120 },
  { num: 5, label: 'Freigeist', color: '#22d3ee', angle: 160 },
  { num: 6, label: 'Heiler', color: '#22c55e', angle: 200 },
  { num: 7, label: 'Mystiker', color: '#7c3aed', angle: 240 },
  { num: 8, label: 'Lenker', color: '#d4af37', angle: 280 },
  { num: 9, label: 'Weiser', color: '#c026d3', angle: 320 },
];

function getSegment(n: number) {
  const reduced = ((n - 1) % 9) + 1;
  return WHEEL_SEGMENTS.find(s => s.num === reduced) ?? WHEEL_SEGMENTS[0]!;
}

interface SoulPathWheelProps { name: string; birthDate: string; }

export function SoulPathWheel({ name, birthDate }: SoulPathWheelProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;
  const py = calcPersonalYear(birthDate).value;
  const GOLD = '#d4af37';

  const lpSeg = getSegment(lp);
  const exSeg = getSegment(ex);
  const suSeg = getSegment(su);
  const pySeg = getSegment(py);

  const numbers = [
    { key: 'LP', val: lp, seg: lpSeg, label: 'Lebenspfad', desc: 'Deine Hauptmission im Leben' },
    { key: 'EX', val: ex, seg: exSeg, label: 'Ausdruck', desc: 'Wie du dich zeigst' },
    { key: 'SU', val: su, seg: suSeg, label: 'Seelenimpuls', desc: 'Was deine Seele begehrt' },
    { key: 'PY', val: py, seg: pySeg, label: 'Persönl. Jahr', desc: 'Energie des aktuellen Jahres' },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Seelenpfad-Kreis</div>
        {/* Visual wheel representation */}
        <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 10px' }}>
          {/* Background circle */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }} />
          {/* Outer ring segments as colored arcs */}
          {WHEEL_SEGMENTS.map(seg => {
            const isActive = [lpSeg.num, exSeg.num, suSeg.num, pySeg.num].includes(seg.num);
            const rad = (seg.angle - 90) * (Math.PI / 180);
            const r = 44;
            const cx = 55 + r * Math.cos(rad);
            const cy = 55 + r * Math.sin(rad);
            return (
              <div key={seg.num} style={{ position: 'absolute', left: cx - 8, top: cy - 8, width: 16, height: 16, borderRadius: '50%', background: isActive ? seg.color : `${seg.color}30`, border: `1.5px solid ${isActive ? seg.color : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isActive ? `0 0 8px ${seg.color}60` : 'none', transition: 'all 0.3s' }}>
                <span style={{ fontSize: 6, color: isActive ? '#fff' : seg.color, fontWeight: 700 }}>{seg.num}</span>
              </div>
            );
          })}
          {/* Center indicator */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: `${lpSeg.color}20`, border: `2px solid ${lpSeg.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${lpSeg.color}40` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: lpSeg.color }}>{lp}</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: lpSeg.color, fontStyle: 'italic' }}>{lpSeg.label}</div>
      </div>

      {/* Number details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {numbers.map(({ key, val, seg, label, desc }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: `${seg.color}07`, border: `1px solid ${seg.color}20` }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${seg.color}20`, border: `1.5px solid ${seg.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: seg.color }}>{val}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: seg.color }}>{seg.label}</span>
                <span style={{ fontSize: 7, color: '#3a3530' }}>{key} · {label}</span>
              </div>
              <div style={{ fontSize: 8, color: '#5a5448' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, padding: '7px 11px', borderRadius: 8, background: `${GOLD}07`, border: `1px solid ${GOLD}18`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.5 }}>
          Dein Kreis aus Zahlen erzählt die Geschichte deiner Seele — von der Mission bis zum Ruf des Herzens.
        </p>
      </div>
    </div>
  );
}
