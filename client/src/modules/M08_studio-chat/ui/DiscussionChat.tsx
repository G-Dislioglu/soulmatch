import { useState, useRef, useEffect, useCallback } from 'react';
import { PersonaBar } from './PersonaBar';
import { PersonaTuningBar } from './PersonaTuningBar';
import { PERSONA_COLORS, PERSONA_ICONS, PERSONA_NAMES } from '../lib/personaColors';
import { useSpeechToText } from '../../../hooks/useSpeechToText';
import { SpeechConsentDialog } from './SpeechConsentDialog';
import { loadProfile } from '../../M03_profile';
import type { StudioSeat } from '../../../shared/types/studio';

interface DiscussMessage {
  id: string;
  role: 'user' | 'persona';
  persona?: string;
  text: string;
  timestamp: string;
  provider?: string;
  model?: string;
  audioUrl?: string;
}

interface PersonaResponseRaw {
  persona: string;
  text: string;
  color: string;
  provider: string;
  model: string;
  audio_url?: string;
  audio?: string;
  mimeType?: string;
}

function getAudioUrlFromResponse(response: PersonaResponseRaw): string | undefined {
  if (response.audio_url) return response.audio_url;
  if (response.audio && response.audio.trim().length > 0) {
    return `data:${response.mimeType ?? 'audio/wav'};base64,${response.audio}`;
  }
  return undefined;
}

interface DiscussionChatProps {
  initialPersonas?: string[];
  selectedPersonas?: string[];
  profileExcerpt?: string;
  currentQuestion?: string;
  onBack: () => void;
  onSwitchPersona?: (personaId: string) => void;
  showTopBar?: boolean;
  onSpeakingPersonaChange?: (personaId: string | null) => void;
}

const STORAGE_KEY = 'soulmatch_discuss_history';

function saveHistory(msgs: DiscussMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-200)));
  } catch {
    // ignore quota
  }
}

