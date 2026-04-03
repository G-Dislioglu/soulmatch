import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { TOKENS } from '../../../design';
import { useSpeechToText } from '../../../hooks/useSpeechToText';

type CreatorRole = 'maya' | 'user';

interface CreatorMessage {
  role: CreatorRole;
  content: string;
  streaming?: boolean;
  isFiller?: boolean;
  attachments?: File[];
}

interface PersonaContext {
  name?: string;
  archetype?: string;
  quirks?: string[];
  tone?: string;
}

interface ArcanaCreatorChatProps {
  errorMessage?: string | null;
  personaContext?: PersonaContext;
  onExtraction?: (fields: Record<string, unknown>) => void;
  liveTalkActive?: boolean;
}

interface AudioPlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  muted: boolean;
  hasAudio: boolean;
}

const SUGGESTIONS = ['Historische Figur', 'Fiktiver Charakter', 'Eigene Erfindung'] as const;

const INTRO_MESSAGE: CreatorMessage = {
  role: 'maya',
  content:
    'Ich bin Maya, deine Casting-Direktorin fuer neue Personas. Gib mir eine Richtung und ich forme mit dir Schritt fuer Schritt eine klare, nutzbare Persona.',
};

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ArcanaCreatorChat({ errorMessage = null, personaContext, onExtraction, liveTalkActive: _liveTalkActive = false }: ArcanaCreatorChatProps) {
  const [messages, setMessages] = useState<CreatorMessage[]>([INTRO_MESSAGE]);
  const [fillerText, setFillerText] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestionsUsed, setSuggestionsUsed] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    muted: false,
    hasAudio: false,
  });

  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onExtractionRef = useRef(onExtraction);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fillerAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { onExtractionRef.current = onExtraction; }, [onExtraction]);

  // Speech-to-text — auto-send when recognition ends
  const handleAutoSend = useCallback((text: string) => {
    if (text.trim().length > 0) {
      setInput('');
      // pushUserMessage needs current messages — use a ref-based approach via setState
      setMessages((prev) => {
        const userMsg: CreatorMessage = { role: 'user', content: text.trim() };
        const updated = [...prev, userMsg];
        void callMayaApiInner(updated);
        return updated;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stt = useSpeechToText('de', handleAutoSend);

  // Sync STT transcript into text input
  useEffect(() => {
    if (stt.isListening && stt.transcript) {
      setInput(stt.transcript);
    }
  }, [stt.isListening, stt.transcript]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Stop filler audio when audio player audio arrives
  function stopFillerAudio() {
    if (fillerAudioRef.current) {
      fillerAudioRef.current.pause();
      fillerAudioRef.current = null;
    }
  }

  function loadMainAudio(base64: string, mimeType: string) {
    stopFillerAudio();
    // Revoke old object URL if any
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
    const blob = base64ToBlob(base64, mimeType);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.muted = audioRef.current?.muted ?? false;

    audio.addEventListener('loadedmetadata', () => {
      setAudioPlayer((prev) => ({ ...prev, duration: audio.duration, hasAudio: true }));
    });
    audio.addEventListener('timeupdate', () => {
      setAudioPlayer((prev) => ({ ...prev, currentTime: audio.currentTime }));
    });
    audio.addEventListener('ended', () => {
      setAudioPlayer((prev) => ({ ...prev, playing: false }));
      URL.revokeObjectURL(url);
    });
    audio.addEventListener('pause', () => {
      setAudioPlayer((prev) => ({ ...prev, playing: false }));
    });
    audio.addEventListener('play', () => {
      setAudioPlayer((prev) => ({ ...prev, playing: true }));
    });

    audioRef.current = audio;
    setAudioPlayer((prev) => ({ ...prev, currentTime: 0, duration: 0, hasAudio: true, playing: false }));
  }

  function handlePlayerToggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function handleMuteToggle() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setAudioPlayer((prev) => ({ ...prev, muted: audio.muted }));
  }

  function handleProgressClick(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !bar || !isFinite(audio.duration) || audio.duration === 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  }

  const canSend = useMemo(
    () => !isStreaming && (input.trim().length > 0 || attachments.length > 0),
    [attachments.length, input, isStreaming],
  );

  // Inner API call helper (used by both normal send and STT auto-send)
  async function callMayaApiInner(updatedMessages: CreatorMessage[]) {
    // Stop any playing audio when user sends a new message
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioPlayer((prev) => ({ ...prev, playing: false, hasAudio: false }));

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: 'maya', content: '', streaming: true }]);

    const apiMessages = updatedMessages
      .filter((m) => m.content.trim().length > 0 && !m.isFiller)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch('/api/arcana/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, personaContext: personaContext ?? {} }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let fullText = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, unknown>;
            const type = event.type as string;

            if (type === 'filler_text') {
              const content = (event.content as string) ?? '';
              if (content) setFillerText(content);
            } else if (type === 'filler_audio') {
              // Filler audio SKIPPED — only filler text is shown.
              // Main audio will play the full answer. This avoids:
              // - Voice inconsistency between filler and answer
              // - Audio player slot conflicts
              // - Jarring transition between two separate audio clips
            } else if (type === 'text_delta') {
              const chunk = (event.chunk as string) ?? '';
              fullText += chunk;
              setFillerText(null);
              setMessages((prev) => {
                const next = [...prev];
                const target = next[next.length - 1]; // last item is the streaming maya bubble
                if (target?.role === 'maya' && target.streaming) {
                  next[next.length - 1] = { ...target, content: target.content + chunk };
                }
                return next;
              });
            } else if (type === 'text_done') {
              setFillerText(null);
              setMessages((prev) => {
                const next = [...prev];
                const target = next[next.length - 1];
                if (target?.role === 'maya' && target.streaming) {
                  next[next.length - 1] = { ...target, content: fullText || target.content, streaming: false };
                }
                return next;
              });
            } else if (type === 'extraction') {
              const fields = event.fields as Record<string, unknown>;
              if (fields && typeof fields === 'object') {
                onExtractionRef.current?.(fields);
              }
            } else if (type === 'audio') {
              const base64 = event.base64 as string;
              const mimeType = (event.mimeType as string) ?? 'audio/wav';
              if (base64) {
                console.log('[SSE] audio event received, length:', base64.length, 'mimeType:', mimeType);
                console.log('[Audio] audioRef.current exists:', !!audioRef.current, 'src:', audioRef.current?.src?.slice(0, 40));
                const blob = base64ToBlob(base64, mimeType);
                const url = URL.createObjectURL(blob);
                const existing = audioRef.current;
                if (existing) {
                  // Reuse the same HTMLAudioElement — browser may keep autoplay permission
                  const prevUrl = existing.src;
                  existing.pause();
                  if (prevUrl.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
                  existing.src = url;
                  existing.load();
                  setAudioPlayer((prev) => ({ ...prev, currentTime: 0, duration: 0, hasAudio: true, playing: false }));
                  // Always auto-play Maya's response audio
                  void existing.play()
                    .then(() => { console.log('[Audio] play() resolved'); })
                    .catch((err) => { console.warn('[Audio] Autoplay blocked:', err); });
                } else {
                  // Fallback: create fresh element
                  loadMainAudio(base64, mimeType);
                  setTimeout(() => { void audioRef.current?.play().catch((err) => { console.warn('[Audio] Autoplay blocked (fresh):', err); }); }, 150);
                }
              } else {
                console.warn('[SSE] audio event received but base64 is empty');
              }
            } else if (type === 'error') {
              const errMsg = (event.message as string) ?? 'Maya ist gerade nicht erreichbar. Versuche es nochmal.';
              setMessages((prev) => {
                const next = [...prev];
                const target = next[next.length - 1];
                if (target?.role === 'maya') {
                  next[next.length - 1] = { ...target, content: errMsg, streaming: false };
                }
                return next;
              });
            }
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }

      // Ensure streaming flag cleared
      setFillerText(null);
      setMessages((prev) => {
        const next = [...prev];
        const target = next[next.length - 1];
        if (target?.role === 'maya' && target.streaming) {
          next[next.length - 1] = { ...target, content: fullText || target.content || 'Maya ist gerade nicht erreichbar. Versuche es nochmal.', streaming: false };
        }
        return next;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const fallback = 'Maya ist gerade nicht erreichbar. Versuche es nochmal.';
      setFillerText(null);
      setMessages((prev) => {
        const next = [...prev];
        const target = next[next.length - 1];
        if (target?.role === 'maya') {
          next[next.length - 1] = { ...target, content: target.content || fallback, streaming: false };
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  const callMayaApi = useCallback(
    (updatedMessages: CreatorMessage[]) => {
      void callMayaApiInner(updatedMessages);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personaContext],
  );

  function pushUserMessage(content: string, files: File[] = []) {
    if (content.trim().length === 0 && files.length === 0) return;

    const userMsg: CreatorMessage = {
      role: 'user',
      content: content.trim(),
      attachments: files.length > 0 ? files : undefined,
    };

    setMessages((prev) => {
      const updated = [...prev, userMsg];
      callMayaApi(updated);
      return updated;
    });

    setInput('');
    setAttachments([]);
  }

  function handleSend() {
    pushUserMessage(input, attachments);
  }

  function handleSuggestionClick(suggestion: string) {
    setSuggestionsUsed(true);
    pushUserMessage(suggestion);
  }

  function handleAttachmentPick(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) return;
    setAttachments((prev) => [...prev, ...nextFiles]);
    event.target.value = '';
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleMicClick() {
    if (!stt.isSupported) return;
    if (!stt.hasConsent) {
      stt.grantConsent();
    }
    if (stt.isListening) {
      stt.stopListening();
      if (input.trim().length > 0) {
        pushUserMessage(input);
        stt.resetTranscript();
      }
    } else {
      stt.resetTranscript();
      setInput('');
      stt.startListening();
    }
  }

  const progressPercent = audioPlayer.duration > 0
    ? (audioPlayer.currentTime / audioPlayer.duration) * 100
    : 0;

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
                    opacity: message.isFiller ? 0.6 : 1,
                    fontStyle: message.isFiller ? 'italic' : 'normal',
                  }}
                >
                  {message.streaming && message.content.length === 0 ? (
                    <span style={{ color: TOKENS.text3, fontStyle: 'italic', fontSize: 12 }}>Maya schreibt…</span>
                  ) : (
                    message.content
                  )}
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

                {isMaya && index === 0 && !suggestionsUsed ? (
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
        {fillerText ? (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ maxWidth: '78%', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F3F0FF', fontFamily: 'DM Sans, sans-serif', fontSize: 11, border: '1px solid rgba(124,106,247,0.45)', background: 'linear-gradient(135deg, #7c6af7, #9b8aff)' }}>M</div>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: '#8a8a9a', letterSpacing: '1px' }}>MAYA</span>
              </div>
              <div style={{ borderRadius: '12px 12px 12px 4px', border: '1px solid rgba(201,168,76,0.1)', background: '#16161F', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.65, opacity: 0.6, fontStyle: 'italic', color: '#E5E4EE' }}>
                {fillerText}
              </div>
            </div>
          </div>
        ) : null}
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
            gridTemplateColumns: 'auto 1fr auto auto',
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
            placeholder={stt.isListening ? 'Spreche jetzt…' : 'Beschreibe Persona-Idee, Tonalitaet oder Szenario...'}
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

          {/* Mic button */}
          <button
            type="button"
            onClick={handleMicClick}
            title={!stt.isSupported ? 'Spracheingabe nur in Chrome verfügbar' : stt.isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${stt.isListening ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)'}`,
              background: stt.isListening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
              color: stt.isListening ? '#f87171' : stt.isSupported ? TOKENS.text2 : TOKENS.text3,
              fontSize: 14,
              cursor: stt.isSupported ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: stt.isListening ? 'arcana-mic-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            🎤
          </button>

          {/* Send button */}
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

        {/* Audio mini-player */}
        {audioPlayer.hasAudio ? (
          <div
            style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              alignItems: 'center',
              gap: 10,
              padding: '7px 12px',
              border: '1px solid rgba(20,184,166,0.3)',
              borderRadius: 10,
              background: 'rgba(20,184,166,0.06)',
            }}
          >
            {/* Play/pause */}
            <button
              type="button"
              onClick={handlePlayerToggle}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: '1px solid rgba(20,184,166,0.45)',
                background: 'rgba(20,184,166,0.12)',
                color: '#2dd4bf',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {audioPlayer.playing ? '⏸' : '▶'}
            </button>

            <button
              type="button"
              onClick={() => {
                const audio = audioRef.current;
                if (audio) {
                  audio.pause();
                  audio.currentTime = 0;
                  if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
                  audio.src = '';
                }
                setAudioPlayer({ playing: false, currentTime: 0, duration: 0, hasAudio: false, muted: audioPlayer.muted });
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: '1px solid rgba(239,68,68,0.35)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ■
            </button>

            {/* Progress bar + time */}
            <div style={{ display: 'grid', gap: 4 }}>
              <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${progressPercent}%`,
                    background: '#2dd4bf',
                    borderRadius: 2,
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: TOKENS.text3 }}>
                  {formatTime(audioPlayer.currentTime)}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: TOKENS.text3 }}>
                  {formatTime(audioPlayer.duration)}
                </span>
              </div>
            </div>

            {/* Mute toggle */}
            <button
              type="button"
              onClick={handleMuteToggle}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: audioPlayer.muted ? TOKENS.text3 : TOKENS.text2,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {audioPlayer.muted ? '🔇' : '🔊'}
            </button>
          </div>
        ) : null}

        <style>{`
          @keyframes arcana-mic-pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
            50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239,68,68,0); }
          }
        `}</style>
      </div>
    </section>
  );
}

