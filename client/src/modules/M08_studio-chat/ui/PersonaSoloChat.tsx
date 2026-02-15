import { useState, useEffect, useRef } from 'react';
import type { StudioSeat } from '../../../shared/types/studio';
import { Button } from '../../M02_ui-kit';
import { getStudioProvider } from '../../M09_settings';
import { MayaPortrait } from './MayaPortrait';
import { LilithPortrait } from './LilithPortrait';
import { getLilithIntensity, setLilithIntensity } from '../lib/lilithGate';
import type { LilithIntensity } from '../lib/lilithGate';
import { loadChatHistory, appendMessage, clearChatHistory } from '../lib/chatHistory';
import type { ChatMessage } from '../lib/chatHistory';
import { updateSensitivity, shouldDowngradeIntensity, shouldTriggerMayaHandoff, getSensitivityState, resetSensitivity } from '../lib/sensitivityTracker';
import { isBlocked, getBlockRemainingMs, evaluateMessage } from '../lib/toxicityGuard';
import { buildMemoryContext, addMemoryEntry, getBanStatus } from '../lib/userMemory';
import { extractInsights, checkMilestone } from '../lib/insightExtractor';
import { LiveSigil } from './LiveSigil';
import type { SigilState } from './LiveSigil';

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

const INTENSITY_UI: Record<LilithIntensity, {
  label: string;
  icon: string;
  bg: string;
  bgActive: string;
  text: string;
  ring: string;
  pulse: string;
}> = {
  mild: {
    label: 'Gentle Mirror',
    icon: '🪞',
    bg: 'bg-green-900/20',
    bgActive: 'bg-green-600/30',
    text: 'text-green-300',
    ring: 'ring-green-500/50',
    pulse: '',
  },
  ehrlich: {
    label: 'Sharp Truth',
    icon: '⚡',
    bg: 'bg-orange-900/20',
    bgActive: 'bg-orange-600/30',
    text: 'text-orange-300',
    ring: 'ring-orange-500/50',
    pulse: 'animate-pulse',
  },
  brutal: {
    label: 'Shadow Dive',
    icon: '🔥',
    bg: 'bg-red-900/20',
    bgActive: 'bg-red-600/30',
    text: 'text-red-400',
    ring: 'ring-red-500/60',
    pulse: 'animate-pulse',
  },
};

