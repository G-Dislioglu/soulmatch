import { useState, useEffect, useRef } from 'react';
import type { StudioSeat } from '../../../shared/types/studio';
import { Button } from '../../M02_ui-kit';
import { getStudioProvider } from '../../M09_settings';
import { getLilithIntensity, setLilithIntensity } from '../lib/lilithGate';
import type { LilithIntensity } from '../lib/lilithGate';
import { loadChatHistory, appendMessage, clearChatHistory } from '../lib/chatHistory';
import type { ChatMessage } from '../lib/chatHistory';
import { updateSensitivity, shouldDowngradeIntensity, shouldTriggerMayaHandoff, getSensitivityState, resetSensitivity } from '../lib/sensitivityTracker';
import { detectToxicity, isBlocked, activateBlock, getBlockRemainingMs } from '../lib/toxicityGuard';

const SEAT_THEMES: Record<StudioSeat, { bg: string; accent: string; headerBg: string; title: string }> = {
  maya: { bg: 'bg-amber-950/20', accent: 'text-amber-300', headerBg: 'bg-amber-900/30', title: 'Maya — Die Strukturgeberin' },
  luna: { bg: 'bg-purple-950/20', accent: 'text-purple-300', headerBg: 'bg-purple-900/30', title: 'Luna — Die Intuitive' },
  orion: { bg: 'bg-sky-950/20', accent: 'text-sky-300', headerBg: 'bg-sky-900/30', title: 'Orion — Der Analytiker' },
  lilith: { bg: 'bg-orange-950/30', accent: 'text-orange-400', headerBg: 'bg-orange-900/40', title: "Lilith's Shadow Chamber" },
};

const INTENSITY_LABELS: Record<LilithIntensity, string> = {
  mild: 'Sanft',
  ehrlich: 'Ehrlich',
  brutal: 'Brutal',
};

interface PersonaSoloChatProps {
  seat: StudioSeat;
  profileId: string;
  onClose: () => void;
}

