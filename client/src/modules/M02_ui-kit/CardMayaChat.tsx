import { useState, useRef, useEffect } from 'react';

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next: Message[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setLoading(true);

    try {
      const systemPrompt = `Du bist Maya, eine weise spirituelle Begleiterin in der Soulmatch-App. Der Nutzer fragt zu folgender Karte:\n\nKARTE: ${cardTitle}\nKONTEXT: ${cardContext}\n\nAntworte einfühlsam, spirituell und präzise auf Deutsch. Maximal 3 Sätze.`;

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
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(8,6,15,0.82)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 520,
          background: 'rgba(10,8,18,0.97)',
          border: `1px solid ${ACCENT}30`,
          borderRadius: 20,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${ACCENT}15`,
          display: 'flex', flexDirection: 'column',
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: `1px solid ${ACCENT}18`,
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT}40, ${ACCENT}10)`,
            border: `1px solid ${ACCENT}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>☽</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>Maya</div>
            <div style={{ fontSize: 11, color: '#6b6560', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Frage zu: {cardTitle}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#6b6560',
              fontSize: 18, cursor: 'pointer', padding: '4px 8px',
              borderRadius: 8, lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
          scrollbarWidth: 'thin',
          scrollbarColor: `${ACCENT}20 transparent`,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '82%',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user'
                  ? `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}15)`
                  : 'rgba(255,255,255,0.04)',
                border: m.role === 'user'
                  ? `1px solid ${ACCENT}35`
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
                padding: '10px 16px', borderRadius: '16px 16px 16px 4px',
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
          padding: '12px 16px 16px',
          borderTop: `1px solid ${ACCENT}12`,
          display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Frage Maya…"
            autoFocus
            style={{
              flex: 1, background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${ACCENT}25`,
              borderRadius: 12, padding: '10px 14px',
              color: '#f0eadc', fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'rgba(212,175,55,0.15)' : `linear-gradient(135deg, ${ACCENT}, #c8a830)`,
              border: 'none', borderRadius: 12,
              padding: '10px 16px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              color: loading || !input.trim() ? '#6b6560' : '#1a1a1a',
              fontSize: 16, fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >↑</button>
        </div>
      </div>
    </div>
  );
}