const SHADOW_DIVE_DISMISS_KEY = 'soulmatch.shadowDive.dismissed';

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
  const [freeMode, setFreeMode] = useState(false);
  const [intensity, setIntensity] = useState<LilithIntensity>(getLilithIntensity);
  const [blocked, setBlocked] = useState(() => isBlocked() || getBanStatus(profileId).banned);
  const [banMessage, setBanMessage] = useState<string | null>(null);
  const [sensitivityScore, setSensitivityScore] = useState(() => getSensitivityState().score);
  const [autoNotice, setAutoNotice] = useState<string | null>(null);
  const [sigilState, setSigilState] = useState<SigilState>('idle');
  const [showAuraSnap, setShowAuraSnap] = useState(true);
  const [shadowDiveConfirm, setShadowDiveConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const theme = SEAT_THEMES[seat];
  const isLilith = seat === 'lilith';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Aura-snap flash on mount
  useEffect(() => {
    const t = setTimeout(() => setShowAuraSnap(false), 600);
    return () => clearTimeout(t);
  }, []);

  function handleIntensityChange(level: LilithIntensity) {
    if (level === 'brutal') {
      const dismissed = localStorage.getItem(SHADOW_DIVE_DISMISS_KEY) === '1';
      if (!dismissed) {
        setShadowDiveConfirm(true);
        return;
      }
    }
    setIntensity(level);
    setLilithIntensity(level);
    setAutoNotice(null);
  }

  function confirmShadowDive(dontShowAgain: boolean) {
    if (dontShowAgain) localStorage.setItem(SHADOW_DIVE_DISMISS_KEY, '1');
    setIntensity('brutal');
    setLilithIntensity('brutal');
    setAutoNotice(null);
    setShadowDiveConfirm(false);
  }

  function handleClear() {
    clearChatHistory(seat);
    resetSensitivity();
    setMessages([]);
    setSensitivityScore(70);
    setAutoNotice(null);
  }

  function buildChatExcerpt(all: ChatMessage[]): string {
    const lines: string[] = [];
    const total = all.length;

    // Older than 30: just a count
    if (total > 30) {
      lines.push(`[... ${total - 30} ältere Nachrichten ...]`);
    }

    // Messages 11-30: truncated to 80 chars
    const midStart = Math.max(0, total - 30);
    const midEnd = Math.max(0, total - 10);
    for (let i = midStart; i < midEnd; i++) {
      const m = all[i]!;
      const who = m.role === 'user' ? 'USER' : `PERSONA(${m.seat})`;
      const txt = (m.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
      lines.push(`${who}: ${txt}`);
    }

    // Last 10: full text (capped at 280 chars)
    const recentStart = Math.max(0, total - 10);
    for (let i = recentStart; i < total; i++) {
      const m = all[i]!;
      const who = m.role === 'user' ? 'USER' : `PERSONA(${m.seat})`;
      const txt = (m.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 280);
      lines.push(`${who}: ${txt}`);
    }

    return lines.join('\n');
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    // Universal moderation — escalating ban system for ALL personas
    const modResult = evaluateMessage(text, profileId);
    if (modResult.action === 'ban' || modResult.action === 'block') {
      setBlocked(true);
      setBanMessage(modResult.message);
      const sysMsg: ChatMessage = {
        role: 'persona', seat,
        text: modResult.message,
        timestamp: new Date().toISOString(),
      };
      const updated = appendMessage(seat, sysMsg);
      setMessages(updated);
      setInput('');
      return;
    }
    if (modResult.action === 'warn') {
      setAutoNotice(modResult.message);
      // Allow the message to go through but show warning
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
      const chatExcerpt = buildChatExcerpt(updated);
      const userMemory = buildMemoryContext(profileId, 2000);

      const res = await provider.generateStudio({
        mode: 'profile',
        profileId,
        userMessage: text,
        seats: [seat],
        maxTurns: 1,
      }, {
        lilithIntensity: effectiveIntensity,
        soloPersona: seat,
        freeMode,
        chatExcerpt,
        userMemory: userMemory || undefined,
      });

      const turn = res.turns[0];
      if (turn) {
        const personaMsg: ChatMessage = { role: 'persona', seat, text: turn.text, timestamp: new Date().toISOString() };
        const withResponse = appendMessage(seat, personaMsg);
        setMessages(withResponse);

        // Trigger 'truth' sigil flash for Lilith brutal responses
        if (isLilith && effectiveIntensity === 'brutal') {
          setSigilState('truth');
          setTimeout(() => setSigilState('idle'), 1200);
        }

        // Extract insights and save to user memory
        const insights = extractInsights(text, turn.text, seat);
        for (const ins of insights) {
          addMemoryEntry(profileId, ins);
        }

        // Check for milestones
        const milestone = checkMilestone(withResponse.length, seat);
        if (milestone) {
          addMemoryEntry(profileId, milestone);
        }
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
      {/* Aura-snap flash on open */}
      {showAuraSnap && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 51,
          background: `radial-gradient(circle at 50% 50%, ${
            isLilith ? 'rgba(212,145,55,0.15)' : seat === 'maya' ? 'rgba(168,85,247,0.15)'
            : seat === 'luna' ? 'rgba(192,132,252,0.15)' : 'rgba(56,189,248,0.15)'
          } 0%, transparent 60%)`,
          animation: 'auraSnap 0.6s ease-out forwards',
        }} />
      )}
      <div className={`w-full max-w-lg rounded-xl border border-[color:var(--border)] ${theme.bg} shadow-2xl flex flex-col max-h-[85vh]`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${theme.headerBg}`}>
          <div className="flex items-center gap-3">
            {/* Persona portrait in header */}
            {seat === 'maya' && <MayaPortrait size={48} />}
            {seat === 'lilith' && <LilithPortrait size={48} intensity={intensity} />}
            {seat !== 'maya' && seat !== 'lilith' && (
              <div className="flex items-center justify-center rounded-lg" style={{
                width: 48, height: 48 * 1.5, background: 'rgba(255,255,255,0.05)',
                borderRadius: 8, fontSize: 22,
              }}>
                {seat === 'luna' ? '☽' : '△'}
              </div>
            )}
            <div>
              <h2 className={`text-sm font-bold ${theme.accent}`}>{theme.title}</h2>
              <p className="text-[10px] text-zinc-500/60 uppercase tracking-wider mt-0.5">
                {freeMode ? 'Freier Modus' : 'Solo-Chat'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFreeMode(!freeMode)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                freeMode
                  ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-500 hover:text-zinc-300 border border-zinc-700/50 hover:border-zinc-600/50'
              }`}
            >
              {freeMode ? '🎯 Soulmatch' : '💬 Frei'}
            </button>
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

        {/* Shadow Dive Confirmation Modal */}
        {shadowDiveConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-red-800/40 p-5 shadow-2xl" style={{ boxShadow: '0 0 40px rgba(220,38,38,0.15)' }}>
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">⚠️</div>
                <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider">Shadow Dive</h3>
                <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                  Maximale Intensität — Lilith wird brutal ehrlich und sarkastisch.
                  Dies kann emotional intensiv sein. Bereit?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShadowDiveConfirm(false)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-all"
                >
                  Nein, abbrechen
                </button>
                <button
                  onClick={() => confirmShadowDive(false)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-red-300 bg-red-600/25 border border-red-500/40 hover:bg-red-600/40 transition-all animate-pulse"
                >
                  Ja, aktivieren
                </button>
              </div>
              <button
                onClick={() => confirmShadowDive(true)}
                className="w-full mt-2 text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Ja + nicht mehr fragen
              </button>
            </div>
          </div>
        )}

        {/* Intensity Control + Sensitivity (Lilith only) */}
        {isLilith && !blocked && (
          <div className="px-4 py-2 border-b border-orange-900/20 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-orange-500/50 uppercase tracking-wider font-semibold shrink-0">Intensity</span>
              <div className="flex gap-1 flex-1 min-w-0">
                {(['mild', 'ehrlich', 'brutal'] as LilithIntensity[]).map((level) => {
                  const ui = INTENSITY_UI[level];
                  const active = intensity === level;
                  return (
                    <button
                      key={level}
                      onClick={() => handleIntensityChange(level)}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                        active
                          ? `${ui.bgActive} ${ui.text} ring-1 ${ui.ring} ${ui.pulse}`
                          : `text-zinc-500 hover:${ui.text} ${ui.bg} hover:ring-1 hover:${ui.ring}`
                      }`}
                      style={active && level === 'brutal' ? { animation: 'sigilPulse 2s ease-in-out infinite', transformOrigin: 'center' } : undefined}
                    >
                      <span className="text-[10px]">{ui.icon}</span>
                      <span className="hidden sm:inline">{ui.label}</span>
                      <span className="sm:hidden">{INTENSITY_LABELS[level]}</span>
                    </button>
                  );
                })}
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

        {/* Messages + Sigil Strip */}
        <div className="flex flex-1 min-h-0">
        {/* Live Sigil Strip */}
        <LiveSigil
          seat={seat}
          state={sigilState !== 'idle' ? sigilState : (loading ? 'speaking' : input.trim() ? 'typing' : 'idle')}
        />
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              {isLilith ? 'Bereit für unbequeme Wahrheiten?' : `Starte ein Gespräch mit ${seat.charAt(0).toUpperCase() + seat.slice(1)}…`}
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
            >
              {/* Persona avatar next to message */}
              {msg.role === 'persona' && (
                <div className="flex-shrink-0" style={{ width: 28, height: 28 }}>
                  {seat === 'maya' && <MayaPortrait size={28} />}
                  {seat === 'lilith' && <LilithPortrait size={28} intensity={intensity} />}
                  {seat !== 'maya' && seat !== 'lilith' && (
                    <div className="w-full h-full rounded-md flex items-center justify-center" style={{
                      background: 'rgba(255,255,255,0.06)', fontSize: 14,
                    }}>
                      {seat === 'luna' ? '☽' : '△'}
                    </div>
                  )}
                </div>
              )}
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
            disabled={blocked}
            placeholder={
              blocked
                ? (banMessage ?? 'Chat gesperrt…')
                : isLilith
                  ? 'Frag Lilith…'
                  : `Frag ${seat.charAt(0).toUpperCase() + seat.slice(1)}…`
            }
            className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <Button variant="primary" onClick={handleSend} disabled={loading || !input.trim() || blocked}>
            {loading ? '…' : 'Senden'}
          </Button>
        </div>
      </div>
    </div>
  );
}
