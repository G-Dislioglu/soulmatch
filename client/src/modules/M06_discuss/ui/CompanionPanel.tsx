import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, InsightCard, PersonaInfo } from '../types';
import { LiveTalkButton } from './LiveTalkButton';

interface Props {
  companion: PersonaInfo;
  insights: InsightCard[];
  isAnalyzing: boolean;
  onSendToCompanion: (message: string, context?: string) => Promise<string | undefined>;
  companionMessages: ChatMessage[];
  focusInputToken?: number;
  liveActive: boolean;
  onLiveToggle: () => void;
  onPlayAudio: (url: string | undefined) => Promise<void>;
}

const PATTERN_CARDS: Array<{ type: string; text: string; category: '' | 'tension' | 'harmony' | 'key' | 'new'; time: string }> = [
  { type: 'Wochenmuster', text: 'Abendgespräche nach 21 Uhr sind 40% tiefer als Tagsgespräche.', category: '', time: 'letzte 7 Tage' },
  { type: 'Neues Muster', text: 'Das Thema Zukunft wird seit 2 Wochen konsequent vermieden.', category: 'new', time: 'seit 14.02.2026' },
  { type: 'Stärke', text: 'Kreative Ausdrucksfähigkeit nimmt in jedem Gespräch zu.', category: 'harmony', time: 'Langzeittrend' },
  { type: 'Blockade', text: 'Widerstand bei Beziehungsthemen – emotionaler Schutzwall aktiv.', category: 'tension', time: 'wiederkehrend' },
];

export function CompanionPanel({
  companion,
  insights,
  isAnalyzing,
  onSendToCompanion,
  companionMessages,
  focusInputToken,
  liveActive,
  onLiveToggle,
  onPlayAudio,
}: Props) {
  const [activeTab, setActiveTab] = useState<'erkenntnisse' | 'muster'>('erkenntnisse');
  const [contextText, setContextText] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusInputToken === undefined) return;
    inputRef.current?.focus();
  }, [focusInputToken]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [companionMessages]);

  const cards = useMemo(() => {
    if (activeTab === 'muster') return PATTERN_CARDS;
    return insights.map((item) => ({ type: item.type, text: item.text, category: item.category, time: `${companion.name} · ${item.timestamp}` }));
  }, [activeTab, companion.name, insights]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const audioUrl = await onSendToCompanion(text, contextText ?? undefined);
    await onPlayAudio(audioUrl);
    setContextText(null);
  };

  return (
    <aside className="sm-rp">
      <div className="sm-rp-head">
        <div className="sm-rp-av" style={{ borderColor: companion.color, boxShadow: `0 0 12px ${companion.color}38` }}>{companion.icon}</div>
        <div>
          <div className="sm-rp-title" style={{ color: companion.color }}>{companion.icon} {companion.name} · Begleitung</div>
          <div className="sm-rp-sub">beobachtet das Gespräch</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <LiveTalkButton isActive={liveActive} onClick={onLiveToggle} />
        </div>
      </div>

      <div className="sm-rp-tabs">
        <button className={`sm-rp-tab${activeTab === 'erkenntnisse' ? ' active' : ''}`} onClick={() => setActiveTab('erkenntnisse')} type="button">Erkenntnisse</button>
        <button className={`sm-rp-tab${activeTab === 'muster' ? ' active' : ''}`} onClick={() => setActiveTab('muster')} type="button">Muster</button>
      </div>

      <div className="sm-rp-scroll">
        {cards.length === 0 ? (
          <div className="sm-empty">Begleitung beobachtet…<br />Erkenntnisse erscheinen hier.</div>
        ) : (
          cards.map((card, idx) => (
            <button key={`${card.text}-${idx}`} className={`sm-ic${card.category ? ` ${card.category}` : ''}`} type="button" onClick={() => { setContextText(card.text); inputRef.current?.focus(); }}>
              <div className="sm-ic-type">{card.type}</div>
              <div className="sm-ic-text">„{card.text}"</div>
              <div className="sm-ic-time">{card.time}</div>
              <div className="sm-ic-discuss">↓ Zum Begleitung-Chat senden</div>
            </button>
          ))
        )}
      </div>

      <div className="sm-rp-sep">
        <div className="sm-rp-sep-label">Direkt mit Begleitung sprechen</div>
      </div>

      <div className="sm-context-pill" style={{ display: contextText ? 'block' : 'none' }}>
        <div className="sm-cp-label">◈ Kontext aus {activeTab === 'erkenntnisse' ? 'Erkenntnisse' : 'Muster'}</div>
        <button className="sm-cp-remove" type="button" onClick={() => setContextText(null)}>✕</button>
        <div>{contextText}</div>
      </div>

      <div className="sm-maya-feed" ref={feedRef}>
        {companionMessages.length === 0 ? (
          <div className="sm-empty sm-empty--small">Direkte Linie zu deiner Begleitung.<br />Klicke auf Erkenntnisse oder Muster um sie zu besprechen.</div>
        ) : (
          companionMessages.map((msg) => (
            <div className={`sm-mm ${msg.role === 'user' ? 'user' : 'persona'}`} key={msg.id}>
              <div className="sm-mm-bub">
                {msg.role !== 'user' && <div className="sm-mm-name" style={{ color: msg.senderColor }}>{msg.senderIcon} {msg.senderName}</div>}
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sm-rp-analyzing" style={{ display: isAnalyzing ? 'flex' : 'none' }}>
        <div className="sm-rp-pulse" />
        <span>{companion.name} analysiert…</span>
      </div>

      <div className="sm-maya-in-row">
        <textarea
          ref={inputRef}
          className="sm-maya-ta"
          rows={1}
          placeholder="Frag deine Begleitung…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <button className="sm-maya-send" type="button" onClick={() => void handleSend()}>↑</button>
      </div>
    </aside>
  );
}
