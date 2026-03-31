import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';

// Prototype-exact colors
const GOLD  = '#C9A84C';
const TEAL  = '#4ECECE';
const MAYA  = '#B06DB0';
const S2    = '#16161F';   // sidebar / block-header bg
const MUTED = '#6E6B7A';
const MUTED2 = '#4A4758';

interface ArcanaPersonaListProps {
  personas: ArcanaPersonaDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
}

function badgeFor(persona: ArcanaPersonaDefinition) {
  if (persona.tier === 'system') {
    const isMaya = persona.name.toLowerCase() === 'maya';
    return {
      label: isMaya ? '✦' : 'SYS',
      style: {
        fontSize: 9, padding: '1px 6px', borderRadius: 8,
        background: isMaya ? 'rgba(176,109,176,0.12)' : 'rgba(201,168,76,0.10)',
        color: isMaya ? MAYA : GOLD,
        border: `1px solid ${isMaya ? 'rgba(176,109,176,0.25)' : 'rgba(201,168,76,0.20)'}`,
      },
    };
  }
  return {
    label: '✎',
    style: {
      fontSize: 9, padding: '1px 6px', borderRadius: 8,
      background: 'rgba(78,206,206,0.10)',
      color: TEAL,
      border: '1px solid rgba(78,206,206,0.20)',
    },
  };
}

function metaLabel(persona: ArcanaPersonaDefinition): string {
  if (persona.tier === 'system') return persona.subtitle || 'System';
  if (persona.status === 'active') return 'Aktiv';
  if (persona.status === 'archived') return 'Archiviert';
  return persona.subtitle || 'Entwurf';
}

function PersonaItem({
  persona,
  isSelected,
  onSelect,
}: {
  persona: ArcanaPersonaDefinition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const badge = badgeFor(persona);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        cursor: 'pointer',
        borderLeft: `2px solid ${isSelected ? GOLD : 'transparent'}`,
        background: isSelected ? 'rgba(201,168,76,0.05)' : 'transparent',
        transition: 'background 0.15s',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          border: '1px solid rgba(201,168,76,0.12)',
          background: 'rgba(201,168,76,0.06)',
          flexShrink: 0,
        }}
      >
        {persona.icon || '✦'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {persona.name}
        </div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 10, color: MUTED, marginTop: 1 }}>
          {metaLabel(persona)}
        </div>
      </div>
      <span style={badge.style}>{badge.label}</span>
    </div>
  );
}

export function ArcanaPersonaList({ personas, selectedId, onSelect, onCreate, loading }: ArcanaPersonaListProps) {
  const systemPersonas  = personas.filter((p) => p.tier === 'system');
  const userPersonas    = personas.filter((p) => p.tier === 'user_created');

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: S2,
        borderRight: '1px solid rgba(201,168,76,0.08)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(201,168,76,0.08)', flexShrink: 0 }}>
        <div style={{ fontFamily: TOKENS.font.display, fontSize: 11, letterSpacing: '2px', color: GOLD, marginBottom: 2 }}>
          ARCANA STUDIO
        </div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: MUTED }}>
          Personas verwalten
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '12px 14px', fontFamily: TOKENS.font.body, fontSize: 11, color: MUTED }}>Laden…</div>
      ) : null}

      {/* System section */}
      {systemPersonas.length > 0 && (
        <>
          <div style={{ padding: '10px 14px 5px', fontSize: 9, letterSpacing: '3px', color: MUTED2, fontFamily: TOKENS.font.body }}>
            SYSTEM
          </div>
          {systemPersonas.map((p) => (
            <PersonaItem key={p.id} persona={p} isSelected={selectedId === p.id} onSelect={() => onSelect(p.id)} />
          ))}
        </>
      )}

      {/* User section */}
      <div style={{ padding: '10px 14px 5px', fontSize: 9, letterSpacing: '3px', color: MUTED2, fontFamily: TOKENS.font.body }}>
        DEINE PERSONAS
      </div>
      {userPersonas.length > 0
        ? userPersonas.map((p) => (
            <PersonaItem key={p.id} persona={p} isSelected={selectedId === p.id} onSelect={() => onSelect(p.id)} />
          ))
        : (
          <div style={{ padding: '8px 14px', fontFamily: TOKENS.font.body, fontSize: 11, color: MUTED, fontStyle: 'italic', lineHeight: 1.5 }}>
            Noch keine eigenen Personas.
          </div>
        )
      }

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* New persona button */}
      <button
        type="button"
        onClick={onCreate}
        style={{
          margin: '0 12px 12px',
          padding: '8px',
          border: '1px dashed rgba(201,168,76,0.3)',
          borderRadius: 8,
          background: 'transparent',
          color: GOLD,
          fontFamily: TOKENS.font.display,
          fontSize: 10,
          letterSpacing: '2px',
          cursor: 'pointer',
          textAlign: 'center',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        ✦ NEUE PERSONA
      </button>
    </aside>
  );
}
