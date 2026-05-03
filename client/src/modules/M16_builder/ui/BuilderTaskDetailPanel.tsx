import { TOKENS } from '../../../design/tokens';
import type { BuilderTask } from '../hooks/useBuilderApi';
import type { MayaContext, MayaPoolConfig, PoolState, PoolType } from '../hooks/useMayaApi';
import { BuilderPanel } from './BuilderPanel';
import { BuilderConfigPanel } from './BuilderConfigPanel';

interface OperatorGuidanceLike {
  title: string;
  summary: string;
  accent: string;
}

interface ExecutionStateLike {
  label: string;
  detail: string;
  accent: string;
}

interface BuilderTaskDetailPanelProps {
  compact: boolean;
  showConfig: boolean;
  mayaCtx: MayaContext | null;
  poolConfig: MayaPoolConfig | null;
  pools: PoolState;
  openPool: PoolType | null;
  activeTask: BuilderTask | null;
  selectedTaskId: string | null;
  operatorGuidance: OperatorGuidanceLike | null;
  executionState: ExecutionStateLike;
  commitHash: string;
  isRunDisabled: boolean;
  isBusy: boolean;
  isPrototypeReview: boolean;
  confirmDelete: boolean;
  previewUrl: string | null;
  executionSummaryText: string;
  onOpenPool: (pool: PoolType | null) => void;
  onTogglePoolModel: (pool: PoolType, modelId: string) => void;
  onCommitHashChange: (value: string) => void;
  onFocusChat: () => void;
  onRunTask: () => void;
  onApproveTask: () => void;
  onRevertTask: () => void;
  onDeleteTask: () => void;
  onApprovePrototype: () => void;
  onRevisePrototype: () => void;
  formatDate: (value: string | null | undefined) => string;
}

