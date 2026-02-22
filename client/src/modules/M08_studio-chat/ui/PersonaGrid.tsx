import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES, PERSONA_TITLES } from '../lib/personaColors';

interface PersonaGridProps {
  onSelectPersona: (id: string) => void;
}

const COMPANION_PERSONAS = ['maya', 'luna', 'orion', 'lilith'];
const SPECIALIST_PERSONAS = ['stella', 'kael', 'lian', 'sibyl', 'amara'];
const META_PERSONAS = ['echo_prism'];

function PersonaCard({ id, onClick }: { id: string; onClick: () => void }) {
  const color = PERSONA_COLORS[id] ?? '#d4af37';
  const icon = PERSONA_ICONS[id] ?? '◇';
  const name = PERSONA_NAMES[id] ?? id;
  const title = PERSONA_TITLES[id] ?? '';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '18px 12px 14px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}26`,
        cursor: 'pointer',
        transition: 'border-color 0.18s, background 0.18s',
        width: '100%',
        minHeight: 130,
        textAlign: 'center',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}50`;
        (e.currentTarget as HTMLButtonElement).style.background = `${color}08`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}26`;
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: `2px solid ${color}50`,
        background: `${color}12`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      {/* Name */}
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color,
        letterSpacing: '0.03em',
        lineHeight: 1.2,
      }}>
        {name}
      </div>
      {/* Title */}
      <div style={{
        fontSize: 10,
        color: '#8a8078',
        lineHeight: 1.3,
        maxWidth: 110,
      }}>
        {title}
      </div>
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10,
      color: '#6b6560',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      fontWeight: 600,
      marginBottom: 10,
      marginTop: 4,
    }}>
      {label}
    </div>
  );
}

export function PersonaGrid({ onSelectPersona }: PersonaGridProps) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 10,
    marginBottom: 20,
  };

  return (
    <div style={{ padding: '8px 0 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Wähle deine Begleitung
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22,
          fontWeight: 700,
          color: '#f0eadc',
          marginTop: 4,
        }}>
          Persona Chat
        </div>
        <div style={{ fontSize: 11, color: '#6b6560', marginTop: 6 }}>
          Klicke auf eine Persona um ein Gespräch zu starten
        </div>
      </div>

      {/* Begleiter */}
      <SectionLabel label="Begleiter" />
      <div style={gridStyle}>
        {COMPANION_PERSONAS.map((id) => (
          <PersonaCard key={id} id={id} onClick={() => onSelectPersona(id)} />
        ))}
      </div>

      {/* Spezialisten */}
      <SectionLabel label="Spezialisten" />
      <div style={gridStyle}>
        {SPECIALIST_PERSONAS.map((id) => (
          <PersonaCard key={id} id={id} onClick={() => onSelectPersona(id)} />
        ))}
      </div>

      {/* Masters — preview only */}
      <SectionLabel label="Masters · bald verfügbar" />
      <div style={gridStyle}>
        {META_PERSONAS.map((id) => (
          <PersonaCard key={id} id={id} onClick={() => onSelectPersona(id)} />
        ))}
        {/* Coming soon placeholders */}
        {['sokrates', 'rumi'].map((id) => {
          const color = '#4a4540';
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '18px 12px 14px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                opacity: 0.45,
                minHeight: 130,
                textAlign: 'center',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: `2px solid ${color}`,
                background: 'rgba(255,255,255,0.02)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: '#4a4540',
              }}>
                🔒
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4a4540' }}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </div>
              <div style={{ fontSize: 10, color: '#4a4540' }}>Bald verfügbar</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
