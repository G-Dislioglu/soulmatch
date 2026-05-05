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
        border: `1.5px solid ${TOKENS.b1}`,
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(18,18,28,0.96), rgba(18,18,28,0.88))',
        boxShadow: TOKENS.shadow.card,
        padding: compact ? '12px 12px' : '12px 16px',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: compact ? 'start' : 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onToggleSidebarExpanded}
                title={sidebarExpanded ? 'Sidebar einklappen' : 'Sidebar aufklappen'}
                aria-label={sidebarExpanded ? 'Sidebar einklappen' : 'Sidebar aufklappen'}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: `1.5px solid ${sidebarExpanded ? TOKENS.cyan : TOKENS.b1}`,
                  background: sidebarExpanded ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.03)',
                  color: sidebarExpanded ? TOKENS.text : TOKENS.text2,
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {sidebarExpanded ? '-' : '+'}
              </button>
              <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: TOKENS.font.body }}>
                Maya Stage
              </div>
            </div>
            <div style={{ fontFamily: TOKENS.font.display, fontSize: compact ? 18 : 21, color: TOKENS.text, letterSpacing: '0.03em', lineHeight: 1.2 }}>
              {greeting}. Builder bleibt im Dialog mit Maya.
            </div>
            <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.55, maxWidth: 820 }}>
              {statusLeft}. {statusRight}.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', color: TOKENS.text3, fontSize: 11.5 }}>
            <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.cyan}55`, padding: '5px 9px', background: 'rgba(34,211,238,0.08)', color: TOKENS.text }}>
              Fokus {currentFocusLabel}
            </span>
            <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b2}`, padding: '5px 9px', background: 'rgba(255,255,255,0.03)' }}>Token {maskedToken}</span>
            <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b2}`, padding: '5px 9px', background: 'rgba(255,255,255,0.03)' }}>{tasksCount} Tasks</span>
            <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b2}`, padding: '5px 9px', background: 'rgba(255,255,255,0.03)' }}>{filesCount} Files</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={onNavigateHome} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text2, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Zur App
          </button>
          <button onClick={onRefresh} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.12)', color: TOKENS.text, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Refresh
          </button>
          <button onClick={onStartMayaTour} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.b1}`, background: 'rgba(124,106,247,0.10)', color: TOKENS.text2, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Maya Tour
          </button>
          {tasksExist ? (
            <button onClick={() => onToggleDrawer('task')} style={{ borderRadius: 999, border: `1.5px solid ${drawerView === 'task' ? TOKENS.green : TOKENS.b1}`, background: drawerView === 'task' ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.03)', color: drawerView === 'task' ? TOKENS.text : TOKENS.text2, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Task
            </button>
          ) : null}
          {hasOutputContext ? (
            <button onClick={() => onToggleDrawer('output')} style={{ borderRadius: 999, border: `1.5px solid ${drawerView === 'output' ? TOKENS.gold : TOKENS.b1}`, background: drawerView === 'output' ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)', color: drawerView === 'output' ? TOKENS.text : TOKENS.text2, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Output
            </button>
          ) : null}
          <button onClick={onOpenModels} style={{ borderRadius: 999, border: `1.5px solid ${drawerView === 'models' || showConfig ? '#7c6af7' : TOKENS.b1}`, background: drawerView === 'models' || showConfig ? 'rgba(124,106,247,0.12)' : 'rgba(255,255,255,0.03)', color: drawerView === 'models' || showConfig ? '#c4b5fd' : TOKENS.text2, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Models
          </button>
          <button onClick={() => onToggleDrawer('visual')} style={{ borderRadius: 999, border: `1.5px solid ${drawerView === 'visual' ? TOKENS.cyan : TOKENS.b1}`, background: drawerView === 'visual' ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.03)', color: drawerView === 'visual' ? TOKENS.text : TOKENS.text2, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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
              border: '1.5px solid #f97316',
              background: 'rgba(249,115,22,0.10)',
              color: '#fdba74',
              textDecoration: 'none',
              padding: '8px 13px',
              fontSize: 12,
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
