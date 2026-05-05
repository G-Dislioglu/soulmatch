import { TOKENS } from '../../../design/tokens';
import type { BuilderTask } from '../hooks/useBuilderApi';

interface BuilderTaskFooterStripProps {
  visibleTasks: BuilderTask[];
  selectedTaskId: string | null;
  statusColors: Record<string, string>;
  deriveTaskQueueSignal: (task: BuilderTask) => { label: string };
  onSelectTask: (taskId: string) => void;
}

export function BuilderTaskFooterStrip(props: BuilderTaskFooterStripProps) {
  const {
    visibleTasks,
    selectedTaskId,
    statusColors,
    deriveTaskQueueSignal,
    onSelectTask,
  } = props;

  return (
    <footer style={{ marginTop: 18, borderRadius: 22, border: `2px solid ${TOKENS.b1}`, background: TOKENS.card, boxShadow: `${TOKENS.shadow.card}, 0 0 0 1px rgba(255,255,255,0.04) inset`, padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
        {visibleTasks.map((task) => {
          const queueSignal = deriveTaskQueueSignal(task);
          return (
            <button
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              style={{
                borderRadius: 999,
                border: `1px solid ${selectedTaskId === task.id ? TOKENS.gold : TOKENS.b1}`,
                background: selectedTaskId === task.id ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)',
                color: statusColors[task.status] ?? TOKENS.text2,
                padding: '8px 12px',
                fontSize: 12,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {task.title}  -  {queueSignal.label}
            </button>
          );
        })}
      </div>
    </footer>
  );
}
