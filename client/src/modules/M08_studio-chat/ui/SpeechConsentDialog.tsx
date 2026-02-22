interface SpeechConsentDialogProps {
  onAccept: () => void;
  onCancel: () => void;
}

export function SpeechConsentDialog({ onAccept, onCancel }: SpeechConsentDialogProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'rgba(20,18,28,0.98)',
        border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: 14,
        padding: '20px 24px',
        maxWidth: 360,
        width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 20, marginBottom: 12, textAlign: 'center' }}>
          🎤 Spracheingabe aktivieren
        </div>
        <div style={{
          fontSize: 13,
          color: '#a8a298',
          lineHeight: 1.6,
          marginBottom: 20,
          textAlign: 'center',
        }}>
          Dein Browser nutzt Spracherkennung, um deine Worte in Text umzuwandeln.
          Die Verarbeitung erfolgt durch deinen Browser-Anbieter (Google/Apple/Microsoft).
          <strong style={{ color: '#d4cfc8' }}> Soulmatch speichert keine Audiodaten.</strong>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#8a8580',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onAccept}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid rgba(212,175,55,0.40)',
              background: 'rgba(212,175,55,0.15)',
              color: '#d4af37',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Verstanden & Aktivieren
          </button>
        </div>
      </div>
    </div>
  );
}
