import { TOKENS } from '../../../design/tokens';

interface Props {
  active: boolean;
  micEnabled: boolean;
  ttsEnabled: boolean;
  selectedVoice: string;
}

export function LiveTalkBanner({ active, micEnabled, ttsEnabled, selectedVoice }: Props) {
  if (!active) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <div style={styles.status}>
        <span style={styles.pulse} />
        <span style={styles.title}>LiveTalk aktiv</span>
      </div>
      <div style={styles.metaRow}>
        <span style={styles.meta}>Mikrofon: {micEnabled ? 'an' : 'aus'}</span>
        <span style={styles.meta}>Gemini TTS: {ttsEnabled ? 'an' : 'aus'}</span>
        <span style={styles.meta}>Stimme: {selectedVoice}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    margin: '14px 22px 0',
    padding: '12px 14px',
    borderRadius: 16,
    border: '1.5px solid rgba(74,222,128,0.55)',
    background: 'rgba(74,222,128,0.12)',
    boxShadow: '0 0 24px rgba(74,222,128,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pulse: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: TOKENS.green,
    boxShadow: `0 0 14px ${TOKENS.green}`,
  },
  title: {
    fontFamily: TOKENS.font.serif,
    fontSize: 16,
    letterSpacing: '0.05em',
    color: TOKENS.text,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  meta: {
    padding: '6px 10px',
    borderRadius: 999,
    border: `1px solid ${TOKENS.greenSoft}`,
    color: TOKENS.text,
    fontFamily: TOKENS.font.body,
    fontSize: 12,
    background: 'rgba(8,6,14,0.22)',
  },
};