function formatBlockRemaining(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function PersonaSoloChat({ seat, profileId, onClose }: PersonaSoloChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory(seat));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<LilithIntensity>(getLilithIntensity);
  const [blocked, setBlocked] = useState(isBlocked);
  const [sensitivityScore, setSensitivityScore] = useState(() => getSensitivityState().score);
  const [autoNotice, setAutoNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const theme = SEAT_THEMES[seat];
  const isLilith = seat === 'lilith';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function handleIntensityChange(level: LilithIntensity) {
    setIntensity(level);
    setLilithIntensity(level);
    setAutoNotice(null);
  }

  function handleClear() {
    clearChatHistory(seat);
    resetSensitivity();
    setMessages([]);
    setSensitivityScore(70);
    setAutoNotice(null);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    // Toxicity check (Lilith solo only)
    if (isLilith && detectToxicity(text)) {
      activateBlock();
      setBlocked(true);
      const warnMsg: ChatMessage = {
        role: 'persona', seat: 'lilith',
        text: "Das war's. Ich diskutiere nicht mit Toxizität. Chat pausiert für 24 Stunden.",
        timestamp: new Date().toISOString(),
      };
      const updated = appendMessage(seat, warnMsg);
      setMessages(updated);
      setInput('');
      return;
    }

    // Sensitivity tracking (Lilith solo only)
    let effectiveIntensity = intensity;
    if (isLilith) {
      const state = updateSensitivity(text);
      setSensitivityScore(state.score);

      const downgrade = shouldDowngradeIntensity(intensity);
      if (downgrade) {
        effectiveIntensity = downgrade;
        setIntensity(downgrade);
        setLilithIntensity(downgrade);
        setAutoNotice(`Intensität automatisch auf "${INTENSITY_LABELS[downgrade]}" reduziert.`);
      }

      // Maya handoff
      if (shouldTriggerMayaHandoff()) {
        const mayaMsg: ChatMessage = {
          role: 'persona', seat: 'maya',
          text: 'Maya hier – Lilith hat dich geschüttelt, lass uns das jetzt sanft sortieren. Atme kurz durch. Was beschäftigt dich gerade am meisten?',
          timestamp: new Date().toISOString(),
        };
        const updated = appendMessage(seat, mayaMsg);
        setMessages(updated);
        setInput('');
        return;
      }
    }

    const userMsg: ChatMessage = { role: 'user', seat, text, timestamp: new Date().toISOString() };
    const updated = appendMessage(seat, userMsg);
    setMessages(updated);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const provider = getStudioProvider();
      const res = await provider.generateStudio({
        mode: 'profile',
        profileId,
        userMessage: text,
        seats: [seat],
        maxTurns: 1,
      }, {
        lilithIntensity: effectiveIntensity,
        soloPersona: seat,
      });

      const turn = res.turns[0];
      if (turn) {
        const personaMsg: ChatMessage = { role: 'persona', seat, text: turn.text, timestamp: new Date().toISOString() };
        const withResponse = appendMessage(seat, personaMsg);
        setMessages(withResponse);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-xl border border-[color:var(--border)] ${theme.bg} shadow-2xl flex flex-col max-h-[85vh]`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${theme.headerBg}`}>
          <div>
            <h2 className={`text-sm font-bold ${theme.accent}`}>{theme.title}</h2>
            {isLilith && (
              <p className="text-[10px] text-orange-500/60 uppercase tracking-wider mt-0.5">Solo-Chat</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-wider"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Blocked overlay (Lilith only) */}
        {isLilith && blocked && (
          <div className="px-4 py-4 border-b border-red-900/30 bg-red-950/20 text-center">
            <p className="text-sm text-red-400 font-semibold">Chat pausiert</p>
            <p className="text-xs text-red-500/70 mt-1">
              Toxizitäts-Sperre aktiv. Verbleibend: {formatBlockRemaining(getBlockRemainingMs())}
            </p>
          </div>
        )}

        {/* Intensity Slider + Sensitivity (Lilith only) */}
        {isLilith && !blocked && (
          <div className="px-4 py-2 border-b border-orange-900/20 flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-orange-500/50 uppercase tracking-wider font-semibold">Intensity</span>
              <div className="flex gap-1">
                {(['mild', 'ehrlich', 'brutal'] as LilithIntensity[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleIntensityChange(level)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                      intensity === level
                        ? 'bg-orange-600/30 text-orange-300 border border-orange-500/40'
                        : 'text-zinc-500 hover:text-orange-400 border border-transparent'
                    }`}
                  >
                    {INTENSITY_LABELS[level]}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-12 h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${sensitivityScore}%`,
                      backgroundColor: sensitivityScore > 50 ? '#22c55e' : sensitivityScore > 25 ? '#eab308' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-[9px] text-zinc-600">{sensitivityScore}</span>
              </div>
            </div>
            {autoNotice && (
              <p className="text-[10px] text-amber-500/80 animate-pulse">{autoNotice}</p>
            )}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              {isLilith ? 'Bereit für unbequeme Wahrheiten?' : `Starte ein Gespräch mit ${seat.charAt(0).toUpperCase() + seat.slice(1)}…`}
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-zinc-700/50 text-zinc-200'
                    : isLilith
                      ? 'bg-orange-900/20 text-orange-200/90 border border-orange-600/15'
                      : 'bg-zinc-800/60 text-zinc-200 border border-zinc-700/30'
                }`}
              >
                {msg.role === 'persona' && (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${theme.accent} opacity-70`}>
                    {seat}
                  </span>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className={`rounded-lg px-3 py-2 text-sm ${isLilith ? 'bg-orange-900/20 text-orange-400' : 'bg-zinc-800/60 text-zinc-400'}`}>
                <span className="animate-pulse">Denke…</span>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 border-t border-red-900/30">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-[color:var(--border)] flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            disabled={isLilith && blocked}
            placeholder={
              isLilith && blocked
                ? 'Chat gesperrt…'
                : isLilith
                  ? 'Frag Lilith…'
                  : `Frag ${seat.charAt(0).toUpperCase() + seat.slice(1)}…`
            }
            className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <Button variant="primary" onClick={handleSend} disabled={loading || !input.trim() || (isLilith && blocked)}>
            {loading ? '…' : 'Senden'}
          </Button>
        </div>
      </div>
    </div>
  );
}
