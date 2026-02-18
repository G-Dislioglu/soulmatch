import type { Aspect } from '../../../shared/types/astrology';

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□', sextile: '✶',
};
const ASPECT_COLOR: Record<string, string> = {
  conjunction: '#d4af37', opposition: '#ef4444', trine: '#22c55e', square: '#f59e0b', sextile: '#38bdf8',
};
const ASPECT_QUALITY: Record<string, string> = {
  conjunction: 'Fusion', opposition: 'Spannung', trine: 'Harmonie', square: 'Herausforderung', sextile: 'Chance',
};

const PLANET_DE: Record<string, string> = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun', pluto: 'Pluto',
  asc: 'ASC', mc: 'MC', chiron: 'Chiron', lilith: 'Lilith',
};
const PLANET_ICON: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  asc: '↑', mc: '↑↑', chiron: '⚷', lilith: '⚸',
};

// Orb-based priority: tighter = more important
function sortAspects(aspects: Aspect[]): Aspect[] {
  return [...aspects].sort((a, b) => {
    const important = ['conjunction', 'opposition', 'trine', 'square'];
    const ai = important.indexOf(a.type);
    const bi = important.indexOf(b.type);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return Math.abs(a.orb) - Math.abs(b.orb);
  });
}

const PAIR_MEANINGS: Record<string, Record<string, Record<string, string>>> = {
  sun: {
    moon: { conjunction: 'Identität und Gefühl vereinen sich in dir zu einem kraftvollen Ganzen.', trine: 'Herz und Wille fließen harmonisch zusammen.', square: 'Innere Spannung zwischen dem was du bist und was du fühlst.', opposition: 'Bewusstsein und Instinkt suchen Balance.', sextile: 'Lebendige Verbindung zwischen Wille und Intuition.' },
    mercury: { conjunction: 'Denken und Identität verschmelzen — du bist dein eigener Botschafter.', trine: 'Klarer Geist trifft starke Präsenz.', square: 'Kommunikation und Ego können kollidieren.', opposition: 'Objektives Denken fordert die eigene Identität heraus.', sextile: 'Leichte Verbindung zwischen Verstand und Willen.' },
    venus: { conjunction: 'Wärme und Charisma strahlen natürlich aus.', trine: 'Schönheitssinn und Selbstausdruck in Harmonie.', square: 'Zwischen Selbst und Wunsch nach Harmonie besteht Reibung.', opposition: 'Andere spiegeln zurück, was du dir wünschst.', sextile: 'Kreativität trifft Selbstvertrauen.' },
    mars: { conjunction: 'Starke Willenskraft und Energie — fast zu viel Feuer.', trine: 'Handeln und Sein im Einklang.', square: 'Impulsivität kann dich überwältigen.', opposition: 'Energie sucht nach außen, was innen brennt.', sextile: 'Gesunder Antrieb und Durchsetzungsfähigkeit.' },
    saturn: { conjunction: 'Ernste Energie — Verantwortung und Identität sind untrennbar.', trine: 'Disziplin stärkt deinen Charakter.', square: 'Selbstzweifel und innere Kritik als Wachstumsfeld.', opposition: 'Äußere Strukturen testen dein Selbstbild.', sextile: 'Struktur und Wille ergänzen sich produktiv.' },
  },
  moon: {
    venus: { conjunction: 'Tiefes Bedürfnis nach Liebe und Schönheit.', trine: 'Emotionale Wärme und Harmonie natürlich.', square: 'Gefühle und Wünsche nicht immer im Einklang.', opposition: 'Was du liebst und was du fühlst — manchmal getrennt.', sextile: 'Feinfühlige Zuneigung.' },
    mars: { conjunction: 'Emotionale Leidenschaft trifft Antrieb.', trine: 'Gefühle motivieren Handlungen.', square: 'Emotionale Reaktionen können impulsiv sein.', opposition: 'Handeln und Fühlen im Dialog.', sextile: 'Gesunde emotionale Energie.' },
    saturn: { conjunction: 'Emotionale Reife früh erlernt — manchmal kalt wirkend.', trine: 'Gefühle mit Weisheit und Stabilität geerdet.', square: 'Innere Kämpfe zwischen Sicherheit und Struktur.', opposition: 'Gefühle fordern Struktur — Struktur fordert Gefühle.', sextile: 'Emotionale Belastbarkeit aufgebaut.' },
    jupiter: { conjunction: 'Großzügige, expandierende Gefühle.', trine: 'Optimismus und Wohlbefinden natürlich.', square: 'Überfließende Gefühle suchen Maß.', opposition: 'Sehnsucht nach mehr kollidiert mit dem Gegenwärtigen.', sextile: 'Freudige, offene Emotionalität.' },
  },
};

function getAspectMeaning(a: string, b: string, type: string): string | null {
  const m1 = PAIR_MEANINGS[a]?.[b]?.[type];
  const m2 = PAIR_MEANINGS[b]?.[a]?.[type];
  return m1 ?? m2 ?? null;
}

interface AspectsOverviewProps { aspects: Aspect[]; }

export function AspectsOverview({ aspects }: AspectsOverviewProps) {
  if (aspects.length === 0) {
    return <div style={{ fontSize: 11, color: '#4a4540', textAlign: 'center', padding: 8 }}>Keine Aspektdaten vorhanden.</div>;
  }

  const sorted = sortAspects(aspects).slice(0, 7);

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Top {sorted.length} Aspekte
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((asp, i) => {
          const color = ASPECT_COLOR[asp.type] ?? '#a09a8e';
          const quality = ASPECT_QUALITY[asp.type] ?? asp.type;
          const meaning = getAspectMeaning(asp.a, asp.b, asp.type);
          const aName = `${PLANET_ICON[asp.a] ?? ''} ${PLANET_DE[asp.a] ?? asp.a}`;
          const bName = `${PLANET_ICON[asp.b] ?? ''} ${PLANET_DE[asp.b] ?? asp.b}`;
          return (
            <div key={i} style={{ padding: '7px 10px', borderRadius: 8, background: `${color}08`, border: `1px solid ${color}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: meaning ? 3 : 0 }}>
                <span style={{ fontSize: 13, color, flexShrink: 0 }}>{ASPECT_GLYPH[asp.type] ?? '·'}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#d4ccbc' }}>{aName}</span>
                <span style={{ fontSize: 9, color: '#3a3530' }}>–</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#d4ccbc' }}>{bName}</span>
                <span style={{ marginLeft: 'auto', fontSize: 8, color, padding: '1px 5px', borderRadius: 4, background: `${color}12`, flexShrink: 0 }}>{quality}</span>
                <span style={{ fontSize: 8, color: '#3a3530', flexShrink: 0 }}>{Math.abs(asp.orb).toFixed(1)}°</span>
              </div>
              {meaning && (
                <p style={{ margin: 0, fontSize: 10, lineHeight: 1.5, color: '#5a5448', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{meaning}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
