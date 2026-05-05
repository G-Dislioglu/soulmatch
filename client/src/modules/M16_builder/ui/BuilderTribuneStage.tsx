import type { ReactNode } from 'react';

import { TOKENS } from '../../../design/tokens';
import type { BuilderTask } from '../hooks/useBuilderApi';
import { BuilderPanel } from './BuilderPanel';

interface TribuneTimelineEntryView {
  key: string;
  label: string;
  detail: string;
  meta: string;
  accent: string;
  state: 'done' | 'current' | 'pending' | 'waiting' | 'blocked';
}

interface OperatorActionSuggestionView {
  key: string;
  label: string;
  tone: 'primary' | 'warning' | 'neutral' | 'danger';
}

interface OperatorGuidanceView {
  title: string;
  summary: string;
  detail: string;
  accent: string;
  actions: OperatorActionSuggestionView[];
}

interface TribunePhaseDetailView {
  title: string;
  summary: string;
  source: string;
  lines: string[];
  note?: string;
  notRequired?: boolean;
}

interface BuilderTribuneStageProps {
  compact: boolean;
  experienceMode: 'default' | 'single_specialist' | 'pipeline';
  activeTask: BuilderTask | null;
  attentionTask: BuilderTask | null;
  attentionDetail: string | null;
  isBusy: boolean;
  selectedTaskId: string | null;
  tribuneHeroTitle: string;
  tribuneHeroSummary: string;
  tribuneHeroPhaseTone: string;
  tribuneTimeline: TribuneTimelineEntryView[];
  effectiveTribunePhase: string | null;
  mayaTribuneSentence: string;
  currentTribuneEntry: TribuneTimelineEntryView | null;
  previewUrl: string | null;
  operatorGuidance: OperatorGuidanceView | null;
  tribunePhaseDetail: TribunePhaseDetailView | null;
  fallbackContent: ReactNode;
  onSelectTribunePhase: (phase: string) => void;
  onFocusOutput: () => void;
  onFocusDialog: () => void;
  onFocusTechnicalDetails: () => void;
  onFocusPreview: () => void;
  onOpenAttentionTask: () => void;
  onApprovePrototype: () => void;
  onApproveTask: () => void;
  onOperatorAction: (key: string) => void;
  isOperatorActionDisabled: (key: string) => boolean;
}

