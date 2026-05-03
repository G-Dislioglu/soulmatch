import { TOKENS } from '../../../design/tokens';
import type { BuilderArtifact, BuilderTask } from '../hooks/useBuilderApi';
import type {
  MayaPoolModel,
  VisionModelScoreAggregate,
  VisualReviewRunResponse,
  VisualReviewTaskType,
} from '../hooks/useMayaApi';
import { BuilderPanel } from './BuilderPanel';

type VisualFeedbackVerdict = 'confirmed' | 'mixed' | 'false_positive';

interface BuilderVisualReviewPanelProps {
  compact: boolean;
  selectedTaskId: string | null;
  activeTask: BuilderTask | null;
  visualReviewTaskCandidate: BuilderTask | null;
  tasksCount: number;
  selectedVisualModelIds: string[];
  selectedVisualArtifactIds: string[];
  visualTaskType: VisualReviewTaskType;
  visualPrompt: string;
  visualRunLoading: boolean;
  chatLoading: boolean;
  visionModels: MayaPoolModel[];
  visionScores: VisionModelScoreAggregate[];
  browserScreenshotArtifacts: BuilderArtifact[];
  displayedVisualRunResult: VisualReviewRunResponse | null;
  visualReviewReportArtifactsCount: number;
  visualReviewBlockingReason: string | null;
  visualFeedbackSavingKey: string | null;
  onSelectTaskType: (value: VisualReviewTaskType) => void;
  onPromptChange: (value: string) => void;
  onToggleVisualModel: (modelId: string) => void;
  onToggleVisualArtifact: (artifactId: string) => void;
  onSelectVisualReviewTask: () => void;
  onRunVisualCaptureFlow: () => void;
  onSeedVisualCapturePrompt: () => void;
  onRunVisualReview: () => void;
  onSubmitVisualFeedback: (reportArtifactId: string, modelId: string, verdict: VisualFeedbackVerdict) => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toArtifactPayload(artifact: BuilderArtifact | null | undefined) {
  return artifact?.jsonPayload && typeof artifact.jsonPayload === 'object' ? artifact.jsonPayload : null;
}

const FEEDBACK_OPTIONS: Array<{ verdict: VisualFeedbackVerdict; label: string }> = [
  { verdict: 'confirmed', label: 'Bestaetigt' },
  { verdict: 'mixed', label: 'Gemischt' },
  { verdict: 'false_positive', label: 'Falschalarm' },
];

export function BuilderVisualReviewPanel(props: BuilderVisualReviewPanelProps) {
  const {
    compact,
    selectedTaskId,
    activeTask,
    visualReviewTaskCandidate,
    tasksCount,
    selectedVisualModelIds,
    selectedVisualArtifactIds,
    visualTaskType,
    visualPrompt,
    visualRunLoading,
    chatLoading,
    visionModels,
    visionScores,
    browserScreenshotArtifacts,
    displayedVisualRunResult,
    visualReviewReportArtifactsCount,
    visualReviewBlockingReason,
    visualFeedbackSavingKey,
    onSelectTaskType,
    onPromptChange,
    onToggleVisualModel,
    onToggleVisualArtifact,
    onSelectVisualReviewTask,
    onRunVisualCaptureFlow,
    onSeedVisualCapturePrompt,
    onRunVisualReview,
    onSubmitVisualFeedback,
  } = props;

  return (
    <div data-maya-target="visual-review">
      <BuilderPanel title="Visual Review" subtitle="Vision-Modelle, Browser-Screenshots und Maya-Synthese fuer UI- und UX-Pruefung." accent={TOKENS.cyan}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ borderRadius: 16, border: `1.5px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '12px 13px', display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
              Visual Pool
            </div>
            <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
              Nutzt vorhandene Browser-Screenshots aus dem Builder-Lauf. Du waehlst 1..N Vision-Modelle, Maya synthetisiert die Findings in einen naechsten Schritt.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) auto' }}>
            <div style={{ borderRadius: 14, border: `1.5px solid ${selectedTaskId ? TOKENS.cyan : TOKENS.b2}`, background: selectedTaskId ? 'rgba(34,211,238,0.08)' : TOKENS.bg2, padding: '11px 12px', display: 'grid', gap: 4 }}>
              <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Review Context</div>
              <div style={{ fontSize: 12.5, color: TOKENS.text, fontWeight: 700 }}>
                {selectedTaskId && activeTask ? activeTask.title : visualReviewTaskCandidate ? `Noch nicht gebunden  -  Vorschlag: ${visualReviewTaskCandidate.title}` : 'Noch keine Task fuer diesen Review gebunden'}
              </div>
              <div style={{ fontSize: 11.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                {selectedTaskId
                  ? 'Vision-Reports werden an diese Task, ihre Screenshots und ihre Artefakte gebunden.'
                  : tasksCount > 0
                    ? 'Waehle zuerst eine Task, damit der Review-Lauf nicht im Leeren endet.'
                    : 'Starte zuerst einen Builder-Lauf ueber Maya, bevor Vision-Modelle Screenshots pruefen koennen.'}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
              <button
                type="button"
                onClick={onSelectVisualReviewTask}
                disabled={!visualReviewTaskCandidate}
                style={{
                  borderRadius: 999,
                  border: `1.5px solid ${TOKENS.cyan}`,
                  background: 'rgba(34,211,238,0.12)',
                  color: TOKENS.text,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: visualReviewTaskCandidate ? 'pointer' : 'not-allowed',
                  opacity: visualReviewTaskCandidate ? 1 : 0.5,
                }}
              >
                {selectedTaskId ? 'Task wechseln' : 'Task fuer Review waehlen'}
              </button>
              <button
                type="button"
                onClick={onRunVisualCaptureFlow}
                style={{
                  borderRadius: 999,
                  border: `1.5px solid ${TOKENS.cyan}`,
                  background: 'rgba(34,211,238,0.12)',
                  color: TOKENS.text,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: chatLoading ? 'not-allowed' : 'pointer',
                  opacity: chatLoading ? 0.5 : 1,
                }}
                disabled={chatLoading}
              >
                Capture jetzt an Maya senden
              </button>
              <button
                type="button"
                onClick={onSeedVisualCapturePrompt}
                style={{
                  borderRadius: 999,
                  border: `1.5px solid ${TOKENS.gold}`,
                  background: 'rgba(212,175,55,0.12)',
                  color: TOKENS.text,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Prompt im Chat bearbeiten
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Review Type</div>
            <select
              value={visualTaskType}
              onChange={(event) => onSelectTaskType(event.target.value as VisualReviewTaskType)}
              style={{ borderRadius: 12, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '10px 12px', fontSize: 13 }}
            >
              <option value="ui_review">UI Review</option>
              <option value="layout_drift">Layout Drift</option>
              <option value="ocr_and_label_check">OCR and Label Check</option>
              <option value="frontend_recreation_hint">Frontend Recreation Hint</option>
              <option value="multi_state_review">Multi State Review</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Vision Models</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {visionModels.map((model) => {
                const active = selectedVisualModelIds.includes(model.id);
                const score = visionScores.find((entry) => entry.modelId === model.id) ?? null;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onToggleVisualModel(model.id)}
                    style={{
                      borderRadius: 999,
                      border: `1.5px solid ${active ? model.color : TOKENS.b2}`,
                      background: active ? `${model.color}22` : TOKENS.bg2,
                      color: active ? TOKENS.text : TOKENS.text2,
                      padding: '7px 11px',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {model.label}{score ? ` (${score.score.toFixed(2)})` : ''}
                  </button>
                );
              })}
              {visionModels.length === 0 ? (
                <div style={{ fontSize: 12, color: TOKENS.text3 }}>Noch keine Vision-Modelle im Katalog sichtbar.</div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Screenshot Sources</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {browserScreenshotArtifacts.map((artifact) => {
                const payload = toArtifactPayload(artifact);
                const step = typeof payload?.step === 'string' ? payload.step : 'ui-run';
                const route = typeof payload?.route === 'string' ? payload.route : artifact.path || '-';
                const active = selectedVisualArtifactIds.includes(artifact.id);
                return (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => onToggleVisualArtifact(artifact.id)}
                    style={{
                      textAlign: 'left',
                      borderRadius: 14,
                      border: `1.5px solid ${active ? TOKENS.cyan : TOKENS.b2}`,
                      background: active ? 'rgba(34,211,238,0.1)' : TOKENS.bg2,
                      color: TOKENS.text,
                      padding: '10px 12px',
                      display: 'grid',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 12 }}>{step}</strong>
                      <span style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(artifact.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: TOKENS.text2 }}>{route}</div>
                  </button>
                );
              })}
              {browserScreenshotArtifacts.length === 0 ? (
                <div style={{ borderRadius: 14, border: `1.5px dashed ${TOKENS.b2}`, background: TOKENS.bg2, color: TOKENS.text3, padding: '12px 13px', fontSize: 12.5, display: 'grid', gap: 6 }}>
                  <div>Fuer diese Task gibt es noch keine Browser-Screenshots. Die Browser-Lane muss zuerst ein `browser_screenshot`-Artefakt erzeugen.</div>
                  <div style={{ fontSize: 11.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                    Nutze den Maya-Chat fuer einen UI-Lauf mit `UI_RUN`-Schritten oder wechsle auf eine Task, die bereits Browser-Artefakte mitbringt.
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={onRunVisualCaptureFlow}
                      disabled={chatLoading}
                      style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.cyan}`, background: 'rgba(34,211,238,0.12)', color: TOKENS.text, padding: '8px 12px', fontSize: 11.5, fontWeight: 700, cursor: chatLoading ? 'not-allowed' : 'pointer', opacity: chatLoading ? 0.5 : 1 }}
                    >
                      Capture-Lauf starten
                    </button>
                    <button
                      type="button"
                      onClick={onSeedVisualCapturePrompt}
                      style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.12)', color: TOKENS.text, padding: '8px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Prompt ansehen
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Operator Prompt</div>
            <textarea
              value={visualPrompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="z.B. Pruefe die visuelle Hierarchie, doppelte Navigation und stoerende Operator-Reibung."
              rows={4}
              style={{ borderRadius: 14, border: `1.5px solid ${TOKENS.b1}`, background: TOKENS.bg2, color: TOKENS.text, padding: '11px 12px', fontSize: 13, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: TOKENS.text3 }}>
              {selectedVisualModelIds.length} Modelle  -  {selectedVisualArtifactIds.length} Screenshots
            </div>
            <button
              type="button"
              onClick={onRunVisualReview}
              disabled={visualRunLoading || !selectedTaskId || selectedVisualModelIds.length === 0 || selectedVisualArtifactIds.length === 0}
              style={{
                borderRadius: 999,
                border: `2px solid ${TOKENS.cyan}`,
                background: 'rgba(34,211,238,0.14)',
                color: TOKENS.text,
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: visualRunLoading ? 'not-allowed' : 'pointer',
                opacity: visualRunLoading || !selectedTaskId || selectedVisualModelIds.length === 0 || selectedVisualArtifactIds.length === 0 ? 0.5 : 1,
              }}
            >
              {visualRunLoading ? 'Visual Review laeuft...' : 'Visual Review starten'}
            </button>
          </div>

          {visualReviewBlockingReason ? (
            <div style={{ borderRadius: 14, border: `1.5px solid ${TOKENS.b2}`, background: TOKENS.bg2, color: TOKENS.text2, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6 }}>
              {visualReviewBlockingReason}
            </div>
          ) : null}

          {displayedVisualRunResult ? (
            <div style={{ display: 'grid', gap: 10, borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 12 }}>
              <div style={{ borderRadius: 14, border: `1.5px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: '12px 13px', display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Maya Synthesis</div>
                <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.65 }}>{displayedVisualRunResult.mayaSynthesis.summary || 'Noch keine Synthese sichtbar.'}</div>
                <div style={{ fontSize: 11, color: TOKENS.text3 }}>
                  Model: {displayedVisualRunResult.mayaSynthesis.model}  -  Report Artifact: {displayedVisualRunResult.reportArtifactId ?? '-'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {displayedVisualRunResult.modelResults.map((result) => (
                  <div key={`${result.modelId}-${result.model}`} style={{ borderRadius: 14, border: `1.5px solid ${TOKENS.b2}`, background: TOKENS.bg2, padding: '12px 13px', display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 12.5, color: TOKENS.text }}>{result.modelId}</strong>
                      <span style={{ fontSize: 11, color: TOKENS.text3 }}>{result.findings.length} Findings</span>
                    </div>
                    <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>{result.summary || (result.error ? `Fehler: ${result.error}` : 'Keine Kurzfassung')}</div>
                    {displayedVisualRunResult.reportArtifactId ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {FEEDBACK_OPTIONS.map((option) => {
                          const feedbackKey = `${displayedVisualRunResult.reportArtifactId}:${result.modelId}:${option.verdict}`;
                          const busy = visualFeedbackSavingKey === feedbackKey;
                          return (
                            <button
                              key={option.verdict}
                              type="button"
                              onClick={() => {
                                onSubmitVisualFeedback(displayedVisualRunResult.reportArtifactId!, result.modelId, option.verdict);
                              }}
                              disabled={visualFeedbackSavingKey !== null}
                              style={{
                                borderRadius: 999,
                                border: `1px solid ${TOKENS.b3}`,
                                background: TOKENS.card2,
                                color: TOKENS.text2,
                                padding: '5px 9px',
                                fontSize: 11,
                                cursor: visualFeedbackSavingKey !== null ? 'not-allowed' : 'pointer',
                                opacity: visualFeedbackSavingKey !== null && !busy ? 0.55 : 1,
                              }}
                            >
                              {busy ? 'Speichert...' : option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    {result.findings.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {result.findings.slice(0, 5).map((finding, index) => (
                          <div key={`${result.modelId}-${index}`} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '9px 10px', display: 'grid', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{finding.category}</span>
                              <span style={{ fontSize: 11, color: TOKENS.text3 }}>{finding.severity}</span>
                            </div>
                            <div style={{ fontSize: 12.5, color: TOKENS.text, fontWeight: 700 }}>{finding.title}</div>
                            <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.6 }}>{finding.description}</div>
                            {finding.suggestedFix ? (
                              <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>Fix: {finding.suggestedFix}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {visualReviewReportArtifactsCount > 0 ? (
                <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                  Persistierte Visual Reports: {visualReviewReportArtifactsCount}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </BuilderPanel>
    </div>
  );
}
