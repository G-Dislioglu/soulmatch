import { TOKENS } from '../../../design/tokens';
import type { BuilderArtifact, BuilderEvidencePack, BuilderTask } from '../hooks/useBuilderApi';
import { BuilderPanel } from './BuilderPanel';

interface BuilderOutputPanelsProps {
  activeTask: BuilderTask | null;
  deliveryArtifacts: BuilderArtifact[];
  latestPrototypeArtifact: BuilderArtifact | null;
  latestApprovalArtifact: BuilderArtifact | null;
  latestStructuredArtifact: BuilderArtifact | null;
  latestDialogSnippet: string | null;
  previewUrl: string | null;
  screenshotPreviewSrc: string | null;
  evidencePack: BuilderEvidencePack | null;
  statusColors: Record<string, string>;
  actorColors: Record<string, string>;
  formatDate: (value: string | null | undefined) => string;
  formatArtifactTypeLabel: (artifactType: string) => string;
  formatExecutionChannelLabel: (channel: string | null | undefined) => string;
  getArtifactPreviewText: (artifact: BuilderArtifact | null | undefined) => string | null;
  getArtifactPayloadString: (artifact: BuilderArtifact | null | undefined, key: string) => string | null;
  onTransitionJump: (lane: string, reason: string | null) => void;
}

