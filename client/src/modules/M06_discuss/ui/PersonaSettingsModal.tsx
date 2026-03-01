import { useState } from 'react';
import type { PersonaInfo } from '../types';

interface Props {
  persona: PersonaInfo;
  open: boolean;
  onClose: () => void;
}

export function PersonaSettingsModal({ persona, open, onClose }: Props) {
  const [depth, setDepth] = useState(3);
  const [length, setLength] = useState(3);
  const [styles, setStyles] = useState<string[]>(['Poetisch']);
  const [language, setLanguage] = useState('Deutsch');
  const [topics, setTopics] = useState<string[]>(['Beziehungen', 'Emotionen']);
  const [toggles, setToggles] = useState({
    memory: true,
    proactive: true,
    mirroring: false,
    informCompanion: true,
    audio: true,
  });

  const toggleItem = (value: string, current: string[], setFn: (next: string[]) => void) => {
    setFn(current.includes(value) ? current.filter((x) => x !== value) : [...current, value]);
  };

  return (
    <div
      className={`sm-modal-bd${open ? ' open' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
      style={{
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: '40px 20px',
      }}
    >
      <div
        className="sm-modal"
        style={{
          position: 'relative',
        }}
      >
        <div className="sm-modal-hd">
          <div className="sm-modal-av" style={{ borderColor: persona.color }}>{persona.icon}</div>
          <div>
            <div className="sm-modal-title">{persona.name} · Einstellungen</div>
            <div className="sm-modal-sub">Passe deine Gesprächspartnerin an</div>
          </div>
          <button className="sm-modal-x" type="button" onClick={onClose}>✕</button>
        </div>

        <div className="sm-modal-body">
          <div className="sm-sg">
            <div className="sm-sg-label">◈ Gesprächstiefe</div>
            <div className="sm-sg-desc">Wie tief soll die Persona in deine Fragen eindringen?</div>
            <div className="sm-sl-row">
              <span className="sm-sl-end">Sanft</span>
              <input className="sm-sl" type="range" min={1} max={5} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
              <span className="sm-sl-v">{depth}</span>
              <span className="sm-sl-end">Tief</span>
            </div>
          </div>

          <div className="sm-sg">
            <div className="sm-sg-label">◈ Antwortlänge</div>
            <div className="sm-sl-row">
              <span className="sm-sl-end">Kurz</span>
              <input className="sm-sl" type="range" min={1} max={5} value={length} onChange={(e) => setLength(Number(e.target.value))} />
              <span className="sm-sl-v">{length}</span>
              <span className="sm-sl-end">Lang</span>
            </div>
          </div>

          <div className="sm-sg">
            <div className="sm-sg-label">◈ Kommunikationsstil</div>
            <div className="sm-chip-g">
              {['Poetisch', 'Direkt', 'Socratic', 'Metaphorisch', 'Herausfordernd'].map((item) => (
                <button key={item} className={`sm-chip${styles.includes(item) ? ' on' : ''}`} type="button" onClick={() => toggleItem(item, styles, setStyles)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="sm-sg">
            <div className="sm-sg-label">◈ Sprache</div>
            <div className="sm-chip-g">
              {['Deutsch', 'English', 'Türkçe'].map((item) => (
                <button key={item} className={`sm-chip${language === item ? ' on' : ''}`} type="button" onClick={() => setLanguage(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="sm-sg">
            <div className="sm-sg-label">◈ Themen-Fokus</div>
            <div className="sm-chip-g">
              {['Beziehungen', 'Emotionen', 'Träume', 'Intuition', 'Vergangenheit', 'Zukunft'].map((item) => (
                <button key={item} className={`sm-chip${topics.includes(item) ? ' on' : ''}`} type="button" onClick={() => toggleItem(item, topics, setTopics)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="sm-sg">
            <div className="sm-sg-label">◈ Verhalten</div>
            <div className="sm-tg-group">
              <ToggleRow label="Session-Gedächtnis" sub="Erinnert sich an vorherige Gespräche" checked={toggles.memory} onChange={(checked) => setToggles((s) => ({ ...s, memory: checked }))} />
              <ToggleRow label="Proaktive Fragen" sub="Stellt vertiefende Fragen von sich aus" checked={toggles.proactive} onChange={(checked) => setToggles((s) => ({ ...s, proactive: checked }))} />
              <ToggleRow label="Emotionale Spiegelung" sub="Spiegelt deine Emotionen zurück" checked={toggles.mirroring} onChange={(checked) => setToggles((s) => ({ ...s, mirroring: checked }))} />
              <ToggleRow label="Begleitung informieren" sub="Erkenntnisse automatisch mit Begleitung teilen" checked={toggles.informCompanion} onChange={(checked) => setToggles((s) => ({ ...s, informCompanion: checked }))} />
              <ToggleRow label="Audio-Antworten" sub="Persona antwortet auch per Sprache" checked={toggles.audio} onChange={(checked) => setToggles((s) => ({ ...s, audio: checked }))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, sub, checked, onChange }: ToggleRowProps) {
  return (
    <div className="sm-tg-row">
      <div>
        <div className="sm-tg-label">{label}</div>
        <div className="sm-tg-sub">{sub}</div>
      </div>
      <label className="sm-tgl">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="sm-tgl-t" />
      </label>
    </div>
  );
}
