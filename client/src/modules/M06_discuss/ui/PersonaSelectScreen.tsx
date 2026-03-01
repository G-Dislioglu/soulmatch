import type { PersonaInfo } from '../types';
import { PERSONAS } from '../types';

interface Props {
  companion: PersonaInfo;
  onSelect: (persona: PersonaInfo) => void;
  onBack: () => void;
}

export function PersonaSelectScreen({ companion, onSelect, onBack }: Props) {
  const options = PERSONAS.filter((p) => p.id !== companion.id);
  void onBack;

  return (
    <div className="sm-screen sm-screen--centered" id="s-persona">
      <div className="sm-cb-badge">
        <div className="sm-cb-dot" style={{ background: companion.color, boxShadow: `0 0 8px ${companion.color}` }} />
        <div>
          <div className="sm-cb-name">{companion.name}</div>
          <div className="sm-cb-text">ist deine Begleitung · immer dabei</div>
        </div>
      </div>

      <div className="sm-step-label">◇ SCHRITT 2 VON 2</div>
      <div className="sm-step-title">Mit wem möchtest du heute sprechen?</div>
      <div className="sm-step-desc">
        <span className="sm-companion-inline" style={{ color: companion.color }}>
          {companion.icon} {companion.name}
        </span>{' '}
        ist deine Begleitung · beobachtet alle Gespräche.
      </div>

      <div className="sm-p-grid">
        {options.map((persona) => (
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
