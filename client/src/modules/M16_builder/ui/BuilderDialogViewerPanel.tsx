import type { RefObject } from 'react';

import { TOKENS } from '../../../design/tokens';
import type { UseSpeechToTextReturn } from '../../../hooks/useSpeechToText';
import type { BuilderChatMessage } from '../hooks/useBuilderApi';
import type { DirectorModel, MayaActionResult } from '../hooks/useMayaApi';
import { BuilderPanel } from './BuilderPanel';

type DialogFormat = 'dsl' | 'text';

interface BuilderBubble {
  id: string;
  actor: string;
  role: string;
  lane: string;
  roundNumber: number;
  createdAt: string;
  content: string;
}

interface ReadFilePreview {
  path: string;
  content: string;
}

interface StudioChatMessage extends BuilderChatMessage {
  label?: string;
  endpoint?: string;
  actions?: MayaActionResult[];
}

interface BuilderDialogViewerPanelProps {
  isVisualLaunchMode: boolean;
  directorModel: DirectorModel | null;
  directorThinking: boolean;
  activeChatLabel: string;
  activeChatEndpoint: string;
  directorModelMeta: Record<DirectorModel, { label: string }>;
  directorStatusText: string | null;
  directorLivePhase: 'thinking' | 'tool' | 'done' | 'error' | null;
  chatMessages: StudioChatMessage[];
  dialogBubbles: BuilderBubble[];
  chatInput: string;
  chatLoading: boolean;
  speech: UseSpeechToTextReturn;
  activeTaskTitle: string | null;
  dialogFormat: DialogFormat;
  chatContainerRef: RefObject<HTMLDivElement | null>;
  chatEndRef: RefObject<HTMLDivElement | null>;
  actorColors: Record<string, string>;
  formatDate: (value: string | null | undefined) => string;
  parseTaskConfirmation: (content: string) => { title?: string; goal?: string } | null;
  getReadFilePreview: (action: MayaActionResult) => ReadFilePreview | null;
  onToggleDirectorMode: () => void;
  onSelectDirectorModel: (model: DirectorModel) => void;
  onToggleDirectorThinking: () => void;
  onChatInputChange: (value: string) => void;
  onSendChat: () => void;
  onMicClick: () => void;
  onSetDialogFormat: (format: DialogFormat) => void;
}

