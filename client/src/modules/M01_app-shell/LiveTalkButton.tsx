import type { CSSProperties } from 'react';
import { TOKENS } from '../../design';
import type { LiveTalkController } from '../../hooks/useLiveTalk';

type LiveTalkVariant = 'sidebar' | 'topbar';

interface LiveTalkButtonProps {
  variant: LiveTalkVariant;
  liveTalk: Pick<LiveTalkController, 'liveTalkActive' | 'toggleLiveTalk'>;
}

function getCopy(isActive: boolean) {
  if (isActive) {
    return {
      label: 'LiveTalk aktiv',
      subLabel: 'Sprich oder schreib frei',
    };
  }

  return {
    label: 'LiveTalk',
    subLabel: 'Klicken zum Aktivieren',
  };
}

export function LiveTalkButton({ variant, liveTalk }: LiveTalkButtonProps) {
  const isActive = liveTalk.liveTalkActive;
  const copy = getCopy(isActive);
  const isSidebar = variant === 'sidebar';

  const buttonStyle: CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isSidebar ? 'flex-start' : 'space-between',
    gap: isSidebar ? 12 : 10,
    padding: isSidebar ? '14px 16px' : '10px 14px',
    borderRadius: isSidebar ? TOKENS.radius2 : TOKENS.radiusRound,
    border: `1.5px solid ${isActive ? 'rgba(74,222,128,0.55)' : TOKENS.b1}`,
    background: isActive ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
    boxShadow: isActive ? '0 0 24px rgba(74,222,128,0.15)' : 'none',
    color: isActive ? TOKENS.green : TOKENS.text,
    cursor: 'pointer',
    transition: TOKENS.transition.fast,
    textAlign: 'left',
  };

  return (
    <button
      type="button"
      onClick={liveTalk.toggleLiveTalk}
      aria-pressed={isActive}
      className={isActive ? 'sm-live-ring sm-live-ring--active' : 'sm-live-ring'}
      style={buttonStyle}
    >
      <span
        aria-hidden="true"
        style={{
          width: isSidebar ? 14 : 12,
          height: isSidebar ? 14 : 12,
          borderRadius: '50%',
          flexShrink: 0,
          background: isActive ? TOKENS.green : 'rgba(255,255,255,0.30)',
          boxShadow: isActive ? '0 0 14px rgba(74,222,128,0.65)' : 'none',
        }}
      />

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontFamily: TOKENS.font.display,
            fontSize: isSidebar ? 14 : 12,
            letterSpacing: '0.04em',
            color: isActive ? TOKENS.green : TOKENS.text,
          }}
        >
          {copy.label}
        </span>
        <span
          style={{
            fontFamily: TOKENS.font.body,
            fontSize: isSidebar ? 11 : 10,
            fontWeight: 400,
            color: isActive ? 'rgba(195,255,214,0.82)' : TOKENS.text2,
            lineHeight: 1.3,
          }}
        >
          {copy.subLabel}
        </span>
      </span>

      {!isSidebar ? (
        <span
          aria-hidden="true"
          style={{
            fontFamily: TOKENS.font.body,
            fontSize: 10,
            color: isActive ? TOKENS.green : TOKENS.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            flexShrink: 0,
          }}
        >
          {isActive ? 'On' : 'Off'}
        </span>
      ) : null}
    </button>
  );
}