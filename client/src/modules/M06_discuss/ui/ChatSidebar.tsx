import type { PersonaInfo } from '../types';

interface Props {
  companion: PersonaInfo;
  persona: PersonaInfo;
  companionQuote: string;
  onNewChat: () => void;
  onCompanionChatClick: () => void;
}

const RESONANCE_ROWS = [
  { label: 'Offenheit', value: 72, color: 'var(--sm-luna)' },
  { label: 'Klarheit', value: 58, color: 'var(--sm-orion)' },
  { label: 'Resonanz', value: 84, color: 'var(--sm-gold)' },
  { label: 'Wachstum', value: 45, color: 'var(--sm-amara)' },
];

export function ChatSidebar({ companion, persona, companionQuote, onNewChat, onCompanionChatClick }: Props) {
  const recent = [
    { p: persona, preview: 'Aktuelles Gespräch', time: 'Jetzt', active: true },
    { p: { icon: '☽', name: 'Luna', color: 'var(--sm-luna)' }, preview: '„Du weißt bereits…"', time: 'Gestern' },
    { p: { icon: '△', name: 'Orion', color: 'var(--sm-orion)' }, preview: '„Die Sterne zeigen…"', time: '3 Tage' },
    { p: { icon: '💎', name: 'Amara', color: 'var(--sm-amara)' }, preview: '„Lass uns beginnen…"', time: '1 Woche' },
  ];

  return (
    <aside className="sm-sb">
      <div className="sm-sb-head">
        <div className="sm-sb-logo">◇ Soulmatch</div>
      </div>

      <div className="sm-comp-widget">
        <div className="sm-cw-top">
          <div className="sm-cw-av" style={{ borderColor: companion.color, boxShadow: `0 0 12px ${companion.color}38` }}>
            <span>{companion.icon}</span>
            <div className="sm-cw-pulse" />
          </div>
          <div>
            <div className="sm-cw-name">{companion.name}</div>
            <div className="sm-cw-role" style={{ color: companion.color }}>Deine Begleitung</div>
          </div>
        </div>
        <div className="sm-cw-quote">„{companionQuote}"</div>
        <button className="sm-cw-btn" onClick={onCompanionChatClick} type="button">
          ◈ Mit Begleitung sprechen
        </button>
      </div>

      <div className="sm-sb-sec">
        <div className="sm-sb-sec-t">Seelenresonanz</div>
      </div>

      <div className="sm-soul-box">
        {RESONANCE_ROWS.map((row) => (
          <div className="sm-st-row" key={row.label}>
            <div className="sm-st-l">{row.label}</div>
            <div className="sm-st-bar">
              <div className="sm-st-fill" style={{ width: `${row.value}%`, background: row.color }} />
            </div>
            <div className="sm-st-v">{row.value}</div>
          </div>
        ))}
      </div>

      <div className="sm-sb-sec">
        <div className="sm-sb-sec-t">Letzte Gespräche</div>
      </div>

      <div>
        {recent.map((item, index) => (
          <div className={`sm-rc-item${item.active ? ' active' : ''}`} key={`${item.p.name}-${index}`}>
            <div className="sm-rc-ico">{item.p.icon}</div>
            <div className="sm-rc-info">
              <div className="sm-rc-n" style={{ color: item.p.color }}>{item.p.name}</div>
              <div className="sm-rc-p">{item.preview}</div>
            </div>
            <div className="sm-rc-t">{item.time}</div>
          </div>
        ))}
      </div>

      <div className="sm-grow" />
      <button className="sm-sb-new" onClick={onNewChat} type="button">
        + Neues Gespräch
      </button>
    </aside>
  );
}
