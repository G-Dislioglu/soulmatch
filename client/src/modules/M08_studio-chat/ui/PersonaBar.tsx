import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES } from '../lib/personaColors';

interface PersonaBarProps {
  selectedPersonas: string[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  maxPersonas?: number;
  audioMode: boolean;
  onToggleAudio: () => void;
  onBack: () => void;
  continuousMode?: boolean;
  onToggleContinuous?: () => void;
  isSpeechSupported?: boolean;
}

export function PersonaBar({
  selectedPersonas,
  onAdd,
  onRemove,
  maxPersonas = 3,
  audioMode,
  onToggleAudio,
  onBack,
  continuousMode = false,
  onToggleContinuous,
  isSpeechSupported = false,
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

      {/* Live Talk Toggle (vereint Audio & Mic) */}
      {isSpeechSupported && onToggleContinuous && (
        <button
          onClick={() => {
            onToggleContinuous();
            // Wenn Live Talk aktiviert wird, schalte auch Audio ein (falls aus)
            if (!continuousMode && !audioMode) {
              onToggleAudio();
            }
          }}
          style={{
            background: continuousMode ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.04)',
            border: continuousMode ? '2px solid rgba(34,197,94,0.65)' : '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8,
            color: continuousMode ? '#22c55e' : '#6b6560',
            cursor: 'pointer',
            fontSize: 13,
            padding: continuousMode ? '6px 12px' : '5px 10px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: continuousMode ? 600 : 400,
            animation: continuousMode ? 'pulse 1.5s infinite' : 'none',
          }}
        >
          <span style={{ fontSize: 16 }}>🎙️</span>
          <span>Live Talk</span>
          {continuousMode && (
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 1s infinite',
            }} />
          )}
        </button>
      )}
    </div>
  );
}
