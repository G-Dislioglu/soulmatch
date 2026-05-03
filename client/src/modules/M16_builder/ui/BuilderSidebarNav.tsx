import { TOKENS } from '../../../design/tokens';
import type { BuilderTask, BuilderPatrolSeverity } from '../hooks/useBuilderApi';

type SidebarView = 'chat' | 'tasks' | 'patrol' | 'models' | 'files' | 'notes';

interface SidebarNote {
  id?: string;
  summary: string;
  updatedAt: string;
}

interface SidebarPatrolStatus {
  totalFindings?: number;
  crossConfirmed?: number;
  bySeverity?: Partial<Record<BuilderPatrolSeverity, number>>;
}

interface BuilderSidebarNavProps {
  compact: boolean;
  sidebarExpanded: boolean;
  sidebarView: SidebarView;
  patrolOpen: boolean;
  selectedTaskId: string | null;
  selectedFilePath: string | null;
  sidebarTasks: BuilderTask[];
  continuityNotes: SidebarNote[];
  patrolStatus: SidebarPatrolStatus | null;
  patrolSeverityConfig: Record<BuilderPatrolSeverity, { color: string; label: string; bg: string }>;
  collapsedLabelFor: (view: SidebarView) => string;
  formatDate: (value: string | null | undefined) => string;
  onSelectSidebarView: (view: SidebarView) => void;
  onFocusChat: () => void;
  onSelectTask: (taskId: string) => void;
  onFocusFileExplorer: () => void;
  onTogglePatrolFeed: () => void;
}

export function BuilderSidebarNav(props: BuilderSidebarNavProps) {
  const {
    compact,
    sidebarExpanded,
    sidebarView,
    patrolOpen,
    selectedTaskId,
    selectedFilePath,
    sidebarTasks,
    continuityNotes,
    patrolStatus,
    patrolSeverityConfig,
    collapsedLabelFor,
    formatDate,
    onSelectSidebarView,
    onFocusChat,
    onSelectTask,
    onFocusFileExplorer,
    onTogglePatrolFeed,
  } = props;

  return (
    <div
      style={{
        borderRadius: 20,
        border: `2px solid ${TOKENS.b1}`,
        background: TOKENS.card,
        boxShadow: TOKENS.shadow.card,
        padding: compact ? 12 : 14,
        display: 'grid',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: sidebarExpanded || compact ? 11 : 10, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
          Sidebar
        </div>
        {[
          { key: 'chat', label: 'Chat', accent: TOKENS.gold },
          { key: 'tasks', label: 'Queue', accent: TOKENS.cyan },
          { key: 'files', label: 'Files', accent: TOKENS.purple },
          { key: 'patrol', label: 'Patrol', accent: '#f97316' },
          { key: 'notes', label: 'Notes', accent: TOKENS.green },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={() => onSelectSidebarView(item.key as SidebarView)}
            style={{
              borderRadius: 14,
              border: `2px solid ${sidebarView === item.key ? item.accent : TOKENS.b2}`,
              background: sidebarView === item.key ? `${item.accent}18` : TOKENS.bg2,
              color: sidebarView === item.key ? TOKENS.text : TOKENS.text2,
              padding: sidebarExpanded || compact ? '10px 12px' : '10px 0',
              minHeight: 42,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: sidebarExpanded || compact ? 'left' : 'center',
            }}
          >
            {sidebarExpanded || compact ? item.label : collapsedLabelFor(item.key as SidebarView)}
          </button>
        ))}
      </div>
      {sidebarExpanded || compact ? (
        <div style={{ borderTop: `2px solid ${TOKENS.b2}`, paddingTop: 12, display: 'grid', gap: 10 }}>
          {sidebarView === 'chat' ? (
            <>
              <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Maya Einstieg
              </div>
              <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                Aufgaben entstehen hier aus dem Dialog mit Maya, nicht aus einem Formular. Beschreibe den naechsten Schritt im Chat und Maya routet ihn in die passende Arbeitsform.
              </div>
              <button
                type="button"
                onClick={onFocusChat}
                style={{ borderRadius: 14, border: `2px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.12)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Zum Maya-Chat
              </button>
            </>
          ) : null}
          {sidebarView === 'tasks' ? (
            <>
              <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Aufmerksamkeit zuerst
              </div>
              {sidebarTasks.length > 0 ? sidebarTasks.map((task) => (
                <button
                  key={`sidebar-${task.id}`}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 14,
                    border: `2px solid ${selectedTaskId === task.id ? TOKENS.cyan : TOKENS.b2}`,
                    background: selectedTaskId === task.id ? 'rgba(34,211,238,0.12)' : TOKENS.bg2,
                    color: TOKENS.text,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{task.title}</span>
                  <span style={{ fontSize: 11.5, color: TOKENS.text3 }}>{task.status}</span>
                </button>
              )) : (
                <div style={{ fontSize: 12.5, color: TOKENS.text3 }}>Noch keine Builder-Tasks vorhanden.</div>
              )}
            </>
          ) : null}
          {sidebarView === 'files' ? (
            <>
              <div style={{ fontSize: 11, color: TOKENS.purple, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Repo Einstieg
              </div>
              <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                {selectedFilePath ?? 'Builder-Dateien indexiert'}
              </div>
              <button
                type="button"
                onClick={onFocusFileExplorer}
                style={{ borderRadius: 14, border: `2px solid ${TOKENS.purple}`, background: 'rgba(124,106,247,0.14)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Zum File Explorer
              </button>
            </>
          ) : null}
          {sidebarView === 'patrol' ? (
            <>
              <div style={{ fontSize: 11, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Patrol Feed
              </div>
              <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                {patrolStatus
                  ? `${patrolStatus.totalFindings ?? 0} Findings  -  ${patrolStatus.crossConfirmed ?? 0} cross-confirmed`
                  : 'Patrol-Status wird geladen oder ist noch nicht geoeffnet.'}
              </div>
              <button
                type="button"
                onClick={onTogglePatrolFeed}
                style={{ borderRadius: 14, border: '2px solid #f97316', background: 'rgba(249,115,22,0.14)', color: TOKENS.text, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {patrolOpen ? 'Patrol einklappen' : 'Patrol zeigen'}
              </button>
              <div style={{ display: 'grid', gap: 8 }}>
                {(Object.keys(patrolSeverityConfig) as BuilderPatrolSeverity[]).map((severity) => {
                  const config = patrolSeverityConfig[severity];
                  return (
                    <div key={`sidebar-patrol-${severity}`} style={{ borderRadius: 14, border: `2px solid ${config.color}33`, background: config.bg, color: config.color, padding: '9px 10px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span>{config.label}</span>
                      <span>{patrolStatus?.bySeverity?.[severity] ?? 0}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          {sidebarView === 'notes' ? (
            <>
              <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Continuity
              </div>
              {continuityNotes.length > 0 ? continuityNotes.slice(0, 3).map((note) => (
                <div key={note.id} style={{ borderRadius: 14, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '10px 12px', display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(note.updatedAt)}</div>
                  <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.55 }}>{note.summary}</div>
                </div>
              )) : (
                <div style={{ fontSize: 12.5, color: TOKENS.text3 }}>Noch keine Continuity Notes gespeichert.</div>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
