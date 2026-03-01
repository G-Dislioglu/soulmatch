import type { PersonaInfo } from '../types';
import { PERSONAS } from '../types';

interface Props {
  onSelect: (companion: PersonaInfo) => void;
}

export function CompanionSelectScreen({ onSelect }: Props) {
  return (
    <div className="sm-screen sm-screen--centered" id="s-companion">
      <div className="sm-step-label">◇ SOULMATCH · SCHRITT 1 VON 2</div>
      <div className="sm-step-title">Wähle deinen Begleitcharakter</div>
      <div className="sm-step-desc">
        Diese Persona begleitet dich dauerhaft. Sie beobachtet jedes Gespräch, kennt deinen Seelenweg und ist jederzeit direkt erreichbar. Jede Persona kann die Begleiterrolle vollständig übernehmen.
      </div>
      <div className="sm-p-grid">
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            className="sm-pc"
            style={{ ['--sm-pcol' as string]: persona.color }}
            onClick={() => onSelect(persona)}
            type="button"
          >
            <span className="sm-ico">{persona.icon}</span>
            <div className="sm-pn">{persona.name}</div>
            <div className="sm-pr">{persona.role}</div>
            <div className="sm-pt">{persona.trait}</div>
            <div className="sm-pd" style={{ background: persona.color, boxShadow: `0 0 8px ${persona.color}` }} />
          </button>
        ))}
      </div>
    </div>
  );
}
