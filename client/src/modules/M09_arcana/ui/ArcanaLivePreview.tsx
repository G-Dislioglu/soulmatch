import { useState } from 'react';

import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';

interface ArcanaLivePreviewProps {
  persona: ArcanaPersonaDefinition | null;
  onPreview: (persona: ArcanaPersonaDefinition) => Promise<void>;
}

export function ArcanaLivePreview({ persona, onPreview }: ArcanaLivePreviewProps) {
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

  return (
    <aside
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
          Hier erscheinen Persona-Karte, Director Prompt und Antwortvorschau. In Phase 6.1 bleibt diese Spalte bewusst minimal.
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
              gap: 10,
            }}
          >
            <div style={{ fontFamily: TOKENS.font.serif, fontSize: 30, color: TOKENS.text }}>{persona.name}</div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>{persona.subtitle || 'Arcana Persona'}</div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2, lineHeight: 1.7 }}>
              Director Prompt und Beispiel-Antwort werden in Phase 6.2 implementiert. Der Stimmtest nutzt bereits die bestehende Arcana-TTS-Preview-Route.
            </div>
          </div>

          <div
            style={{
              border: `1.5px dashed ${TOKENS.b2}`,
              borderRadius: 20,
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Voice Snapshot
            </div>
            <div style={{ fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
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
