import { calcLifePath, calcExpression, calcSoulUrge } from '../../M05_numerology/lib/calc';

const AURA_COLORS: Record<number, { name: string; hex: string; quality: string; frequency: string }> = {
  1: { name: 'Rubinrot', hex: '#ef4444', quality: 'Willenskraft & Führung', frequency: '396 Hz' },
  2: { name: 'Silberblau', hex: '#93c5fd', quality: 'Intuition & Empathie', frequency: '417 Hz' },
  3: { name: 'Goldgelb', hex: '#fbbf24', quality: 'Kreativität & Freude', frequency: '528 Hz' },
  4: { name: 'Waldgrün', hex: '#86efac', quality: 'Stabilität & Vertrauen', frequency: '432 Hz' },
  5: { name: 'Türkis', hex: '#22d3ee', quality: 'Freiheit & Wandel', frequency: '639 Hz' },
  6: { name: 'Smaragd', hex: '#22c55e', quality: 'Liebe & Heilung', frequency: '741 Hz' },
  7: { name: 'Amethyst', hex: '#a78bfa', quality: 'Mystik & Weisheit', frequency: '852 Hz' },
  8: { name: 'Gold', hex: '#d4af37', quality: 'Macht & Manifestation', frequency: '963 Hz' },
  9: { name: 'Magenta', hex: '#e879f9', quality: 'Mitgefühl & Vollendung', frequency: '174 Hz' },
  11: { name: 'Perlweiß', hex: '#e2e8f0', quality: 'Erleuchtung & Vision', frequency: '528 Hz' },
  22: { name: 'Platin', hex: '#cbd5e1', quality: 'Meisterschaft & Aufbau', frequency: '963 Hz' },
  33: { name: 'Kristall', hex: '#f9a8d4', quality: 'Heilige Liebe', frequency: '528 Hz' },
};

const DEFAULT_AURA = { name: 'Weiß', hex: '#ffffff', quality: 'Reinheit', frequency: '432 Hz' };

const RESONANCE_DESC: Record<string, string> = {
  same: 'Eure Aurenfelder schwingen auf identischer Frequenz — eine seltene Gleichklang-Verbindung.',
  complement: 'Eure Aurenfelder ergänzen sich perfekt — sie tanzen miteinander, ohne zu verschmelzen.',
  blend: 'Eure Aurenfelder mischen sich zu einem einzigartigen Spektrum — harmonisch und reich.',
  contrast: 'Eure Aurenfelder erzeugen kreative Reibung — Funken, die Wachstum entfachen.',
};

interface AuraResonanceProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function AuraResonance({ nameA, birthDateA, nameB, birthDateB }: AuraResonanceProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;

  const aA = AURA_COLORS[lpA] ?? DEFAULT_AURA;
  const aB = AURA_COLORS[lpB] ?? DEFAULT_AURA;
  const eA = AURA_COLORS[exA] ?? DEFAULT_AURA;
  const eB = AURA_COLORS[exB] ?? DEFAULT_AURA;
  const sA = AURA_COLORS[suA] ?? DEFAULT_AURA;
  const sB = AURA_COLORS[suB] ?? DEFAULT_AURA;

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  let resonanceType: string;
  if (lpA === lpB) resonanceType = 'same';
  else if (Math.abs(lpA - lpB) === 4 || Math.abs(lpA - lpB) === 5) resonanceType = 'complement';
  else if (Math.abs(lpA - lpB) <= 2) resonanceType = 'blend';
  else resonanceType = 'contrast';

  const resonanceDesc = RESONANCE_DESC[resonanceType] ?? RESONANCE_DESC['blend']!;

  const layers = [
    { label: 'Lebenspfad', numA: lpA, numB: lpB, auraA: aA, auraB: aB },
    { label: 'Ausdruck', numA: exA, numB: exB, auraA: eA, auraB: eB },
    { label: 'Seelenimpuls', numA: suA, numB: suB, auraA: sA, auraB: sB },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Aura-Resonanz-Feld</div>
        {/* Aura visual */}
        <div style={{ position: 'relative', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Aura A */}
          <div style={{ position: 'absolute', left: '25%', transform: 'translateX(-50%)', width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${aA.hex}40 0%, ${aA.hex}10 60%, transparent 80%)`, border: `1px solid ${aA.hex}30` }} />
          {/* Aura B */}
          <div style={{ position: 'absolute', right: '25%', transform: 'translateX(50%)', width: 60, height: 60, borderRadius: '50%', background: `radial-gradient(circle, ${aB.hex}40 0%, ${aB.hex}10 60%, transparent 80%)`, border: `1px solid ${aB.hex}30` }} />
          {/* Names */}
          <div style={{ position: 'absolute', left: '15%', fontSize: 7, color: aA.hex, textAlign: 'center' }}>{firstA}<br />{aA.name}</div>
          <div style={{ position: 'absolute', right: '15%', fontSize: 7, color: aB.hex, textAlign: 'center' }}>{firstB}<br />{aB.name}</div>
          {/* Center overlap */}
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: `linear-gradient(135deg, ${aA.hex}60, ${aB.hex}60)`, zIndex: 1, boxShadow: `0 0 12px ${aA.hex}40, 0 0 12px ${aB.hex}40` }} />
        </div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.5 }}>{resonanceDesc}</p>
      </div>

      {/* Layer rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {layers.map(({ label, numA, numB, auraA, auraB }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: auraA.hex, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7, color: '#3a3530', marginBottom: 1 }}>{label}</div>
              <div style={{ fontSize: 8, color: auraA.hex }}>{auraA.name} ({numA}) · {auraA.quality}</div>
            </div>
            <span style={{ fontSize: 7, color: '#2a2520' }}>⟷</span>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 7, color: '#3a3530', marginBottom: 1 }}>{label}</div>
              <div style={{ fontSize: 8, color: auraB.hex }}>{auraB.name} ({numB}) · {auraB.quality}</div>
            </div>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: auraB.hex, flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* Frequencies */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <div style={{ fontSize: 8, color: aA.hex, padding: '2px 8px', borderRadius: 8, background: `${aA.hex}10` }}>{aA.frequency}</div>
        <span style={{ fontSize: 8, color: '#3a3530' }}>×</span>
        <div style={{ fontSize: 8, color: aB.hex, padding: '2px 8px', borderRadius: 8, background: `${aB.hex}10` }}>{aB.frequency}</div>
      </div>
    </div>
  );
}
