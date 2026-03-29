import { TOKENS } from '../../../design';

interface InsightsGridProps {
  onSelect: (target: 'chat' | 'astro' | 'souls' | 'journey') => void;
}

const INSIGHT_ITEMS = [
  {
    id: 'chat',
    title: 'Gespräche vertiefen',
    text: 'Starte direkt einen fokussierten Austausch mit Maya oder einer Spezialistin.',
    accent: TOKENS.gold,
  },
  {
    id: 'astro',
    title: 'Sternenlage lesen',
    text: 'Wechsle in die astrologische Sicht und prüfe Transite, Rhythmen und Muster.',
    accent: TOKENS.cyan,
  },
  {
    id: 'souls',
    title: 'Soul Cards ordnen',
    text: 'Schau nach, welche Karten heute weitergeführt oder gekreuzt werden sollten.',
    accent: TOKENS.rose,
  },
  {
    id: 'journey',
    title: 'Naechste Schritte planen',
    text: 'Nutze den Reise- und Entscheidungsraum für bewusste Datumsfenster.',
    accent: TOKENS.green,
  },
] as const;

export function InsightsGrid({ onSelect }: InsightsGridProps) {
  return (
    <section className="sm-card" style={{ padding: 22, display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Heute entdecken
        </div>
        <div style={{ fontFamily: TOKENS.font.serif, fontSize: 24, color: TOKENS.text, marginTop: 4 }}>
          Vier Wege fuer deinen naechsten Fokus
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {INSIGHT_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            style={{
              border: `1.5px solid ${TOKENS.b2}`,
              borderRadius: 18,
              background: TOKENS.card2,
              padding: 16,
              textAlign: 'left',
              display: 'grid',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 36, height: 3, borderRadius: 999, background: item.accent, boxShadow: `0 0 12px ${item.accent}22` }}
            />
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 14, fontWeight: 500, color: TOKENS.text }}>
              {item.title}
            </div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, lineHeight: 1.6, color: TOKENS.text2 }}>
              {item.text}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}