import { useState, useEffect, useCallback } from 'react';
import type { TimelineEntry, SoulCard } from '../lib/types';
import { ENTRY_TYPES } from '../lib/entryTypes';
import * as timelineService from '../lib/timelineService';
import * as soulCardService from '../lib/soulCardService';

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const ACCENT = '#d4af37';
const SIDEBAR_W = 280;
const SIDEBAR_COLLAPSED_W = 56;
const RECAP_SESSION_KEY = 'soulmatch_recap_dismissed';

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Gestern';
  if (days < 30) return `vor ${days} Tagen`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/* ═══════════════════════════════════════════
   Props
   ═══════════════════════════════════════════ */

export interface SidebarCallbacks {
  onNavigateScore?: (entryId: string) => void;
  onNavigateChat?: (personaId: string, sessionId?: string) => void;
  onNavigateInsight?: (claimId: string) => void;
  onOpenSettings?: () => void;
  onOpenSoulCard?: (card: SoulCard) => void;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  lastScore?: number | null;
  callbacks?: SidebarCallbacks;
}

/* ═══════════════════════════════════════════
   MayaRecap — Session greeting card
   ═══════════════════════════════════════════ */

function MayaRecap({
  lastScore,
  onDismiss,
  onContinue,
}: {
  lastScore?: number | null;
  onDismiss: () => void;
  onContinue: () => void;
}) {
  const latestScore = timelineService.getLatestByType('score');
  if (!latestScore && !lastScore) return null;

  const score = lastScore ?? latestScore?.metadata?.score ?? null;
  const daysSince = latestScore
    ? Math.floor((Date.now() - new Date(latestScore.timestamp).getTime()) / 86_400_000)
    : null;

  return (
    <div
      className="sidebar-entry-fadein"
      style={{
        margin: '8px 10px 12px',
        padding: '14px 14px 12px',
        borderRadius: 12,
        background: `${ACCENT}06`,
        border: `1px solid ${ACCENT}18`,
        animation: 'sidebarRecapIn 0.5s ease-out',
      }}
    >
      <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>
        ◇ Maya
      </div>
      <div style={{ fontSize: 12, color: '#b0a898', lineHeight: 1.6, marginBottom: 10 }}>
        {daysSince !== null && daysSince > 0
          ? `Seit deinem letzten Besuch vor ${daysSince} ${daysSince === 1 ? 'Tag' : 'Tagen'}:`
          : 'Willkommen zurück!'}
        {score !== null && (
          <span style={{ display: 'block', marginTop: 4, color: '#c8c2b6' }}>
            Score: <strong style={{ color: ACCENT }}>{score}</strong>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onContinue}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer',
            background: `${ACCENT}12`, border: `1px solid ${ACCENT}25`,
            color: ACCENT, fontSize: 11, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s ease',
          }}
        >
          Weitermachen
        </button>
        <button
          onClick={onDismiss}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            color: '#7a7468', fontSize: 11, fontWeight: 500,
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s ease',
          }}
        >
          Verwerfen
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TimelineEntryCard
   ═══════════════════════════════════════════ */

