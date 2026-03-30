import { TOKENS } from '../../../design';
import type { ArcanaPersonaDefinition } from '../hooks/useArcanaApi';

interface ArcanaPersonaTuningProps {
  persona: ArcanaPersonaDefinition | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ArcanaPersonaTuning({ persona, onSave, onCancel }: ArcanaPersonaTuningProps) {
  if (!persona) {
    return (
      <section
        style={{
          minHeight: 0,
          height: '100%',
          overflowY: 'auto',
          padding: '24px 24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontFamily: TOKENS.font.display, fontSize: 28, color: TOKENS.text }}>Persona Fine-Tuning</div>
          <div style={{ marginTop: 12, fontFamily: TOKENS.font.body, fontSize: 14, lineHeight: 1.8, color: TOKENS.text2 }}>
            Waehle eine Persona aus oder erstelle eine neue. Phase 6.1 baut nur die Werkstatt-Schale, die Regler und Quirks folgen in Phase 6.2.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        minHeight: 0,
        height: '100%',
        overflowY: 'auto',
        padding: '24px 24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.gold, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Persona Fine-Tuning
        </div>
        <div style={{ marginTop: 10, fontFamily: TOKENS.font.serif, fontSize: 34, color: TOKENS.text }}>{persona.name}</div>
        <div style={{ marginTop: 8, fontFamily: TOKENS.font.body, fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
          {persona.tier === 'system'
            ? 'System-Personas sind in Phase 6.1 read-only. Die Detailsteuerung bleibt fuer Phase 6.2 reserviert.'
            : 'Tuning-Optionen werden in Phase 6.2 implementiert. Diese Spalte reserviert bereits den Platz fuer Charakter, Ton, Quirks und Voice-Tuning.'}
        </div>
      </div>

      <div
        style={{
          border: `1.5px dashed ${TOKENS.b2}`,
          borderRadius: 22,
          background: 'rgba(255,255,255,0.02)',
          padding: '22px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Name und Archetyp</div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Beschreibung</div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Charakter-Tuning, Ton-Modus, Signature Quirks</div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>Stimme, Akzent, Tempo, Pausen, Emotion</div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button
          type="button"
          disabled
          onClick={onCancel}
          style={{
            border: `1.5px solid ${TOKENS.b1}`,
            background: 'rgba(255,255,255,0.03)',
            color: TOKENS.text3,
            borderRadius: 16,
            padding: '12px 16px',
            fontFamily: TOKENS.font.body,
            cursor: 'not-allowed',
          }}
        >
          Abbrechen
        </button>
        <button
          type="button"
          disabled
          onClick={onSave}
          style={{
            border: `1.5px solid ${TOKENS.gold}`,
            background: 'rgba(212,175,55,0.08)',
            color: `${TOKENS.gold}88`,
            borderRadius: 16,
            padding: '12px 16px',
            fontFamily: TOKENS.font.body,
            cursor: 'not-allowed',
          }}
        >
          Persona speichern
        </button>
      </div>
    </section>
  );
}