export function BuilderDialogViewerPanel(props: BuilderDialogViewerPanelProps) {
  const {
    isVisualLaunchMode,
    directorModel,
    directorThinking,
    activeChatLabel,
    activeChatEndpoint,
    directorModelMeta,
    directorStatusText,
    directorLivePhase,
    chatMessages,
    dialogBubbles,
    chatInput,
    chatLoading,
    speech,
    activeTaskTitle,
    dialogFormat,
    chatContainerRef,
    chatEndRef,
    actorColors,
    formatDate,
    parseTaskConfirmation,
    getReadFilePreview,
    onToggleDirectorMode,
    onSelectDirectorModel,
    onToggleDirectorThinking,
    onChatInputChange,
    onSendChat,
    onMicClick,
    onSetDialogFormat,
  } = props;

  return (
    <div data-maya-target="dialog-viewer">
      <BuilderPanel
        title={isVisualLaunchMode ? 'Maya Capture' : 'Dialog Viewer'}
        subtitle={isVisualLaunchMode
          ? 'Starte hier den ersten Browser-Lauf fuer Vision. Danach uebernimmt der Review-Drawer mit Screenshots und Modellwahl.'
          : 'Rueckfragen, Begruendungen und Builder-Dialoge. Sekundaer zur Tribune, aber weiter voll nutzbar.'}
        accent={TOKENS.gold}
      >
        <div
          data-maya-target="maya-chat"
          style={{
            background: TOKENS.bg2,
            borderRadius: 22,
            border: `1px solid ${TOKENS.b1}`,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: TOKENS.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 10,
              fontFamily: TOKENS.font.display,
            }}
          >
            Maya Chat
          </div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={onToggleDirectorMode}
                style={{
                  borderRadius: 999,
                  border: `1.5px solid ${directorModel ? '#7c6af7' : TOKENS.b1}`,
                  background: directorModel ? 'rgba(124,106,247,0.14)' : 'transparent',
                  color: directorModel ? '#c4b5fd' : TOKENS.text2,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Maya Brain {directorModel ? 'AN' : 'AUS'}
              </button>
              {directorModel ? (Object.entries(directorModelMeta) as Array<[DirectorModel, { label: string }]>).map(([id, meta]) => (
                <button
                  key={id}
                  onClick={() => onSelectDirectorModel(id)}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${directorModel === id ? TOKENS.gold : TOKENS.b1}`,
                    background: directorModel === id ? 'rgba(212,175,55,0.14)' : 'transparent',
                    color: directorModel === id ? TOKENS.gold : TOKENS.text2,
                    padding: '6px 11px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {meta.label}
                </button>
              )) : null}
              {directorModel ? (
                <button
                  onClick={onToggleDirectorThinking}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${directorThinking ? TOKENS.cyan : TOKENS.b1}`,
                    background: directorThinking ? 'rgba(34,211,238,0.12)' : 'transparent',
                    color: directorThinking ? TOKENS.cyan : TOKENS.text2,
                    padding: '6px 11px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {directorThinking ? 'Deep' : 'Fast'}
                </button>
              ) : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 14, border: `1px solid ${TOKENS.b1}`, background: 'rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: 12, color: TOKENS.text }}>
                {directorModel ? 'Mehrstufiger Maya-Brain aktiv' : 'Normaler Builder-Chat aktiv'}
              </span>
              <span style={{ fontSize: 11, color: TOKENS.text2, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                {activeChatLabel}  -  {activeChatEndpoint}
              </span>
            </div>
          </div>
          <div
                ref={chatContainerRef as RefObject<HTMLDivElement>}
            style={{
              maxHeight: 420,
              overflowY: 'auto',
              marginBottom: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {chatMessages.length === 0 ? (
              <div style={{ color: TOKENS.text3, fontSize: 13, fontStyle: 'italic' }}>
                {directorModel
                  ? 'Beschreibe den naechsten Builder-Schritt - Maya Brain kann analysieren, delegieren und Actions ausfuehren.'
                  : 'Beschreibe was du aendern willst - Maya erstellt den Task automatisch.'}
              </div>
            ) : null}
            {chatMessages.map((message, index) => {
              const parsedTask = message.role === 'assistant'
                ? parseTaskConfirmation(message.content)
                : null;

              return (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    background: message.role === 'user' ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${message.role === 'user' ? `${TOKENS.gold}30` : TOKENS.b1}`,
                    borderRadius: 14,
                    padding: '8px 12px',
                    maxWidth: '85%',
                    fontSize: 13,
                    color: TOKENS.text,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.role === 'assistant' && message.label ? (
                    <div style={{ marginBottom: 6, fontSize: 10, color: TOKENS.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                      {message.label}
                    </div>
                  ) : null}
                  {parsedTask ? (
                    <div
                      style={{
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid rgba(212,175,55,0.25)',
                        borderRadius: 10,
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Task erstellt
                      </div>
                      <div style={{ fontSize: 15, color: '#e2e4f0', fontWeight: 600 }}>
                        {parsedTask.title}
                      </div>
                      {parsedTask.goal ? (
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                          {parsedTask.goal}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {message.content}
                      {message.actions && message.actions.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                          {message.actions.map((action, actionIndex) => (
                            <span
                              key={`${action.tool}-${actionIndex}`}
                              style={{
                                borderRadius: 999,
                                border: `1px solid ${action.ok ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
                                background: action.ok ? 'rgba(20,83,45,0.26)' : 'rgba(127,29,29,0.22)',
                                color: action.ok ? '#bbf7d0' : '#fecaca',
                                padding: '3px 8px',
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                              title={action.summary}
                            >
                              {action.tool}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {message.actions
                        ?.map((action) => getReadFilePreview(action))
                        .filter((preview): preview is ReadFilePreview => preview !== null)
                        .map((preview, previewIndex) => (
                          <details
                            key={`${preview.path}-${previewIndex}`}
                            style={{
                              marginTop: 10,
                              borderRadius: 12,
                              border: `1px solid ${TOKENS.b2}`,
                              background: 'rgba(255,255,255,0.03)',
                              padding: '10px 12px',
                            }}
                          >
                            <summary style={{ cursor: 'pointer', color: TOKENS.gold, fontSize: 12, fontWeight: 700 }}>
                              read-file  -  {preview.path}
                            </summary>
                            <pre
                              style={{
                                margin: '10px 0 0',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: 11,
                                lineHeight: 1.6,
                                color: TOKENS.text2,
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                              }}
                            >
                              {preview.content}
                            </pre>
                          </details>
                        ))}
                    </>
                  )}
                </div>
              );
            })}
            {chatLoading && !directorModel ? (
              <div style={{ color: TOKENS.gold, fontSize: 12, fontStyle: 'italic' }}>
                Maya denkt nach...
              </div>
            ) : null}
                <div ref={chatEndRef as RefObject<HTMLDivElement>} />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={(event) => onChatInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    onSendChat();
                  }
                }}
                placeholder={directorModel ? "z.B. 'Pruefe den Patrol-Status und delegiere den naechsten sinnvollen Schritt'" : "z.B. 'Erstelle einen Health-Check Endpoint'"}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  border: `1.5px solid ${TOKENS.b1}`,
                  background: TOKENS.bg,
                  color: TOKENS.text,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
                disabled={chatLoading}
              />
              <button
                onClick={onMicClick}
                disabled={!speech.isSupported || chatLoading}
                title={speech.isSupported ? (speech.isListening ? 'Mikrofon stoppen' : 'Mikrofon starten') : 'Spracherkennung nicht verfuegbar'}
                aria-label={speech.isSupported ? (speech.isListening ? 'Mikrofon stoppen' : 'Mikrofon starten') : 'Spracherkennung nicht verfuegbar'}
                style={{
                  borderRadius: 12,
                  border: `1.5px solid ${speech.isListening ? TOKENS.green : TOKENS.b1}`,
                  background: speech.isListening ? 'rgba(16,185,129,0.16)' : 'transparent',
                  color: speech.isListening ? TOKENS.green : TOKENS.text2,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !speech.isSupported || chatLoading ? 'not-allowed' : 'pointer',
                  opacity: !speech.isSupported || chatLoading ? 0.45 : 1,
                }}
              >
                {speech.isListening ? 'Stop' : 'Mic'}
              </button>
              <button
                data-maya-target="send-button"
                onClick={onSendChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  borderRadius: 12,
                  border: `1.5px solid ${TOKENS.gold}`,
                  background: 'rgba(212,175,55,0.12)',
                  color: TOKENS.gold,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: chatLoading ? 'not-allowed' : 'pointer',
                  opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                }}
              >
                Senden
              </button>
            </div>
            {speech.micBlocked || speech.isListening ? (
              <div
                style={{
                  minHeight: 18,
                  color: speech.micBlocked ? '#fca5a5' : TOKENS.green,
                  fontSize: 12,
                }}
              >
                {speech.micBlocked ? 'Mikrofon blockiert. Bitte Browser-Freigabe pruefen.' : 'Maya hoert zu...'}
              </div>
            ) : null}
            {directorModel && directorStatusText ? (
              <div
                style={{
                  minHeight: 20,
                  color: directorLivePhase === 'error'
                    ? '#fca5a5'
                    : directorLivePhase === 'tool' || chatLoading
                      ? TOKENS.green
                      : TOKENS.text2,
                  fontSize: 12,
                }}
              >
                {directorStatusText}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ color: TOKENS.text2, fontSize: 13 }}>
            Aktiver Task: {activeTaskTitle ?? '-'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['dsl', 'text'] as const).map((format) => (
              <button
                key={format}
                onClick={() => onSetDialogFormat(format)}
                style={{
                  borderRadius: 999,
                  border: `1.5px solid ${dialogFormat === format ? TOKENS.gold : TOKENS.b1}`,
                  background: dialogFormat === format ? 'rgba(212,175,55,0.12)' : 'transparent',
                  color: dialogFormat === format ? TOKENS.text : TOKENS.text2,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14, minHeight: 720 }}>
          {dialogBubbles.map((bubble) => (
            <article
              key={bubble.id}
              style={{
                justifySelf: bubble.actor === 'chatgpt' ? 'end' : 'start',
                width: 'min(86%, 760px)',
                borderRadius: 22,
                border: `1.5px solid ${actorColors[bubble.actor] ?? TOKENS.b2}`,
                background: bubble.actor === 'chatgpt' ? 'rgba(34,211,238,0.07)' : bubble.actor === 'claude' ? 'rgba(212,175,55,0.08)' : TOKENS.card2,
                padding: '14px 16px',
                boxShadow: TOKENS.shadow.card,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: actorColors[bubble.actor] ?? TOKENS.text2 }}>{bubble.actor}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: TOKENS.text3 }}>Runde {bubble.roundNumber || '-'}  -  {bubble.role}</div>
                </div>
                <div style={{ fontSize: 11, color: TOKENS.text3 }}>{formatDate(bubble.createdAt)}</div>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5, lineHeight: 1.7, color: TOKENS.text, fontFamily: dialogFormat === 'dsl' ? 'ui-monospace, SFMono-Regular, monospace' : TOKENS.font.body }}>
                {bubble.content}
              </pre>
            </article>
          ))}
          {dialogBubbles.length === 0 ? <div style={{ fontSize: 14, color: TOKENS.text2 }}>Noch kein Dialog fuer den gewaehlten Task vorhanden.</div> : null}
        </div>
      </BuilderPanel>
    </div>
  );
}
