import { useMemo } from 'react';
import { TOKENS } from '../../../design';
import { ENTRY_TYPES, soulCardService, timelineService } from '../../M13_timeline';
import type { SoulCard } from '../../M13_timeline';

interface SoulCardsPreviewProps {
  onOpenSoulCard: (card: SoulCard) => void;
}

export function SoulCardsPreview({ onOpenSoulCard }: SoulCardsPreviewProps) {
  const soulCards = useMemo(() => soulCardService.getConfirmedCards().slice(0, 3), []);
  const timeline = useMemo(() => timelineService.getEntries().slice(0, 4), []);

  return (
    <section className="sm-card" style={{ padding: 22, display: 'grid', gap: 18, minHeight: '100%' }}>
      <div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Seelenkarten und Timeline
        </div>
        <div style={{ fontFamily: TOKENS.font.serif, fontSize: 24, color: TOKENS.text, marginTop: 4 }}>
          Gesammelte Spuren
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {soulCards.length > 0 ? (
          soulCards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenSoulCard(card)}
              className={index === 0 ? 'soul-card-new' : undefined}
              style={{
                border: `1.5px solid ${TOKENS.goldSoft}`,
                borderRadius: 18,
                background: `${TOKENS.goldGlow}`,
                padding: '14px 16px',
                display: 'grid',
                gap: 8,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, fontWeight: 500, color: TOKENS.text }}>{card.title}</span>
                <span style={{ fontFamily: TOKENS.font.body, fontSize: 10, color: TOKENS.gold }}>Soul Card</span>
              </div>
              <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, lineHeight: 1.6, color: TOKENS.text2 }}>{card.essence}</span>
            </button>
          ))
        ) : (
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
            Noch keine bestaetigten Soul Cards sichtbar. Neue Karten tauchen hier automatisch auf.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Letzte Timeline
        </div>
        {timeline.length > 0 ? (
          timeline.map((entry) => {
            const meta = ENTRY_TYPES[entry.type];
            return (
              <div key={entry.id} style={{ display: 'grid', gap: 4, paddingTop: 10, borderTop: `1px solid ${TOKENS.b3}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: meta.color }}>{meta.icon}</span>
                  <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text }}>{entry.title}</span>
                </div>
                <span style={{ fontFamily: TOKENS.font.body, fontSize: 11, lineHeight: 1.5, color: TOKENS.text2 }}>{entry.preview}</span>
              </div>
            );
          })
        ) : (
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
            Die Timeline fuellt sich nach den ersten Scores, Chats und Karten.
          </div>
        )}
      </div>
    </section>
  );
}