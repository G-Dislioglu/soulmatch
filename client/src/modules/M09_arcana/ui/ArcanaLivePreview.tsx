import { useState } from 'react';

import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';

const TEAL   = '#4ECECE';
const VIOLET = '#8A6DB0';
const GREEN  = '#6BD672';

type BadgeStyle = { bg: string; border: string; color: string; icon: string };

function getToneBadge(mode: string): BadgeStyle {
  if (mode === 'komisch')   return { bg: 'rgba(107,214,114,0.08)', border: 'rgba(107,214,114,0.25)', color: GREEN,     icon: '🎪' };
  if (mode === 'satirisch') return { bg: 'rgba(255,120,50,0.08)',  border: 'rgba(255,120,50,0.25)',  color: '#FFB080', icon: '🎭' };
  if (mode === 'bissig')    return { bg: 'rgba(201,168,76,0.08)',  border: 'rgba(201,168,76,0.25)',  color: '#C9A84C', icon: '😏' };
  return                           { bg: 'rgba(107,79,160,0.1)',   border: 'rgba(107,79,160,0.3)',   color: '#C0A8E0', icon: '📜' };
}

interface ArcanaLivePreviewProps {
  persona: ArcanaPersonaDefinition | null;
  onPreview: (persona: ArcanaPersonaDefinition) => Promise<void>;
  showPreviewButton?: boolean;
}

export function ArcanaLivePreview({
  persona,
  onPreview,
  showPreviewButton = true,
}: ArcanaLivePreviewProps) {
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function handlePreview(): Promise<void> {
    if (!persona) {
      return;
    }

    setPreviewing(true);
    setPreviewError(null);
    try {
      await onPreview(persona);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Preview fehlgeschlagen');
    } finally {
      setPreviewing(false);
    }
  }

  function renderMiniBar(label: string, value: number, color: string = TOKENS.gold) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '68px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2 }}>{label}</div>
        <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
          <div style={{ width: `${value}%`, height: '100%', background: color }} />
        </div>
      </div>
    );
  }

  return (
    <section
      id="arcana-live-preview"
      style={{
        display: 'grid',
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontFamily: TOKENS.font.display, fontSize: 10, letterSpacing: '3px', color: '#C9A84C', marginBottom: 2 }}>
          LIVE · VORSCHAU
        </div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: '#6E6B7A' }}>
          Snapshot der aktuellen Persona
        </div>
      </div>

      {!persona ? (
        <div
          style={{
            border: `1.5px dashed ${TOKENS.b2}`,
            borderRadius: 12,
            padding: '16px 14px',
            color: TOKENS.text2,
            fontFamily: TOKENS.font.body,
            fontSize: 12,
            lineHeight: 1.7,
            background: '#111118',
          }}
        >
          Hier erscheint der Live-Charakter-Snapshot. Waehle links eine Persona oder starte einen neuen Entwurf.
        </div>
      ) : (
        <div style={{ background: '#1E1E2B', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 9, padding: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{persona.icon || '✦'}</div>
            <div>
              <div style={{ fontFamily: TOKENS.font.display, fontSize: 12, color: '#C9A84C' }}>{persona.name}</div>
              <div style={{ fontFamily: TOKENS.font.serif, fontStyle: 'italic', fontSize: 11, color: '#6E6B7A' }}>{persona.subtitle || 'Arcana Persona'}</div>
            </div>
          </div>
          {renderMiniBar('Intensitaet', persona.character.intensity)}
          {renderMiniBar('Empathie', persona.character.empathy)}
          {renderMiniBar('Konfront.', persona.character.confrontation)}
          {renderMiniBar('Ton-Modus', persona.toneMode.slider, VIOLET)}
          {renderMiniBar('Tempo', persona.voice.speakingTempo, TEAL)}
          {renderMiniBar('Pausen', persona.voice.pauseDramaturgy, TEAL)}
          {renderMiniBar('Emotion', persona.voice.emotionalIntensity, TEAL)}
          {(() => {
            const bc = getToneBadge(persona.toneMode.mode);
            return (
              <div
                style={{
                  alignSelf: 'flex-start',
                  border: `1px solid ${bc.border}`,
                  borderRadius: 7,
                  padding: '3px 9px',
                  fontFamily: TOKENS.font.display,
                  fontSize: 10,
                  color: bc.color,
                  background: bc.bg,
                  letterSpacing: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 4,
                }}
              >
                {bc.icon} {persona.toneMode.mode.toUpperCase()}-MODUS
              </div>
            );
          })()}
        </div>
      )}
      {persona && showPreviewButton && (
        <div style={{ padding: '10px 0 0' }}>
          <button
            type="button"
            onClick={() => void handlePreview()}
            disabled={previewing}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(78,206,206,0.06)',
              border: '1px solid rgba(78,206,206,0.25)',
              borderRadius: 7,
              color: '#4ECECE',
              fontFamily: TOKENS.font.display,
              fontSize: 10,
              letterSpacing: '2px',
              cursor: previewing ? 'progress' : 'pointer',
            }}
          >
            {previewing ? 'STIMME LAEDT...' : '▶ STIMME ABSPIELEN'}
          </button>
          {previewError ? (
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: '#fda4af', lineHeight: 1.6, marginTop: 6 }}>{previewError}</div>
          ) : null}
        </div>
      )}
    </section>
  );
}
