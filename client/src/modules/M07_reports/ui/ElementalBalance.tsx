import { calcLifePath, calcExpression } from '../../M05_numerology/lib/calc';

// Birth month → element (Western numerology mapping)
function getElement(lp: number): string {
  if ([1, 4, 7].includes(lp % 9 || 9)) return 'Feuer';
  if ([2, 5, 8].includes(lp % 9 || 9)) return 'Erde';
  if ([3, 6, 9].includes(lp % 9 || 9)) return 'Luft';
  return 'Wasser';
}

function getExElement(ex: number): string {
  if ([1, 5, 9].includes(ex % 9 || 9)) return 'Feuer';
  if ([2, 4, 8].includes(ex % 9 || 9)) return 'Erde';
  if ([3, 6].includes(ex % 9 || 9)) return 'Luft';
  return 'Wasser';
}

const ELEMENT_DATA: Record<string, { icon: string; color: string; quality: string }> = {
  'Feuer': { icon: '🔥', color: '#ef4444', quality: 'Leidenschaft, Energie, Inspiration' },
  'Erde':  { icon: '🌍', color: '#a16207', quality: 'Stabilität, Praktik, Ausdauer' },
  'Luft':  { icon: '🌬', color: '#38bdf8', quality: 'Intellekt, Kommunikation, Freiheit' },
  'Wasser':{ icon: '💧', color: '#7c3aed', quality: 'Intuition, Gefühl, Tiefe' },
};

const PAIR_COMPAT: Record<string, Record<string, { score: number; dynamic: string; advice: string }>> = {
  'Feuer': {
    'Feuer':  { score: 88, dynamic: 'Flamme trifft Flamme — intensiv, leidenschaftlich, manchmal brennend', advice: 'Nutzt eure gemeinsame Energie für große Projekte' },
    'Erde':   { score: 72, dynamic: 'Feuer braucht Erde als Boden — Stabilität trifft Antrieb', advice: 'Erde gibt dem Feuer Halt, Feuer gibt der Erde Wärme' },
    'Luft':   { score: 92, dynamic: 'Luft nährt das Feuer — Ideen entfachen Leidenschaft', advice: 'Eine natürliche, beflügelnde Verbindung' },
    'Wasser': { score: 65, dynamic: 'Wasser und Feuer — Spannung die heilt oder verletzt', advice: 'Lernt, die Energie des anderen zu respektieren' },
  },
  'Erde': {
    'Feuer':  { score: 72, dynamic: 'Feuer wärmt die Erde — Begeisterung trifft Beständigkeit', advice: 'Erde gibt dem Feuer Halt, Feuer gibt der Erde Wärme' },
    'Erde':   { score: 82, dynamic: 'Zwei Erden — solides Fundament und langfristige Beständigkeit', advice: 'Achtet darauf, gemeinsam auch zu wachsen' },
    'Luft':   { score: 70, dynamic: 'Luft über Erde — Ideen treffen Realismus', advice: 'Luft inspiriert, Erde verwirklicht — eine gute Kombination' },
    'Wasser': { score: 90, dynamic: 'Wasser nährt die Erde — tiefste Fürsorge und Wachstum', advice: 'Eine natürliche, nährende Verbindung' },
  },
  'Luft': {
    'Feuer':  { score: 92, dynamic: 'Luft nährt das Feuer — Ideen entfachen Leidenschaft', advice: 'Eine natürliche, beflügelnde Verbindung' },
    'Erde':   { score: 70, dynamic: 'Luft über Erde — Ideen treffen Realismus', advice: 'Luft inspiriert, Erde verwirklicht — eine gute Kombination' },
    'Luft':   { score: 85, dynamic: 'Zwei Lüfte — lebhafte Kommunikation und gemeinsame Visionen', advice: 'Achtet darauf, auch in der Stille zusammen zu sein' },
    'Wasser': { score: 75, dynamic: 'Luft bewegt Wasser — Gedanken treffen Gefühle', advice: 'Luft bringt Klarheit, Wasser Tiefe — ergänzt euch' },
  },
  'Wasser': {
    'Feuer':  { score: 65, dynamic: 'Wasser und Feuer — Spannung die heilt oder verletzt', advice: 'Lernt, die Energie des anderen zu respektieren' },
    'Erde':   { score: 90, dynamic: 'Wasser nährt die Erde — tiefste Fürsorge und Wachstum', advice: 'Eine natürliche, nährende Verbindung' },
    'Luft':   { score: 75, dynamic: 'Luft bewegt Wasser — Gedanken treffen Gefühle', advice: 'Luft bringt Klarheit, Wasser Tiefe — ergänzt euch' },
    'Wasser': { score: 80, dynamic: 'Zwei Wasser — tiefe emotionale Verbindung, manchmal überflutend', advice: 'Gebt euch gegenseitig emotionalen Raum' },
  },
};

interface ElementalBalanceProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function ElementalBalance({ nameA, birthDateA, nameB, birthDateB }: ElementalBalanceProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;

  const elemA = getElement(lpA);
  const elemB = getElement(lpB);
  const exElemA = getExElement(exA);
  const exElemB = getExElement(exB);

  const compat = PAIR_COMPAT[elemA]?.[elemB] ?? { score: 75, dynamic: 'Einzigartige Elementarverbindung', advice: 'Entdeckt gemeinsam eure elementare Harmonie' };
  const dataA = ELEMENT_DATA[elemA]!;
  const dataB = ELEMENT_DATA[elemB]!;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Elementar-Balance
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[{ first: firstA, elem: elemA, data: dataA, lp: lpA, ex: exElemA }, { first: firstB, elem: elemB, data: dataB, lp: lpB, ex: exElemB }].map(({ first, elem, data, lp, ex }) => (
          <div key={first} style={{ padding: '10px', borderRadius: 10, background: `${data.color}10`, border: `1px solid ${data.color}28`, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 3 }}>{data.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: data.color }}>{elem}</div>
            <div style={{ fontSize: 7, color: '#3a3530', marginTop: 1 }}>{first} · LP {lp}</div>
            <div style={{ fontSize: 7, color: '#5a5448', marginTop: 3 }}>EX-Elem.: {ex}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 9 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: '#d4af37', fontWeight: 700 }}>Elementar-Resonanz</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#d4af37' }}>{compat.score}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 7 }}>
          <div style={{ height: '100%', width: `${compat.score}%`, background: 'linear-gradient(90deg, #d4af3760, #d4af37)', borderRadius: 3 }} />
        </div>
        <p style={{ margin: '0 0 5px', fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', lineHeight: 1.5, fontStyle: 'italic' }}>{compat.dynamic}</p>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{compat.advice}</p>
      </div>
    </div>
  );
}
