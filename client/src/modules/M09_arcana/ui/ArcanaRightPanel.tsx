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
        minWidth: 420,
        width: 420,
        height: '100%',
        minHeight: 0,
        borderLeft: '1px solid rgba(201,168,76,0.08)',
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
          padding: '13px 15px 11px',
          borderBottom: '1px solid rgba(201,168,76,0.08)',
          background: '#1E1E2B',
        }}
      >
        <ArcanaLivePreview persona={persona} onPreview={onPreview} showPreviewButton={false} />
      </div>

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
          borderTop: '1px solid rgba(201,168,76,0.08)',
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
