import { TOKENS } from '../../../design/tokens';
import type { BuilderTask } from '../hooks/useBuilderApi';
import { BuilderPanel } from './BuilderPanel';

type TaskQueueFilter = 'all' | 'attention' | 'active' | 'ready' | 'delivered' | 'done';
type TaskQueueSort = 'priority' | 'updated' | 'title';

interface QueueSignal {
  label: string;
  summary: string;
  accent: string;
}

interface CardTone {
  border: string;
  background: string;
  glow: string;
  chipBg: string;
}

interface BuilderTaskListPanelProps {
  compact: boolean;
  taskQueueFilter: TaskQueueFilter;
  taskQueueSort: TaskQueueSort;
  visibleTasks: BuilderTask[];
  tasksCount: number;
  selectedTaskId: string | null;
  isBusy: boolean;
  deriveTaskQueueSignal: (task: BuilderTask) => QueueSignal;
  deriveTaskCardTone: (task: BuilderTask, selected: boolean) => CardTone;
  formatLaneList: (lanes: string[]) => string;
  onTaskQueueFilterChange: (value: TaskQueueFilter) => void;
  onTaskQueueSortChange: (value: TaskQueueSort) => void;
  onSelectTask: (taskId: string) => void;
  onCancelTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function BuilderTaskListPanel(props: BuilderTaskListPanelProps) {
  const {
    compact,
    taskQueueFilter,
    taskQueueSort,
    visibleTasks,
    tasksCount,
    selectedTaskId,
    isBusy,
    deriveTaskQueueSignal,
    deriveTaskCardTone,
    formatLaneList,
    onTaskQueueFilterChange,
    onTaskQueueSortChange,
    onSelectTask,
    onCancelTask,
    onDeleteTask,
  } = props;

  return (
    <div data-maya-target="tasklist">
      <BuilderPanel title="Task-Liste" subtitle="Aktive Builder-Queues, Prioritaetssignale und Statusfarben." accent={TOKENS.cyan}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : '1fr 1fr' }}>
              <select value={taskQueueFilter} onChange={(event) => onTaskQueueFilterChange(event.target.value as TaskQueueFilter)} style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '10px 12px', fontSize: 12.5 }}>
                <option value="all">Alle Prioritaeten</option>
                <option value="attention">Nur Aufmerksamkeit</option>
                <option value="active">Nur Laufend</option>
                <option value="ready">Nur Startklar</option>
                <option value="delivered">Nur Bereit</option>
                <option value="done">Nur Abgeschlossen</option>
              </select>
              <select value={taskQueueSort} onChange={(event) => onTaskQueueSortChange(event.target.value as TaskQueueSort)} style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '10px 12px', fontSize: 12.5 }}>
                <option value="priority">Sort: Prioritaet zuerst</option>
                <option value="updated">Sort: Zuletzt aktualisiert</option>
                <option value="title">Sort: Titel A-Z</option>
              </select>
            </div>
            <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
              {visibleTasks.length} von {tasksCount} Tasks sichtbar
            </div>
          </div>
          {visibleTasks.map((task) => {
            const selected = task.id === selectedTaskId;
            const isActive = !['done', 'cancelled', 'blocked', 'deleted'].includes(task.status);
            const queueSignal = deriveTaskQueueSignal(task);
            const cardTone = deriveTaskCardTone(task, selected);
            return (
              <div
                key={task.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 8,
                  alignItems: 'start',
                }}
              >
                <button
                  onClick={() => onSelectTask(task.id)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 18,
                    border: `1.5px solid ${cardTone.border}`,
                    background: cardTone.background,
                    boxShadow: `0 0 0 1px ${cardTone.glow} inset`,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div
                      style={{
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: TOKENS.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {task.title}
                    </div>
                    <div style={{ display: 'grid', gap: 6, justifyItems: 'end', flexShrink: 0 }}>
                      <span
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${TOKENS.b1}`,
                          color: TOKENS.text2,
                          padding: '3px 8px',
                          fontSize: 11,
                          textTransform: 'uppercase',
                          maxWidth: 80,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.status}
                      </span>
                      <span
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${queueSignal.accent}55`,
                          background: cardTone.chipBg,
                          color: queueSignal.accent,
                          padding: '3px 8px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {queueSignal.label}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: TOKENS.text2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {task.goal}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11.5,
                      lineHeight: 1.55,
                      color: queueSignal.accent,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {queueSignal.summary}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, color: TOKENS.text3, borderRadius: 999, border: `1px solid ${TOKENS.b3}`, padding: '3px 7px', background: 'rgba(255,255,255,0.03)' }}>
                      {task.contract.lifecycle.phase}
                    </span>
                    <span style={{ fontSize: 10.5, color: TOKENS.text3, borderRadius: 999, border: `1px solid ${TOKENS.b3}`, padding: '3px 7px', background: 'rgba(255,255,255,0.03)' }}>
                      {task.requestedOutputKind}
                    </span>
                    <span style={{ fontSize: 10.5, color: TOKENS.text3 }}>
                      {formatLaneList(task.contract.routing.activeLanes)}
                    </span>
                  </div>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'center' }}>
                  {isActive ? (
                    <button
                      onClick={() => onCancelTask(task.id)}
                      title="Task abbrechen"
                      disabled={isBusy}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        border: `1.5px solid rgba(239,68,68,0.45)`,
                        background: 'rgba(127,29,29,0.22)',
                        color: '#fecaca',
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        fontSize: 16,
                        lineHeight: 1,
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      x
                    </button>
                  ) : null}
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    title="Task loeschen"
                    disabled={isBusy}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: `1.5px solid rgba(161,98,7,0.45)`,
                      background: 'rgba(120,53,15,0.22)',
                      color: '#fde68a',
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      fontSize: 15,
                      lineHeight: 1,
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    x
                  </button>
                </div>
              </div>
            );
          })}
          {tasksCount === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Noch keine Builder-Tasks vorhanden.</div> : null}
          {tasksCount > 0 && visibleTasks.length === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Fuer diesen Filter sind gerade keine Tasks sichtbar.</div> : null}
        </div>
      </BuilderPanel>
    </div>
  );
}