export function BuilderTaskDetailPanel(props: BuilderTaskDetailPanelProps) {
  const {
    compact,
    showConfig,
    mayaCtx,
    poolConfig,
    pools,
    openPool,
    activeTask,
    selectedTaskId,
    operatorGuidance,
    executionState,
    commitHash,
    isRunDisabled,
    isBusy,
    isPrototypeReview,
    confirmDelete,
    previewUrl,
    executionSummaryText,
    onOpenPool,
    onTogglePoolModel,
    onCommitHashChange,
    onFocusChat,
    onRunTask,
    onApproveTask,
    onRevertTask,
    onDeleteTask,
    onApprovePrototype,
    onRevisePrototype,
    formatDate,
  } = props;

  return (
    <div data-maya-target="task-detail">
      <BuilderPanel title="Task Detail" subtitle="Steuerung und Aktionen fuer die gewaehlte Task. Nicht die Hauptbuehne." accent={TOKENS.green}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ borderRadius: 16, border: `2px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '12px 14px', display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Dialog first
              </div>
              <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                Neue Tasks werden nicht manuell angelegt. Beschreibe die Aufgabe im Maya-Chat, Maya schneidet daraus Intent, Output und Routing.
              </div>
              <button
                type="button"
                onClick={onFocusChat}
                style={{ justifySelf: 'start', borderRadius: 999, border: `2px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.12)', color: TOKENS.text, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Zum Chat
              </button>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 14, display: 'grid', gap: 10 }}>
            {showConfig ? (
              <div style={{ border: `1.5px solid rgba(124,106,247,0.3)`, borderRadius: 18, background: TOKENS.card, overflow: 'hidden', marginBottom: 10 }}>
                <BuilderConfigPanel
                  ctx={mayaCtx}
                  poolConfig={poolConfig}
                  pools={pools}
                  openPool={openPool}
                  onOpenPool={onOpenPool}
                  onToggleModel={onTogglePoolModel}
                  onSelectModel={(pool, modelId) => onTogglePoolModel(pool, modelId)}
                />
              </div>
            ) : null}
            {activeTask ? (
              <div data-maya-target="workspace-panel" style={{ borderRadius: 18, border: `1.5px solid ${operatorGuidance?.accent ?? TOKENS.b2}44`, background: `linear-gradient(135deg, ${(operatorGuidance?.accent ?? TOKENS.b2)}12, rgba(255,255,255,0.03))`, padding: '13px 14px', display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 11, color: operatorGuidance?.accent ?? TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                    Active Workspace
                  </div>
                  <div style={{ fontSize: 17, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                    {operatorGuidance?.title ?? executionState.label}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 5 }}>
                    <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      Was Maya jetzt braucht
                    </div>
                    <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                      {operatorGuidance?.summary ?? executionState.detail}
                    </div>
                  </div>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 5 }}>
                    <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      Was als Naechstes lieferbar ist
                    </div>
                    <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                      {activeTask.contract.output.summary}
                    </div>
                    <div style={{ fontSize: 11, color: TOKENS.text3 }}>
                      Plan: {activeTask.contract.output.plannedArtifacts.join(', ') || '-'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div
              style={{
                borderRadius: 18,
                border: `1.5px solid ${executionState.accent}44`,
                background: `${executionState.accent}14`,
                padding: '12px 14px',
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 11, color: executionState.accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Jetzt gerade
              </div>
              <div style={{ fontSize: 19, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                {executionState.label}
              </div>
              <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                {executionState.detail}
              </div>
            </div>
            {activeTask ? (
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status</div>
                  <div style={{ fontSize: 13.5, color: TOKENS.text, fontWeight: 700 }}>{activeTask.status}</div>
                  <div style={{ fontSize: 11.5, color: TOKENS.text2 }}>{activeTask.contract.lifecycle.phase}</div>
                </div>
                <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Intent / Output</div>
                  <div style={{ fontSize: 13.5, color: TOKENS.text, fontWeight: 700 }}>{activeTask.intentKind}  ·  {activeTask.requestedOutputKind}</div>
                  <div style={{ fontSize: 11.5, color: TOKENS.text2 }}>{activeTask.requestedOutputFormat}</div>
                </div>
                <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Team / Lanes</div>
                  <div style={{ fontSize: 13.5, color: TOKENS.text, fontWeight: 700 }}>{activeTask.contract.team.activeInstances.length} Instanzen</div>
                  <div style={{ fontSize: 11.5, color: TOKENS.text2 }}>{activeTask.contract.routing.activeLanes.join('  ·  ') || '-'}</div>
                </div>
              </div>
            ) : null}
            <div
              style={{
                fontFamily: TOKENS.font.display,
                fontSize: 22,
                color: TOKENS.text,
                overflowWrap: 'break-word',
                wordBreak: 'normal',
                hyphens: 'auto',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {activeTask?.title ?? 'Keine Task gewaehlt'}
            </div>
            <div
              style={{
                fontSize: 13,
                color: TOKENS.text2,
                lineHeight: 1.7,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                overflow: 'hidden',
              }}
            >
              {activeTask?.goal ?? 'Links eine Task waehlen oder oben eine neue erstellen.'}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Execution Facts</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text2, padding: '4px 8px', fontSize: 11.5 }}>Risk {activeTask?.risk ?? '-'}</span>
                <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text2, padding: '4px 8px', fontSize: 11.5 }}>Type {activeTask?.taskType ?? '-'}</span>
                <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text2, padding: '4px 8px', fontSize: 11.5 }}>Policy {activeTask?.policyProfile ?? '-'}</span>
                <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text2, padding: '4px 8px', fontSize: 11.5 }}>Updated {formatDate(activeTask?.updatedAt)}</span>
              </div>
              <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>Execution: {executionSummaryText}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>Plan: {activeTask ? activeTask.contract.output.plannedArtifacts.join(', ') : '-'}</div>
            </div>
            <input value={commitHash} onChange={(event) => onCommitHashChange(event.target.value)} placeholder="Commit-Hash fuer Approve" style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13 }} />
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0,1fr))' }}>
              <button data-maya-target="run-button" onClick={onRunTask} disabled={isRunDisabled} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.cyan}`, background: 'rgba(34,211,238,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: isPrototypeReview ? 'not-allowed' : 'pointer', opacity: isPrototypeReview ? 0.45 : 1 }}>Run</button>
              <button data-maya-target="approve-button" onClick={onApproveTask} disabled={isBusy || !selectedTaskId || isPrototypeReview} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: isPrototypeReview ? 'not-allowed' : 'pointer', opacity: isPrototypeReview ? 0.45 : 1 }}>Approve</button>
              <button data-maya-target="revert-button" onClick={onRevertTask} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.rose}`, background: 'rgba(244,114,182,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{isPrototypeReview ? 'Discard' : 'Revert'}</button>
            </div>
            <button
              onClick={onDeleteTask}
              disabled={isBusy || !selectedTaskId}
              style={{
                borderRadius: 999,
                border: `1.5px solid ${confirmDelete ? '#ef4444' : TOKENS.b1}`,
                background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                color: confirmDelete ? '#ef4444' : TOKENS.text2,
                padding: '8px 14px',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: 6,
                width: '100%',
                transition: 'all 0.2s ease',
              }}
            >
              {confirmDelete ? 'Wirklich loeschen?' : 'Task loeschen'}
            </button>
            {isPrototypeReview && previewUrl ? (
              <div style={{ marginTop: 8, display: 'grid', gap: 12 }}>
                <div style={{ borderRadius: 18, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                  <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Prototype Preview</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                    Der Builder stoppt hier bewusst. Preview pruefen und dann explizit freigeben, ueberarbeiten lassen oder verwerfen.
                  </div>
                  <iframe
                    title={`Prototype Preview ${activeTask?.id ?? 'task'}`}
                    src={previewUrl}
                    style={{ width: '100%', height: 400, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, marginTop: 12, background: '#0f0f17' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0,1fr))' }}>
                  <button data-maya-target="approve-prototype-button" onClick={onApprovePrototype} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve Prototype</button>
                  <button data-maya-target="revise-prototype-button" onClick={onRevisePrototype} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Revise</button>
                  <button data-maya-target="discard-prototype-button" onClick={onRevertTask} disabled={isBusy || !selectedTaskId} style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.rose}`, background: 'rgba(244,114,182,0.10)', color: TOKENS.text, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Discard</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </BuilderPanel>
    </div>
  );
}
