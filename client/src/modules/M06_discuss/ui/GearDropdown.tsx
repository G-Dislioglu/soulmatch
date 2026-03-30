import { VOICE_CATALOG } from '../../../data/voiceCatalog';
import type { LiveTalkController } from '../../../hooks/useLiveTalk';
import { TOKENS } from '../../../design/tokens';

interface Props {
  open: boolean;
  liveTalk: LiveTalkController;
  onOpenSettings: () => void;
}

export function GearDropdown({ open, liveTalk, onOpenSettings }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div style={styles.panel}>
      <div style={styles.heading}>LiveTalk Einstellungen</div>

      <ToggleRow
        checked={liveTalk.micEnabled}
        description="Spracheingabe fuer freies Sprechen"
        label="Mikrofon"
        onToggle={liveTalk.toggleMic}
      />
      <ToggleRow
        checked={liveTalk.ttsEnabled}
        description="Antworten mit Gemini TTS vorlesen"
        label="TTS"
        onToggle={liveTalk.toggleTTS}
      />
      <ToggleRow
        checked={liveTalk.autoSend}
        description="Transkript sofort als Nachricht senden"
        label="Auto-Senden"
        onToggle={liveTalk.toggleAutoSend}
      />

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Stimme waehlen</div>
        <select
          onChange={(event) => liveTalk.setVoice(event.target.value)}
          style={styles.select}
          value={liveTalk.selectedVoice}
        >
          <optgroup label="Weiblich">
            {VOICE_CATALOG.filter((entry) => entry.gender === 'female').map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Maennlich">
            {VOICE_CATALOG.filter((entry) => entry.gender === 'male').map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Neutral">
            {VOICE_CATALOG.filter((entry) => entry.gender === 'neutral').map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div style={styles.note}>
        LiveTalk nutzt hier die Gemini-TTS-Stimmen fuer das Vorlesen von Antworten.
      </div>

      <button onClick={onOpenSettings} style={styles.linkButton} type="button">
        Erweiterte Persona Settings oeffnen
      </button>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, description, checked, onToggle }: ToggleRowProps) {
  return (
    <div style={styles.row}>
      <div>
        <div style={styles.rowLabel}>{label}</div>
        <div style={styles.rowDescription}>{description}</div>
      </div>
      <button
        aria-pressed={checked}
        onClick={onToggle}
        style={{
          ...styles.switch,
          ...(checked ? styles.switchOn : null),
        }}
        type="button"
      >
        <span
          style={{
            ...styles.switchThumb,
            transform: checked ? 'translateX(18px)' : 'translateX(0px)',
            background: checked ? TOKENS.gold : TOKENS.text2,
          }}
        />
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 10px)',
    width: 320,
    borderRadius: 18,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.card,
    boxShadow: TOKENS.shadow.dropdown,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    zIndex: 20,
  },
  heading: {
    fontFamily: TOKENS.font.serif,
    fontSize: 18,
    letterSpacing: '0.05em',
    color: TOKENS.text,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b2}`,
    background: TOKENS.card2,
  },
  rowLabel: {
    color: TOKENS.text,
    fontSize: 13,
    fontFamily: TOKENS.font.body,
  },
  rowDescription: {
    marginTop: 3,
    color: TOKENS.text2,
    fontSize: 12,
    fontFamily: TOKENS.font.body,
  },
  switch: {
    width: 42,
    height: 24,
    borderRadius: 999,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.bg3,
    padding: 2,
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
  },
  switchOn: {
    background: 'rgba(212,175,55,0.14)',
    borderColor: TOKENS.goldSoft,
  },
  switchThumb: {
    display: 'block',
    width: 16,
    height: 16,
    borderRadius: '50%',
    transition: 'transform 0.2s ease',
  },
  section: {
    padding: '12px 12px 10px',
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b2}`,
    background: TOKENS.card2,
  },
  sectionLabel: {
    marginBottom: 10,
    color: TOKENS.text2,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontSize: 11,
    fontFamily: TOKENS.font.body,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.bg3,
    color: TOKENS.text,
    fontFamily: TOKENS.font.body,
    fontSize: 13,
  },
  note: {
    padding: '10px 12px',
    borderRadius: 12,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: 'rgba(212,175,55,0.06)',
    color: TOKENS.text2,
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: TOKENS.font.body,
  },
  linkButton: {
    padding: '10px 12px',
    borderRadius: 12,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'transparent',
    color: TOKENS.text,
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
  },
};