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

const DEMO_USER_PERSONAS = [
  { id: '__demo_napoleon__', name: 'Napoleon', subtitle: 'Nutzer-Persona', icon: '🫡' },
  { id: '__demo_sokrates__', name: 'Sokrates', subtitle: 'Nutzer-Persona', icon: '🧠' },
  { id: '__demo_freud__', name: 'Freud', subtitle: 'Nutzer-Persona', icon: '🛋️' },
] as const;

function fallbackIconFor(name: string): string {
  const key = name.toLowerCase();
  if (key === 'maya') return '🌙';
  if (key === 'luna') return '🌕';
  if (key === 'orion') return '⭐';
  if (key === 'lilith') return '🦂';
  if (key === 'stella') return '✨';
  if (key === 'kael') return '⚔️';
  if (key === 'lian') return '🍃';
  if (key === 'sibyl') return '🔮';
  if (key === 'amara') return '🔥';
  if (key === 'sri') return '🕉️';
  return '✦';
}

function badgeFor(persona: ArcanaPersonaDefinition) {
  const isMaya = persona.name.toLowerCase() === 'maya';
  if (persona.tier === 'system') {
    return {
      label: isMaya ? 'Maya Special' : 'SYS',
      style: {
        fontSize: 9, padding: '1px 7px', borderRadius: 8,
        background: isMaya ? 'rgba(176,109,176,0.12)' : 'rgba(201,168,76,0.10)',
        color: isMaya ? MAYA : GOLD,
        border: `1px solid ${isMaya ? 'rgba(176,109,176,0.25)' : 'rgba(201,168,76,0.20)'}`,
      },
    };
  }

  if (persona.status === 'draft') {
    return {
      label: 'Entwurf',
      style: {
        fontSize: 9, padding: '1px 7px', borderRadius: 8,
        background: 'rgba(120,113,255,0.12)',
        color: '#BEB4FF',
        border: '1px solid rgba(120,113,255,0.25)',
      },
    };
  }

  return {
    label: 'DEIN',
    style: {
      fontSize: 9, padding: '1px 7px', borderRadius: 8,
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
  disabled = false,
}: {
  persona: ArcanaPersonaDefinition;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const badge = badgeFor(persona);
  const isMaya = persona.name.toLowerCase() === 'maya';
  const avatarBackground = persona.tier === 'system'
    ? (isMaya ? 'linear-gradient(135deg, rgba(176,109,176,0.32), rgba(124,106,247,0.3))' : 'linear-gradient(135deg, rgba(201,168,76,0.28), rgba(148,119,41,0.24))')
    : (persona.status === 'draft' ? 'linear-gradient(135deg, rgba(124,106,247,0.34), rgba(157,139,255,0.24))' : 'linear-gradient(135deg, rgba(78,206,206,0.32), rgba(53,167,167,0.22))');
  const avatarBorder = persona.tier === 'system'
    ? (isMaya ? '1px solid rgba(176,109,176,0.35)' : '1px solid rgba(201,168,76,0.35)')
    : (persona.status === 'draft' ? '1px solid rgba(124,106,247,0.35)' : '1px solid rgba(78,206,206,0.3)');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) onSelect(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        cursor: disabled ? 'default' : 'pointer',
        borderLeft: `2px solid ${isSelected ? GOLD : 'transparent'}`,
        background: isSelected ? 'rgba(201,168,76,0.05)' : 'transparent',
        transition: 'background 0.15s',
        userSelect: 'none',
        opacity: disabled ? 0.92 : 1,
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
          border: avatarBorder,
          background: avatarBackground,
          flexShrink: 0,
        }}
      >
        {persona.icon || fallbackIconFor(persona.name)}
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
  const hasRealUserPersonas = userPersonas.length > 0;

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
      {loading
        ? (
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        )
        : hasRealUserPersonas
          ? userPersonas.map((p) => (
              <PersonaItem key={p.id} persona={p} isSelected={selectedId === p.id} onSelect={() => onSelect(p.id)} />
            ))
          : (
          <>
            {DEMO_USER_PERSONAS.map((entry) => {
              const demoPersona = {
                id: entry.id,
                name: entry.name,
                subtitle: entry.subtitle,
                icon: entry.icon,
                tier: 'user_created',
                status: 'active',
              } as ArcanaPersonaDefinition;

              return (
                <PersonaItem
                  key={entry.id}
                  persona={demoPersona}
                  isSelected={false}
                  onSelect={() => {}}
                  disabled
                />
              );
            })}
            <div style={{ padding: '8px 14px', fontFamily: TOKENS.font.body, fontSize: 11, color: MUTED, fontStyle: 'italic', lineHeight: 1.5 }}>
              Demo-Ansicht. Erstelle unten deine erste Persona.
            </div>
          </>
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
