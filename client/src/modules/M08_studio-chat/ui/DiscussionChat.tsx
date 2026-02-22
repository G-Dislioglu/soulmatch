import { useState, useRef, useEffect, useCallback } from 'react';
import { PersonaBar } from './PersonaBar';
import { PersonaPicker } from './PersonaPicker';
import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES } from '../lib/personaColors';
import { useSpeechToText } from '../../../hooks/useSpeechToText';
import { SpeechConsentDialog } from './SpeechConsentDialog';
import { loadProfile } from '../../M03_profile';

interface DiscussMessage {
  id: string;
  role: 'user' | 'persona';
  persona?: string;
  text: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

interface PersonaResponseRaw {
  persona: string;
  text: string;
  color: string;
  provider: string;
  model: string;
  audio_url?: string;
}

interface DiscussionChatProps {
  initialPersonas?: string[];
  profileExcerpt?: string;
  onBack: () => void;
}

const STORAGE_KEY = 'soulmatch_discuss_history';

function saveHistory(msgs: DiscussMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-200)));
  } catch {
    // ignore quota
  }
}

export function DiscussionChat({ initialPersonas = ['maya'], profileExcerpt = '', onBack }: DiscussionChatProps) {
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(initialPersonas);
  const [showPicker, setShowPicker] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [messages, setMessages] = useState<DiscussMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectedPersonasRef = useRef<string[]>(selectedPersonas);
  const loadingRef = useRef(false); // Ref for auto-send callback
  const messagesRef = useRef<DiscussMessage[]>(messages);
  useEffect(() => { selectedPersonasRef.current = selectedPersonas; }, [selectedPersonas]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Speech-to-text integration
  // TODO: Read language from central app settings when implemented

  const sendMessage = useCallback(async (textRaw: string) => {
    const text = textRaw.trim();
    if (!text || loadingRef.current) return;

    const userMsg: DiscussMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const updated = [...messagesRef.current, userMsg];
    messagesRef.current = updated;
    setMessages(updated);
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const conversationHistory = updated.slice(-20).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'persona' ? `${PERSONA_NAMES[m.persona ?? ''] ?? m.persona}: ${m.text}` : m.text,
      }));

      const profile = loadProfile();
      const userId = profile?.id;

      const activePersonas = selectedPersonasRef.current;
      const res = await fetch('/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personas: activePersonas,
          message: text,
          conversationHistory,
          userChart: profileExcerpt,
          audioMode,
          userId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? `API ${res.status}`);
      }

      const data = await res.json() as { responses: PersonaResponseRaw[]; creditsUsed: number };
      const newMsgs: DiscussMessage[] = data.responses.map((r, i) => ({
        id: `p-${Date.now()}-${i}`,
        role: 'persona',
        persona: r.persona,
        text: r.text,
        timestamp: new Date().toISOString(),
        provider: r.provider,
        model: r.model,
      }));

      setMessages((prev) => [...prev, ...newMsgs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [profileExcerpt, audioMode]);

  // Auto-send callback for continuous mode
  const handleAutoSend = useCallback((text: string) => {
    console.log('[chat] handleAutoSend called with:', text);
    if (!text.trim()) return;
    setInput('');
    void sendMessage(text);
  }, [sendMessage]);

  const speech = useSpeechToText('de', handleAutoSend);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  function handleAddPersona(id: string) {
    if (selectedPersonas.length < 3 && !selectedPersonas.includes(id)) {
      setSelectedPersonas((prev) => [...prev, id]);
    }
    setShowPicker(false);
  }

  function handleRemovePersona(id: string) {
    if (selectedPersonas.length > 1) {
      setSelectedPersonas((prev) => prev.filter((p) => p !== id));
    }
  }

  const handleSend = useCallback(async () => {
    if (loading) return;
    const text = input;
    setInput('');
    speech.resetTranscript();
    await sendMessage(text);
    inputRef.current?.focus();
  }, [input, loading, sendMessage, speech]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // Live transcript update
  useEffect(() => {
    if (speech.transcript) {
      setInput(speech.transcript);
    }
  }, [speech.transcript]);

  function handleMicClick() {
    if (!speech.hasConsent) {
      setShowConsent(true);
      return;
    }
    if (speech.isListening) {
      speech.stopListening();
    } else {
      speech.startListening();
    }
  }

  function handleConsentCancel() {
    setShowConsent(false);
  }

  function handleToggleContinuous() {
    if (!speech.hasConsent) {
      setShowConsent(true);
      return;
    }
    if (speech.isContinuousMode) {
      speech.stopContinuous();
    } else {
      speech.startContinuous();
    }
  }

  function handleConsentAccept() {
    speech.grantConsent();
    setShowConsent(false);
    speech.startContinuous();
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      background: 'rgba(8,6,15,0.98)',
    }}>
      {/* PersonaBar */}
      <PersonaBar
        selectedPersonas={selectedPersonas}
        onAdd={() => setShowPicker(true)}
        onRemove={handleRemovePersona}
        audioMode={audioMode}
        onToggleAudio={() => setAudioMode((v) => !v)}
        onBack={onBack}
        continuousMode={speech.isContinuousMode}
        onToggleContinuous={handleToggleContinuous}
        isSpeechSupported={speech.isSupported}
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4a4540' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>
              {selectedPersonas.map((id) => PERSONA_ICONS[id] ?? '◇').join(' ')}
            </div>
            <div style={{ fontSize: 13, color: '#6b6560' }}>
              {selectedPersonas.map((id) => PERSONA_NAMES[id] ?? id).join(' & ')} warten auf deine Frage.
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: '16px 16px 4px 16px',
                  background: 'rgba(212,175,55,0.16)',
                  border: '1px solid rgba(212,175,55,0.40)',
                  fontSize: 13,
                  color: '#f0eadc',
                  lineHeight: 1.6,
                }}>
                  {msg.text}
                </div>
              </div>
            );
          }

          const color = PERSONA_COLORS[msg.persona ?? ''] ?? '#d4af37';
          const icon = PERSONA_ICONS[msg.persona ?? ''] ?? '◇';
          const name = PERSONA_NAMES[msg.persona ?? ''] ?? msg.persona ?? '';

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '85%' }}>
              <div style={{
                fontSize: 10,
                color,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <span>{icon}</span>
                <span>{name}</span>
                {msg.provider && (
                  <span style={{ color: '#3a3530', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    · {msg.provider}/{msg.model}
                  </span>
                )}
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: '4px 16px 16px 16px',
                background: `${color}1a`,
                border: `1px solid ${color}55`,
                fontSize: 13,
                color: '#d4cfc8',
                lineHeight: 1.7,
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
            {selectedPersonas.map((id) => (
              <div key={id} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: PERSONA_COLORS[id] ?? '#d4af37',
                animation: 'pulse 1.2s ease-in-out infinite',
                opacity: 0.7,
              }} />
            ))}
            <span style={{ fontSize: 11, color: '#4a4540' }}>antwortet…</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.20)',
            fontSize: 12,
            color: '#ef4444',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: speech.isContinuousMode ? '1px solid rgba(239,68,68,0.20)' : '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,6,15,0.95)',
        borderLeft: speech.isContinuousMode ? '2px solid rgba(239,68,68,0.30)' : 'none',
        borderRight: speech.isContinuousMode ? '2px solid rgba(239,68,68,0.30)' : 'none',
      }}>
        {speech.isContinuousMode ? (
          // Continuous Mode UI
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)',
              borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.20)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: speech.isListening ? '#ef4444' : '#6b6560',
                  animation: speech.isListening ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{ fontSize: 12, color: speech.isListening ? '#ef4444' : '#8a8580' }}>
                  {speech.isListening ? '🎙 Ich höre zu...' : loading ? '💬 Warte auf Antwort...' : '🎙 Bereit zum Zuhören'}
                </span>
              </div>
              <button
                onClick={() => speech.stopContinuous()}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.30)',
                  borderRadius: 8,
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '6px 12px',
                }}
              >
                ⏹ Beenden
              </button>
            </div>
            {speech.transcript && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                fontSize: 13,
                color: '#a8a298',
                fontStyle: 'italic',
              }}>
                "{speech.transcript}"
              </div>
            )}
          </div>
        ) : (
          // Normal Mode UI
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={speech.isListening ? 'Höre zu…' : 'Schreib eine Nachricht… (Enter zum Senden)'}
              rows={2}
              style={{
                flex: 1,
                background: speech.isListening ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
                border: speech.isListening ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10,
                color: '#d4c9b0',
                fontSize: 13,
                padding: '10px 12px',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            />
            {speech.isSupported && (
              <button
                onClick={handleMicClick}
                title={speech.isListening ? 'Stoppen' : 'Spracheingabe'}
                style={{
                  background: speech.isListening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                  border: speech.isListening ? '1px solid rgba(239,68,68,0.30)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  color: speech.isListening ? '#ef4444' : '#6b6560',
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: '10px 12px',
                  alignSelf: 'stretch',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: speech.isListening ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                🎤
              </button>
            )}
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? 'rgba(212,175,55,0.20)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${input.trim() && !loading ? 'rgba(212,175,55,0.40)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10,
                color: input.trim() && !loading ? '#d4af37' : '#4a4540',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                fontSize: 18,
                padding: '10px 14px',
                alignSelf: 'stretch',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ↑
            </button>
          </div>
        )}

        {audioMode && !speech.isContinuousMode && (
          <div style={{ fontSize: 10, color: '#6b6560', marginTop: 6 }}>
            🔊 Audio-Modus aktiv — Sprachausgabe wird generiert (coming soon)
          </div>
        )}
      </div>

      {/* PersonaPicker Overlay */}
      {showPicker && (
        <PersonaPicker
          selectedPersonas={selectedPersonas}
          onSelect={handleAddPersona}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Speech Consent Dialog */}
      {showConsent && (
        <SpeechConsentDialog
          onAccept={handleConsentAccept}
          onCancel={handleConsentCancel}
        />
      )}
    </div>
  );
}
