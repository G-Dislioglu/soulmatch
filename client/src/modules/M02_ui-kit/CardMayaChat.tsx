import { useState, useRef, useEffect, useCallback } from 'react';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { SpeechConsentDialog } from '../M08_studio-chat/ui/SpeechConsentDialog';

interface Message {
  role: 'user' | 'maya';
  text: string;
}

interface CardMayaChatProps {
  cardTitle: string;
  cardContext: string;
  onClose: () => void;
}

const ACCENT = '#d4af37';

export function CardMayaChat({ cardTitle, cardContext, onClose }: CardMayaChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'maya',
      text: `Ich sehe du möchtest mehr über **${cardTitle}** erfahren. Was möchtest du wissen?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const sendText = useCallback(async (textRaw: string) => {
    const text = textRaw.trim();
    if (!text || loading) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setLoading(true);

    try {
      const systemPrompt = `Du bist Maya, eine weise spirituelle Begleiterin in der Soulmatch-App. Der Nutzer fragt zu folgender Karte:\n\nKARTE: ${cardTitle}\nKONTEXT: ${cardContext}\n\nAntworte einfühlsam, spirituell und präzise auf Deutsch. Maximal 3 Sätze. Beziehe dich direkt auf den Karteninhalt.`;

      const res = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...next.map((m) => ({ role: m.role === 'maya' ? 'assistant' : 'user', content: m.text })),
          ],
          soloPersona: 'maya',
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json() as { reply?: string; message?: string };
      const reply = data.reply ?? data.message ?? 'Ich bin gerade in tiefer Meditation. Versuche es gleich nochmal.';
      setMessages((prev) => [...prev, { role: 'maya', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'maya', text: 'Die kosmische Verbindung ist kurz unterbrochen. Versuche es nochmal.' }]);
    } finally {
      setLoading(false);
    }
  }, [cardContext, cardTitle, loading, messages]);

  const handleAutoSend = useCallback((text: string) => {
    if (!text.trim()) return;
    void sendText(text);
  }, [sendText]);

  const speech = useSpeechToText('de', handleAutoSend);

  useEffect(() => {
    if (speech.transcript) {
      setInput(speech.transcript);
    }
  }, [speech.transcript]);

  const send = useCallback(() => {
    speech.resetTranscript();
    void sendText(input);
  }, [input, sendText, speech]);

  const handleMicClick = useCallback(() => {
    if (!speech.hasConsent) {
      setShowConsent(true);
      return;
    }
    if (speech.isListening) {
      speech.stopListening();
    } else {
      speech.startListening();
    }
  }, [speech]);

  const handleConsentAccept = useCallback(() => {
    speech.grantConsent();
    setShowConsent(false);
    speech.startListening();
  }, [speech]);

  const handleConsentCancel = useCallback(() => {
    setShowConsent(false);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <div
      style={{
        marginTop: 8,
        borderRadius: 16,
        background: 'rgba(8,6,15,0.92)',
        border: `1px solid ${ACCENT}28`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${ACCENT}10`,
        overflow: 'hidden',
        animation: 'expandIn 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px 10px',
        borderBottom: `1px solid ${ACCENT}15`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: `radial-gradient(circle, ${ACCENT}40, ${ACCENT}10)`,
          border: `1px solid ${ACCENT}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>☽</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>Maya · Frage zur Karte</div>
          <div style={{ fontSize: 11, color: '#6b6560', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cardTitle}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#6b6560',
            fontSize: 16, cursor: 'pointer', padding: '2px 6px',
            borderRadius: 6, lineHeight: 1, flexShrink: 0,
          }}
        >✕</button>
      </div>

      {/* Messages */}
      <div style={{
        maxHeight: 260,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        scrollbarWidth: 'thin',
        scrollbarColor: `${ACCENT}20 transparent`,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '86%',
              padding: '8px 12px',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user'
                ? `linear-gradient(135deg, ${ACCENT}22, ${ACCENT}12)`
                : 'rgba(255,255,255,0.05)',
              border: m.role === 'user'
                ? `1px solid ${ACCENT}30`
                : '1px solid rgba(255,255,255,0.07)',
              fontSize: 13,
              lineHeight: 1.55,
              color: m.role === 'user' ? '#f0eadc' : '#d4cfc8',
            }}>
              {m.text.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '8px 14px', borderRadius: '14px 14px 14px 4px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              fontSize: 13, color: '#6b6560',
            }}>
              <span style={{ animation: 'breathe 1.2s ease-in-out infinite', display: 'inline-block' }}>✦</span>
              {' '}Maya denkt nach…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px 12px',
        borderTop: `1px solid ${ACCENT}10`,
        display: 'flex', gap: 8,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Frage Maya zu dieser Karte…"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${ACCENT}22`,
            borderRadius: 10, padding: '8px 12px',
            color: '#f0eadc', fontSize: 13,
            outline: 'none',
          }}
        />
        {speech.isSupported && (
          <button
            onClick={handleMicClick}
            disabled={loading}
            className={speech.isListening ? 'mic-green-pulse' : undefined}
            style={{
              background: speech.isListening ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
              border: speech.isListening ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '8px 12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: speech.isListening ? '#4ade80' : '#6b6560',
              fontSize: 16,
            }}
            title={speech.isListening ? 'Stoppen' : 'Spracheingabe'}
          >
            🎤
          </button>
        )}
        <button
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? 'rgba(212,175,55,0.12)' : `linear-gradient(135deg, ${ACCENT}, #c8a830)`,
            border: 'none', borderRadius: 10,
            padding: '8px 14px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            color: loading || !input.trim() ? '#6b6560' : '#1a1a1a',
            fontSize: 15, fontWeight: 600,
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >↑</button>
      </div>

      {showConsent && (
        <SpeechConsentDialog
          onAccept={handleConsentAccept}
          onCancel={handleConsentCancel}
        />
      )}
    </div>
  );
}
