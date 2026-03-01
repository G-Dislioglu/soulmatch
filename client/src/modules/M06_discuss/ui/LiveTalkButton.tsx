interface Props {
  isActive: boolean;
  onClick: () => void;
}

export function LiveTalkButton({ isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 16px',
        background: isActive ? 'rgba(34,197,94,0.1)' : 'none',
        border: `1.5px solid ${isActive ? '#22c55e' : 'rgba(255,255,255,0.20)'}`,
        borderRadius: '8px',
        color: isActive ? '#22c55e' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer',
        fontFamily: "'Cinzel', serif",
        fontSize: '11px',
        letterSpacing: '1px',
        transition: 'all 0.2s',
        boxShadow: isActive ? '0 0 12px rgba(34,197,94,0.3)' : 'none',
      }}
    >
      {isActive ? (
        <>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#22c55e',
              animation: 'sm-live-pulse 1.2s ease-in-out infinite',
              boxShadow: '0 0 6px #22c55e',
              flexShrink: 0,
            }}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '16px' }}>
            {[4, 11, 16, 11, 4].map((h, i) => (
              <span
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  background: '#22c55e',
                  borderRadius: '2px',
                  animation: `sm-osc 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))}
          </span>
        </>
      ) : (
        <span>🎙</span>
      )}
      <span>{isActive ? 'Live' : 'Live Talk'}</span>
    </button>
  );
}
