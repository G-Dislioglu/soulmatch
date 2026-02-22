import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES } from '../lib/personaColors';

interface PersonaBarProps {
  selectedPersonas: string[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  maxPersonas?: number;
  audioMode: boolean;
  onToggleAudio: () => void;
  onBack: () => void;
}

export function PersonaBar({
  selectedPersonas,
  onAdd,
  onRemove,
  maxPersonas = 3,
  audioMode,
  onToggleAudio,
  onBack,
}: PersonaBarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(8,6,15,0.85)',
      backdropFilter: 'blur(12px)',
      flexWrap: 'wrap',
      minHeight: 52,
    }}>
      {/* Zurück-Button */}
      <button
        onClick={onBack}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
          color: '#b0a898',
          cursor: 'pointer',
          fontSize: 14,
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        ← Zurück
      </button>

      {/* Persona Chips */}
      <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {selectedPersonas.map((id) => {
          const color = PERSONA_COLORS[id] ?? '#d4af37';
          const icon = PERSONA_ICONS[id] ?? '◇';
          const name = PERSONA_NAMES[id] ?? id;
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                background: `${color}18`,
                border: `1px solid ${color}40`,
                fontSize: 12,
                color,
                fontWeight: 600,
                letterSpacing: '0.03em',
              }}
            >
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span>{name}</span>
              {selectedPersonas.length > 1 && (
                <button
                  onClick={() => onRemove(id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: `${color}80`,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '0 0 0 2px',
                    lineHeight: 1,
                  }}
                  title={`${name} entfernen`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* + Hinzufügen */}
        {selectedPersonas.length < maxPersonas && (
          <button
            onClick={onAdd}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.18)',
              borderRadius: 20,
              color: '#6b6560',
              cursor: 'pointer',
              fontSize: 12,
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            + Hinzufügen
          </button>
        )}
      </div>

      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        title={audioMode ? 'Audio deaktivieren' : 'Audio aktivieren'}
        style={{
          background: audioMode ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${audioMode ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: 8,
          color: audioMode ? '#d4af37' : '#6b6560',
          cursor: 'pointer',
          fontSize: 16,
          padding: '5px 10px',
          flexShrink: 0,
        }}
      >
        🔊
      </button>
    </div>
  );
}
