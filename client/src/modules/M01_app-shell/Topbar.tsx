import type { ReactNode } from 'react';
import { TOKENS } from '../../design';
import type { LiveTalkController } from '../../hooks/useLiveTalk';
import type { PageDef } from '../M02_ui-kit';
import { LiveTalkButton } from './LiveTalkButton';

interface TopbarProps {
  page: PageDef;
  liveTalk: LiveTalkController;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  mediaControl?: {
    active: boolean;
    onStop: () => void;
  };
  extraActions?: ReactNode;
}

export function Topbar({ page, liveTalk, onOpenMobileSidebar, onOpenSettings, mediaControl, extraActions }: TopbarProps) {
  return (
    <div className="sm-topbar-shell" style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(8,6,14,0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div
        style={{
          minHeight: TOKENS.layout.topbarH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '10px 20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className="mobile-hamburger"
            onClick={onOpenMobileSidebar}
            aria-label="Sidebar oeffnen"
            style={{
              display: 'none',
              width: 38,
              height: 38,
              borderRadius: 12,
              border: `1.5px solid ${TOKENS.b1}`,
              background: 'rgba(255,255,255,0.04)',
              color: TOKENS.text,
              cursor: 'pointer',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ☰
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{page.icon}</span>
              <h1 style={{ margin: 0, fontFamily: TOKENS.font.display, fontSize: 20, fontWeight: 500, color: TOKENS.text, letterSpacing: '0.05em' }}>
                {page.label}
              </h1>
            </div>
            <p style={{ margin: '4px 0 0', fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2 }}>
              Maya fuehrt dich durch den aktiven Bereich.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 220, flex: '0 1 280px' }}>
            <LiveTalkButton variant="topbar" liveTalk={liveTalk} />
          </div>

          {mediaControl?.active ? (
            <button
              type="button"
              onClick={mediaControl.onStop}
              style={{
                height: 42,
                padding: '0 14px',
                borderRadius: 24,
                border: `1.5px solid ${TOKENS.goldSoft}`,
                background: 'rgba(212,175,55,0.12)',
                color: TOKENS.gold,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Stop
            </button>
          ) : null}

          {extraActions}

          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              height: 42,
              padding: '0 14px',
              borderRadius: 24,
              border: `1.5px solid ${TOKENS.b1}`,
              background: 'rgba(255,255,255,0.04)',
              color: TOKENS.text2,
              cursor: 'pointer',
            }}
          >
            Einstellungen
          </button>
        </div>
      </div>

      {liveTalk.liveTalkActive ? (
        <div
          style={{
            padding: '10px 20px 12px',
            borderTop: `1px solid ${TOKENS.greenSoft}`,
            background: 'rgba(74,222,128,0.10)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1.5px solid rgba(74,222,128,0.35)',
              borderRadius: TOKENS.radius2,
              background: 'rgba(74,222,128,0.12)',
              padding: '10px 14px',
              color: TOKENS.green,
              boxShadow: '0 0 24px rgba(74,222,128,0.12)',
            }}
          >
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: TOKENS.green, boxShadow: '0 0 12px rgba(74,222,128,0.6)' }} />
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, fontWeight: 500 }}>
              LiveTalk aktiv. Mikrofon, TTS und Eingabe reagieren jetzt auf den gemeinsamen Shell-Status.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}