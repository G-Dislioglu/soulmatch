import { useState, type CSSProperties } from 'react';

interface VoiceRitualProps {
  personaId: string;
  personaName: string;
  personaIcon: string;
  personaColor: string;
  onComplete: (voiceRegistered: boolean) => void;
}

export function VoiceRitual({
  personaName,
  personaIcon,
  personaColor,
  onComplete,
}: VoiceRitualProps) {
  const [phase, setPhase] = useState<'intro' | 'pending' | 'done'>('intro');

  return (
    <div className="voice-ritual-overlay">
      <div className="voice-ritual-card">
        <div
          className="ritual-avatar"
          style={{ '--ritual-color': personaColor } as CSSProperties}
        >
          {personaIcon}
        </div>

        {phase === 'intro' && (
          <>
            <p className="ritual-text">
              Bevor wir sprechen –<br />
              sag mir etwas.<br />
              <em>Irgendetwas.</em>
            </p>
            <p className="ritual-sub">
              Ich möchte lernen wie du klingst.
            </p>
            <p className="ritual-consent">
              Darf {personaName} sich deine Stimme merken?
            </p>
            <div className="ritual-buttons">
              <button
                className="btn-primary"
                onClick={() => setPhase('pending')}
              >
                Ja – beginnen
              </button>
              <button
                className="btn-ghost"
                onClick={() => onComplete(false)}
              >
                Lieber nicht
              </button>
            </div>
          </>
        )}

        {phase === 'pending' && (
          <>
            <p className="ritual-text">
              <em>Diese Funktion<br />kommt bald.</em>
            </p>
            <p className="ritual-sub">
              Dein Stimmprofil wird beim nächsten Update aktiviert.
            </p>
            <button
              className="btn-primary"
              onClick={() => onComplete(false)}
            >
              Verstanden – weiter →
            </button>
          </>
        )}

        {phase === 'done' && (
          <>
            <p className="ritual-text">
              Ich kenne dich jetzt.<br />
              <em>Nicht alles –<br />aber genug.</em>
            </p>
            <button
              className="btn-primary"
              onClick={() => onComplete(true)}
            >
              Beginnen →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
