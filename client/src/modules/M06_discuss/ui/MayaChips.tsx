import { TOKENS } from '../../../design/tokens';

interface Props {
  visible: boolean;
  chips: string[];
}

export function MayaChips({ visible, chips }: Props) {
  if (!visible || chips.length === 0) {
    return null;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.labelRow}>
        <span style={styles.dot} />
        <span style={styles.label}>Maya Memory Kontext</span>
      </div>
      <div style={styles.row}>
        {chips.map((chip) => (
          <span key={chip} style={styles.chip}>
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: '14px 22px 10px',
    borderBottom: `1.5px solid ${TOKENS.b2}`,
    background: 'linear-gradient(180deg, rgba(212,175,55,0.06), rgba(13,10,26,0.88))',
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: TOKENS.gold,
    boxShadow: `0 0 10px ${TOKENS.gold}`,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: TOKENS.gold,
    fontFamily: TOKENS.font.body,
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    padding: '8px 12px',
    borderRadius: 20,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: 'rgba(212,175,55,0.07)',
    color: TOKENS.text,
    fontFamily: TOKENS.font.body,
    fontSize: 12,
    lineHeight: 1.3,
  },
};