function TimelineEntryCard({
  entry,
  index,
  onClick,
}: {
  entry: TimelineEntry;
  index: number;
  onClick: () => void;
}) {
  const meta = ENTRY_TYPES[entry.type];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="sidebar-entry-fadein"
      style={{
        padding: '10px 14px',
        margin: '0 10px 4px',
        borderRadius: 10,
        background: hovered ? meta.glowColor : 'rgba(255,255,255,0.015)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? `0 4px 16px rgba(0,0,0,0.3), 0 0 12px ${meta.glowColor}` : 'none',
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Left color bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 3, height: '100%',
        background: meta.color,
        opacity: hovered ? 1 : 0.4,
        borderRadius: '3px 0 0 3px',
        transition: 'opacity 0.3s ease',
        boxShadow: hovered ? `0 0 8px ${meta.color}` : 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 6 }}>
        {/* Type icon */}
        <div style={{
          fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 1,
          color: meta.color,
          filter: hovered ? `drop-shadow(0 0 4px ${meta.color})` : 'none',
          transition: 'filter 0.3s ease',
        }}>
          {meta.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#f0eadc',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {entry.title}
            </div>
            <div style={{ fontSize: 10, color: '#5a5550', flexShrink: 0 }}>
              {relativeDate(entry.timestamp)}
            </div>
          </div>
          <div style={{
            fontSize: 12, color: '#7a7468', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.4,
          }}>
            {entry.preview}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SoulCardEntry (compact sidebar row)
   ═══════════════════════════════════════════ */

function SoulCardEntry({
  card,
  onClick,
}: {
  card: SoulCard;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 14px',
        margin: '0 10px 4px',
        borderRadius: 10,
        background: hovered ? 'rgba(232,121,249,0.06)' : 'rgba(232,121,249,0.03)',
        border: `1px solid ${hovered ? 'rgba(232,121,249,0.15)' : 'rgba(232,121,249,0.08)'}`,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 4px 12px rgba(232,121,249,0.06)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#f0eadc',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1,
        }}>
          <span style={{ color: '#e879f9', marginRight: 6 }}>◆</span>
          {card.title}
        </div>
        <div style={{ fontSize: 10, color: '#5a5550', flexShrink: 0, marginLeft: 8 }}>
          {shortDate(card.createdAt)}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sidebar  (main export)
   ═══════════════════════════════════════════ */

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose, lastScore, callbacks }: SidebarProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [soulCards, setSoulCards] = useState<SoulCard[]>([]);
  const [showRecap, setShowRecap] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);

  // Load data
  const refresh = useCallback(() => {
    setEntries(timelineService.getEntries());
    setSoulCards(soulCardService.getConfirmedCards());
  }, []);

  useEffect(() => {
    refresh();
    // Check if recap should show
    if (!sessionStorage.getItem(RECAP_SESSION_KEY)) {
      const latest = timelineService.getLatestByType('score');
      if (latest || lastScore) setShowRecap(true);
    }
  }, [refresh, lastScore]);

  // Refresh when sidebar expands or mobile opens
  useEffect(() => {
    if (!collapsed || mobileOpen) refresh();
  }, [collapsed, mobileOpen, refresh]);

  const dismissRecap = useCallback(() => {
    setShowRecap(false);
    sessionStorage.setItem(RECAP_SESSION_KEY, '1');
  }, []);

  const handleEntryClick = useCallback((entry: TimelineEntry) => {
    if (!callbacks) return;
    switch (entry.type) {
      case 'score':
        callbacks.onNavigateScore?.(entry.id);
        break;
      case 'chat_maya':
      case 'chat_lilith':
      case 'chat_luna':
      case 'chat_orion':
        callbacks.onNavigateChat?.(
          entry.metadata?.personaId ?? entry.type.replace('chat_', ''),
          entry.metadata?.sessionId,
        );
        break;
      case 'insight':
        callbacks.onNavigateInsight?.(entry.metadata?.claimId ?? '');
        break;
      case 'soul_card':
      case 'crossing': {
        const card = soulCardService.getCardById(entry.metadata?.cardIds?.[0] ?? '');
        if (card) callbacks.onOpenSoulCard?.(card);
        break;
      }
    }
  }, [callbacks]);

  const visibleCards = showAllCards ? soulCards : soulCards.slice(0, 3);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  return (
    <>
      {/* ── Sidebar panel ── */}
      <aside
        className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          width: sidebarWidth,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          background: 'linear-gradient(180deg, #0a0812 0%, #08060f 100%)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Ambient light overlay */}
        {!collapsed && <div className="sidebar-ambient" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />}

        {/* Header */}
        <div style={{
          padding: collapsed ? '20px 0 12px' : '20px 16px 12px',
          display: 'flex', justifyContent: collapsed ? 'center' : 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20, fontWeight: 700, color: '#f0eadc',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
              Soulmatch
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="sidebar-collapse-btn"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b6560', fontSize: 16, padding: '4px 8px',
              borderRadius: 6, transition: 'color 0.2s ease',
              lineHeight: 1, flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b6560'; }}
            aria-label={collapsed ? 'Sidebar erweitern' : 'Sidebar minimieren'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* ── COLLAPSED VIEW: icon column ── */}
        {collapsed ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8 }} className="hidden-scrollbar">
              {entries.map((entry) => {
                const meta = ENTRY_TYPES[entry.type];
                return (
                  <button
                    key={entry.id}
                    onClick={() => { onToggleCollapse(); handleEntryClick(entry); }}
                    title={entry.title}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', padding: '12px 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: meta.color, fontSize: 16, lineHeight: 1,
                      transition: 'background 0.2s ease',
                      borderRadius: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    {meta.icon}
                  </button>
                );
              })}
              {entries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', opacity: 0.3, fontSize: 16 }}>◈</div>
              )}
            </div>

            {/* Soul card icons in collapsed */}
            {soulCards.length > 0 && (
              <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 6, paddingBottom: 4 }}>
                {soulCards.slice(0, 5).map((card) => (
                  <button
                    key={card.id}
                    onClick={() => { onToggleCollapse(); callbacks?.onOpenSoulCard?.(card); }}
                    title={card.title}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', padding: '10px 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#e879f9', fontSize: 14, lineHeight: 1,
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    ◆
                  </button>
                ))}
              </div>
            )}

            {/* Settings icon in collapsed */}
            <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px 0 16px' }}>
              <button
                onClick={callbacks?.onOpenSettings}
                title="Einstellungen"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', padding: '8px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#5a5550', fontSize: 14, lineHeight: 1,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#a09a8e'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#5a5550'; e.currentTarget.style.background = 'none'; }}
              >
                ⚙
              </button>
            </div>
          </>
        ) : (
          /* ── EXPANDED VIEW: full content ── */
          <>
            {/* Maya Recap */}
            {showRecap && (
              <MayaRecap
                lastScore={lastScore}
                onDismiss={dismissRecap}
                onContinue={() => {
                  dismissRecap();
                  callbacks?.onNavigateScore?.('');
                }}
              />
            )}

            {/* Timeline entries (scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 4 }} className="hidden-scrollbar">
              {/* Section label */}
              <div style={{
                padding: '0 16px 8px',
                fontSize: 9, fontWeight: 600, color: '#5a5550',
                textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>
                Timeline
              </div>

              {entries.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>◈</div>
                  <div style={{ fontSize: 11, color: '#5a5550', lineHeight: 1.5 }}>
                    Noch keine Einträge.<br />
                    Berechne deinen Score oder starte einen Chat.
                  </div>
                </div>
              ) : (
                entries.map((entry, i) => (
                  <TimelineEntryCard
                    key={entry.id}
                    entry={entry}
                    index={i}
                    onClick={() => handleEntryClick(entry)}
                  />
                ))
              )}
            </div>

            {/* Soul Cards section */}
            {soulCards.length > 0 && (
              <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10, paddingBottom: 4 }}>
                <div style={{
                  padding: '0 16px 8px',
                  fontSize: 9, fontWeight: 600, color: '#5a5550',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>Soul Cards ({soulCards.length})</span>
                </div>

                {visibleCards.map((card) => (
                  <SoulCardEntry
                    key={card.id}
                    card={card}
                    onClick={() => callbacks?.onOpenSoulCard?.(card)}
                  />
                ))}

                {soulCards.length > 3 && !showAllCards && (
                  <button
                    onClick={() => setShowAllCards(true)}
                    style={{
                      display: 'block', width: '100%', padding: '8px 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#5a5550', fontSize: 10, fontWeight: 500,
                      fontFamily: "'Outfit', sans-serif",
                      transition: 'color 0.2s ease',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#a09a8e'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#5a5550'; }}
                  >
                    Alle anzeigen →
                  </button>
                )}
              </div>
            )}

            {/* Settings link at bottom */}
            <div style={{ flexShrink: 0, padding: '8px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={callbacks?.onOpenSettings}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 10px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderRadius: 8, color: '#5a5550', fontSize: 11,
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#a09a8e';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#5a5550';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <span>⚙</span>
                <span>Einstellungen</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 39,
            display: 'none', // shown via CSS on mobile
          }}
        />
      )}
    </>
  );
}
