import { useState } from 'react';

import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';
import { ArcanaLivePreview } from './ArcanaLivePreview';
import { ArcanaPersonaTuning } from './ArcanaPersonaTuning';

interface ArcanaRightPanelProps {
  persona: ArcanaPersonaDefinition | null;
  onChange: (updated: Partial<ArcanaPersonaDefinition>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onPreview: (persona: ArcanaPersonaDefinition) => Promise<void>;
  saving: boolean;
  isSystem: boolean;
}

export function ArcanaRightPanel({
  persona,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onPreview,
  saving,
  isSystem,
}: ArcanaRightPanelProps) {
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function handlePreviewClick(): Promise<void> {
    if (!persona) {
      return;
    }

    setPreviewing(true);
    setPreviewError(null);
    try {
      await onPreview(persona);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Stimmprobe fehlgeschlagen');
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <aside
      style={{
        minWidth: 540,
        width: 540,
        height: '100%',
        minHeight: 0,
        borderLeft: '1.5px solid #3A3A50',
        background: '#16161F',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          padding: '8px 12px',
          borderBottom: '1.5px solid #3A3A50',
          background: '#1E1E2B',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Compact persona identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{persona?.icon ?? '✦'}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: TOKENS.font.display, fontSize: 11, letterSpacing: '1.5px', color: '#C9A84C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {persona ? persona.name.toUpperCase() : 'KEIN PROFIL'}
            </div>
            {persona ? (
              <div style={{ fontFamily: TOKENS.font.body, fontSize: 10, color: '#6E6B7A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {persona.subtitle || 'Entwurf'}
              </div>
            ) : null}
          </div>
        </div>
        {/* Preview toggle button */}
        <button
          type="button"
          onClick={() => setShowPreview((prev) => !prev)}
          style={{
            height: 28,
            borderRadius: 8,
            border: `1px solid ${showPreview ? 'rgba(78,206,206,0.45)' : 'rgba(78,206,206,0.20)'}`,
            background: showPreview ? 'rgba(78,206,206,0.12)' : 'rgba(78,206,206,0.04)',
            color: '#4ECECE',
            fontFamily: TOKENS.font.display,
            fontSize: 9,
            letterSpacing: '1.5px',
            padding: '0 10px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {showPreview ? '▼ VORSCHAU' : '▶ VORSCHAU'}
        </button>
      </div>

      {/* Floating Live Preview Overlay */}
      {showPreview ? (
        <div style={{
          position: 'fixed',
          top: 60,
          right: 20,
          width: 420,
          zIndex: 9999,
          background: '#16161F',
          border: '1.5px solid #3A3A50',
          borderRadius: 12,
          boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '2px', color: '#4ECECE' }}>
              LIVE · VORSCHAU
            </span>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              style={{ background: 'none', border: 'none', color: '#7A7A8E', fontSize: 16, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <ArcanaLivePreview persona={persona} onPreview={onPreview} showPreviewButton={false} />
        </div>
      ) : null}

      <div style={{ minHeight: 0, overflowY: 'auto' }}>
        <ArcanaPersonaTuning
          persona={persona}
          onChange={onChange}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={onDelete}
          saving={saving}
          isSystem={isSystem}
          compact
        />
      </div>

      <div
        style={{
          borderTop: '1.5px solid #3A3A50',
          background: '#14141C',
          padding: '10px 12px',
          display: 'grid',
          gap: 7,
        }}
      >
        <button
          type="button"
          onClick={() => void handlePreviewClick()}
          disabled={!persona || previewing || saving}
          style={{
            height: 34,
            borderRadius: 10,
            border: '1px solid rgba(78,206,206,0.35)',
            background: !persona || previewing || saving ? 'rgba(78,206,206,0.04)' : 'rgba(78,206,206,0.12)',
            color: '#73DEDE',
            fontFamily: TOKENS.font.display,
            fontSize: 10,
            letterSpacing: '1.8px',
            cursor: !persona || previewing || saving ? 'not-allowed' : 'pointer',
          }}
        >
          {previewing ? 'Stimme laeuft...' : '▶ Stimme abspielen'}
        </button>
        {previewError ? (
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: '#fda4af' }}>{previewError}</div>
        ) : null}
      </div>
    </aside>
  );
}
