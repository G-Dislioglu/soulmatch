import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { TOKENS } from '../../../design';

type CreatorRole = 'maya' | 'user';

interface CreatorMessage {
  role: CreatorRole;
  content: string;
  attachments?: File[];
}

interface ArcanaCreatorChatProps {
  errorMessage?: string | null;
}

const SUGGESTIONS = ['Historische Figur', 'Fiktiver Charakter', 'Eigene Erfindung'] as const;

const INTRO_MESSAGE: CreatorMessage = {
  role: 'maya',
  content:
    'Ich bin Maya, deine Casting-Direktorin fuer neue Personas. Gib mir eine Richtung und ich forme mit dir Schritt fuer Schritt eine klare, nutzbare Persona.',
};

export function ArcanaCreatorChat({ errorMessage = null }: ArcanaCreatorChatProps) {
  const [messages, setMessages] = useState<CreatorMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 || attachments.length > 0, [attachments.length, input]);

  function pushUserMessage(content: string, files: File[] = []) {
    if (content.trim().length === 0 && files.length === 0) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: content.trim(),
        attachments: files.length > 0 ? files : undefined,
      },
    ]);
    setInput('');
    setAttachments([]);
  }

  function handleSend() {
    pushUserMessage(input, attachments);
  }

  function handleSuggestionClick(suggestion: string) {
    pushUserMessage(suggestion);
  }

  function handleAttachmentPick(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    setAttachments((prev) => [...prev, ...nextFiles]);
    event.target.value = '';
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <section style={{ minHeight: 0, height: '100%', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', background: '#111118' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(201,168,76,0.08)', background: '#111118' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F3F0FF',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              border: '1px solid rgba(124,106,247,0.45)',
              background: 'linear-gradient(135deg, #7c6af7, #9b8aff)',
            }}
          >
            M
          </div>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: '2px', color: '#C9A84C' }}>
              MAYA · CASTING-DIREKTORIN
            </div>
            <div style={{ marginTop: 2, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: TOKENS.text2 }}>
              Persona-Erstellung durch Dialog
            </div>
          </div>
        </div>
        {errorMessage ? (
          <div style={{ marginTop: 10 }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: '#fda4af', lineHeight: 1.5 }}>Arcana API Fehler: {errorMessage}</span>
          </div>
        ) : null}
      </div>

      <div ref={listRef} style={{ minHeight: 0, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((message, index) => {
          const isMaya = message.role === 'maya';
          return (
            <div key={`${message.role}-${index}`} style={{ display: 'flex', justifyContent: isMaya ? 'flex-start' : 'flex-end' }}>
              <div style={{ maxWidth: '78%', display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isMaya ? 'flex-start' : 'flex-end' }}>
                  {isMaya ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#F3F0FF',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 11,
                        border: '1px solid rgba(124,106,247,0.45)',
                        background: 'linear-gradient(135deg, #7c6af7, #9b8aff)',
                      }}
                    >
                      M
                    </div>
                  ) : null}
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: TOKENS.text3, letterSpacing: '1px' }}>
                    {isMaya ? 'MAYA' : 'DU'}
                  </span>
                  {!isMaya ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: TOKENS.text2,
                        background: '#242433',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 11,
                      }}
                    >
                      G
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    borderRadius: isMaya ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                    border: isMaya ? '1px solid rgba(201,168,76,0.1)' : '1px solid rgba(124,106,247,0.35)',
                    background: isMaya ? '#16161F' : 'rgba(124,106,247,0.15)',
                    padding: '10px 12px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: TOKENS.text,
                  }}
                >
                  {message.content}
                  {message.attachments && message.attachments.length > 0 ? (
                    <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {message.attachments.map((file, fileIndex) => (
                        <span
                          key={`${file.name}-${fileIndex}`}
                          style={{
                            border: '1px solid rgba(124,106,247,0.35)',
                            background: 'rgba(124,106,247,0.12)',
                            color: '#D5CDFB',
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: 11,
                          }}
                        >
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {isMaya && index === 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          border: '1px solid #2E2E40',
                          background: '#242433',
                          color: TOKENS.text2,
                          borderRadius: 999,
                          padding: '5px 10px',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.borderColor = 'rgba(124,106,247,0.6)';
                          event.currentTarget.style.background = 'rgba(124,106,247,0.12)';
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.borderColor = '#2E2E40';
                          event.currentTarget.style.background = '#242433';
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', padding: '14px 24px 18px', background: '#111118' }}>
        {attachments.length > 0 ? (
          <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {attachments.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid rgba(124,106,247,0.35)',
                  background: 'rgba(124,106,247,0.12)',
                  color: '#D5CDFB',
                  borderRadius: 999,
                  padding: '4px 9px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                }}
              >
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#E3DDFF',
                    cursor: 'pointer',
                    fontSize: 11,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div
          style={{
            border: `1px solid ${isFocused ? 'rgba(124,106,247,0.7)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 12,
            background: '#16161F',
            padding: '8px 10px',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 8,
            alignItems: 'end',
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid rgba(124,106,247,0.35)',
              background: 'rgba(124,106,247,0.08)',
              color: '#B7A8FF',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            📎
          </button>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Beschreibe Persona-Idee, Tonalitaet oder Szenario..."
            rows={2}
            style={{
              width: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: TOKENS.text,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              lineHeight: 1.5,
              minHeight: 44,
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${canSend ? 'rgba(124,106,247,0.55)' : 'rgba(255,255,255,0.1)'}`,
              background: canSend ? 'rgba(124,106,247,0.18)' : 'rgba(255,255,255,0.03)',
              color: canSend ? '#D2C8FF' : TOKENS.text3,
              fontSize: 14,
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            ↑
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            multiple
            onChange={handleAttachmentPick}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </section>
  );
}
