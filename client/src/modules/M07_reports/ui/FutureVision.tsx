import { calcLifePath } from '../../M05_numerology/lib/calc';

const VISION_THEMES: Record<number, { gift: string; challenge: string; destiny: string }> = {
  1: { gift: 'Unabhängigkeit und Pioniergeist', challenge: 'Ego und Dominanz', destiny: 'eine Verbindung, die Freiheit schenkt und trotzdem zusammenhält' },
  2: { gift: 'Tiefe Empathie und Harmonie', challenge: 'Abhängigkeit und Überanpassung', destiny: 'eine Verbindung, in der beide wachsen ohne sich aufzugeben' },
  3: { gift: 'Freude, Kreativität und Ausdruck', challenge: 'Oberflächlichkeit und Zerstreuung', destiny: 'eine Verbindung, die das Leben zum Kunstwerk macht' },
  4: { gift: 'Verlässlichkeit und Beständigkeit', challenge: 'Starrheit und Kontrolle', destiny: 'eine Verbindung, die auf solidem Fundament dauerhaft gedeiht' },
  5: { gift: 'Abenteuer und Vitalität', challenge: 'Unverbindlichkeit und Unruhe', destiny: 'eine Verbindung, die frei ist und trotzdem treu' },
  6: { gift: 'Liebe, Fürsorge und Schönheit', challenge: 'Überfürsorge und Selbstverlust', destiny: 'eine Verbindung, die ein sicheres Zuhause für beide schafft' },
  7: { gift: 'Tiefe Weisheit und Intuition', challenge: 'Rückzug und Isolation', destiny: 'eine Verbindung, in der Stille und Tiefe als Geschenk erlebt werden' },
  8: { gift: 'Kraft, Manifestation und Fülle', challenge: 'Machtstreben und Materialismus', destiny: 'eine Verbindung, die gemeinsam Großes aufbaut und teilt' },
  9: { gift: 'Universalliebe und Weisheit', challenge: 'Selbstaufopferung und Loslassungsschmerz', destiny: 'eine Verbindung, die über sich hinauswächst und die Welt berührt' },
  11: { gift: 'Inspiration und spirituelle Tiefe', challenge: 'Übersensitivität und Energie-Verlust', destiny: 'eine Verbindung, die das Unsichtbare sichtbar macht' },
  22: { gift: 'Visionäre Kraft und Meisterschaft', challenge: 'Überwältigung und Perfektionismus', destiny: 'eine Verbindung, die gemeinsam etwas Bleibendes erschafft' },
  33: { gift: 'Bedingungslose Liebe und Heilung', challenge: 'Aufopferung und fehlende Grenzen', destiny: 'eine Verbindung, in der Liebe heilt und trägt' },
};

const PAIR_FUTURES: [number, number, string][] = [
  [1, 1, 'Zwei Pioniere — ihr erschafft gemeinsam, was einzeln nicht möglich wäre. Lernt, euch Raum zu lassen.'],
  [1, 2, 'Führung trifft Sensibilität — ihr ergänzt euch perfekt, wenn Respekt in beide Richtungen fließt.'],
  [1, 7, 'Stärke trifft Tiefe — eure Verbindung kann außergewöhnlich weise und kraftvoll werden.'],
  [2, 6, 'Zwei Herzseelen — eure Liebe kann tiefe Heilung bringen. Achtet auf eure eigenen Grenzen.'],
  [3, 5, 'Kreativität trifft Abenteuer — gemeinsam werdet ihr niemals langweilig werden.'],
  [4, 8, 'Zwei Baumeister — zusammen erschafft ihr etwas Dauerhaftes und Wertvolles.'],
  [6, 9, 'Fürsorge trifft Universalliebe — eure Verbindung kann anderen als Leuchtturm dienen.'],
  [7, 11, 'Zwei Seher — eure Verbindung berührt Ebenen, die andere nie sehen werden.'],
];

const DEFAULT_FUTURE = 'Eure Verbindung trägt das Potenzial, euch beide zu eurem höchsten Selbst zu führen — wenn ihr es zulasst.';

function getPairFuture(lpA: number, lpB: number): string {
  const low = Math.min(lpA, lpB);
  const high = Math.max(lpA, lpB);
  const found = PAIR_FUTURES.find(([a, b]) => a === low && b === high);
  return found ? found[2] : DEFAULT_FUTURE;
}

interface FutureVisionProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function FutureVision({ nameA, birthDateA, nameB, birthDateB }: FutureVisionProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const vA = VISION_THEMES[lpA];
  const vB = VISION_THEMES[lpB];
  const pairFuture = getPairFuture(lpA, lpB);
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const GOLD = '#d4af37';

  return (
    <div>
      {/* Pair future prose */}
      <div style={{ padding: '14px 16px', borderRadius: 12, background: `${GOLD}08`, border: `1px solid ${GOLD}28`, marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          ✦ Gemeinsame Zukunftsvision
        </div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, lineHeight: 1.8, color: '#d4ccbc', fontStyle: 'italic' }}>
          „{pairFuture}"
        </p>
      </div>

      {/* Individual destiny cards */}
      {vA && vB && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[{ name: firstA, lp: lpA, v: vA, color: GOLD }, { name: firstB, lp: lpB, v: vB, color: '#c084fc' }].map(({ name, lp, v, color }) => (
            <div key={name} style={{ flex: 1, padding: '9px 10px', borderRadius: 9, background: `${color}07`, border: `1px solid ${color}20` }}>
              <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 3 }}>{name} · LP {lp}</div>
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 7, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Geschenk</div>
                <div style={{ fontSize: 9, color: '#4a4540', lineHeight: 1.4 }}>{v.gift}</div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 7, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Schatten</div>
                <div style={{ fontSize: 9, color: '#4a4540', lineHeight: 1.4 }}>{v.challenge}</div>
              </div>
              <div>
                <div style={{ fontSize: 7, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bestimmung</div>
                <div style={{ fontSize: 9, color: '#4a4540', lineHeight: 1.4 }}>{v.destiny}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared potential */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Gemeinsames Potenzial</div>
        <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6, color: '#5a5448', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
          Wenn beide eure Geschenke vollständig entfaltet — und eure Schatten bewusst halten — wird eure Verbindung zu einem Ort, an dem das Höchste in euch gedeihen kann.
        </p>
      </div>
    </div>
  );
}
