import { reduceToNumber } from '../lib/calc';

const VOWELS = new Set('aeiouäöü');
const PYTHAGOREAN: Record<string, number> = { a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,j:1,k:2,l:3,m:4,n:5,o:6,p:7,q:8,r:9,s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8,ä:1,ö:6,ü:3 };

function nameDigits(name: string, onlyVowels: boolean): number[] {
  return name.toLowerCase().split('').filter((c) => onlyVowels ? VOWELS.has(c) : !VOWELS.has(c) && /[a-zäöü]/.test(c)).map((c) => PYTHAGOREAN[c] ?? 0);
}

function rawSum(digits: number[]): number {
  return digits.reduce((a, b) => a + b, 0);
}

interface DebtDef {
  title: string;
  lesson: string;
  strength: string;
  color: string;
}

const DEBT_DEF: Record<number, DebtDef> = {
  13: { title: 'Karma der Trägheit', lesson: 'In einem früheren Leben hast du kreative Energie missbraucht oder dich auf Kosten anderer ausgeruht. Disziplin und harte Arbeit sind der Schlüssel — jeder Schritt zählt.', strength: 'Durch Konsequenz entstehen die dauerhaftesten Werke.', color: '#f59e0b' },
  14: { title: 'Karma der Freiheit', lesson: 'Die Freiheit wurde einst missbraucht — Sucht, Unbeständigkeit oder Verantwortungslosigkeit. Jetzt lernst du, Freiheit mit Selbstbeherrschung zu verbinden.', strength: 'Wahre Freiheit wächst durch bewusste Entscheidungen.', color: '#38bdf8' },
  16: { title: 'Karma des Egos', lesson: 'Stolz und Eitelkeit haben in einem früheren Leben geschadet. Diese Zahl bringt Ego-Auflösung — manchmal durch plötzliche Umbrüche — damit das Wahre entsteht.', strength: 'Aus der Asche des Egos entsteht authentische Weisheit.', color: '#c084fc' },
  19: { title: 'Karma der Macht', lesson: 'Macht wurde einst zum eigenen Vorteil missbraucht. Jetzt ist Lernen durch Unabhängigkeit das Thema — aber auch das Erkennen, dass wahre Stärke dient.', strength: 'Stärke, die anderen dient, ist die mächtigste von allen.', color: '#ef4444' },
};

interface FoundDebt { number: number; source: string; def: DebtDef; }

function checkRaw(rawNums: number[]): number[] {
  const DEBTS = [13, 14, 16, 19];
  return rawNums.filter((n) => DEBTS.includes(n));
}

function findDebts(name: string, birthDate: string): FoundDebt[] {
  const parts = birthDate.split('-');
  const month = parseInt(parts[1] ?? '1', 10);
  const day = parseInt(parts[2] ?? '1', 10);
  const year = parseInt(parts[0] ?? '2000', 10);

  const lpRaw = rawSum([month, day, year]);
  const exRaw = rawSum(nameDigits(name, false).concat(nameDigits(name, true)));
  const suRaw = rawSum(nameDigits(name, true));

  // Check raw sums (before final reduction)
  const rawChecks: { raw: number; source: string }[] = [
    { raw: lpRaw, source: 'Lebenspfad' },
    { raw: reduceToNumber(month) + reduceToNumber(day) + reduceToNumber(year), source: 'Lebenspfad (Stufe 2)' },
    { raw: exRaw, source: 'Ausdruckszahl' },
    { raw: suRaw, source: 'Seelendrang' },
  ];

  const found: FoundDebt[] = [];
  const seen = new Set<number>();

  for (const { raw, source } of rawChecks) {
    const debts = checkRaw([raw]);
    for (const d of debts) {
      if (!seen.has(d)) {
        seen.add(d);
        const def = DEBT_DEF[d];
        if (def) found.push({ number: d, source, def });
      }
    }
  }

  return found;
}

interface KarmicDebtsProps { name: string; birthDate: string; }

export function KarmicDebts({ name, birthDate }: KarmicDebtsProps) {
  let debts: FoundDebt[] = [];
  try {
    debts = findDebts(name, birthDate);
  } catch {
    debts = [];
  }

  if (debts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ fontSize: 20, marginBottom: 6 }}>✦</div>
        <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Keine Karma-Schulden erkannt</div>
        <div style={{ fontSize: 10, color: '#4a4540', marginTop: 2 }}>Dein Energiefeld trägt keine der klassischen Karma-Zahlen (13, 14, 16, 19).</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {debts.length} Karma-{debts.length === 1 ? 'Zahl' : 'Zahlen'} erkannt
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {debts.map((d) => (
          <div key={d.number} style={{ padding: '12px 14px', borderRadius: 11, background: `${d.def.color}0a`, border: `1px solid ${d.def.color}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: d.def.color, lineHeight: 1 }}>{d.number}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f0eadc' }}>{d.def.title}</div>
                <div style={{ fontSize: 8, color: d.def.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>aus {d.source}</div>
              </div>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 11, lineHeight: 1.6, color: '#6a6458', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{d.def.lesson}</p>
            <div style={{ fontSize: 10, color: d.def.color, fontWeight: 500 }}>✦ {d.def.strength}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
