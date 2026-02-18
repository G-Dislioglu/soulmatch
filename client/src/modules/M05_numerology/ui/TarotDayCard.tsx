import { calcLifePath, reduceToNumber } from '../lib/calc';

// 22 Major Arcana
const MAJOR_ARCANA = [
  { num: 0,  name: 'Der Narr',          symbol: '🃏', element: 'Luft',   keyword: 'Anfang, Vertrauen, Potential', guidance: 'Springe ins Unbekannte mit vollem Vertrauen. Jetzt ist der Moment für Neues.' },
  { num: 1,  name: 'Der Magier',         symbol: '✦',  element: 'Feuer',  keyword: 'Willenskraft, Manifestation', guidance: 'Du hast alle Werkzeuge. Setze deinen Willen in Aktion.' },
  { num: 2,  name: 'Die Hohepriesterin', symbol: '☾',  element: 'Wasser', keyword: 'Intuition, Stille, Geheimnis', guidance: 'Höre auf deine innere Stimme. Die Antwort liegt bereits in dir.' },
  { num: 3,  name: 'Die Herrscherin',    symbol: '♀',  element: 'Erde',   keyword: 'Fülle, Kreativität, Natur', guidance: 'Erschaffe und nähre. Fruchtbarkeit in allem was du berührst.' },
  { num: 4,  name: 'Der Herrscher',      symbol: '♂',  element: 'Feuer',  keyword: 'Struktur, Ordnung, Führung', guidance: 'Schaffe stabile Grundlagen. Disziplin ist jetzt dein Freund.' },
  { num: 5,  name: 'Der Hierophant',     symbol: '⛪', element: 'Erde',   keyword: 'Tradition, Weisheit, Lehre', guidance: 'Suche Anleitung in Weisheit und Überlieferung.' },
  { num: 6,  name: 'Die Liebenden',      symbol: '♡',  element: 'Luft',   keyword: 'Wahl, Liebe, Werte', guidance: 'Eine wichtige Entscheidung aus dem Herzen steht an.' },
  { num: 7,  name: 'Der Wagen',          symbol: '⚔',  element: 'Wasser', keyword: 'Triumph, Kontrolle, Ziel', guidance: 'Halte Kurs. Deine Entschlossenheit trägt dich zum Ziel.' },
  { num: 8,  name: 'Die Kraft',          symbol: '∞',  element: 'Feuer',  keyword: 'Mut, Sanftheit, Stärke', guidance: 'Wahre Stärke kommt aus Mitgefühl, nicht Kontrolle.' },
  { num: 9,  name: 'Der Eremit',         symbol: '🔦', element: 'Erde',   keyword: 'Rückzug, Reflexion, Weisheit', guidance: 'Gehe nach innen. Die Stille enthüllt tiefe Wahrheiten.' },
  { num: 10, name: 'Das Rad des Schicksals', symbol: '☸', element: 'Feuer', keyword: 'Zyklen, Wendepunkte, Glück', guidance: 'Das Rad dreht sich. Erkenne den Rhythmus des Lebens.' },
  { num: 11, name: 'Die Gerechtigkeit',  symbol: '⚖',  element: 'Luft',   keyword: 'Ausgewogenheit, Wahrheit, Karma', guidance: 'Handle im Einklang mit deiner tiefsten Wahrheit.' },
  { num: 12, name: 'Der Gehängte',       symbol: '♅',  element: 'Wasser', keyword: 'Loslassen, Pause, Perspektive', guidance: 'Halte inne. Sieh die Dinge aus einem anderen Winkel.' },
  { num: 13, name: 'Der Tod',            symbol: '☽',  element: 'Wasser', keyword: 'Transformation, Ende, Wandel', guidance: 'Lass los was ausgedient hat. Transformation ist Leben.' },
  { num: 14, name: 'Die Mäßigkeit',      symbol: '☯',  element: 'Feuer',  keyword: 'Balance, Heilung, Geduld', guidance: 'Mische Gegensätze mit Anmut. Balance ist die Kunst.' },
  { num: 15, name: 'Der Teufel',         symbol: '⛓',  element: 'Erde',   keyword: 'Muster, Bindung, Schatten', guidance: 'Erkenne was dich festhält. Bewusstsein löst die Ketten.' },
  { num: 16, name: 'Der Turm',           symbol: '⚡',  element: 'Feuer',  keyword: 'Umbruch, Enthüllung, Wandel', guidance: 'Was bricht, bricht um Platz zu schaffen. Vertraue dem Prozess.' },
  { num: 17, name: 'Der Stern',          symbol: '✦',  element: 'Luft',   keyword: 'Hoffnung, Heilung, Inspiration', guidance: 'Nach dem Sturm: Erneuerung. Dein Stern leuchtet.' },
  { num: 18, name: 'Der Mond',           symbol: '🌕', element: 'Wasser', keyword: 'Unbewusstes, Illusion, Träume', guidance: 'Vertraue dem Mondlicht in der Ungewissheit. Träume leiten.' },
  { num: 19, name: 'Die Sonne',          symbol: '☉',  element: 'Feuer',  keyword: 'Freude, Klarheit, Erfolg', guidance: 'Strahle dein Licht aus. Heute gehört dir.' },
  { num: 20, name: 'Das Gericht',        symbol: '📯', element: 'Feuer',  keyword: 'Erwachen, Ruf, Erneuerung', guidance: 'Höre den inneren Ruf zur Erneuerung. Auferstehe.' },
  { num: 21, name: 'Die Welt',           symbol: '🌍', element: 'Erde',   keyword: 'Vollendung, Integration, Erfolg', guidance: 'Du hast die Reise vollendet. Feiere die Ganzheit.' },
];

const EL_COLOR: Record<string, string> = { Feuer: '#f97316', Erde: '#84cc16', Luft: '#38bdf8', Wasser: '#818cf8' };

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

function drawCard(birthDate: string): typeof MAJOR_ARCANA[0] {
  const today = new Date();
  const lp = calcLifePath(birthDate).value;
  const py = personalYear(birthDate);
  const doy = dayOfYear(today);
  const idx = (lp + py + doy) % 22;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return MAJOR_ARCANA[idx]!;
}

interface TarotDayCardProps {
  birthDate: string;
}

export function TarotDayCard({ birthDate }: TarotDayCardProps) {
  const card = drawCard(birthDate);
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  const elColor = EL_COLOR[card.element] ?? '#d4af37';

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {/* Card face */}
      <div style={{
        flexShrink: 0, width: 66, minHeight: 100, borderRadius: 10,
        background: 'linear-gradient(160deg, #1a1225 0%, #0d0a18 100%)',
        border: `1.5px solid ${elColor}40`,
        boxShadow: `0 0 16px ${elColor}20`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '10px 6px',
      }}>
        <div style={{ fontSize: 24 }}>{card.symbol}</div>
        <div style={{ fontSize: 9, color: '#4a4540', textAlign: 'center', fontWeight: 600, letterSpacing: '0.05em' }}>
          {String(card.num).padStart(2, '0')}
        </div>
      </div>

      {/* Card info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: '#4a4540', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{dateStr} · Major Arcana</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: '#f0eadc', lineHeight: 1.2, marginBottom: 4 }}>{card.name}</div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: `${elColor}18`, color: elColor, border: `1px solid ${elColor}30`, fontWeight: 600 }}>{card.element}</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: '#6a6458', border: '1px solid rgba(255,255,255,0.06)' }}>{(card.keyword.split(',')[0] ?? card.keyword).trim()}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: '#a09a8e', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
          {card.guidance}
        </p>
      </div>
    </div>
  );
}
