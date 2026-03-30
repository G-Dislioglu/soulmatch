import { useState } from 'react';

import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';
import { buildClientDirectorPrompt, buildExampleResponse } from '../lib/clientDirectorPrompt';

const TEAL   = '#4ECECE';
const VIOLET = '#8A6DB0';
const RED    = '#FF7070';
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
}

export function ArcanaLivePreview({ persona, onPreview }: ArcanaLivePreviewProps) {
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const exampleAnswer = persona ? buildExampleResponse(persona) : '';
  const directorPrompt = persona ? buildClientDirectorPrompt(persona) : '';

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

  async function handleCopyPrompt(): Promise<void> {
    if (!directorPrompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(directorPrompt);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1600);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1600);
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
    <aside
      id="arcana-live-preview"
      style={{
        width: 320,
        minWidth: 320,
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        borderLeft: `1.5px solid ${TOKENS.b1}`,
        background: 'rgba(255,255,255,0.02)',
        padding: '24px 22px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Live · Vorschau
        </div>
        <div style={{ marginTop: 6, fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>
          Aktualisiert in Echtzeit
        </div>
      </div>

      {!persona ? (
        <div
          style={{
            marginTop: 8,
            border: `1.5px dashed ${TOKENS.b2}`,
            borderRadius: 22,
            padding: '22px 18px',
            color: TOKENS.text2,
            fontFamily: TOKENS.font.body,
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          Hier erscheinen Persona-Karte, Director Prompt und Antwortvorschau. Waehle links eine User-Persona oder starte einen neuen Entwurf.
        </div>
      ) : (
        <>
          <div
            style={{
              border: `1.5px solid ${TOKENS.b2}`,
              borderRadius: 22,
              background: TOKENS.card,
              padding: '20px 18px',
              boxShadow: TOKENS.shadow.card,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontFamily: TOKENS.font.display, fontSize: 22, color: TOKENS.text, lineHeight: 1.2 }}>{persona.name}</div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>{persona.subtitle || 'Arcana Persona'}</div>
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
                    fontFamily: TOKENS.font.body,
                    fontSize: 11,
                    color: bc.color,
                    background: bc.bg,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {bc.icon} {persona.toneMode.mode.toUpperCase()}-MODUS
                </div>
              );
            })()}
            <div style={{ background: TOKENS.bg, border: `1px solid rgba(255,112,112,0.18)`, borderRadius: 9, padding: '11px' }}>
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 9, letterSpacing: '0.3em', color: RED, textTransform: 'uppercase', marginBottom: 7 }}>
                AKTIVE QUIRKS
              </div>
              {persona.quirks.filter((quirk) => quirk.enabled).length > 0 ? persona.quirks.filter((quirk) => quirk.enabled).map((quirk) => (
                <div key={quirk.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, marginBottom: 4 }}>
                  <span>✦</span><span>{quirk.label}</span>
                </div>
              )) : (
                <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text3, fontStyle: 'italic' }}>
                  Keine aktiven Quirks.
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              border: `1.5px solid ${TOKENS.b2}`,
              borderRadius: 20,
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Director Prompt · Auto
              </div>
              <button
                type="button"
                onClick={() => void handleCopyPrompt()}
                style={{
                  border: `1.5px solid ${TOKENS.b1}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: copyState === 'copied' ? TOKENS.gold : TOKENS.text,
                  borderRadius: 12,
                  padding: '6px 10px',
                  fontFamily: TOKENS.font.body,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {copyState === 'copied' ? 'Kopiert' : copyState === 'failed' ? 'Fehler' : '📋'}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                maxHeight: 240,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Consolas, monospace',
                fontSize: 12,
                lineHeight: 1.55,
                color: TOKENS.text2,
              }}
            >
              {directorPrompt}
            </pre>
          </div>

          <div
            style={{
              border: `1.5px solid ${TOKENS.b2}`,
              borderRadius: 20,
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Beispiel-Antwort
            </div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              User
            </div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text, lineHeight: 1.6 }}>
              Was soll ich mit meinem Leben anfangen?
            </div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {persona.name}
            </div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
              {exampleAnswer}
            </div>
          </div>

          <div
            style={{
              border: `1.5px solid ${TOKENS.b2}`,
              borderRadius: 20,
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>
              Stimme: {persona.voice.voiceName}<br />Akzent: {persona.voice.accent}
            </div>
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={previewing}
              style={{
                border: `1.5px solid ${TOKENS.gold}`,
                background: 'rgba(212,175,55,0.08)',
                color: TOKENS.gold,
                borderRadius: 16,
                padding: '12px 14px',
                fontFamily: TOKENS.font.body,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: previewing ? 'progress' : 'pointer',
              }}
            >
              {previewing ? 'Stimme laedt...' : '▶ Stimme abspielen'}
            </button>
            {previewError ? (
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: '#fda4af', lineHeight: 1.6 }}>
                {previewError}
              </div>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}
