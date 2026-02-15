import { useState } from 'react';
import type { SoulCard } from '../lib/types';
import * as soulCardService from '../lib/soulCardService';

const PINK = '#e879f9';

export interface SoulCardDetailProps {
  card: SoulCard;
  onClose: () => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
}

export function SoulCardDetail({ card, onClose, onDeleted, onUpdated }: SoulCardDetailProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [essence, setEssence] = useState(card.essence);
  const [tagsStr, setTagsStr] = useState(card.tags.join(', '));

  function handleSave() {
    soulCardService.updateCard(card.id, {
      title,
      essence,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setEditing(false);
    onUpdated?.();
  }

  function handleDelete() {
    soulCardService.deleteCard(card.id);
    onDeleted?.();
    onClose();
  }

  const sourceLabel =
    card.sourceType === 'chat' ? 'Chat-Erkenntnis'
    : card.sourceType === 'crossing' ? 'Crossing-Synthese'
    : card.sourceType === 'insight' ? 'Report-Erkenntnis'
    : card.sourceType === 'score' ? 'Score-Analyse'
    : 'Manuell';

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
          width: '100%', maxWidth: 440,
          borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(180deg, #0d0a16 0%, #08060f 100%)',
          border: `1px solid ${PINK}18`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${PINK}08`,
          animation: 'sidebarRecapIn 0.35s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 10, color: PINK, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            ◆ Soul Card
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

        {/* Content */}
        <div style={{ padding: '0 24px 20px' }}>
          {editing ? (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f0eadc', fontSize: 16, fontWeight: 700,
                  fontFamily: "'Cormorant Garamond', serif",
                  outline: 'none',
                }}
              />
              <textarea
                value={essence}
                onChange={(e) => setEssence(e.target.value)}
                rows={4}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#b0a898', fontSize: 13, lineHeight: 1.6,
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none', resize: 'vertical',
                }}
              />
              <input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Tags (kommagetrennt)"
                style={{
                  width: '100%', padding: '6px 12px', borderRadius: 8, marginBottom: 14,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: PINK, fontSize: 11,
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: `${PINK}12`, border: `1px solid ${PINK}30`,
                    color: PINK, fontSize: 12, fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Speichern
                </button>
                <button
                  onClick={() => { setEditing(false); setTitle(card.title); setEssence(card.essence); setTagsStr(card.tags.join(', ')); }}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#7a7468', fontSize: 12, fontWeight: 500,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Title */}
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22, fontWeight: 700, color: '#f0eadc',
                marginBottom: 10, lineHeight: 1.3,
              }}>
                {card.title}
              </div>

              {/* Essence */}
              <div style={{
                fontSize: 13, color: '#b0a898', lineHeight: 1.7,
                marginBottom: 16,
              }}>
                {card.essence}
              </div>

              {/* Tags */}
              {card.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {card.tags.map((tag) => (
                    <span key={tag} style={{
                      fontSize: 10, padding: '3px 10px', borderRadius: 6,
                      background: `${PINK}0a`, color: PINK,
                      border: `1px solid ${PINK}15`,
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Source */}
              <div style={{
                padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 9, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  Quelle
                </div>
                <div style={{ fontSize: 12, color: '#7a7468' }}>
                  {sourceLabel} · {new Date(card.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>

              {/* Crossings */}
              {card.crossedWith && card.crossedWith.length > 0 && (
                <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)', marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: '#5a5550', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                    Crossings
                  </div>
                  {card.crossedWith.map((cwId) => {
                    const crossed = soulCardService.getCardById(cwId);
                    return crossed ? (
                      <div key={cwId} style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                        ⚛ mit "{crossed.title}"
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#a09a8e', fontSize: 12, fontWeight: 500,
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'all 0.2s ease',
                  }}
                >
                  ✎ Bearbeiten
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)',
                    color: '#ef4444', fontSize: 12, fontWeight: 500,
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'all 0.2s ease',
                  }}
                >
                  🗑 Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