export function BuilderTribuneStage(props: BuilderTribuneStageProps) {
  const {
    compact,
    experienceMode,
    activeTask,
    attentionTask,
    attentionDetail,
    isBusy,
    selectedTaskId,
    tribuneHeroTitle,
    tribuneHeroSummary,
    tribuneHeroPhaseTone,
    tribuneTimeline,
    effectiveTribunePhase,
    mayaTribuneSentence,
    currentTribuneEntry,
    previewUrl,
    operatorGuidance,
    tribunePhaseDetail,
    fallbackContent,
    onSelectTribunePhase,
    onFocusOutput,
    onFocusDialog,
    onFocusTechnicalDetails,
    onFocusPreview,
    onOpenAttentionTask,
    onApprovePrototype,
    onApproveTask,
    onOperatorAction,
    isOperatorActionDisabled,
  } = props;
  const isPipelineMode = experienceMode === 'pipeline';
  const isSingleSpecialistMode = experienceMode === 'single_specialist';

  return (
    <div data-maya-target="tribune-main">
      <BuilderPanel
        title={isPipelineMode ? 'Live Tribune' : isSingleSpecialistMode ? 'Specialist Focus' : 'Live Tribune'}
        subtitle={isPipelineMode
          ? 'Mehrspurige Orchestrierung: was laeuft gerade, wo steht die Task und braucht Maya deine Entscheidung?'
          : isSingleSpecialistMode
            ? 'Fokussierter Einzelpfad: ein klarer Arbeitsstrang statt breite Pipeline-Orchestrierung.'
            : 'Was passiert gerade, warum und wartet Maya auf dich oder nicht?'}
        accent={isPipelineMode ? TOKENS.purple : TOKENS.cyan}
      >
        {activeTask ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                borderRadius: 22,
                border: `1.5px solid ${tribuneHeroPhaseTone}55`,
                background: `linear-gradient(135deg, ${tribuneHeroPhaseTone}16, rgba(255,255,255,0.03))`,
                padding: compact ? '16px 16px' : '18px 20px',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 11, color: tribuneHeroPhaseTone, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
                {isPipelineMode ? 'Pipeline Orchestration' : isSingleSpecialistMode ? 'Specialist Run' : 'First Cognition'}
              </div>
              <div style={{ fontSize: compact ? 24 : 30, color: TOKENS.text, fontFamily: TOKENS.font.display, lineHeight: 1.2 }}>
                {tribuneHeroTitle}
              </div>
              <div style={{ fontSize: 15, color: TOKENS.text2, lineHeight: 1.7, maxWidth: 920 }}>
                {tribuneHeroSummary}
              </div>
            </div>

            {attentionTask && attentionDetail ? (
              <div
                style={{
                  borderRadius: 18,
                  border: `1.5px solid ${TOKENS.gold}66`,
                  background: 'rgba(212,175,55,0.12)',
                  padding: '14px 16px',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                      Maya braucht dich kurz
                    </div>
                    <div style={{ fontSize: 18, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                      {attentionTask.title}
                    </div>
                  </div>
                  <div style={{ minWidth: 28, height: 28, borderRadius: '50%', background: `${TOKENS.gold}22`, border: `1px solid ${TOKENS.gold}55`, display: 'grid', placeItems: 'center', color: TOKENS.gold, fontWeight: 700 }}>
                    M
                  </div>
                </div>
                <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                  {attentionDetail}
                </div>
                <div style={{ fontSize: 11.5, color: TOKENS.text3, fontFamily: TOKENS.font.body }}>
                  {attentionTask.status === 'prototype_review'
                    ? 'Ich habe einen sichtbaren Zwischenstand vorbereitet. Bitte entscheide jetzt bewusst.'
                    : 'Ich bin an einem Punkt, an dem ich nicht still weiterlanden sollte.'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={onOpenAttentionTask}
                    style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.gold}`, background: 'rgba(212,175,55,0.16)', color: TOKENS.text, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {attentionTask.id === activeTask.id ? 'Zum Entscheidungsblock' : 'Zu dieser Task'}
                  </button>
                  {attentionTask.id === activeTask.id && attentionTask.status === 'prototype_review' ? (
                    <button
                      type="button"
                      onClick={onApprovePrototype}
                      disabled={isBusy || !selectedTaskId}
                      style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: isBusy ? 0.7 : 1 }}
                    >
                      Prototype freigeben
                    </button>
                  ) : null}
                  {attentionTask.id === activeTask.id && attentionTask.status !== 'prototype_review' ? (
                    <button
                      type="button"
                      onClick={onApproveTask}
                      disabled={isBusy || !selectedTaskId}
                      style={{ borderRadius: 999, border: `1.5px solid ${TOKENS.green}`, background: 'rgba(74,222,128,0.10)', color: TOKENS.text, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: isBusy ? 0.7 : 1 }}
                    >
                      Freigeben
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isPipelineMode ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                  Sichtbarer Task-Pfad
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  {tribuneTimeline.map((entry, index) => {
                    const stateStyles: Record<TribuneTimelineEntryView['state'], { border: string; background: string; dot: string; text: string; badge: string }> = {
                      done: { border: `${TOKENS.green}44`, background: 'rgba(74,222,128,0.08)', dot: TOKENS.green, text: TOKENS.text, badge: 'Durchlaufen' },
                      current: { border: `${entry.accent}66`, background: `${entry.accent}16`, dot: entry.accent, text: TOKENS.text, badge: 'Aktiv' },
                      pending: { border: TOKENS.b3, background: 'rgba(255,255,255,0.02)', dot: TOKENS.text3, text: TOKENS.text2, badge: 'Ausstehend' },
                      waiting: { border: `${TOKENS.gold}66`, background: 'rgba(212,175,55,0.12)', dot: TOKENS.gold, text: TOKENS.text, badge: 'Wartet auf dich' },
                      blocked: { border: `${TOKENS.rose}66`, background: 'rgba(244,114,182,0.12)', dot: TOKENS.rose, text: TOKENS.text, badge: 'Gestoppt' },
                    };
                    const style = stateStyles[entry.state];

                    return (
                      <button
                        type="button"
                        key={entry.key}
                        onClick={() => onSelectTribunePhase(entry.key)}
                        style={{
                          borderRadius: 16,
                          border: `1.5px solid ${effectiveTribunePhase === entry.key ? entry.accent : style.border}`,
                          background: effectiveTribunePhase === entry.key ? `${entry.accent}18` : style.background,
                          padding: '12px 12px 13px',
                          display: 'grid',
                          gap: 8,
                          minHeight: compact ? 92 : 108,
                          alignContent: 'start',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: style.dot, boxShadow: entry.state === 'current' ? `0 0 12px ${style.dot}66` : 'none', display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Schritt {index + 1}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, color: style.text, fontWeight: 700, lineHeight: 1.35 }}>
                          {entry.label}
                        </div>
                        <div style={{ fontSize: 11.5, color: entry.state === 'current' || entry.state === 'waiting' || entry.state === 'blocked' ? style.text : TOKENS.text3, lineHeight: 1.5 }}>
                          {style.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                  Aktiver Spezialpfad
                </div>
                <div style={{ borderRadius: 18, border: `1.5px solid ${currentTribuneEntry?.accent ?? TOKENS.cyan}55`, background: `linear-gradient(135deg, ${(currentTribuneEntry?.accent ?? TOKENS.cyan)}14, rgba(255,255,255,0.03))`, padding: '13px 14px', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 14, color: TOKENS.text, fontWeight: 700 }}>
                      {currentTribuneEntry?.label ?? 'Fokussierter Arbeitsmodus'}
                    </div>
                    <span style={{ borderRadius: 999, border: `1px solid ${(currentTribuneEntry?.accent ?? TOKENS.cyan)}66`, padding: '3px 8px', fontSize: 10.5, color: currentTribuneEntry?.accent ?? TOKENS.cyan, fontWeight: 700 }}>
                      {currentTribuneEntry?.state === 'waiting' ? 'Wartet auf dich' : currentTribuneEntry?.state === 'blocked' ? 'Gestoppt' : 'Aktiv'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                    {currentTribuneEntry?.detail ?? 'Maya arbeitet in einem fokussierten Einzelpfad ohne breite Pool-Orchestrierung.'}
                  </div>
                  {currentTribuneEntry?.meta ? (
                    <div style={{ fontSize: 11, color: TOKENS.text3, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                      {currentTribuneEntry.meta}
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                    <button type="button" onClick={onFocusOutput} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                      Zum Output
                    </button>
                    <button type="button" onClick={onFocusDialog} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                      Zum Dialog
                    </button>
                    {previewUrl ? (
                      <button type="button" onClick={onFocusPreview} style={{ borderRadius: 999, border: `1px solid ${TOKENS.gold}55`, background: 'rgba(212,175,55,0.10)', color: TOKENS.gold, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                        Zum Preview
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <div style={{ borderRadius: 18, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '13px 14px', display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                {isPipelineMode ? 'Maya sagt gerade' : 'Maya fokussiert gerade'}
              </div>
              <div style={{ fontSize: 15, color: TOKENS.text, lineHeight: 1.75 }}>
                {mayaTribuneSentence}
              </div>
              {currentTribuneEntry ? (
                <div style={{ display: 'grid', gap: 4, borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 8 }}>
                  <div style={{ fontSize: 13, color: currentTribuneEntry.accent, fontWeight: 700 }}>
                    {currentTribuneEntry.label}
                  </div>
                  <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                    {currentTribuneEntry.detail}
                  </div>
                  <div style={{ fontSize: 11, color: TOKENS.text3, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                    {currentTribuneEntry.meta}
                  </div>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                <button type="button" onClick={onFocusOutput} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                  Zum Output
                </button>
                <button type="button" onClick={onFocusDialog} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                  Zum Dialog
                </button>
                {isPipelineMode ? (
                  <button type="button" onClick={onFocusTechnicalDetails} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                    Zu Transitions
                  </button>
                ) : null}
                {previewUrl ? (
                  <button type="button" onClick={onFocusPreview} style={{ borderRadius: 999, border: `1px solid ${TOKENS.gold}55`, background: 'rgba(212,175,55,0.10)', color: TOKENS.gold, padding: '6px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                    Zum Preview
                  </button>
                ) : null}
              </div>
            </div>

            {operatorGuidance ? (
              <div style={{ borderRadius: 18, border: `1.5px solid ${operatorGuidance.accent}55`, background: `linear-gradient(135deg, ${operatorGuidance.accent}12, rgba(255,255,255,0.03))`, padding: '13px 14px', display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 11, color: operatorGuidance.accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                    Operator Next Step
                  </div>
                  <div style={{ fontSize: 16, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                    {operatorGuidance.title}
                  </div>
                  <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                    {operatorGuidance.summary}
                  </div>
                  <div style={{ fontSize: 11.5, color: TOKENS.text3, lineHeight: 1.6 }}>
                    {operatorGuidance.detail}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {operatorGuidance.actions.map((action) => {
                    const tones: Record<OperatorActionSuggestionView['tone'], { border: string; background: string; color: string }> = {
                      primary: { border: TOKENS.cyan, background: 'rgba(34,211,238,0.12)', color: TOKENS.text },
                      warning: { border: TOKENS.gold, background: 'rgba(212,175,55,0.12)', color: TOKENS.text },
                      neutral: { border: TOKENS.b1, background: 'rgba(255,255,255,0.04)', color: TOKENS.text2 },
                      danger: { border: TOKENS.rose, background: 'rgba(244,114,182,0.12)', color: TOKENS.text },
                    };
                    const tone = tones[action.tone];
                    const disabled = isOperatorActionDisabled(action.key);

                    return (
                      <button
                        type="button"
                        key={action.key}
                        onClick={() => onOperatorAction(action.key)}
                        disabled={disabled}
                        style={{
                          borderRadius: 999,
                          border: `1.5px solid ${tone.border}`,
                          background: tone.background,
                          color: tone.color,
                          padding: '9px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.45 : 1,
                        }}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {tribunePhaseDetail && isPipelineMode ? (
              <div style={{ borderRadius: 18, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '13px 14px', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                    Phase im Detail
                  </div>
                  <div style={{ fontSize: 11, color: tribunePhaseDetail.notRequired ? TOKENS.text3 : TOKENS.cyan, fontWeight: 700 }}>
                    Quelle: {tribunePhaseDetail.source}
                  </div>
                </div>
                <div style={{ fontSize: 16, color: TOKENS.text, fontFamily: TOKENS.font.display }}>
                  {tribunePhaseDetail.title}
                </div>
                <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                  {tribunePhaseDetail.summary}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {tribunePhaseDetail.lines.map((line, index) => (
                    <div key={`${tribunePhaseDetail.title}-${index}`} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '9px 11px', fontSize: 12, color: TOKENS.text2, lineHeight: 1.55 }}>
                      {line}
                    </div>
                  ))}
                </div>
                {tribunePhaseDetail.notRequired ? (
                  <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                    Diese Phase war fuer die aktuelle Task nicht erforderlich und ist deshalb bewusst nicht weiter ausgefaltet.
                  </div>
                ) : null}
                {tribunePhaseDetail.note ? (
                  <div style={{ fontSize: 11.5, color: TOKENS.text3, borderTop: `1px solid ${TOKENS.b3}`, paddingTop: 8 }}>
                    {tribunePhaseDetail.note}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          fallbackContent
        )}
      </BuilderPanel>
    </div>
  );
}
