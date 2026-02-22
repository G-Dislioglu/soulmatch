import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES, PERSONA_TITLES, PERSONA_TIERS } from '../lib/personaColors';

interface PersonaPickerProps {
  selectedPersonas: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

const COMPANION_PERSONAS = ['maya', 'luna', 'orion', 'lilith'];
const SPECIALIST_PERSONAS = ['stella', 'kael', 'lian', 'sibyl', 'amara'];
const META_PERSONAS = ['echo_prism'];

function PersonaChip({
  id,
  disabled,
  onSelect,
}: {
  id: string;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const color = PERSONA_COLORS[id] ?? '#d4af37';
  const icon = PERSONA_ICONS[id] ?? '◇';
  const name = PERSONA_NAMES[id] ?? id;
  const title = PERSONA_TITLES[id] ?? '';

  return (
    <button
      onClick={() => !disabled && onSelect(id)}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: disabled ? 'rgba(255,255,255,0.02)' : `${color}10`,
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : `${color}30`}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1, minWidth: 24, textAlign: 'center' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, color: disabled ? '#6b6560' : color, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 10, color: '#6b6560', marginTop: 1 }}>{title}</div>
      </div>
      {disabled && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6b6560' }}>aktiv</span>
      )}
    </button>
  );
}

export function PersonaPicker({ selectedPersonas, onSelect, onClose }: PersonaPickerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 16px 16px',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'rgba(12,10,20,0.97)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: '20px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0eadc' }}>Persona hinzufügen</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6b6560', cursor: 'pointer', fontSize: 18, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Begleiter */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Begleiter
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {COMPANION_PERSONAS.map((id) => (
              <PersonaChip
                key={id}
                id={id}
                disabled={selectedPersonas.includes(id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        {/* Spezialisten */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Spezialisten
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SPECIALIST_PERSONAS.map((id) => (
              <PersonaChip
                key={id}
                id={id}
                disabled={selectedPersonas.includes(id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        {/* Meta */}
        <div>
          <div style={{ fontSize: 10, color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Masters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {META_PERSONAS.map((id) => (
              <PersonaChip
                key={id}
                id={id}
                disabled={selectedPersonas.includes(id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
