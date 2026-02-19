import { calcLifePath, calcSoulUrge, reduceToNumber } from '../../M05_numerology/lib/calc';

const ORACLE_CARDS = [
  { name: 'Die Brücke', symbol: '∞', meaning: 'Was euch trennt, ist auch das, was euch verbindet. Der Weg zueinander führt durch Verständnis.' },
  { name: 'Der Spiegel', symbol: '◈', meaning: 'Ihr zeigt einander, was noch der Heilung bedarf. Dies ist ein Geschenk, kein Fluch.' },
  { name: 'Das Feuer', symbol: '△', meaning: 'Eure Verbindung entzündet etwas Neues. Hütet die Flamme — nährt sie täglich.' },
  { name: 'Die Wurzel', symbol: '⊕', meaning: 'Gemeinsame Tiefe ist euer Fundament. Kehrt immer dorthin zurück, wenn der Sturm kommt.' },
  { name: 'Der Fluss', symbol: '〜', meaning: 'Fließt miteinander — widersteht der Versuchung, die Richtung des anderen zu erzwingen.' },
  { name: 'Der Stern', symbol: '✦', meaning: 'Eure Verbindung hat eine kosmische Dimension. Vertraut dem, was zwischen euch ist.' },
  { name: 'Das Labyrinth', symbol: '⌘', meaning: 'Der Weg ist nicht gerade — aber jede Kurve bringt euch näher zueinander, wenn ihr bleibt.' },
  { name: 'Die Stille', symbol: '○', meaning: 'In der Stille zwischen euren Worten liegt das Tiefste. Lernt diese Sprache zu sprechen.' },
  { name: 'Der Schlüssel', symbol: '⚷', meaning: 'Einer von euch hält den Schlüssel zum verborgenen Raum des anderen. Tragt ihn behutsam.' },
];

const ADVICE_BY_SUM: Record<number, string> = {
  1: 'Beginnt neu — auch wenn ihr Angst davor habt.',
  2: 'Sprecht aus, was ihr fühlt — Schweigen schützt nicht.',
  3: 'Bringt mehr Freude und Leichtigkeit in eure Begegnungen.',
  4: 'Setzt gemeinsam einen konkreten Schritt um — heute.',
  5: 'Wagt gemeinsam etwas Neues, das keiner von euch allein täte.',
  6: 'Sorgt füreinander — und lasst euch fürsorgen.',
  7: 'Verbringt stille Zeit zusammen ohne Agenda.',
  8: 'Besprecht, was ihr gemeinsam aufbauen möchtet.',
  9: 'Vergebt — euch selbst oder einander.',
};

function getOracleCard(lpA: number, lpB: number, suA: number, suB: number): typeof ORACLE_CARDS[0] {
  const idx = (lpA + lpB + suA + suB + new Date().getDate()) % ORACLE_CARDS.length;
  return ORACLE_CARDS[idx]!;
}

function getDailyAdvice(lpA: number, lpB: number): string {
  const sum = reduceToNumber(lpA + lpB + new Date().getDate()) || 9;
  return ADVICE_BY_SUM[sum] ?? ADVICE_BY_SUM[9]!;
}

interface CompatOracleProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function CompatOracle({ nameA, birthDateA, nameB, birthDateB }: CompatOracleProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;
  const card = getOracleCard(lpA, lpB, suA, suB);
  const advice = getDailyAdvice(lpA, lpB);
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const GOLD = '#d4af37';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Orakel für {firstA} & {firstB}
        </div>
      </div>

      {/* Oracle card */}
      <div style={{ textAlign: 'center', marginBottom: 14, padding: '16px', borderRadius: 12, background: `${GOLD}08`, border: `1px solid ${GOLD}30` }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: GOLD, marginBottom: 6 }}>{card.symbol}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: GOLD, marginBottom: 8 }}>{card.name}</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, lineHeight: 1.7, color: '#d4ccbc', fontStyle: 'italic' }}>
          „{card.meaning}"
        </p>
      </div>

      {/* Daily action */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          ✦ Heutiger Impuls
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#7a7468', lineHeight: 1.5 }}>{advice}</p>
      </div>

      <div style={{ marginTop: 8, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        Karte & Impuls wechseln täglich
      </div>
    </div>
  );
}
