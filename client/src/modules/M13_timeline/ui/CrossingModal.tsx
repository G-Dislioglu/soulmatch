import { useState, useCallback } from 'react';
import type { SoulCard, SoulCardProposal } from '../lib/types';
import * as soulCardService from '../lib/soulCardService';
import * as timelineService from '../lib/timelineService';
import { parseSoulCard } from '../../M08_studio-chat/lib/commandParser';
import { getStudioProvider } from '../../M09_settings';

const PINK = '#e879f9';
const YELLOW = '#f59e0b';

export interface CrossingModalProps {
  cards: SoulCard[];
  initialCardA?: SoulCard;
  onClose: () => void;
  onComplete?: () => void;
}

type Phase = 'select' | 'merging' | 'result';

export function CrossingModal({ cards, initialCardA, onClose, onComplete }: CrossingModalProps) {
  const [cardA, setCardA] = useState<SoulCard | null>(initialCardA ?? null);
  const [cardB, setCardB] = useState<SoulCard | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [resultCard, setResultCard] = useState<SoulCardProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableForB = cards.filter((c) => c.id !== cardA?.id);

  const performCrossing = useCallback(async () => {
    if (!cardA || !cardB) return;
    setPhase('merging');
    setError(null);

    try {
      const provider = getStudioProvider();
      const crossingPrompt = `Kreuze diese zwei Soul Cards und finde die tiefere Verbindung:

Card A: "${cardA.title}"
${cardA.essence}
Tags: ${cardA.tags.join(', ')}

Card B: "${cardB.title}"
${cardB.essence}
Tags: ${cardB.tags.join(', ')}

Erstelle eine SYNTHESE als neue Soul Card. Nicht zusammenfassen — finde die verborgene Verbindung.

<<<SOUL_CARD>>>
{"title": "Max 40 Zeichen", "essence": "2-3 Sätze Synthese in du-Form", "tags": ["tag1", "tag2", "tag3"]}
<<<END_CARD>>>`;

      const res = await provider.generateStudio({
        userMessage: crossingPrompt,
        mode: 'profile',
        seats: ['maya'],
        maxTurns: 1,
      }, { soloPersona: 'maya' });

      const turn = res.turns[0];
      if (turn) {
        const { card } = parseSoulCard(turn.text);
        if (card) {
          setResultCard(card);
          setPhase('result');
        } else {
          setError('Crossing konnte nicht geparst werden.');
          setPhase('select');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('select');
    }
  }, [cardA, cardB]);

  function handleConfirmResult() {
    if (!resultCard || !cardA || !cardB) return;

    // Create the crossing result as a new Soul Card
    const entry = timelineService.addEntry('crossing', resultCard.title, resultCard.essence.slice(0, 80), {
      cardIds: [cardA.id, cardB.id],
    });
    const newCard = soulCardService.createCardFromProposal(resultCard, entry.id, 'crossing');
    soulCardService.confirmCard(newCard.id);

    // Link the source cards to this crossing
    soulCardService.addCrossing(cardA.id, cardB.id, newCard.id);
    soulCardService.addCrossing(cardB.id, cardA.id, newCard.id);

    onComplete?.();
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(180deg, #0d0a16 0%, #08060f 100%)',
          border: `1px solid ${YELLOW}18`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${YELLOW}08`,
          animation: 'sidebarRecapIn 0.35s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 10, color: YELLOW, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ⚛ Soul Card Crossing
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#5a5550', fontSize: 16, lineHeight: 1,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#a09a8e'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#5a5550'; }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {/* ── SELECT PHASE ── */}
          {phase === 'select' && (
            <>
              <div style={{ fontSize: 13, color: '#b0a898', lineHeight: 1.6, marginBottom: 16 }}>
                Wähle zwei Soul Cards zum Kreuzen. Maya findet die verborgene Verbindung.
              </div>

              {/* Card A */}
              <div style={{ fontSize: 10, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Card A
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                {cards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCardA(c); if (cardB?.id === c.id) setCardB(null); }}
                    style={{
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      textAlign: 'left',
                      background: cardA?.id === c.id ? `${PINK}12` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${cardA?.id === c.id ? `${PINK}30` : 'rgba(255,255,255,0.04)'}`,
                      color: cardA?.id === c.id ? PINK : '#a09a8e',
                      fontSize: 12, fontWeight: cardA?.id === c.id ? 600 : 400,
                      fontFamily: "'Outfit', sans-serif",
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ◆ {c.title}
                  </button>
                ))}
              </div>

              {/* Card B */}
              {cardA && (
                <>
                  <div style={{ fontSize: 10, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Card B
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                    {availableForB.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCardB(c)}
                        style={{
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          textAlign: 'left',
                          background: cardB?.id === c.id ? `${PINK}12` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${cardB?.id === c.id ? `${PINK}30` : 'rgba(255,255,255,0.04)'}`,
                          color: cardB?.id === c.id ? PINK : '#a09a8e',
                          fontSize: 12, fontWeight: cardB?.id === c.id ? 600 : 400,
                          fontFamily: "'Outfit', sans-serif",
                          transition: 'all 0.2s ease',
                        }}
                      >
                        ◆ {c.title}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {error && (
                <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 10 }}>{error}</div>
              )}

              <button
                onClick={performCrossing}
                disabled={!cardA || !cardB}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10, cursor: cardA && cardB ? 'pointer' : 'not-allowed',
                  background: cardA && cardB ? `${YELLOW}14` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${cardA && cardB ? `${YELLOW}30` : 'rgba(255,255,255,0.04)'}`,
                  color: cardA && cardB ? YELLOW : '#5a5550',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'all 0.25s ease',
                  opacity: cardA && cardB ? 1 : 0.5,
                }}
              >
                ⚛ Kreuzen
              </button>
            </>
          )}

          {/* ── MERGING PHASE ── */}
          {phase === 'merging' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div className="crossing-merge-anim" style={{
                display: 'flex', justifyContent: 'center', gap: 12,
                marginBottom: 20,
              }}>
                <div style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: `${PINK}08`, border: `1px solid ${PINK}15`,
                  color: PINK, fontSize: 11, fontWeight: 600,
                  animation: 'crossingPulseLeft 1.5s ease-in-out infinite',
                }}>
                  ◆ {cardA?.title}
                </div>
                <div style={{ color: YELLOW, fontSize: 20, alignSelf: 'center', animation: 'crossingSpinSymbol 2s linear infinite' }}>
                  ⚛
                </div>
                <div style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: `${PINK}08`, border: `1px solid ${PINK}15`,
                  color: PINK, fontSize: 11, fontWeight: 600,
                  animation: 'crossingPulseRight 1.5s ease-in-out infinite',
                }}>
                  ◆ {cardB?.title}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#7a7468' }}>
                Maya sucht die Verbindung…
              </div>
            </div>
          )}

          {/* ── RESULT PHASE ── */}
          {phase === 'result' && resultCard && (
            <>
              <div style={{
                padding: '16px', borderRadius: 14, marginBottom: 16,
                background: `${YELLOW}06`, border: `1px solid ${YELLOW}15`,
                animation: 'sidebarRecapIn 0.4s ease-out',
              }}>
                <div style={{ fontSize: 10, color: YELLOW, fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  ⚛ Crossing-Ergebnis
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 18, fontWeight: 700, color: '#f0eadc',
                  marginBottom: 8, lineHeight: 1.3,
                }}>
                  {resultCard.title}
                </div>
                <div style={{ fontSize: 13, color: '#b0a898', lineHeight: 1.65, marginBottom: 12 }}>
                  {resultCard.essence}
                </div>
                {resultCard.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {resultCard.tags.map((tag) => (
                      <span key={tag} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 6,
                        background: `${YELLOW}0a`, color: YELLOW,
                        border: `1px solid ${YELLOW}15`,
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleConfirmResult}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    background: `${YELLOW}14`, border: `1px solid ${YELLOW}30`,
                    color: YELLOW, fontSize: 12, fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  ✓ Als Soul Card speichern
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#7a7468', fontSize: 12, fontWeight: 500,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Verwerfen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
