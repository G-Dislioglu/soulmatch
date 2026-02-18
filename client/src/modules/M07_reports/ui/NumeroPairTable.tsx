import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality, reduceToNumber } from '../../M05_numerology/lib/calc';

interface Profile { name: string; birthDate: string; }

const GOLD = '#d4af37';
const MASTER = new Set([11, 22, 33]);

function personalYear(bd: string): number {
  const now = new Date();
  const parts = bd.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

interface Row {
  label: string;
  sublabel: string;
  valA: number;
  valB: number;
  color: string;
}

function harmony(a: number, b: number): { score: number; label: string; color: string } {
  if (a === b) return { score: 100, label: 'Zwilling', color: '#a855f7' };
  const diff = Math.abs(a - b);
  if (diff === 0) return { score: 100, label: 'Zwilling', color: '#a855f7' };
  if ([1, 9].includes(diff)) return { score: 85, label: 'Harmonisch', color: '#22c55e' };
  if ([2, 7].includes(diff)) return { score: 72, label: 'Ergänzend', color: '#38bdf8' };
  if ([3, 6].includes(diff)) return { score: 60, label: 'Wachstum', color: GOLD };
  if ([4, 5].includes(diff)) return { score: 45, label: 'Spannung', color: '#f59e0b' };
  return { score: 35, label: 'Herausforderung', color: '#ef4444' };
}

interface NumeroPairTableProps {
  profileA: Profile;
  profileB: Profile;
}

export function NumeroPairTable({ profileA, profileB }: NumeroPairTableProps) {
  const aLP = calcLifePath(profileA.birthDate).value;
  const bLP = calcLifePath(profileB.birthDate).value;
  const aEX = calcExpression(profileA.name).value;
  const bEX = calcExpression(profileB.name).value;
  const aSU = calcSoulUrge(profileA.name).value;
  const bSU = calcSoulUrge(profileB.name).value;
  const aPE = calcPersonality(profileA.name).value;
  const bPE = calcPersonality(profileB.name).value;
  const aPY = personalYear(profileA.birthDate);
  const bPY = personalYear(profileB.birthDate);

  const rows: Row[] = [
    { label: 'Lebenspfad', sublabel: 'Kernmission der Seele', valA: aLP, valB: bLP, color: GOLD },
    { label: 'Seelendrang', sublabel: 'Innerstes Verlangen',  valA: aSU, valB: bSU, color: '#c084fc' },
    { label: 'Ausdruck',    sublabel: 'Bestimmung & Talent',  valA: aEX, valB: bEX, color: '#38bdf8' },
    { label: 'Persönlichkeit', sublabel: 'Äußere Wirkung',   valA: aPE, valB: bPE, color: '#34d399' },
    { label: 'Pers. Jahr',  sublabel: `${new Date().getFullYear()}`,  valA: aPY, valB: bPY, color: '#f472b6' },
  ];

  function fmt(n: number) {
    return MASTER.has(n) ? <span style={{ color: '#c084fc', fontWeight: 700 }}>{n}<sup style={{ fontSize: 7 }}>M</sup></span> : <span>{n}</span>;
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textAlign: 'center' }}>{profileA.name}</div>
        <div style={{ width: 60 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fb7185', textAlign: 'center' }}>{profileB.name}</div>
      </div>

      {/* Data rows */}
      {rows.map((row) => {
        const h = harmony(row.valA, row.valB);
        return (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, marginBottom: 7, alignItems: 'center' }}>
            {/* A value */}
            <div style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 9, background: `${GOLD}0e`, border: `1px solid ${GOLD}25` }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: GOLD }}>{fmt(row.valA)}</div>
            </div>

            {/* Center: label + harmony */}
            <div style={{ width: 70, textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: row.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</div>
              <div style={{ fontSize: 8, color: '#4a4540', marginTop: 1 }}>{row.sublabel}</div>
              <div style={{ marginTop: 4, fontSize: 8, padding: '2px 6px', borderRadius: 6, background: `${h.color}15`, color: h.color, border: `1px solid ${h.color}30`, display: 'inline-block' }}>
                {h.label}
              </div>
            </div>

            {/* B value */}
            <div style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 9, background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.18)' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#fb7185' }}>{fmt(row.valB)}</div>
            </div>
          </div>
        );
      })}

      {/* Overall harmony */}
      {(() => {
        const total = rows.reduce((s, r) => s + harmony(r.valA, r.valB).score, 0);
        const avg = Math.round(total / rows.length);
        const color = avg >= 75 ? '#22c55e' : avg >= 55 ? GOLD : '#f59e0b';
        return (
          <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 9, background: `${color}0a`, border: `1px dashed ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Numerologische Harmonie</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color }}>{avg}%</span>
          </div>
        );
      })()}
    </div>
  );
}
