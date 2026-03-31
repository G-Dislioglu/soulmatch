import { useState } from 'react';

import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';
import { buildClientDirectorPrompt, buildExampleResponse } from '../lib/clientDirectorPrompt';

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
        width: 300,
        minWidth: 300,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(201,168,76,0.08)',
        background: '#16161F',
      }}
    >
      {/* pv-head */}
      <div style={{ padding: '13px 15px 11px', borderBottom: '1px solid rgba(201,168,76,0.08)', background: '#1E1E2B', flexShrink: 0 }}>
        <div style={{ fontFamily: TOKENS.font.display, fontSize: 10, letterSpacing: '3px', color: '#C9A84C', marginBottom: 2 }}>LIVE · VORSCHAU</div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: '#6E6B7A' }}>Aktualisiert in Echtzeit</div>
      </div>
      {/* pv-body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '13px', display: 'flex', flexDirection: 'column', gap: 11 }}>

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
          {/* Snapshot card */}
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
            <div style={{ background: '#111118', border: '1px solid rgba(255,112,112,0.18)', borderRadius: 9, padding: '11px' }}>
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 9, letterSpacing: '3px', color: '#FF7070', textTransform: 'uppercase', marginBottom: 7 }}>
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

          {/* Director Prompt */}
          <div style={{ background: '#111118', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid rgba(201,168,76,0.08)', padding: '7px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: TOKENS.font.body, fontSize: 9, letterSpacing: '3px', color: '#C9A84C' }}>DIRECTOR PROMPT · AUTO</span>
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
                  fontFamily: TOKENS.font.serif,
                  fontSize: 11,
                  lineHeight: 1.7,
                  color: TOKENS.text2,
                  padding: '10px 11px',
                }}
            >
              {directorPrompt}
            </pre>
          </div>

          {/* Example Answer */}
          <div style={{ background: '#1E1E2B', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 9, padding: '11px' }}>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 9, letterSpacing: '3px', color: '#6E6B7A', marginBottom: 8, textTransform: 'uppercase' }}>BEISPIEL-ANTWORT</div>
            <div style={{ background: '#242433', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '9px 9px 9px 2px', padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 10, color: '#C9A84C', letterSpacing: '1px', marginBottom: 2 }}>USER</div>
              <div style={{ fontFamily: TOKENS.font.serif, fontStyle: 'italic', fontSize: 13, lineHeight: 1.5 }}>Was soll ich mit meinem Leben anfangen?</div>
            </div>
            <div style={{ background: '#242433', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '9px 9px 9px 2px', padding: '8px 10px' }}>
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 10, color: '#C9A84C', letterSpacing: '1px', marginBottom: 2 }}>{persona.name.toUpperCase()}</div>
              <div style={{ fontFamily: TOKENS.font.serif, fontStyle: 'italic', fontSize: 13, lineHeight: 1.5, color: TOKENS.text2 }}>{exampleAnswer}</div>
            </div>
          </div>
        </>
      )}
      </div>
      {/* pv-foot */}
      {persona && (
        <div style={{ padding: '10px 13px', borderTop: '1px solid rgba(201,168,76,0.08)', background: '#1E1E2B', flexShrink: 0 }}>
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
            {previewing ? 'STIMME LÄDT...' : '▶ STIMME ABSPIELEN'}
          </button>
          {previewError ? (
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: '#fda4af', lineHeight: 1.6, marginTop: 6 }}>{previewError}</div>
          ) : null}
        </div>
      )}
    </aside>
  );
}
