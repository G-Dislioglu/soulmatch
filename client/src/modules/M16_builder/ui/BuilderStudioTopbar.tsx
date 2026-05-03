import { TOKENS } from '../../../design/tokens';

type DrawerView = 'models' | 'task' | 'output' | 'visual';

interface BuilderStudioTopbarProps {
  compact: boolean;
  sidebarExpanded: boolean;
  greeting: string;
  statusLeft: string;
  statusRight: string;
  currentFocusLabel: string;
  maskedToken: string;
  tasksCount: number;
  filesCount: number;
  tasksExist: boolean;
  hasOutputContext: boolean;
  drawerView: DrawerView | null;
  showConfig: boolean;
  effectiveOpusToken: string | null;
  onToggleSidebarExpanded: () => void;
  onNavigateHome: () => void;
  onRefresh: () => void;
  onStartMayaTour: () => void;
  onToggleDrawer: (view: DrawerView) => void;
  onOpenModels: () => void;
  onMissingPatrolToken: () => void;
}

export function BuilderStudioTopbar(props: BuilderStudioTopbarProps) {
  const {
    compact,
    sidebarExpanded,
    greeting,
    statusLeft,
    statusRight,
    currentFocusLabel,
    maskedToken,
    tasksCount,
    filesCount,
    tasksExist,
    hasOutputContext,
    drawerView,
    showConfig,
    effectiveOpusToken,
    onToggleSidebarExpanded,
    onNavigateHome,
    onRefresh,
    onStartMayaTour,
    onToggleDrawer,
    onOpenModels,
    onMissingPatrolToken,
  } = props;

  return (
    <div
      style={{
        border: `2px solid ${TOKENS.b1}`,
        borderRadius: 20,
        background: TOKENS.card,
        boxShadow: TOKENS.shadow.card,
        padding: compact ? '14px 14px' : '14px 18px',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: compact ? 'start' : 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onToggleSidebarExpanded}
                title={sidebarExpanded ? 'Sidebar einklappen' : 'Sidebar aufklappen'}
                aria-label={sidebarExpanded ? 'Sidebar einklappen' : 'Sidebar aufklappen'}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  border: `2px solid ${sidebarExpanded ? TOKENS.cyan : TOKENS.b1}`,
                  background: sidebarExpanded ? 'rgba(34,211,238,0.12)' : TOKENS.bg2,
                  color: sidebarExpanded ? TOKENS.text : TOKENS.text2,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {sidebarExpanded ? '-' : '+'}
              </button>
              <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.16em', fontFamily: TOKENS.font.body }}>
                Maya Stage
              </div>
            </div>
            <div style={{ fontFamily: TOKENS.font.display, fontSize: compact ? 20 : 24, color: TOKENS.text, letterSpacing: '0.04em' }}>
              {greeting}. Builder bleibt im Dialog mit Maya.
            </div>
            <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.6, maxWidth: 860 }}>
              {statusLeft}. {statusRight}.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', color: TOKENS.text3, fontSize: 12 }}>
            <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.cyan}66`, padding: '6px 10px', background: 'rgba(34,211,238,0.10)', color: TOKENS.text }}>
              Fokus {currentFocusLabel}
            </span>
            <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b2}`, padding: '6px 10px', background: TOKENS.bg2 }}>Token {maskedToken}</span>
            <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b2}`, padding: '6px 10px', background: TOKENS.bg2 }}>{tasksCount} Tasks</span>
            <span style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b2}`, padding: '6px 10px', background: TOKENS.bg2 }}>{filesCount} Files</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={onNavigateHome} style={{ borderRadius: 999, border: `2px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Zur App
          </button>
          <button onClick={onRefresh} style={{ borderRadius: 999, border: `2px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.14)', color: TOKENS.text, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Refresh
          </button>
          <button onClick={onStartMayaTour} style={{ borderRadius: 999, border: `2px solid ${TOKENS.gold}`, background: 'rgba(124,106,247,0.14)', color: TOKENS.text, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Maya Tour
          </button>
          {tasksExist ? (
            <button onClick={() => onToggleDrawer('task')} style={{ borderRadius: 999, border: `2px solid ${drawerView === 'task' ? TOKENS.green : TOKENS.b1}`, background: drawerView === 'task' ? 'rgba(74,222,128,0.12)' : TOKENS.bg2, color: drawerView === 'task' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              Task
            </button>
          ) : null}
          {hasOutputContext ? (
            <button onClick={() => onToggleDrawer('output')} style={{ borderRadius: 999, border: `2px solid ${drawerView === 'output' ? TOKENS.gold : TOKENS.b1}`, background: drawerView === 'output' ? 'rgba(212,175,55,0.12)' : TOKENS.bg2, color: drawerView === 'output' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              Output
            </button>
          ) : null}
          <button onClick={onOpenModels} style={{ borderRadius: 999, border: `2px solid ${drawerView === 'models' || showConfig ? '#7c6af7' : TOKENS.b1}`, background: drawerView === 'models' || showConfig ? 'rgba(124,106,247,0.14)' : TOKENS.bg2, color: drawerView === 'models' || showConfig ? '#c4b5fd' : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Models
          </button>
          <button onClick={() => onToggleDrawer('visual')} style={{ borderRadius: 999, border: `2px solid ${drawerView === 'visual' ? TOKENS.cyan : TOKENS.b1}`, background: drawerView === 'visual' ? 'rgba(34,211,238,0.12)' : TOKENS.bg2, color: drawerView === 'visual' ? TOKENS.text : TOKENS.text2, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Vision
          </button>
          <a
            data-maya-target="patrol-console"
            href={effectiveOpusToken ? `/patrol?opus_token=${encodeURIComponent(effectiveOpusToken)}` : '#'}
            onClick={(event) => {
              if (!effectiveOpusToken) {
                event.preventDefault();
                onMissingPatrolToken();
              }
            }}
            title={effectiveOpusToken ? 'Patrol Console oeffnen' : 'Opus-Token fehlt'}
            style={{
              borderRadius: 999,
              border: '2px solid #f97316',
              background: 'rgba(249,115,22,0.14)',
              color: '#fdba74',
              textDecoration: 'none',
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: effectiveOpusToken ? 'pointer' : 'not-allowed',
              opacity: effectiveOpusToken ? 1 : 0.6,
            }}
          >
            Patrol Console
          </a>
        </div>
      </div>
    </div>
  );
}
