import { useState } from 'react';
import { TOKENS } from '../../../design/tokens';

interface Props {
  open: boolean;
  liveTalkActive: boolean;
  onClose: () => void;
  onQuickCommand: (command: string) => void;
}

const QUICK_COMMANDS = [
  'Maya, fasse den Verlauf zusammen',
  'Maya, oeffne Luna',
  'Maya, schalte LiveTalk um',
  'Maya, gib mir eine klare Frage',
];

export function MayaOverlay({ open, liveTalkActive, onClose, onQuickCommand }: Props) {
  const [input, setInput] = useState('');

  if (!open) {
    return null;
  }

  return (
    <div onClick={onClose} style={styles.backdrop}>
      <div onClick={(event) => event.stopPropagation()} style={styles.panel}>
        <button onClick={onClose} style={styles.closeButton} type="button">
          ✕
        </button>

        <div style={styles.orbWrap}>
          <div style={styles.orbOuter}>
            <div style={styles.orbInner} />
          </div>
        </div>

        <div style={styles.kicker}>Maya Core Overlay</div>
        <div style={styles.title}>Dieselbe Maya, anderer Raum.</div>
        <div style={styles.copy}>
          {liveTalkActive
            ? 'LiveTalk ist aktiv. Maya kann gerade direkt mitfuehren, rahmen und auf den aktuellen Verlauf reagieren.'
            : 'Maya ist bereit. Oeffne einen Befehl, setze einen Fokus oder starte von hier in die naechste Persona.'}
        </div>

        <div style={styles.commandGrid}>
          {QUICK_COMMANDS.map((command) => (
            <button
              key={command}
              onClick={() => onQuickCommand(command)}
              style={styles.commandChip}
              type="button"
            >
              {command}
            </button>
          ))}
        </div>

        <div style={styles.memoryHint}>Maya Core Gedaechtnis bleibt Hinweisraum, nicht verdeckte Wahrheitsquelle.</div>

        <div style={styles.inputRow}>
          <textarea
            onChange={(event) => setInput(event.target.value)}
            placeholder="Freier Maya-Befehl oder Gedanke..."
            rows={3}
            style={styles.textarea}
            value={input}
          />
          <button
            onClick={() => {
              const next = input.trim();
              if (!next) {
                return;
              }
              onQuickCommand(next);
              setInput('');
            }}
            style={styles.sendButton}
            type="button"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 45,
    background: 'rgba(8,6,14,0.84)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    position: 'relative',
    width: 'min(720px, 100%)',
    borderRadius: 24,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: 'radial-gradient(circle at top, rgba(212,175,55,0.12), rgba(18,14,32,0.97) 38%, rgba(8,6,14,0.98) 100%)',
    boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
    padding: '36px 28px 28px',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 12,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'transparent',
    color: TOKENS.text2,
    cursor: 'pointer',
  },
  orbWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
  },
  orbOuter: {
    width: 132,
    height: 132,
    borderRadius: '50%',
    padding: 12,
    background: 'radial-gradient(circle, rgba(255,255,255,0.22), rgba(212,175,55,0.18) 40%, rgba(167,139,250,0.12) 72%, transparent 100%)',
    boxShadow: `0 0 42px ${TOKENS.goldGlow}`,
  },
  orbInner: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(212,175,55,0.24) 32%, rgba(8,6,14,0.96) 76%)',
    boxShadow: `inset 0 0 24px ${TOKENS.goldGlow}`,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: TOKENS.gold,
    fontFamily: TOKENS.font.body,
  },
  title: {
    marginTop: 12,
    fontFamily: TOKENS.font.display,
    fontSize: 36,
    color: TOKENS.text,
  },
  copy: {
    maxWidth: 560,
    margin: '14px auto 0',
    color: TOKENS.text2,
    fontFamily: TOKENS.font.body,
    fontSize: 14,
    lineHeight: 1.7,
  },
  commandGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 24,
  },
  commandChip: {
    padding: '10px 14px',
    borderRadius: 20,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: 'rgba(212,175,55,0.08)',
    color: TOKENS.text,
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
    fontSize: 13,
  },
  memoryHint: {
    marginTop: 24,
    color: TOKENS.text2,
    fontFamily: TOKENS.font.serif,
    fontSize: 17,
  },
  inputRow: {
    marginTop: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  textarea: {
    width: '100%',
    borderRadius: 18,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.card2,
    color: TOKENS.text,
    padding: '14px 16px',
    resize: 'vertical',
    minHeight: 96,
    fontFamily: TOKENS.font.body,
    fontSize: 14,
  },
  sendButton: {
    alignSelf: 'center',
    padding: '12px 18px',
    borderRadius: 24,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: TOKENS.gold,
    color: '#08060e',
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
    fontWeight: 600,
  },
};