export function BuilderOutputPanels(props: BuilderOutputPanelsProps) {
  const {
    activeTask,
    deliveryArtifacts,
    latestPrototypeArtifact,
    latestApprovalArtifact,
    latestStructuredArtifact,
    latestDialogSnippet,
    previewUrl,
    screenshotPreviewSrc,
    evidencePack,
    statusColors,
    actorColors,
    formatDate,
    formatArtifactTypeLabel,
    formatExecutionChannelLabel,
    getArtifactPreviewText,
    getArtifactPayloadString,
    onTransitionJump,
  } = props;

  return (
    <>
      <div data-maya-target="delivery-surface">
        <BuilderPanel title="Delivery Surface" subtitle="Die passende Arbeits- und Ergebnisansicht pro Output-Typ statt nur generischer Technikdaten." accent={TOKENS.gold}>
          {activeTask ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                  {activeTask.requestedOutputKind}
                </div>
                <div style={{ fontSize: 13, color: TOKENS.text2, lineHeight: 1.65 }}>
                  {activeTask.contract.output.summary}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Artifacts</div>
                    <div style={{ fontSize: 14, color: TOKENS.text, fontWeight: 700 }}>{deliveryArtifacts.length}</div>
                  </div>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Preview</div>
                    <div style={{ fontSize: 14, color: TOKENS.text, fontWeight: 700 }}>{previewUrl ? 'Verfuegbar' : 'Noch offen'}</div>
                  </div>
                  <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: 10.5, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Latest Delivery</div>
                    <div style={{ fontSize: 14, color: TOKENS.text, fontWeight: 700 }}>{formatDate(latestPrototypeArtifact?.createdAt ?? latestStructuredArtifact?.createdAt ?? latestApprovalArtifact?.createdAt)}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {deliveryArtifacts.length > 0 ? deliveryArtifacts.map((artifact) => (
                  <span key={artifact.id} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text3, padding: '4px 8px', fontSize: 11 }}>
                    {formatArtifactTypeLabel(artifact.artifactType)}  -  {artifact.lane}
                  </span>
                )) : (
                  <span style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text3, padding: '4px 8px', fontSize: 11 }}>
                    Noch keine persistierten Delivery-Artefakte
                  </span>
                )}
              </div>
              {(activeTask.requestedOutputKind === 'html_artifact' || activeTask.requestedOutputKind === 'visual_artifact') ? (
                <div data-maya-target="preview-panel" style={{ borderRadius: 16, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 11, color: TOKENS.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Preview Surface</div>
                  <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                    {latestPrototypeArtifact
                      ? `Gespeichertes ${formatArtifactTypeLabel(latestPrototypeArtifact.artifactType)} aus der Prototype-Lane ist vorhanden und dient hier als primaere Delivery-Spur.`
                      : previewUrl
                        ? 'Die Preview ist verfuegbar, aber noch nicht als eigenstaendiges Artefakt beschrieben.'
                        : 'Noch keine direkte Vorschau verfuegbar. Die Tribune und der Dialog liefern aktuell den besten Zwischenstand.'}
                  </div>
                  {previewUrl ? (
                    <iframe
                      title={`Delivery Preview ${activeTask.id}`}
                      src={previewUrl}
                      style={{ width: '100%', height: 320, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, background: '#0f0f17' }}
                    />
                  ) : null}
                  {latestPrototypeArtifact ? (
                    <div style={{ fontSize: 12, color: TOKENS.text3 }}>
                      {formatArtifactTypeLabel(latestPrototypeArtifact.artifactType)}  -  {latestPrototypeArtifact.path ?? 'ohne Pfad'}  -  {formatDate(latestPrototypeArtifact.createdAt)}
                    </div>
                  ) : null}
                  {screenshotPreviewSrc ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Latest Browser Capture</div>
                      <img
                        src={screenshotPreviewSrc}
                        alt="Latest browser screenshot"
                        style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#0f0f17' }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {activeTask.requestedOutputKind === 'code_artifact' ? (
                <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Code Delivery</div>
                  <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                    {latestApprovalArtifact
                      ? 'Es liegt bereits ein persistierter Freigabe- oder Operator-Artefaktpfad vor. Das ist aktuell die belastbarste Delivery-Spur fuer diesen Lauf.'
                      : deliveryArtifacts.length > 0
                        ? 'Der Lauf hat persistierte Builder-Artefakte erzeugt. Fuer Code ist die Artefaktspur noch knapper als fuer Preview-Outputs, aber nicht mehr rein dialogbasiert.'
                        : activeTask.contract.codeLane.summary}
                  </div>
                  <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                    Geplante Artefakte: {activeTask.contract.output.plannedArtifacts.join(', ') || '-'}
                  </div>
                  {deliveryArtifacts.length > 0 ? deliveryArtifacts.slice(0, 3).map((artifact) => (
                    <div key={artifact.id} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px', display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 11, color: TOKENS.cyan, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        {formatArtifactTypeLabel(artifact.artifactType)}  -  {artifact.lane}
                      </div>
                      <div style={{ fontSize: 12, color: TOKENS.text2 }}>
                        {artifact.path ?? 'kein Pfad gespeichert'}
                      </div>
                      <div style={{ fontSize: 11, color: TOKENS.text3 }}>
                        {formatDate(artifact.createdAt)}
                      </div>
                      {getArtifactPreviewText(artifact) ? (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.6, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 180, overflowY: 'auto' }}>
                          {getArtifactPreviewText(artifact)}
                        </pre>
                      ) : null}
                    </div>
                  )) : null}
                  {latestDialogSnippet ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.6, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 220, overflowY: 'auto', borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px' }}>
                      {latestDialogSnippet}
                    </pre>
                  ) : null}
                </div>
              ) : null}
              {(activeTask.requestedOutputKind === 'structured_answer' || activeTask.requestedOutputKind === 'chat_answer' || activeTask.requestedOutputKind === 'markdown_artifact' || activeTask.requestedOutputKind === 'json_artifact' || activeTask.requestedOutputKind === 'presentation_artifact') ? (
                <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b2}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    {activeTask.requestedOutputKind === 'presentation_artifact' ? 'Presentation Surface' : activeTask.requestedOutputKind === 'json_artifact' ? 'Structured Data Surface' : 'Answer Surface'}
                  </div>
                  <div style={{ fontSize: 12.5, color: TOKENS.text2, lineHeight: 1.6 }}>
                    {latestStructuredArtifact
                      ? 'Die Delivery Surface zeigt hier das zuletzt persistierte Builder-Artefakt statt nur die Zusammenfassung aus Contract oder Dialog.'
                      : evidencePack?.intent?.user_outcome || activeTask.goal}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {activeTask.contract.output.plannedArtifacts.map((artifact) => (
                      <span key={artifact} style={{ borderRadius: 999, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.03)', color: TOKENS.text3, padding: '4px 8px', fontSize: 11 }}>
                        {artifact}
                      </span>
                    ))}
                  </div>
                  {latestStructuredArtifact ? (
                    <div style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px', display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 11, color: TOKENS.green, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        {formatArtifactTypeLabel(latestStructuredArtifact.artifactType)}  -  {latestStructuredArtifact.lane}
                      </div>
                      <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                        {latestStructuredArtifact.path ?? 'kein Pfad gespeichert'}  -  {formatDate(latestStructuredArtifact.createdAt)}
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.6, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 260, overflowY: 'auto' }}>
                        {getArtifactPreviewText(latestStructuredArtifact)}
                      </pre>
                    </div>
                  ) : null}
                  {latestDialogSnippet ? (
                    <div style={{ fontSize: 12, color: TOKENS.text2, lineHeight: 1.65, borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 11px' }}>
                      {latestDialogSnippet}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div style={{ borderRadius: 16, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Artifact Stream</div>
                {deliveryArtifacts.length > 0 ? deliveryArtifacts.slice(0, 5).map((artifact) => (
                  <div key={artifact.id} style={{ borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '9px 10px', display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 12, color: TOKENS.text }}>{formatArtifactTypeLabel(artifact.artifactType)}</strong>
                      <span style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(artifact.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: TOKENS.text2 }}>
                      Lane {artifact.lane}  -  {artifact.path ?? 'kein Pfad'}
                    </div>
                    {getArtifactPayloadString(artifact, 'route') ? (
                      <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                        Route: {getArtifactPayloadString(artifact, 'route')}
                      </div>
                    ) : null}
                  </div>
                )) : (
                  <div style={{ fontSize: 13, color: TOKENS.text2 }}>
                    Fuer diese Task liegt noch kein eigener Builder-Artefaktstrom vor.
                  </div>
                )}
                {deliveryArtifacts.length > 5 ? (
                  <div style={{ fontSize: 11.5, color: TOKENS.text3 }}>
                    Weitere {deliveryArtifacts.length - 5} Artefakte bleiben hier bewusst verborgen, damit die Delivery-Flaeche lesbar bleibt.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: TOKENS.text2 }}>Waehle eine Task, um die passende Delivery-Ansicht zu sehen.</div>
          )}
        </BuilderPanel>
      </div>

      <div data-maya-target="pruefstand">
        <BuilderPanel title="Pruefstand" subtitle="Build- und Runtime-Befunde. Wichtig fuer Operatoren, aber bewusst nicht die Hauptbuehne." accent={TOKENS.cyan}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>TSC</div>
                <div style={{ marginTop: 6, fontSize: 18, color: evidencePack?.checks.tsc === 'pass' ? TOKENS.green : TOKENS.text }}>{evidencePack?.checks.tsc ?? '-'}</div>
              </div>
              <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Build</div>
                <div style={{ marginTop: 6, fontSize: 18, color: evidencePack?.checks.build === 'pass' ? TOKENS.green : TOKENS.text }}>{evidencePack?.checks.build ?? '-'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(evidencePack?.runtime_results ?? []).slice(0, 8).map((result) => (
                <div key={`${result.test}-${result.details}`} style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 12.5, color: TOKENS.text }}>{result.test}</span>
                    <span style={{ fontSize: 12, color: result.result === 'pass' ? TOKENS.green : '#fca5a5' }}>{result.result}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: TOKENS.text2 }}>{result.details}</div>
                </div>
              ))}
              {!evidencePack || evidencePack.runtime_results.length === 0 ? <div style={{ fontSize: 13, color: TOKENS.text2 }}>Noch keine Test- oder Runtime-Ergebnisse vorhanden.</div> : null}
            </div>
          </div>
        </BuilderPanel>
      </div>

      <div data-maya-target="technical-details">
        <BuilderPanel title="Technische Details" subtitle="Review-, Diff- und Rohdaten zum aktuellen Task. Nur bei Bedarf vertiefen." accent={TOKENS.rose}>
          {evidencePack ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Final Status: <strong style={{ color: statusColors[evidencePack.final_status] ?? TOKENS.text }}>{evidencePack.final_status}</strong></div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Intent: {evidencePack.intent_kind}  -  Output: {evidencePack.requested_output_kind}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Format: {evidencePack.requested_output_format}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Execution Channel: {formatExecutionChannelLabel(evidencePack.execution_summary.channel)}  -  Source: {evidencePack.execution_summary.latest_status_source ?? '-'}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Latest Transition: {evidencePack.execution_summary.last_transition_reason ?? '-'}  -  Lane: {evidencePack.execution_summary.last_transition_lane ?? '-'}  -  {formatDate(evidencePack.execution_summary.last_transition_at)}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Transition Count: {evidencePack.execution_summary.transition_count}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Contract Phase: {evidencePack.contract_snapshot.lifecycle_phase}  -  Attention: {evidencePack.contract_snapshot.attention_state}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Active Lanes: {evidencePack.contract_snapshot.active_lanes.join('  -  ') || '-'}  -  Team: {evidencePack.contract_snapshot.team_instances.join('  -  ') || '-'}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Planned Artifacts: {evidencePack.contract_snapshot.planned_artifacts.join(', ') || '-'}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Agreement: {evidencePack.agreement_level ?? '-'}  -  Tokens: {evidencePack.total_tokens}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>Counterexamples: {evidencePack.counterexamples_passed}/{evidencePack.counterexamples_tested}</div>
              <div style={{ fontSize: 12, color: TOKENS.text2 }}>False success detected: {evidencePack.false_success_detected ? 'ja' : 'nein'}</div>
              <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Status Transitions</div>
                <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                  {evidencePack.status_transitions.length > 0 ? evidencePack.status_transitions.slice(-8).map((transition) => (
                    <button
                      type="button"
                      key={`${transition.at}-${transition.to_status}-${transition.reason ?? 'none'}`}
                      onClick={() => onTransitionJump(transition.lane, transition.reason)}
                      style={{ fontSize: 12.5, color: TOKENS.text2, textAlign: 'left', borderRadius: 12, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '9px 10px', cursor: 'pointer' }}
                    >
                      <strong style={{ color: TOKENS.text }}>{transition.to_status}</strong> via {transition.lane}
                      {transition.from_status ? ` (von ${transition.from_status})` : ''}
                      {transition.reason ? `  -  ${transition.reason}` : ''}
                      {`  -  ${transition.lifecycle_phase}`}
                    </button>
                  )) : <div style={{ fontSize: 12.5, color: TOKENS.text2 }}>Noch keine expliziten Transition-Signale gespeichert.</div>}
                </div>
              </div>
              <div style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
                <div style={{ fontSize: 11, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Reviews</div>
                <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                  {Object.entries(evidencePack.reviews).map(([reviewer, review]) => (
                    <div key={reviewer} style={{ fontSize: 12.5, color: TOKENS.text2 }}>
                      <strong style={{ color: actorColors[reviewer] ?? TOKENS.text }}>{reviewer}</strong>: {review.verdict}
                      {review.notes ? <div style={{ marginTop: 3 }}>{review.notes}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
              <details style={{ borderRadius: 14, border: `1px solid ${TOKENS.b3}`, background: 'rgba(255,255,255,0.02)', padding: '10px 12px' }}>
                <summary style={{ cursor: 'pointer', color: TOKENS.text, fontSize: 12.5, fontWeight: 700 }}>
                  Rohdaten anzeigen
                </summary>
                <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.7, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace', maxHeight: 280, overflowY: 'auto' }}>
                  {JSON.stringify(evidencePack, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: TOKENS.text2 }}>Fuer diese Task liegt noch kein Evidence Pack vor.</div>
          )}
        </BuilderPanel>
      </div>
    </>
  );
}
