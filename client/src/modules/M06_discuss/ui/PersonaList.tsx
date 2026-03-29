import { useState } from 'react';
import { TOKENS } from '../../../design/tokens';
import type { PersonaInfo } from '../types';

interface Props {
  personas: PersonaInfo[];
  activePersonaId: string;
  liveTalkActive: boolean;
  onSelect: (persona: PersonaInfo) => void;
  onOpenSettings: (persona: PersonaInfo) => void;
  onOpenMayaOverlay: () => void;
}

export function PersonaList({
  personas,
  activePersonaId,
  liveTalkActive,
  onSelect,
  onOpenSettings,
  onOpenMayaOverlay,
}: Props) {
  const [hoveredPersonaId, setHoveredPersonaId] = useState<string | null>(null);
  const maya = personas.find((persona) => persona.id === 'maya') ?? personas[0];
  const specialists = personas.filter((persona) => persona.id !== 'maya');

  return (
    <aside style={styles.root}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Diskussionsraum</div>
          <div style={styles.title}>Maya und Spezialisten</div>
        </div>
        <button onClick={onOpenMayaOverlay} style={styles.mayaOrbButton} type="button">
          <span style={styles.mayaOrbCore} />
        </button>
      </div>

      {maya ? (
        <button
          key={maya.id}
          onClick={() => onSelect(maya)}
          style={{
            ...styles.mayaCard,
            ...(activePersonaId === maya.id ? styles.activeCard : null),
          }}
          type="button"
        >
          <div style={styles.goldLine} />
          <div style={styles.personaRow}>
            <div style={styles.personaMeta}>
              <div style={{ ...styles.avatar, borderColor: TOKENS.gold, boxShadow: `0 0 18px ${TOKENS.goldGlow}` }}>{maya.icon}</div>
              <div>
                <div style={styles.nameRow}>
                  <span style={{ ...styles.name, color: TOKENS.gold }}>{maya.name}</span>
                  <span style={styles.aiBadge}>AI</span>
                </div>
                <div style={styles.subRow}>
                  <span style={{ ...styles.liveDot, opacity: liveTalkActive ? 1 : 0.45 }} />
                  <span>{liveTalkActive ? 'Maya Core live verbunden' : 'Maya Core bereit'}</span>
                </div>
              </div>
            </div>
            <button
              aria-label="Maya Einstellungen"
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings(maya);
              }}
              style={styles.gearButton}
              type="button"
            >
              ⚙
            </button>
          </div>
          <div style={styles.trait}>{maya.role} · {maya.trait}</div>
        </button>
      ) : null}

      <div style={styles.dividerWrap}>
        <div style={styles.divider} />
        <span style={styles.dividerLabel}>Spezialisten</span>
        <div style={styles.divider} />
      </div>

      <div style={styles.list}>
        {specialists.map((persona) => {
          const isActive = activePersonaId === persona.id;
          const gearVisible = isActive || hoveredPersonaId === persona.id;

          return (
            <button
              key={persona.id}
              onMouseEnter={() => setHoveredPersonaId(persona.id)}
              onMouseLeave={() => setHoveredPersonaId((current) => (current === persona.id ? null : current))}
              onClick={() => onSelect(persona)}
              style={{
                ...styles.card,
                ...(isActive
                  ? {
                    borderColor: persona.color,
                    background: 'rgba(255,255,255,0.05)',
                    boxShadow: `0 0 0 1px ${persona.color}26 inset`,
                  }
                  : null),
              }}
              type="button"
            >
              <div style={styles.personaRow}>
                <div style={styles.personaMeta}>
                  <div style={{ ...styles.avatar, borderColor: isActive ? persona.color : TOKENS.b1 }}>{persona.icon}</div>
                  <div>
                    <div style={{ ...styles.name, color: isActive ? persona.color : TOKENS.text }}>{persona.name}</div>
                    <div style={styles.subtle}>{persona.role}</div>
                  </div>
                </div>
                <button
                  aria-label={`${persona.name} Einstellungen`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenSettings(persona);
                  }}
                  style={{
                    ...styles.gearButton,
                    opacity: gearVisible ? 1 : 0,
                    pointerEvents: gearVisible ? 'auto' : 'none',
                  }}
                  type="button"
                >
                  ⚙
                </button>
              </div>
              <div style={styles.trait}>{persona.trait}</div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '18px 14px 20px',
    borderRight: `2px solid ${TOKENS.b1}`,
    background: TOKENS.bg2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: TOKENS.text3,
    fontFamily: TOKENS.font.body,
  },
  title: {
    fontFamily: TOKENS.font.serif,
    fontSize: 18,
    color: TOKENS.text,
    letterSpacing: '0.04em',
  },
  mayaOrbButton: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35), ${TOKENS.goldGlow} 35%, rgba(8,6,14,0.98) 75%)`,
    boxShadow: `0 0 22px ${TOKENS.goldGlow}`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mayaOrbCore: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: TOKENS.gold,
    boxShadow: `0 0 14px ${TOKENS.gold}`,
  },
  mayaCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: 'linear-gradient(180deg, rgba(212,175,55,0.1), rgba(22,17,42,0.95) 38%)',
    padding: '16px 14px 14px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  activeCard: {
    boxShadow: `0 0 0 1px ${TOKENS.goldSoft} inset, 0 16px 36px rgba(0,0,0,0.34)`,
  },
  goldLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    background: TOKENS.gold,
  },
  card: {
    borderRadius: 16,
    border: `1.5px solid ${TOKENS.b2}`,
    background: 'rgba(255,255,255,0.02)',
    padding: '14px 12px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  personaRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  personaMeta: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `1.5px solid ${TOKENS.b1}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: TOKENS.bg3,
    color: TOKENS.text,
    fontSize: 18,
    flexShrink: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: TOKENS.font.serif,
    fontSize: 18,
    color: TOKENS.text,
    letterSpacing: '0.04em',
  },
  aiBadge: {
    padding: '2px 8px',
    borderRadius: 999,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    color: TOKENS.gold,
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: TOKENS.font.body,
  },
  subRow: {
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: TOKENS.text2,
    fontSize: 12,
    fontFamily: TOKENS.font.body,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: TOKENS.gold,
    boxShadow: `0 0 12px ${TOKENS.gold}`,
  },
  subtle: {
    marginTop: 4,
    color: TOKENS.text2,
    fontFamily: TOKENS.font.body,
    fontSize: 12,
  },
  trait: {
    marginTop: 12,
    color: TOKENS.text2,
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: TOKENS.font.body,
  },
  gearButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(255,255,255,0.02)',
    color: TOKENS.text2,
    cursor: 'pointer',
    flexShrink: 0,
  },
  dividerWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  divider: {
    flex: 1,
    height: 1,
    background: TOKENS.b1,
  },
  dividerLabel: {
    color: TOKENS.text3,
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontFamily: TOKENS.font.body,
  },
};