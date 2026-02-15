import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExplainClaim } from '../../shared/types/scoring';
import { getInsightEnrichment, getRelatedIndices } from './insightTexts';

const ACCENT = '#d4af37';

/* ═══════════════════════════════════════════
   Props
   ═══════════════════════════════════════════ */

export interface DiscoveryFlowProps {
  claims: ExplainClaim[];
  highlightedCard?: string | null;
  tourTarget?: string | null;
  onAskMaya?: (claimTitle: string) => void;
  onNavigateStudio?: () => void;
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function dotColor(level: ExplainClaim['level']): string {
  if (level === 'positive') return '#34d399';
  if (level === 'caution') return '#fbbf24';
  return ACCENT;
}

function bgColor(level: ExplainClaim['level']): string {
  if (level === 'positive') return 'rgba(34,211,153,0.08)';
  if (level === 'caution') return 'rgba(251,191,36,0.08)';
  return `${ACCENT}08`;
}

function borderColor(level: ExplainClaim['level']): string {
  if (level === 'positive') return 'rgba(34,211,153,0.18)';
  if (level === 'caution') return 'rgba(251,191,36,0.18)';
  return `${ACCENT}18`;
}

/* ═══════════════════════════════════════════
   FlowEndCTA
   ═══════════════════════════════════════════ */

function FlowEndCTA({ onNavigateStudio }: { onNavigateStudio?: () => void }) {
  return (
    <div style={{
      marginTop: 24, padding: '28px 24px', borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(212,175,55,0.08) 50%, rgba(8,6,15,0.95) 100%)',
      border: '1px solid rgba(212,175,55,0.15)',
      textAlign: 'center',
      animation: 'fadeUp 0.5s ease-out',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 20, fontWeight: 700, color: '#f0eadc', marginBottom: 6,
      }}>
        Alle Erkenntnisse erkundet
      </div>
      <div style={{ fontSize: 13, color: '#a09a8e', lineHeight: 1.6, marginBottom: 20 }}>
        Deine Analyse ist bereit. Möchtest du sie mit Maya besprechen?
      </div>
      {onNavigateStudio && (
        <button
          onClick={onNavigateStudio}
          style={{
            padding: '12px 28px', borderRadius: 10, cursor: 'pointer',
            background: `linear-gradient(135deg, ${ACCENT}25 0%, rgba(168,85,247,0.15) 100%)`,
            border: `1px solid ${ACCENT}40`,
            color: ACCENT, fontWeight: 600, fontSize: 14, letterSpacing: '0.03em',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 24px ${ACCENT}30`;
            e.currentTarget.style.borderColor = `${ACCENT}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = `${ACCENT}40`;
          }}
        >
          ☽ Zum Persona Studio
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   InsightCard
   ═══════════════════════════════════════════ */

function InsightCard({
  claim,
  index,
  isExpanded,
  isVisited,
  isRelatedPulsing,
  isHighlighted,
  isTourTarget,
  isLast,
  nextTitle,
  onToggle,
  onNext,
  onAskMaya,
}: {
  claim: ExplainClaim;
  index: number;
  isExpanded: boolean;
  isVisited: boolean;
  isRelatedPulsing: boolean;
  isHighlighted: boolean;
  isTourTarget: boolean;
  isLast: boolean;
  nextTitle?: string;
  onToggle: () => void;
  onNext: () => void;
  onAskMaya?: () => void;
}) {
  const [showWhisper, setShowWhisper] = useState(false);
  const whisperTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enrichment = getInsightEnrichment(claim.id);

  // Whisper delay: show 1.5s after expanding
  useEffect(() => {
    if (isExpanded && enrichment?.mayaWhisper) {
      whisperTimer.current = setTimeout(() => setShowWhisper(true), 1500);
    } else {
      setShowWhisper(false);
      if (whisperTimer.current) clearTimeout(whisperTimer.current);
    }
    return () => { if (whisperTimer.current) clearTimeout(whisperTimer.current); };
  }, [isExpanded, enrichment?.mayaWhisper]);

  const color = dotColor(claim.level);
  const cardId = `claim-${index}`;

  return (
    <div
      id={`card-${cardId}`}
      data-visited={isVisited ? 'true' : undefined}
      data-level={claim.level}
      className={[
        'discovery-card-item',
        isHighlighted ? 'maya-card-highlight' : '',
        isTourTarget ? 'maya-tour-target' : '',
        isRelatedPulsing ? 'related-glow' : '',
      ].filter(Boolean).join(' ')}
      onClick={onToggle}
      style={{
        padding: '14px 16px', borderRadius: 14, marginBottom: 8, cursor: 'pointer',
        background: isExpanded
          ? `linear-gradient(135deg, ${bgColor(claim.level)}, rgba(8,6,15,0.5))`
          : bgColor(claim.level),
        border: `1px solid ${isExpanded ? `${color}30` : borderColor(claim.level)}`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Color dot */}
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: color, boxShadow: `0 0 10px ${color}90`,
        }} />

        {/* Title + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0eadc' }}>{claim.title}</div>
          {!isExpanded && (
            <div style={{ fontSize: 12, color: '#a09a8e', marginTop: 2, lineHeight: 1.4 }}>{claim.detail}</div>
          )}
        </div>

        {/* Right side: pulse indicator + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Gold pulse dot — disappears after first visit */}
          {!isVisited && !isExpanded && (
            <div className="discovery-pulse" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: ACCENT,
            }} />
          )}
          {/* Chevron */}
          <div style={{
            fontSize: 14, color: '#5a5550',
            transition: 'transform 0.3s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            ▾
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{
          marginTop: 14, paddingTop: 14,
          borderTop: `1px solid ${color}18`,
          overflow: 'hidden',
          animation: 'expandIn 0.45s cubic-bezier(0.4,0,0.2,1) forwards',
        }}>
          {/* Detail text */}
          <p style={{ fontSize: 13, color: '#b0a898', lineHeight: 1.75, margin: '0 0 12px 0' }}>
            {enrichment?.detail ?? claim.detail}
          </p>

          {/* Maya Whisper */}
          {showWhisper && enrichment?.mayaWhisper && (
            <div className="maya-whisper-fade" style={{
              fontSize: 12, fontStyle: 'italic', color: ACCENT,
              lineHeight: 1.6, marginBottom: 14, opacity: 0,
            }}>
              ◇ {enrichment.mayaWhisper}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
            {onAskMaya && (
              <button
                onClick={onAskMaya}
                style={{
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  background: `${ACCENT}10`, border: `1px solid ${ACCENT}28`,
                  color: ACCENT, fontSize: 12, fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${ACCENT}1a`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${ACCENT}10`; }}
              >
                ◇ Maya fragen
              </button>
            )}
            <button
              onClick={onNext}
              style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#c8c2b6', fontSize: 12, fontWeight: 500,
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s ease',
                flex: 1,
                textAlign: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              {isLast ? 'Zum Studio →' : `Weiter: ${nextTitle ?? 'Nächste'} →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DiscoveryFlow  (main export)
   ═══════════════════════════════════════════ */

export function DiscoveryFlow({
  claims,
  highlightedCard,
  tourTarget,
  onAskMaya,
  onNavigateStudio,
}: DiscoveryFlowProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [pulsingRelated, setPulsingRelated] = useState<Set<number>>(new Set());
  const [allExplored, setAllExplored] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allClaimIds = claims.map((c) => c.id);

  // Track visited cards
  useEffect(() => {
    if (expandedIdx !== null) {
      setVisited((prev) => {
        const next = new Set(prev);
        next.add(expandedIdx);
        return next;
      });
    }
  }, [expandedIdx]);

  // Check all-explored
  useEffect(() => {
    if (visited.size >= claims.length && claims.length > 0) {
      setAllExplored(true);
    }
  }, [visited, claims.length]);

  // Pulse related cards when a card is expanded
  useEffect(() => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    if (expandedIdx === null) {
      setPulsingRelated(new Set());
      return;
    }
    const claim = claims[expandedIdx];
    if (!claim) return;
    const related = getRelatedIndices(claim.id, allClaimIds);
    if (related.length > 0) {
      setPulsingRelated(new Set(related));
      pulseTimer.current = setTimeout(() => setPulsingRelated(new Set()), 2000);
    } else {
      setPulsingRelated(new Set());
    }
    return () => { if (pulseTimer.current) clearTimeout(pulseTimer.current); };
  }, [expandedIdx, claims, allClaimIds]);

  const handleToggle = useCallback((idx: number) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const handleNext = useCallback((idx: number) => {
    if (idx >= claims.length - 1) {
      // Last card → navigate to studio
      setExpandedIdx(null);
      onNavigateStudio?.();
    } else {
      // Close current, open next
      setExpandedIdx(idx + 1);
      // Scroll to next card after a short delay for animation
      setTimeout(() => {
        const el = document.getElementById(`card-claim-${idx + 1}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [claims.length, onNavigateStudio]);

  const handleAskMaya = useCallback((claimTitle: string) => {
    onAskMaya?.(claimTitle);
  }, [onAskMaya]);

  if (claims.length === 0) return null;

  return (
    <div>
      {/* Section heading */}
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 19, fontWeight: 700, color: '#f0eadc', marginBottom: 16,
      }}>
        Erkenntnisse
      </div>

      {/* Insight cards */}
      {claims.map((claim, idx) => {
        const cardId = `claim-${idx}`;
        return (
          <InsightCard
            key={claim.id}
            claim={claim}
            index={idx}
            isExpanded={expandedIdx === idx}
            isVisited={visited.has(idx)}
            isRelatedPulsing={pulsingRelated.has(idx)}
            isHighlighted={highlightedCard === cardId}
            isTourTarget={tourTarget === cardId}
            isLast={idx === claims.length - 1}
            nextTitle={idx < claims.length - 1 ? claims[idx + 1]?.title : undefined}
            onToggle={() => handleToggle(idx)}
            onNext={() => handleNext(idx)}
            onAskMaya={onAskMaya ? () => handleAskMaya(claim.title) : undefined}
          />
        );
      })}

      {/* Flow-End CTA */}
      {allExplored && <FlowEndCTA onNavigateStudio={onNavigateStudio} />}
    </div>
  );
}
