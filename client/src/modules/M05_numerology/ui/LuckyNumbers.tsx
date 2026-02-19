import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality, calcBirthday, reduceToNumber } from '../lib/calc';

const NUM_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#38bdf8', 3: '#fbbf24', 4: '#a16207',
  5: '#22d3ee', 6: '#22c55e', 7: '#7c3aed', 8: '#d4af37', 9: '#c026d3',
};
const NUM_MEANINGS: Record<number, string> = {
  1: 'Neubeginn & Führung', 2: 'Balance & Partnerschaft', 3: 'Kreativität & Freude',
  4: 'Stabilität & Aufbau', 5: 'Freiheit & Wandel', 6: 'Harmonie & Fürsorge',
  7: 'Weisheit & Reflexion', 8: 'Fülle & Erfolg', 9: 'Vollendung & Liebe',
};

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

function toBase(n: number): number {
  if (n <= 9) return n;
  if (n === 11 || n === 22 || n === 33) return n % 9 || 9;
  return reduceToNumber(n);
}

interface LuckyNumbersProps { name: string; birthDate: string; }

export function LuckyNumbers({ name, birthDate }: LuckyNumbersProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;
  const pe = calcPersonality(name).value;
  const bd = calcBirthday(birthDate) % 9 || 9;
  const py = personalYear(birthDate);

  const sources = [
    { label: 'LP', value: lp, weight: 3 },
    { label: 'EX', value: ex, weight: 2 },
    { label: 'SU', value: su, weight: 2 },
    { label: 'PE', value: pe, weight: 1 },
    { label: 'BD', value: bd, weight: 1 },
    { label: 'PJ', value: py, weight: 2 },
  ];

  // Build weighted frequency map
  const freq = new Map<number, number>();
  sources.forEach(({ value, weight }) => {
    const base = toBase(value);
    freq.set(base, (freq.get(base) ?? 0) + weight);
  });

  // Sort by weight descending, take top 5
  const lucky = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n);

  // Also compute "power number" (sum of all cores)
  const allSum = sources.reduce((acc, { value }) => acc + toBase(value), 0);
  const powerNum = reduceToNumber(allSum);

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Aus LP + EX + SU + PE + BD + PJ berechnet
      </div>

      {/* Lucky numbers grid */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {lucky.map((n, i) => {
          const color = NUM_COLORS[n] ?? '#a09a8e';
          const size = i === 0 ? 52 : i === 1 ? 44 : 38;
          return (
            <div key={n} style={{
              width: size, height: size, borderRadius: '50%',
              background: `${color}12`, border: `${i === 0 ? 2 : 1.5}px solid ${color}${i === 0 ? '60' : '35'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: i === 0 ? 22 : i === 1 ? 18 : 15, fontWeight: 700, color }}>{n}</span>
            </div>
          );
        })}
      </div>

      {/* Meanings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {lucky.slice(0, 3).map((n) => {
          const color = NUM_COLORS[n] ?? '#a09a8e';
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color, width: 20, textAlign: 'center', flexShrink: 0 }}>{n}</div>
              <div style={{ fontSize: 10, color: '#5a5448' }}>{NUM_MEANINGS[n] ?? '—'}</div>
            </div>
          );
        })}
      </div>

      {/* Power number */}
      <div style={{ textAlign: 'center', padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ fontSize: 8, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Seelen-Kraftzahl</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: '#d4af37', lineHeight: 1 }}>{powerNum}</div>
        <div style={{ fontSize: 9, color: '#5a5448', marginTop: 2 }}>{NUM_MEANINGS[powerNum] ?? '—'}</div>
      </div>
    </div>
  );
}
