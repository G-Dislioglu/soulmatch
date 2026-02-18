import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality, reduceToNumber } from '../lib/calc';

// ── Chakra definitions ────────────────────────────────────────────────────────

interface ChakraDef {
  id: string;
  name: string;
  sanskrit: string;
  color: string;
  numbers: number[];
  element: string;
  keyword: string;
}

const CHAKRAS: ChakraDef[] = [
  { id: 'root',    name: 'Wurzel',       sanskrit: 'Muladhara',    color: '#ef4444', numbers: [1,4,8],    element: 'Erde',   keyword: 'Sicherheit' },
  { id: 'sacral',  name: 'Sakral',       sanskrit: 'Svadhisthana', color: '#f97316', numbers: [2,5],      element: 'Wasser', keyword: 'Kreativität' },
  { id: 'solar',   name: 'Solarplexus',  sanskrit: 'Manipura',     color: '#eab308', numbers: [3,6,8],    element: 'Feuer',  keyword: 'Willenskraft' },
  { id: 'heart',   name: 'Herz',         sanskrit: 'Anahata',      color: '#22c55e', numbers: [2,6,9],    element: 'Luft',   keyword: 'Liebe' },
  { id: 'throat',  name: 'Hals',         sanskrit: 'Vishuddha',    color: '#38bdf8', numbers: [3,5,7],    element: 'Äther',  keyword: 'Ausdruck' },
  { id: 'third',   name: 'Stirn',        sanskrit: 'Ajna',         color: '#818cf8', numbers: [7,11],     element: 'Licht',  keyword: 'Intuition' },
  { id: 'crown',   name: 'Krone',        sanskrit: 'Sahasrara',    color: '#c084fc', numbers: [9,22,33],  element: 'Bewusstsein', keyword: 'Erleuchtung' },
];

// ── Calculation ───────────────────────────────────────────────────────────────

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const mm = parts[1] ?? '01';
  const dd = parts[2] ?? '01';
  const digits = `${now.getFullYear()}${mm}${dd}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

function deriveChakraScores(name: string, birthDate: string): Record<string, number> {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;
  const pe = calcPersonality(name).value;
  const py = personalYear(birthDate);
  const nums = [lp, ex, su, pe, py];

  const scores: Record<string, number> = {};
  for (const chakra of CHAKRAS) {
    let score = 20; // base
    for (const n of nums) {
      if (chakra.numbers.includes(n)) score += 16;
    }
    // Master number bonus
    const hasMaster = nums.some((v) => [11, 22, 33].includes(v));
    if (hasMaster && chakra.numbers.some((cn) => [11, 22, 33].includes(cn))) score += 10;
    scores[chakra.id] = Math.min(100, score);
  }
  return scores;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ChakraBarProps {
  name: string;
  birthDate: string;
}

export function ChakraBar({ name, birthDate }: ChakraBarProps) {
  const scores = deriveChakraScores(name, birthDate);

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>
        Energieresonanz · Pythagorean System
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {CHAKRAS.map((chakra) => {
          const score = scores[chakra.id] ?? 0;
          const active = score >= 52;
          return (
            <div key={chakra.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Chakra dot */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: active ? chakra.color : `${chakra.color}40`,
                boxShadow: active ? `0 0 6px ${chakra.color}80` : 'none',
                transition: 'all 0.4s',
              }} />
              {/* Label */}
              <div style={{ width: 72, flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? '#f0eadc' : '#6a6458' }}>{chakra.name}</div>
                <div style={{ fontSize: 9, color: '#4a4540', lineHeight: 1 }}>{chakra.keyword}</div>
              </div>
              {/* Bar */}
              <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: `linear-gradient(90deg, ${chakra.color}99, ${chakra.color})`,
                  width: `${score}%`,
                  transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: score > 60 ? `0 0 4px ${chakra.color}60` : 'none',
                }} />
              </div>
              {/* Percent */}
              <div style={{ width: 28, fontSize: 10, textAlign: 'right', color: active ? chakra.color : '#4a4540', fontWeight: active ? 600 : 400 }}>
                {score}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Most active chakra */}
      {(() => {
        const top = CHAKRAS.reduce((a, b) => (scores[a.id] ?? 0) > (scores[b.id] ?? 0) ? a : b);
        return (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: `${top.color}0e`, border: `1px solid ${top.color}28`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: top.color, boxShadow: `0 0 6px ${top.color}` }} />
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: top.color }}>{top.name} · {top.sanskrit}</span>
              <span style={{ fontSize: 10, color: '#7a7468', marginLeft: 6 }}>Stärkstes Energiezentrum · {top.element}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
