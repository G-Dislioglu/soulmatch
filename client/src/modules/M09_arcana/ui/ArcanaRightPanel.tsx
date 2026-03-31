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
  return (
    <aside
      style={{
        minWidth: 380,
        width: 380,
        height: '100%',
        minHeight: 0,
        borderLeft: '1px solid rgba(201,168,76,0.08)',
        background: '#16161F',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
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
        <div style={{ fontFamily: TOKENS.font.display, fontSize: 10, letterSpacing: '3px', color: '#C9A84C', marginBottom: 2 }}>
          LIVE · VORSCHAU
        </div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: '#6E6B7A', marginBottom: 10 }}>
          Snapshot + direkte Stimmprobe
        </div>
        <ArcanaLivePreview persona={persona} onPreview={onPreview} />
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
    </aside>
  );
}