export function DiscussionChat({
  initialPersonas = ['maya'],
  selectedPersonas: selectedPersonasProp,
  profileExcerpt = '',
  currentQuestion = '',
  onBack,
  onSwitchPersona,
  showTopBar = true,
  onSpeakingPersonaChange,
}: DiscussionChatProps) {
  const [selectedPersonasState, setSelectedPersonasState] = useState<string[]>(initialPersonas);
  const selectedPersonas = selectedPersonasProp ?? selectedPersonasState;
  const [audioMode, setAudioMode] = useState(false);
  const [messages, setMessages] = useState<DiscussMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [speakingPersona, setSpeakingPersona] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectedPersonasRef = useRef<string[]>(selectedPersonas);
  const loadingRef = useRef(false); // Ref for auto-send callback
  const messagesRef = useRef<DiscussMessage[]>(messages);
  const sendMessageRef = useRef<(textRaw: string) => Promise<void>>(async () => {});
  const playedAudioRef = useRef<Set<string>>(new Set());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const shouldResumeSpeechAfterAudioRef = useRef<{ mode: 'none' | 'continuous' | 'listening' }>({ mode: 'none' });
  const audioSessionRef = useRef(0);
  const audioQueueRef = useRef<{ id: string, url: string }[]>([]);
  const isPlayingQueueRef = useRef(false);
  const messagePersonaRef = useRef<Map<string, string>>(new Map());

  useEffect(() => { selectedPersonasRef.current = selectedPersonas; }, [selectedPersonas]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const handleScroll = () => {
      setShowScrollTop(node.scrollTop > 300);
    };

    handleScroll();
    node.addEventListener('scroll', handleScroll);
    return () => node.removeEventListener('scroll', handleScroll);
  }, []);

  const speech = useSpeechToText('de', (text) => {
    const spoken = text.trim();
    if (!spoken) return;
    console.log('[STT] auto-send:', spoken);
    void sendMessageRef.current(spoken);
  });
  const [showConsent, setShowConsent] = useState(false);
  const [consentIntent, setConsentIntent] = useState<'continuous' | 'listening'>('continuous');

  const pauseSpeechForAudio = useCallback(() => {
    if (speech.isContinuousMode) {
      shouldResumeSpeechAfterAudioRef.current = { mode: 'continuous' };
      speech.stopContinuous();
      return;
    }
    if (speech.isListening) {
      shouldResumeSpeechAfterAudioRef.current = { mode: 'listening' };
      speech.stopListening();
      return;
    }
    shouldResumeSpeechAfterAudioRef.current = { mode: 'none' };
  }, [speech]);

  const scheduleResumeSpeechAfterAudio = useCallback((session: number) => {
    window.setTimeout(() => {
      // Nur wenn die Queue leer ist, das Mikrofon wieder starten
      if (audioQueueRef.current.length > 0) return;
      if (audioSessionRef.current !== session) return;
      if (currentAudioRef.current) return;

      const mode = shouldResumeSpeechAfterAudioRef.current.mode;
      shouldResumeSpeechAfterAudioRef.current = { mode: 'none' };

      if (mode === 'continuous') {
        speech.startContinuous();
      } else if (mode === 'listening') {
        speech.startListening();
      }
    }, 1000);
  }, [speech]);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      const session = audioSessionRef.current;
      speech.setPlaybackActive(false);
      scheduleResumeSpeechAfterAudio(session);
      setSpeakingPersona(null);
      return;
    }

    isPlayingQueueRef.current = true;
    const next = audioQueueRef.current.shift();
    if (!next) return;
    setSpeakingPersona(messagePersonaRef.current.get(next.id) ?? null);

    try {
      const existing = audioElsRef.current.get(next.id);
      const a = existing ?? new Audio(next.url);
      if (!existing) {
        audioElsRef.current.set(next.id, a);
      }
      if (currentAudioRef.current && currentAudioRef.current !== a) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      const session = audioSessionRef.current + 1;
      audioSessionRef.current = session;
      currentAudioRef.current = a;
      a.currentTime = 0;

      a.onplay = () => {
        if (audioSessionRef.current !== session) return;
        speech.setPlaybackActive(true);
        pauseSpeechForAudio();
      };
      
      const handleEndOrError = () => {
        if (audioSessionRef.current !== session) return;
        currentAudioRef.current = null;
        setSpeakingPersona(null);
        // Spiele das nächste Audio in der Warteschlange ab (falls vorhanden)
        setTimeout(() => {
          playNextInQueue();
        }, 300); // Kurze Pause zwischen den Sprechern
      };

      a.onended = handleEndOrError;
      a.onerror = (e) => {
        console.error('[audio] playback failed in queue', e);
        handleEndOrError();
      };

      const playPromise = a.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[audio] autoplay blocked or failed', err);
          handleEndOrError();
        });
      }
    } catch (err) {
      console.error('[audio] sync error in queue', err);
      playNextInQueue();
    }
  }, [speech, pauseSpeechForAudio, scheduleResumeSpeechAfterAudio]);

  const playAudioOnce = useCallback((id: string, url: string) => {
    if (!url || typeof url !== 'string') return;
    if (playedAudioRef.current.has(id)) return;
    playedAudioRef.current.add(id);

    audioQueueRef.current.push({ id, url });
    
    // Wenn die Queue nicht gerade läuft, anstoßen
    if (!isPlayingQueueRef.current) {
      playNextInQueue();
    }
  }, [playNextInQueue]);

  const playAudioNow = useCallback((id: string, url: string) => {
    if (!url) return;
    const existing = audioElsRef.current.get(id);
    const a = existing ?? new Audio(url);
    if (!existing) {
      audioElsRef.current.set(id, a);
    }
    try {
      if (currentAudioRef.current && currentAudioRef.current !== a) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      const session = audioSessionRef.current + 1;
      audioSessionRef.current = session;
      currentAudioRef.current = a;
      a.currentTime = 0;

      a.onplay = () => {
        if (audioSessionRef.current !== session) return;
        speech.setPlaybackActive(true);
        pauseSpeechForAudio();
      };

      a.onended = () => {
        if (currentAudioRef.current === a) {
          currentAudioRef.current = null;
        }
        setSpeakingPersona(null);
        speech.setPlaybackActive(false);
        scheduleResumeSpeechAfterAudio(session);
      };

      a.onerror = () => {
        if (currentAudioRef.current === a) {
          currentAudioRef.current = null;
        }
        setSpeakingPersona(null);
        speech.setPlaybackActive(false);
        scheduleResumeSpeechAfterAudio(session);
      };

      const p = a.play();
      if (p && typeof (p as any).catch === 'function') {
        (p as Promise<void>).catch((e) => {
          console.warn('[audio] manual play failed', e);
          if (currentAudioRef.current === a) {
            currentAudioRef.current = null;
          }
          setSpeakingPersona(null);
          speech.setPlaybackActive(false);
          scheduleResumeSpeechAfterAudio(session);
        });
      }
    } catch {
      // ignore
    }
  }, [pauseSpeechForAudio, scheduleResumeSpeechAfterAudio]);

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
      if (activePersonas.length === 0) {
        throw new Error('Bitte mindestens eine Persona auswählen.');
      }
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
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? `API ${res.status}`);
      }

      const ct = res.headers.get('content-type') ?? '';
      const isStream = ct.includes('text/event-stream');
      if (!isStream) {
        const data = await res.json() as { responses: PersonaResponseRaw[]; creditsUsed: number };
        const newMsgs: DiscussMessage[] = data.responses.map((r, i) => ({
          id: `p-${Date.now()}-${i}`,
          role: 'persona',
          persona: r.persona,
          text: r.text,
          timestamp: new Date().toISOString(),
          provider: r.provider,
          model: r.model,
          audioUrl: getAudioUrlFromResponse(r),
        }));

        for (let i = 0; i < newMsgs.length; i++) {
          const m = newMsgs[i];
          if (!m) continue;
          if (m.persona) messagePersonaRef.current.set(m.id, m.persona);
          if (m.audioUrl) {
            playAudioOnce(m.id, m.audioUrl);
          }
        }

        setMessages((prev) => [...prev, ...newMsgs]);
        return;
      }

      if (!res.body) {
        throw new Error('Stream response has no body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let doneEventReceived = false;

      // SSE frames are separated by a blank line. We only use `data: ...` lines.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const frameEnd = buffer.indexOf('\n\n');
          if (frameEnd === -1) break;
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);

          const lines = frame.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice('data:'.length).trim();
            if (!payload) continue;

            let evt: any;
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }

            if (evt?.type === 'persona' && evt?.response) {
              const r = evt.response as PersonaResponseRaw;
              const id = `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
              const newMsg: DiscussMessage = {
                id,
                role: 'persona',
                persona: r.persona,
                text: r.text,
                timestamp: new Date().toISOString(),
                provider: r.provider,
                model: r.model,
                audioUrl: getAudioUrlFromResponse(r),
              };

              if (newMsg.persona) messagePersonaRef.current.set(newMsg.id, newMsg.persona);
              if (newMsg.audioUrl) {
                playAudioOnce(newMsg.id, newMsg.audioUrl);
              }
              setMessages((prev) => [...prev, newMsg]);
            }

            if (evt?.type === 'done') {
              doneEventReceived = true;
              try {
                await reader.cancel();
              } catch {
                // ignore
              }
              break;
            }
          }

          if (doneEventReceived) break;
        }

        if (doneEventReceived) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      loadingRef.current = false;
      setLoading(false);
      
      // SAFETY RESET: Ensure microphone isn't locked if no audio was received or an error occurred
      // Let it unlock if we are waiting for audio but nothing plays after a short delay
      setTimeout(() => {
        if (!currentAudioRef.current || currentAudioRef.current.paused) {
          speech.setPlaybackActive(false);
          scheduleResumeSpeechAfterAudio(audioSessionRef.current);
        }
      }, 1500);
    }
  }, [profileExcerpt, audioMode, scheduleResumeSpeechAfterAudio]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.role !== 'persona') return;
    if (!last.audioUrl) return;
    playAudioOnce(last.id, last.audioUrl);
  }, [messages, playAudioOnce]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    onSpeakingPersonaChange?.(speakingPersona);
  }, [speakingPersona, onSpeakingPersonaChange]);

  function handleRemovePersona(id: string) {
    if (selectedPersonasProp) return;
    if (selectedPersonas.length > 1) {
      setSelectedPersonasState((prev) => prev.filter((p) => p !== id));
    }
  }

  const activePersonaId = selectedPersonas[0] ?? 'maya';
  const activePersonaColor = PERSONA_COLORS[activePersonaId] ?? '#d4af37';
  const activePersonaName = PERSONA_NAMES[activePersonaId] ?? activePersonaId;
  const activePersonaIcon = PERSONA_ICONS[activePersonaId] ?? '◇';
  const isSpeaking = speakingPersona === activePersonaId;
  const profile = loadProfile();

  const otherRealms = ['maya', 'luna', 'orion', 'lilith', 'stella', 'kael', 'lian', 'sibyl', 'amara']
    .filter((id) => id !== activePersonaId)
    .map((id) => ({
      id,
      label: PERSONA_NAMES[id] ?? id,
      color: PERSONA_COLORS[id] ?? '#d4af37',
    }));

  function handleSwitchPersona(id: string) {
    onSwitchPersona?.(id);
    if (!onSwitchPersona && !selectedPersonasProp) {
      setSelectedPersonasState([id]);
    }
  }

  const handleSend = useCallback(async () => {
    if (loading) return;
    const text = input;
    setInput('');
    speech.resetTranscript();

    // Autoplay unlocker: Fire audio on direct user interaction
    if (audioMode) {
      try {
        const dummy = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        dummy.volume = 0.01;
        const p = dummy.play();
        if (p !== undefined) {
          p.catch(() => { /* ignore */ });
        }
      } catch { /* ignore */ }
    }

    await sendMessage(text);
    inputRef.current?.focus();
  }, [input, loading, sendMessage, speech, audioMode]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleConsentCancel() {
    setShowConsent(false);
  }

  function handleToggleContinuous() {
    if (!speech.hasConsent) {
      setConsentIntent('continuous');
      setShowConsent(true);
      return;
    }
    if (speech.isContinuousMode) {
      speech.stopContinuous();
    } else {
      speech.startContinuous();
      console.log('[STT] started');
    }
  }

  function handleConsentAccept() {
    speech.grantConsent();
    setShowConsent(false);
    if (consentIntent === 'listening') {
      speech.startListening();
      console.log('[STT] started');
      return;
    }
    speech.startContinuous();
    console.log('[STT] started');
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      background: 'rgba(8,6,15,0.98)',
    }}>
      {showTopBar && (
        <PersonaBar
          selectedPersonas={selectedPersonas}
          onAdd={() => {}}
          onRemove={handleRemovePersona}
          audioMode={audioMode}
          onToggleAudio={() => setAudioMode((v) => !v)}
          onBack={onBack}
          continuousMode={speech.isContinuousMode}
          onToggleContinuous={handleToggleContinuous}
          isSpeechSupported={speech.isSupported}
        />
      )}

      <div className="session-layout" style={{ flex: 1, minHeight: 0 }}>
        <div className="session-context-bar">
          <button className="back-to-oracle" onClick={onBack}>
            ← Neue Frage
          </button>
          <div className="context-question-display">
            {currentQuestion ? `"${currentQuestion}"` : 'Neue Session'}
          </div>
          <div className="realm-badge" style={{ borderColor: activePersonaColor, color: activePersonaColor }}>
            {activePersonaIcon} {activePersonaName}
          </div>
        </div>

        <div className="session-body">
          <aside className="analyst-sidebar">
            <div className="analyst-portrait-wrap">
              <div className="analyst-portrait" style={{ background: `${activePersonaColor}18`, borderColor: activePersonaColor }}>
                {activePersonaIcon}
              </div>
              {isSpeaking && <div className="speaking-ring" style={{ borderColor: activePersonaColor }} />}
            </div>

            <div className={`voice-oscillator ${isSpeaking ? 'active' : speech.isContinuousMode ? 'listening' : 'idle'}`} style={{ ['--persona-color' as string]: activePersonaColor }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>

            <h3 className="analyst-sidebar-name" style={{ color: activePersonaColor }}>{activePersonaName}</h3>
            <span className="analyst-sidebar-realm">Aktiver Analyst</span>

            <div className="mood-section">
              <span className="mood-label">Gesprächstiefe</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PersonaTuningBar seat={activePersonaId as StudioSeat} accentColor={activePersonaColor} />
              </div>
            </div>
          </aside>

          <div className="chat-main" style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            borderRight: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
          }}>
          {/* Messages */}
          <div
            className="messages"
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minHeight: 0,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4a4540' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>
                  {activePersonaIcon}
                </div>
                <div style={{ fontSize: 13, color: '#6b6560' }}>
                  {activePersonaName} wartet auf deine Frage.
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
                    {msg.audioUrl && (
                      <button
                        type="button"
                        title="Audio abspielen"
                        onClick={() => playAudioNow(msg.id, msg.audioUrl ?? '')}
                        style={{
                          fontSize: 12,
                          color: '#6b6560',
                          marginLeft: 4,
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          lineHeight: 1,
                        }}
                      >
                        🔊
                      </button>
                    )}
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
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,6,15,0.95)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {speech.transcript && (
                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#a8a298',
                  fontStyle: 'italic',
                }}>
                  erkannt: "{speech.transcript}"
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                {!showTopBar && speech.isSupported && (
                  <button
                    onClick={() => {
                      if (!speech.isContinuousMode && !audioMode) {
                        setAudioMode(true);
                      }
                      handleToggleContinuous();
                    }}
                    title="Live-Talk"
                    style={{
                      minWidth: 98,
                      height: 42,
                      borderRadius: 10,
                      border: speech.isContinuousMode ? '1px solid rgba(80,220,120,0.55)' : '1px solid rgba(255,255,255,0.10)',
                      background: speech.isContinuousMode ? 'rgba(80,220,120,0.16)' : 'rgba(255,255,255,0.04)',
                      color: speech.isContinuousMode ? '#50dc78' : '#d4c9b0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '0 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{speech.isContinuousMode ? '⏹' : '🎙️'}</span>
                    <span>Live-Talk</span>
                  </button>
                )}


                <textarea
                  className="session-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={false}
                  placeholder={speech.isListening ? 'Spreche oder tippe...' : 'Schreibe eine Nachricht...'}
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
            </div>

            {audioMode && !speech.isContinuousMode && (
              <div style={{ fontSize: 10, color: '#6b6560', marginTop: 6 }}>
                🔊 Audio-Modus aktiv — Sprachausgabe wird generiert (coming soon)
              </div>
            )}
          </div>
          </div>

          <aside className="context-panel">
            <div className="ctx-block">
              <span className="ctx-label">Deine Daten</span>
              <div className="user-data-grid">
                <span>Geburt</span><span>{profile?.birthDate ?? '–'}</span>
                <span>Ort</span><span>{profile?.birthLocation?.label ?? '–'}</span>
                <span>Aszendent</span><span>{profileExcerpt.includes('Aszendent') ? 'bekannt' : '–'}</span>
              </div>
            </div>

            <div className="ctx-block">
              <span className="ctx-label">Andere Methoden</span>
              {otherRealms.map((realm) => (
                <div key={realm.id} className="realm-row" onClick={() => handleSwitchPersona(realm.id)}>
                  <div className="realm-dot" style={{ background: realm.color }} />
                  {realm.label}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <button
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Zum Anfang"
        aria-label="Zum Anfang"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 32,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 20,
          color: '#fff',
          padding: '6px 14px',
          fontSize: 12,
          cursor: showScrollTop ? 'pointer' : 'default',
          backdropFilter: 'blur(8px)',
          transition: 'opacity 0.3s',
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
          zIndex: 70,
        }}
      >
        ↑ Anfang
      </button>

      {/* Speech Consent Dialog */}
      {showConsent && (
        <SpeechConsentDialog
          onAccept={handleConsentAccept}
          onCancel={handleConsentCancel}
        />
      )}

      <style>{`@keyframes voicePulse {
        0%, 100% { box-shadow: 0 0 8px rgba(80,220,120,0.2); }
        50% { box-shadow: 0 0 20px rgba(80,220,120,0.6); }
      }
      @keyframes wave {
        0%, 100% { height: 4px; }
        50% { height: 14px; }
      }
      .session-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .session-context-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 24px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
        background: rgba(255,255,255,0.02);
        backdrop-filter: blur(12px);
      }
      .back-to-oracle {
        font-size: 12px;
        color: rgba(255,255,255,0.35);
        letter-spacing: 0.08em;
        transition: color 0.2s;
        white-space: nowrap;
        background: transparent;
        border: none;
        cursor: pointer;
      }
      .back-to-oracle:hover { color: rgba(255,255,255,0.65); }
      .context-question-display {
        flex: 1;
        font-size: 13px;
        font-style: italic;
        color: rgba(255,255,255,0.35);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .realm-badge {
        font-size: 11px;
        letter-spacing: 0.1em;
        padding: 4px 14px;
        border-radius: 20px;
        border: 1px solid;
        white-space: nowrap;
      }
      .session-body {
        display: flex;
        flex: 1;
        overflow: hidden;
        align-items: stretch;
        min-height: 0;
      }
      .chat-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
      }
      .messages {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        overscroll-behavior: contain;
      }
      .analyst-sidebar {
        width: 220px;
        flex-shrink: 0;
        position: relative;
        border-right: 1px solid rgba(255,255,255,0.08);
        padding: 28px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        overflow-y: auto;
        background: rgba(255,255,255,0.015);
      }
      .analyst-portrait-wrap { position: relative; margin-bottom: 4px; }
      .analyst-portrait {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        border: 1px solid rgba(255,255,255,0.15);
      }
      .speaking-ring {
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.3);
        animation: speakRing 1.5s ease-in-out infinite;
      }
      .voice-oscillator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        height: 24px;
        margin-top: 8px;
        opacity: 0.15;
        transition: opacity 0.3s;
      }
      .voice-oscillator.idle { opacity: 0.15; }
      .voice-oscillator.listening { opacity: 0.65; }
      .voice-oscillator.active { opacity: 1; }
      .voice-oscillator span {
        width: 3px;
        height: 4px;
        border-radius: 2px;
        background: var(--persona-color, #c9a84c);
        transform-origin: bottom;
        animation: none;
      }
      .voice-oscillator.listening span {
        animation: oscListen 2s ease-in-out infinite alternate;
      }
      .voice-oscillator.active span {
        animation: oscBar 0.6s ease-in-out infinite alternate;
      }
      @keyframes oscListen {
        from { height: 2px; opacity: 0.35; }
        to { height: 9px; opacity: 1; }
      }
      .voice-oscillator span:nth-child(1) { animation-duration: 0.45s; }
      .voice-oscillator span:nth-child(2) { animation-duration: 0.60s; }
      .voice-oscillator span:nth-child(3) { animation-duration: 0.35s; }
      .voice-oscillator span:nth-child(4) { animation-duration: 0.55s; }
      .voice-oscillator span:nth-child(5) { animation-duration: 0.40s; }
      .voice-oscillator span:nth-child(6) { animation-duration: 0.65s; }
      .voice-oscillator span:nth-child(7) { animation-duration: 0.50s; }
      @keyframes speakRing {
        0%, 100% { transform: scale(1); opacity: 0.4; }
        50% { transform: scale(1.08); opacity: 0.8; }
      }
      @keyframes oscBar {
        from { height: 3px; opacity: 0.4; }
        to { height: 20px; opacity: 1; }
      }
      .analyst-sidebar-name {
        font-size: 20px;
        font-weight: 500;
        text-align: center;
        margin: 0;
      }
      .analyst-sidebar-realm {
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
        text-align: center;
      }
      .mood-section {
        width: 100%;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.08);
      }
      .mood-label {
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
        margin-bottom: 12px;
        display: block;
      }
      .context-panel {
        width: 200px;
        flex-shrink: 0;
        position: relative;
        border-left: 1px solid rgba(255,255,255,0.08);
        padding: 24px 16px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        overflow-y: auto;
        background: rgba(255,255,255,0.01);
      }
      .ctx-label {
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.25);
        margin-bottom: 12px;
        display: block;
      }
      .user-data-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 12px;
        font-size: 12px;
      }
      .user-data-grid span:nth-child(odd) { color: rgba(255,255,255,0.3); }
      .user-data-grid span:nth-child(even) { color: rgba(255,255,255,0.65); }
      .realm-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 12px;
        color: rgba(255,255,255,0.35);
        margin-bottom: 4px;
      }
      .realm-row:hover {
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.65);
      }
      .realm-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      @media (max-width: 900px) {
        .analyst-sidebar, .context-panel { display: none; }
      }`}</style>
    </div>
  );
}
