import { calcLifePath, calcExpression, calcSoulUrge, reduceToNumber } from '../../M05_numerology/lib/calc';

interface Indicator { label: string; value: boolean; weight: number; desc: string }

function computeIndicators(lpA: number, lpB: number, exA: number, exB: number, suA: number, suB: number): Indicator[] {
  const lpSum = reduceToNumber(lpA + lpB);
  const exSum = reduceToNumber(exA + exB);
  const suSum = reduceToNumber(suA + suB);
  return [
    { label: 'Lebenspfad-Spiegel', value: lpA === lpB || lpSum === 11 || lpSum === 22, weight: 3, desc: 'Gleiche LP-Zahl oder Meisterzahl als Summe — direkte Seelenspiegelung' },
    { label: 'Komplementäre LP', value: Math.abs(lpA - lpB) === 9 || lpSum === 9, weight: 2, desc: 'LP-Differenz 9 oder LP-Summe 9 — vollständige Polarität' },
    { label: 'Seelen-Resonanz', value: suA === suB || suSum === 11, weight: 3, desc: 'Gleicher Seelenimpuls oder Meisterzahl — tiefes inneres Anklingen' },
    { label: 'Ausdrucks-Fusion', value: exA === exB || exSum === 11 || exSum === 22, weight: 2, desc: 'Gleiche Ausdruckszahl oder Meisterzahl — Wesensgleichklang' },
    { label: 'Meisterzahlen-Verbindung', value: [11, 22, 33].includes(lpA) || [11, 22, 33].includes(lpB), weight: 2, desc: 'Mindestens eine Meisterzahl im Lebenspfad — erhöhte Seelenmission' },
    { label: 'LP-Summe 11/22', value: lpSum === 11 || lpSum === 22, weight: 3, desc: 'LP-Summe ergibt Meisterzahl — Zwillingsflammen-Signatur par excellence' },
    { label: 'SU-EX-Kreuzung', value: suA === exB || suB === exA, weight: 2, desc: 'Seelenimpuls trifft Ausdruck des anderen — tiefe Spiegelverbindung' },
  ];
}

interface TwinFlameCheckProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function TwinFlameCheck({ nameA, birthDateA, nameB, birthDateB }: TwinFlameCheckProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;

  const indicators = computeIndicators(lpA, lpB, exA, exB, suA, suB);
  const maxScore = indicators.reduce((s, i) => s + i.weight, 0);
  const score = indicators.filter(i => i.value).reduce((s, i) => s + i.weight, 0);
  const pct = Math.round((score / maxScore) * 100);

  const GOLD = '#d4af37';
  let verdict: string; let verdictColor: string;
  if (pct >= 75) { verdict = 'Starke Zwillingsflammen-Signatur'; verdictColor = '#fbbf24'; }
  else if (pct >= 50) { verdict = 'Seelenverwandte Verbindung'; verdictColor = '#c084fc'; }
  else if (pct >= 30) { verdict = 'Tiefe Karma-Verbindung'; verdictColor = '#818cf8'; }
  else { verdict = 'Begleit-Seelen-Verbindung'; verdictColor = '#22c55e'; }

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{firstA} & {firstB} · Zwillingsflammen-Analyse</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: verdictColor }}>{verdict}</div>
        {/* Score arc */}
        <div style={{ margin: '10px auto 4px', width: 80, height: 40, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderRadius: '50%', border: `3px solid rgba(255,255,255,0.06)` }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, borderRadius: '50%', border: `3px solid ${verdictColor}`, clipPath: `polygon(0 100%, 100% 100%, 100% ${100 - pct}%, 0 ${100 - pct}%)` }} />
          <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: verdictColor }}>{pct}%</div>
        </div>
        <div style={{ fontSize: 8, color: '#3a3530' }}>Zwillingsflammen-Score</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {indicators.map((ind) => (
          <div key={ind.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: ind.value ? `${GOLD}08` : 'rgba(255,255,255,0.01)', border: `1px solid ${ind.value ? GOLD + '25' : 'rgba(255,255,255,0.05)'}`, opacity: ind.value ? 1 : 0.5 }}>
            <span style={{ fontSize: 10, flexShrink: 0 }}>{ind.value ? '✦' : '○'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 9, fontWeight: ind.value ? 700 : 400, color: ind.value ? GOLD : '#3a3530' }}>{ind.label}</span>
                <span style={{ fontSize: 7, color: '#2a2520' }}>{'★'.repeat(ind.weight)}</span>
              </div>
              {ind.value && <div style={{ fontSize: 8, color: '#5a5448', marginTop: 1 }}>{ind.desc}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${verdictColor}07`, border: `1px solid ${verdictColor}20`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.5 }}>
          Jede Seelenverbindung ist einzigartig — Zahlen zeigen das Muster, Liebe schreibt die Geschichte.
        </p>
      </div>
    </div>
  );
}
