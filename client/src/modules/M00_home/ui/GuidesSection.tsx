import { TOKENS } from '../../../design';

interface GuidesSectionProps {
  onOpenGuide: (target: 'maya' | 'chat' | 'astro' | 'match') => void;
}

const GUIDE_ITEMS = [
  {
    id: 'maya',
    label: 'Maya',
    sub: 'Begleiterin',
    accent: TOKENS.gold,
    orb: '◇',
  },
  {
    id: 'chat',
    label: 'Luna',
    sub: 'Gefuehl und Resonanz',
    accent: TOKENS.purple,
    orb: '☽',
  },
  {
    id: 'astro',
    label: 'Orion',
    sub: 'Weite und Blick',
    accent: TOKENS.cyan,
    orb: '△',
  },
  {
    id: 'match',
    label: 'Lilith',
    sub: 'Reibung und Wahrheit',
    accent: TOKENS.rose,
    orb: '✦',
  },
] as const;

export function GuidesSection({ onOpenGuide }: GuidesSectionProps) {
  return (
    <section className="sm-card" style={{ padding: 22, display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Guides
        </div>
        <div style={{ fontFamily: TOKENS.font.serif, fontSize: 24, color: TOKENS.text, marginTop: 4 }}>
          Wer soll dich heute fuehren?
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {GUIDE_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenGuide(item.id)}
            style={{
              border: `1.5px solid ${TOKENS.b2}`,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.03)',
              padding: '14px 10px 12px',
              display: 'grid',
              gap: 6,
              justifyItems: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              transition: TOKENS.transition.fast,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                border: `1.5px solid ${item.accent}`,
                color: item.accent,
                boxShadow: `0 0 18px ${item.accent}22`,
                background: `${item.accent}12`,
                fontSize: 17,
              }}
            >
              {item.orb}
            </span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, fontWeight: 500, color: TOKENS.text }}>
              {item.label}
            </span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 10, lineHeight: 1.35, color: TOKENS.text2 }}>
              {item.sub}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}