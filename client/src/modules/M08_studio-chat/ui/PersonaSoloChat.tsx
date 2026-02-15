import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useGuide } from '../../../modules/M14_guide/GuideProvider';
import { LiveSigil } from './LiveSigil';
import type { SigilState } from './LiveSigil';
import { parseResponse, parseSoulCard } from '../lib/commandParser';
import type { MayaCommand, TourStep, SoulCardProposal } from '../lib/commandParser';
import { soulCardService, timelineService } from '../../M13_timeline';
import { createCommandBus, sleep } from '../lib/commandBus';
import type { CommandBus } from '../lib/commandBus';

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

interface MayaSuggestion {
  id: number;
  text: string;
  action?: MayaCommand;
}

export interface MayaCommandCallbacks {
  onNavigate?: (target: string) => void;
  onHighlight?: (target: string) => void;
  onExpand?: (target: string) => void;
  onPersonaSwitch?: (target: StudioSeat) => void;
  onScrollTo?: (target: string) => void;
  onTourStart?: (steps: TourStep[]) => void;
}

interface PersonaSoloChatProps {
  seat: StudioSeat;
  profileId: string;
  onClose: () => void;
  commandCallbacks?: MayaCommandCallbacks;
}

function formatBlockRemaining(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function PersonaSoloChat({ seat, profileId, onClose, commandCallbacks }: PersonaSoloChatProps) {
  const guide = useGuide();
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
  const initialMsgCount = useRef(messages.length);

  // ── Maya Command System state ──
  const [pendingCmd, setPendingCmd] = useState<MayaCommand | null>(null);
  const [suggestions, setSuggestions] = useState<MayaSuggestion[]>([]);
  const [cardProposal, setCardProposal] = useState<SoulCardProposal | null>(null);
  const cmdBusRef = useRef<CommandBus | null>(null);

  const theme = SEAT_THEMES[seat];
  const isLilith = seat === 'lilith';

  // ── Command Executor ──
  const executeCommand = useCallback(async (cmd: MayaCommand) => {
    // Commands with confirm field pause for user confirmation
    if (cmd.confirm && !cmd._confirmed) {
      setPendingCmd(cmd);
      return;
    }

    switch (cmd.cmd) {
      case 'navigate':
        if (cmd.target) commandCallbacks?.onNavigate?.(cmd.target);
        break;
      case 'highlight':
        if (cmd.target) {
          commandCallbacks?.onHighlight?.(cmd.target);
          const el = document.getElementById(`card-${cmd.target}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      case 'expand':
        if (cmd.target) {
          commandCallbacks?.onExpand?.(cmd.target);
          await sleep(300);
          const el = document.getElementById(`card-${cmd.target}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      case 'suggest':
        if (cmd.text) {
          setSuggestions((prev) => [...prev, { id: Date.now(), text: cmd.text!, action: cmd.action }]);
        }
        break;
      case 'persona_switch':
        if (cmd.target) commandCallbacks?.onPersonaSwitch?.(cmd.target as StudioSeat);
        break;
      case 'scroll_to':
        if (cmd.target) {
          commandCallbacks?.onScrollTo?.(cmd.target);
          const el = document.getElementById(cmd.target);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      case 'truth_mode':
        setSigilState('truth');
        setTimeout(() => setSigilState('idle'), 800);
        break;
      case 'tour_start':
        if (cmd.steps && cmd.steps.length > 0) {
          commandCallbacks?.onTourStart?.(cmd.steps);
        }
        break;
      case 'guide_start':
        try {
          guide.startOnboarding();
        } catch (err) {
          console.warn('Guide start failed:', err);
          // Fallback: try highlight if available
          if (cmd.target) {
            commandCallbacks?.onHighlight?.(cmd.target);
          }
        }
        break;
      case 'guide_next':
        try {
          guide.nextStep();
        } catch (err) {
          console.warn('Guide next failed:', err);
        }
        break;
      case 'guide_end':
        try {
          guide.stopGuide();
        } catch (err) {
          console.warn('Guide end failed:', err);
        }
        break;
      case 'point_to':
        try {
          // GuideProvider doesn't have pointTo, use highlight fallback
          if (cmd.target) {
            commandCallbacks?.onHighlight?.(cmd.target);
          }
        } catch (err) {
          console.warn('Point to failed:', err);
          // Fallback to highlight
          if (cmd.target) {
            commandCallbacks?.onHighlight?.(cmd.target);
          }
        }
        break;
    }
  }, [commandCallbacks, guide]);

  // Initialize command bus
  useEffect(() => {
    cmdBusRef.current = createCommandBus(executeCommand);
    return () => { cmdBusRef.current?.clear(); };
  }, [executeCommand]);

  function confirmPendingCommand() {
    if (!pendingCmd) return;
    const confirmed = { ...pendingCmd, _confirmed: true };
    setPendingCmd(null);
    cmdBusRef.current?.push(confirmed);
  }

  function rejectPendingCommand() {
    if (!pendingCmd) return;
    setPendingCmd(null);
    const rejectMsg: ChatMessage = {
      role: 'persona', seat,
      text: 'Alles klar, kein Problem. Was möchtest du stattdessen tun?',
      timestamp: new Date().toISOString(),
    };
    const updated = appendMessage(seat, rejectMsg);
    setMessages(updated);
  }

  function executeSuggestion(suggestion: MayaSuggestion) {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    if (suggestion.action) {
      cmdBusRef.current?.push(suggestion.action);
    }
  }

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

  function handleClose() {
    // Create timeline entry if new messages were sent during this session
    const newMsgs = messages.length - initialMsgCount.current;
    if (newMsgs >= 2) {
      const lastPersonaMsg = [...messages].reverse().find((m) => m.role === 'persona');
      const preview = lastPersonaMsg?.text?.slice(0, 80) ?? `${newMsgs} Nachrichten`;
      const entryType = `chat_${seat}` as const;
      timelineService.addEntry(entryType, `Chat mit ${seat.charAt(0).toUpperCase() + seat.slice(1)}`, preview, { personaId: seat });
    }
    onClose();
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
        // Parse soul card proposal first (before command parsing strips it)
        const { text: textAfterCard, card: soulCard } = parseSoulCard(turn.text);
        if (soulCard) setCardProposal(soulCard);

        // Parse commands from response text
        const { text: cleanText, commands } = parseResponse(textAfterCard);

        const personaMsg: ChatMessage = { role: 'persona', seat, text: cleanText, timestamp: new Date().toISOString() };
        const withResponse = appendMessage(seat, personaMsg);
        setMessages(withResponse);

        // Trigger 'truth' sigil flash for Lilith brutal responses
        if (isLilith && effectiveIntensity === 'brutal') {
          setSigilState('truth');
          setTimeout(() => setSigilState('idle'), 1200);
        }

        // Dispatch any extracted commands via the bus
        if (commands.length > 0) {
          await sleep(500);
          cmdBusRef.current?.pushAll(commands);
        }

        // Extract insights and save to user memory
        const insights = extractInsights(text, cleanText, seat);
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
      <div className={`w-full max-w-lg rounded-xl border border-white/[0.16] ${theme.bg} shadow-[0_0_24px_rgba(212,175,55,0.06),0_8px_32px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh]`}>
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
              onClick={handleClose}
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
            <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-red-500/50 p-5" style={{ boxShadow: '0 0 40px rgba(220,38,38,0.2), 0 4px 24px rgba(0,0,0,0.5)' }}>
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

          {/* Maya Command: Pending confirmation dialog */}
          {pendingCmd && (
            <div className="maya-suggest-btn" style={{
              padding: '12px 16px', borderRadius: 14, alignSelf: 'flex-start', maxWidth: '88%',
              background: `rgba(212,175,55,0.06)`, border: '1px solid rgba(212,175,55,0.2)',
            }}>
              <p className="text-xs text-zinc-300 mb-2.5 leading-relaxed">
                {pendingCmd.confirm || 'Soll ich fortfahren?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmPendingCommand}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37' }}
                >
                  Ja, mach das
                </button>
                <button
                  onClick={rejectPendingCommand}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 border border-zinc-700/50 hover:border-zinc-500/50 transition-all"
                >
                  Nein
                </button>
              </div>
            </div>
          )}

          {/* Soul Card Proposal */}
          {cardProposal && (
            <div
              className="sidebar-entry-fadein"
              style={{
                alignSelf: 'flex-start', maxWidth: '92%',
                padding: '14px 16px', borderRadius: 14,
                background: 'rgba(232,121,249,0.04)',
                border: '1px solid rgba(232,121,249,0.15)',
              }}
            >
              <div style={{ fontSize: 10, color: '#e879f9', fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                ◆ Soul Card (Vorschlag)
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0eadc', marginBottom: 6, fontFamily: "'Cormorant Garamond', serif" }}>
                {cardProposal.title}
              </div>
              <div style={{ fontSize: 12, color: '#b0a898', lineHeight: 1.65, marginBottom: 10 }}>
                {cardProposal.essence}
              </div>
              {cardProposal.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {cardProposal.tags.map((tag) => (
                    <span key={tag} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(232,121,249,0.08)', color: '#e879f9',
                      border: '1px solid rgba(232,121,249,0.12)',
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => {
                    const entry = timelineService.addEntry('soul_card', cardProposal.title, cardProposal.essence.slice(0, 80), {});
                    const card = soulCardService.createCardFromProposal(cardProposal, entry.id, 'chat');
                    soulCardService.confirmCard(card.id);
                    setCardProposal(null);
                  }}
                  style={{
                    flex: 1, padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(232,121,249,0.1)', border: '1px solid rgba(232,121,249,0.25)',
                    color: '#e879f9', fontSize: 11, fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s ease',
                  }}
                >
                  ✓ Speichern
                </button>
                <button
                  onClick={() => setCardProposal(null)}
                  style={{
                    padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#7a7468', fontSize: 11, fontWeight: 500,
                    fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s ease',
                  }}
                >
                  ✕ Verwerfen
                </button>
              </div>
            </div>
          )}

          {/* Maya Command: Suggestion buttons */}
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => executeSuggestion(s)}
              className="maya-suggest-btn"
              style={{
                alignSelf: 'flex-start', padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(212,145,55,0.06)', border: '1px solid rgba(212,145,55,0.2)',
                color: '#d49137', fontSize: 12, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif", textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>→</span> {s.text}
            </button>
          ))}
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
