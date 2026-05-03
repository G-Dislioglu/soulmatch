import { TOKENS } from '../../../design/tokens';

type ChecklistStatus = 'done' | 'ready' | 'waiting';

interface VisualLaunchChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  description: string;
}

interface BuilderStageIntroProps {
  compact: boolean;
  greeting: string;
  isVisualLaunchMode: boolean;
  experienceModeLabel: string;
  visualLaunchChecklist: VisualLaunchChecklistItem[];
  chatLoading: boolean;
  onFocusChat: () => void;
  onRunVisualCaptureFlow: () => void;
  onSeedVisualCapturePrompt: () => void;
}

export function BuilderStageIntro(props: BuilderStageIntroProps) {
  const {
    compact,
    greeting,
    isVisualLaunchMode,
    experienceModeLabel,
    visualLaunchChecklist,
    chatLoading,
    onFocusChat,
    onRunVisualCaptureFlow,
    onSeedVisualCapturePrompt,
  } = props;

  if (isVisualLaunchMode) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ borderRadius: 20, border: `2px solid ${TOKENS.cyan}66`, background: 'linear-gradient(135deg, rgba(34,211,238,0.14), rgba(255,255,255,0.03))', padding: compact ? '16px 16px' : '18px 20px', display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
              Vision Launchpad
            </div>
            <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
              Taskloser Startpfad fuer UI- und UX-Reviews
            </div>
          </div>
          <div style={{ fontSize: compact ? 24 : 28, color: TOKENS.text, fontFamily: TOKENS.font.display, lineHeight: 1.2 }}>
            Starte den Review-Flow zuerst ueber Maya, dann uebernimmt Vision.
          </div>
          <div style={{ fontSize: 13.5, color: TOKENS.text2, lineHeight: 1.7 }}>
            Solange noch keine Task und keine Browser-Screenshots gebunden sind, braucht Builder zuerst einen klaren Startlauf. Maya kann ihn direkt fuer dich aufsetzen.
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {visualLaunchChecklist.map((item) => {
              const statusColor = item.status === 'done'
                ? TOKENS.green
                : item.status === 'ready'
                  ? TOKENS.cyan
                  : TOKENS.text3;
              const statusBg = item.status === 'done'
                ? 'rgba(74,222,128,0.12)'
                : item.status === 'ready'
                  ? 'rgba(34,211,238,0.12)'
                  : TOKENS.bg2;
              const statusLabel = item.status === 'done' ? 'Erledigt' : item.status === 'ready' ? 'Startklar' : 'Wartet';
              return (
                <div key={item.id} style={{ borderRadius: 16, border: `1.5px solid ${statusColor}55`, background: statusBg, padding: '11px 12px', display: 'grid', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12.5, color: TOKENS.text, fontWeight: 700 }}>{item.label}</div>
                    <span style={{ borderRadius: 999, border: `1px solid ${statusColor}66`, padding: '3px 8px', fontSize: 10.5, color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                  </div>
                  <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>{item.description}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onFocusChat}
              style={{ borderRadius: 999, border: `2px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.12)', color: TOKENS.text, padding: '9px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Zum Chat
            </button>
            <button
              type="button"
              onClick={onRunVisualCaptureFlow}
              disabled={chatLoading}
              style={{ borderRadius: 999, border: `2px solid ${TOKENS.cyan}`, background: 'rgba(34,211,238,0.12)', color: TOKENS.text, padding: '9px 13px', fontSize: 12.5, fontWeight: 700, cursor: chatLoading ? 'not-allowed' : 'pointer', opacity: chatLoading ? 0.5 : 1 }}
            >
              Capture jetzt an Maya senden
            </button>
            <button
              type="button"
              onClick={onSeedVisualCapturePrompt}
              style={{ borderRadius: 999, border: `2px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text2, padding: '9px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Prompt im Chat bearbeiten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ borderRadius: 20, border: `2px solid ${TOKENS.gold}66`, background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(255,255,255,0.03))', padding: compact ? '16px 16px' : '18px 20px', display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
          Default Mode
        </div>
        <div style={{ fontSize: compact ? 24 : 28, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
          {greeting}. Sprich mit Maya, nicht mit einem Task-Formular.
        </div>
        <div style={{ fontSize: 14, color: TOKENS.text2, lineHeight: 1.7 }}>
          Builder startet jetzt dialogisch. Beschreibe die Aufgabe im Maya-Chat; Intent, Output und Routing entstehen aus der Kommunikation und erscheinen danach erst als strukturierte Task.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}66`, background: 'rgba(212,175,55,0.10)', color: TOKENS.text, padding: '5px 10px', fontSize: 11.5, fontWeight: 700 }}>Dialog first</span>
          <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.cyan}66`, background: 'rgba(34,211,238,0.10)', color: TOKENS.text, padding: '5px 10px', fontSize: 11.5, fontWeight: 700 }}>Keine manuelle Task-Erstellung</span>
          <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.purple}66`, background: 'rgba(124,106,247,0.10)', color: TOKENS.text, padding: '5px 10px', fontSize: 11.5, fontWeight: 700 }}>{experienceModeLabel}</span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.7 }}>
        Maya wartet auf deine naechste klare Aufgabe. Sobald eine Task aktiv ist, wird hier zuerst sichtbar, was gerade passiert, warum und ob Maya gerade deine Entscheidung braucht.
      </div>
    </div>
  );
}
