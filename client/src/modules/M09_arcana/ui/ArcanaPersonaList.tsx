import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';

interface ArcanaPersonaListProps {
  personas: ArcanaPersonaDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
}

function statusLabel(status: ArcanaPersonaDefinition['status']): string {
  if (status === 'active') return 'Aktiv';
  if (status === 'archived') return 'Archiviert';
  return 'Entwurf';
}

function statusColor(status: ArcanaPersonaDefinition['status']): string {
  if (status === 'active') return TOKENS.green;
  if (status === 'archived') return '#f87171';
  return TOKENS.text2;
}

function renderPersonaRow(
  persona: ArcanaPersonaDefinition,
  selectedId: string | null,
  onSelect: (id: string) => void,
) {
  const isActive = selectedId === persona.id;
  const isSystem = persona.tier === 'system';

  return (
    <button
      key={persona.id}
      type="button"
      onClick={() => onSelect(persona.id)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px 14px 13px',
        borderRadius: 18,
        border: `1.5px solid ${isActive ? TOKENS.gold : TOKENS.b2}`,
        background: isActive ? 'rgba(212,175,55,0.09)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: isActive ? '0 0 24px rgba(212,175,55,0.08)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ color: isSystem ? TOKENS.gold : TOKENS.text2, fontSize: 16 }}>{persona.icon || '✦'}</span>
          <span
            style={{
              fontFamily: TOKENS.font.serif,
              fontSize: 24,
              color: TOKENS.text,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {persona.name}
          </span>
        </div>
        <span
          style={{
            borderRadius: 999,
            border: `1.5px solid ${isSystem ? TOKENS.gold : statusColor(persona.status)}55`,
            color: isSystem ? TOKENS.gold : statusColor(persona.status),
            padding: '3px 8px',
            fontSize: 10,
            fontFamily: TOKENS.font.body,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            flexShrink: 0,
          }}
        >
          {isSystem ? 'SYS' : statusLabel(persona.status)}
        </span>
      </div>
      <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2, lineHeight: 1.5 }}>
        {persona.subtitle || (isSystem ? 'System-Persona' : 'Entwurf')} · {statusLabel(persona.status)}
      </div>
    </button>
  );
}

export function ArcanaPersonaList({ personas, selectedId, onSelect, onCreate, loading }: ArcanaPersonaListProps) {
  const systemPersonas = personas.filter((persona) => persona.tier === 'system');
  const userPersonas = personas.filter((persona) => persona.tier === 'user_created');

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        borderRight: `1.5px solid ${TOKENS.b1}`,
        background: 'rgba(255,255,255,0.025)',
        padding: '20px 16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <div style={{ fontFamily: TOKENS.font.display, fontSize: 22, color: TOKENS.text, letterSpacing: '0.06em' }}>Arcana Studio</div>
        <div style={{ marginTop: 6, fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>
          System-Personas, Entwuerfe und neue Archetypen in einer Werkstatt.
        </div>
      </div>

      <button
        type="button"
        onClick={onCreate}
        style={{
          border: `1.5px solid ${TOKENS.gold}`,
          background: 'rgba(212,175,55,0.08)',
          color: TOKENS.gold,
          borderRadius: 18,
          padding: '13px 14px',
          fontFamily: TOKENS.font.body,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        + Neue Persona
      </button>

      {loading ? (
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Lade Arcana-Personas...</div>
      ) : null}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>System</div>
        {systemPersonas.map((persona) => renderPersonaRow(persona, selectedId, onSelect))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Deine Personas</div>
        {userPersonas.length > 0 ? userPersonas.map((persona) => renderPersonaRow(persona, selectedId, onSelect)) : (
          <div
            style={{
              border: `1.5px dashed ${TOKENS.b2}`,
              borderRadius: 18,
              padding: '14px 12px',
              color: TOKENS.text2,
              fontFamily: TOKENS.font.body,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Noch keine eigenen Personas. Lege eine neue Persona an, um hier deinen ersten Entwurf zu sehen.
          </div>
        )}
      </section>
    </aside>
  );
}
