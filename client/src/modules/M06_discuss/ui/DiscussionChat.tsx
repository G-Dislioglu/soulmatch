import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSystemAccent, getSystemVoiceName } from '../../../data/voiceCatalog';
import type { LiveTalkController } from '../../../hooks/useLiveTalk';
import { TOKENS } from '../../../design/tokens';
import { loadProfile } from '../../M03_profile';
import { SpeechConsentDialog } from '../../M08_studio-chat/ui/SpeechConsentDialog';
import { useDiscussApi } from '../hooks/useDiscussApi';
import { useLiveTalk as useDiscussLiveTalk } from '../hooks/useLiveTalk';
import { GearDropdown } from './GearDropdown';
import { LiveTalkBanner } from './LiveTalkBanner';
import { MayaChips } from './MayaChips';
import { MayaOverlay } from './MayaOverlay';
import { PersonaList } from './PersonaList';
import { type PersonaPanelSettings, PersonaSettingsPanel } from './PersonaSettingsPanel';
import { PERSONAS, type ChatMessage, type PersonaInfo } from '../types';

interface Props {
  onBack?: () => void;
  liveTalk: LiveTalkController;
  appMode: string;
}

const REPLIES: Record<string, string[]> = {
  luna: [
    'Der Mond zeigt uns, was verborgen bleibt – auch das, was du gerade trägst. Was liegt darunter?',
    'Ich spüre in deinen Worten eine Flut die noch nicht gebrochen ist. Was hält sie zurück?',
    'Die Nacht hat ihre eigene Sprache. Du beginnst, sie zu verstehen.',
    'Manchmal ist das Schweigen zwischen zwei Sätzen ehrlicher als die Worte selbst.',
  ],
  lilith: [
    'Hör auf, dich klein zu machen. Die Wahrheit verlangt mehr von dir.',
    'Du weißt bereits was du willst. Du hast nur Angst davor, es laut zu sagen.',
    'Feuer verbrennt nicht nur – es klärt. Was soll klar werden?',
    'Interessant. Du fragst, aber du zweifelst schon an meiner Antwort.',
  ],
  orion: [
    'Die Sterne kennen keine Eile. Was du suchst, hat bereits begonnen.',
    'Zwischen Chaos und Ordnung liegt der einzige Ort, wo echtes Wachstum möglich ist.',
    'Was siehst du wenn Schmerz nicht mehr dein Zentrum ist?',
    'Jede Konstellation war einst einzelne Punkte im Nichts.',
  ],
  amara: [
    'Du bist nicht kaputt. Du bist im Prozess – das ist ein fundamentaler Unterschied.',
    'Heilen bedeutet nicht den Schmerz loszuwerden. Es bedeutet Raum für ihn zu schaffen.',
    'Ich bin hier. Nimm dir die Zeit die du brauchst.',
    'Was du als Schwäche siehst ist oft der Eingang zur tiefsten Stärke.',
  ],
  stella: [
    'Die Daten sprechen klar – du liest sie aber emotional. Beides hat seinen Platz.',
    'Muster wiederholen sich. Sieh genauer hin.',
    'Das Universum expandiert – und du stehst noch still. Was hindert die Bewegung?',
  ],
  sibyl: [
    'Die Zeichen sprachen bereits von dir.',
    'Was du vermeidest, sucht dich trotzdem. Wann schaust du hin?',
    'Das Unbehagen ist ein Wegweiser, kein Feind.',
  ],
  kael: [
    'Zwischen dem was war und was sein könnte – dort lebst du gerade.',
    'Die Seele kennt den Weg. Der Verstand weigert sich zu folgen.',
    'Leid ist nur Widerstand gegen das Unvermeidliche.',
  ],
  maya: [
    'Ich habe etwas bemerkt das du vielleicht noch nicht siehst – darf ich es ansprechen?',
    'Diese Offenheit zeigt Stärke, keine Schwäche.',
    'Ein Muster taucht auf. Ich beobachte es schon eine Weile.',
  ],
  lian: [
    'Wandel kommt selten laut. Aber er ist schon da.',
    'Zwischen den Linien liegt oft die eigentliche Antwort.',
    'Du musst nicht alles kontrollieren, um klar zu handeln.',
  ],
};

const INTROS: Record<string, string> = {
  luna: 'Willkommen in dieser Nacht. Ich bin bereit zu lauschen – was bewegt dich gerade?',
  lilith: 'Du bist da. Gut. Was willst du wirklich – kein Umweg.',
  orion: 'Die Sterne haben dich erwartet. Wo stehst du gerade?',
  amara: 'Es freut mich, dass du hier bist. Wie geht es dir wirklich?',
  stella: 'Daten empfangen. Bereit. Womit beginnen wir?',
  sibyl: 'Die Zeichen sprachen bereits von dir. Ich habe gewartet.',
  kael: 'Zwischen allen Möglichkeiten – was zieht dich heute an?',
  maya: 'Ich beobachte schon eine Weile. Was liegt dir auf dem Herzen?',
  lian: 'Das I-Ging flüstert schon. Wo beginnt dein Wandel?',
};

const LIVE_AUDIO_ENABLED = import.meta.env.VITE_DISABLE_LIVE_AUDIO !== 'true';
const AUDIO_DEVTOOLS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_AUDIO_DEVTOOLS === 'true';
const FALLBACK_PERSONA = PERSONAS[0]!;

function ts(): string {
  return new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' });
}

function makeMessage(partial: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: ts(),
    ...partial,
  };
}

export function DiscussionChat({ onBack, liveTalk, appMode }: Props) {
  const [selectedPersonaId, setSelectedPersonaId] = useState('maya');
  const [panelPersonaId, setPanelPersonaId] = useState('maya');
  const [messagesByPersona, setMessagesByPersona] = useState<Record<string, ChatMessage[]>>(() =>
    Object.fromEntries(PERSONAS.map((persona) => [persona.id, [buildIntroMessage(persona)]])),
  );
  const [personaSettings, setPersonaSettings] = useState<Record<string, PersonaPanelSettings>>(() =>
    Object.fromEntries(PERSONAS.map((persona) => [persona.id, buildDefaultSettings(persona)])),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [mayaOverlayOpen, setMayaOverlayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPersonaSpeaking, setIsPersonaSpeaking] = useState(false);
  const [forceAudioRequest, setForceAudioRequest] = useState(false);
  const [lastRequestedAudioMode, setLastRequestedAudioMode] = useState(false);
  const [lastPersonaAudioUrl, setLastPersonaAudioUrl] = useState<string | null>(null);
  const [lastServerTtsEngine, setLastServerTtsEngine] = useState<string | null>(null);
  const [lastServerTtsMimeType, setLastServerTtsMimeType] = useState<string | null>(null);
  const [ttsTelemetryStatus, setTtsTelemetryStatus] = useState<'idle' | 'ok' | 'missing'>('idle');
  const [audioDiag, setAudioDiag] = useState('idle');
  const [audioDiagError, setAudioDiagError] = useState<string | null>(null);
  const [typingPersonaId, setTypingPersonaId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const sendMessageRef = useRef<(textRaw: string, personaId?: string) => Promise<void>>(async () => {});
  const requestIdRef = useRef(0);
  const forceAudioRequestRef = useRef(false);
  const speechDraftRef = useRef('');
  const typingTimeoutRef = useRef<number | null>(null);
  const { callStream, cancel } = useDiscussApi();
  const runtimeLiveTalk = useDiscussLiveTalk({
    onTranscript: (text) => {
      setInput(text);
      if (liveTalk.autoSend) {
        void sendMessageRef.current(text);
      }
    },
  });

  const profile = useMemo(() => loadProfile(), []);
  const selectedPersona = PERSONAS.find((persona) => persona.id === selectedPersonaId) ?? FALLBACK_PERSONA;
  const panelPersona = PERSONAS.find((persona) => persona.id === panelPersonaId) ?? selectedPersona;
  const activeMessages = messagesByPersona[selectedPersona.id] ?? [buildIntroMessage(selectedPersona)];
  const showAudioDevTools = useMemo(() => {
    if (!AUDIO_DEVTOOLS_ENABLED || typeof window === 'undefined') {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('devAudio') === '1' || window.localStorage.getItem('sm.devAudio') === '1';
  }, []);

  const playTestTone = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextCtor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const ctx = new AudioContextCtor();
    await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, 350);
  }, []);

  const playLastPersonaAudio = useCallback(async () => {
    await runtimeLiveTalk.playAudio(lastPersonaAudioUrl ?? undefined);
  }, [lastPersonaAudioUrl, runtimeLiveTalk]);

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const showTyping = useCallback((personaId: string | null) => {
    clearTypingTimeout();
    setTypingPersonaId(personaId);
    if (personaId) {
      typingTimeoutRef.current = window.setTimeout(() => {
        setTypingPersonaId((current) => (current === personaId ? null : current));
        typingTimeoutRef.current = null;
      }, 2000);
    }
  }, [clearTypingTimeout]);

  const sendMessage = useCallback(async (textRaw: string, personaId = selectedPersonaId) => {
    const persona = PERSONAS.find((entry) => entry.id === personaId);
    const text = textRaw.trim();
    if (!persona || !text) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const userMessage = makeMessage({
      role: 'user',
      senderName: 'Du',
      senderIcon: '✦',
      senderColor: TOKENS.gold,
      text,
    });

    let nextMessages: ChatMessage[] = [];
    setMessagesByPersona((current) => {
      const base = current[persona.id] ?? [buildIntroMessage(persona)];
      nextMessages = [...base, userMessage];
      return {
        ...current,
        [persona.id]: nextMessages,
      };
    });
    setInput('');
    setIsAnalyzing(true);

    const historyForCall = nextMessages.slice(-12).map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.role === 'user' ? message.text : `${message.senderName}: ${message.text}`,
    }));

    const shouldRequestAudio = ((liveTalk.liveTalkActive && liveTalk.ttsEnabled && LIVE_AUDIO_ENABLED) || (showAudioDevTools && forceAudioRequestRef.current));
    setLastRequestedAudioMode(shouldRequestAudio);
    showTyping(persona.id);

    const activePanelSettings = personaSettings[persona.id] ?? buildDefaultSettings(persona);
    const personaSettingsForRequest = {
      [persona.id]: {
        voice: activePanelSettings.voice || liveTalk.selectedVoice || getSystemVoiceName(persona.id),
        accent: activePanelSettings.accent || getSystemAccent(persona.id),
      },
    };

    const streamMessageId = `stream-${requestId}-${persona.id}`;
    await callStream(
      {
        personas: [persona.id],
        message: text,
        conversationHistory: historyForCall,
        personaSettings: personaSettingsForRequest,
        userId: profile?.id,
        appMode,
        audioMode: shouldRequestAudio,
        stream: true,
      },
      {
        onTyping: (streamPersonaId) => {
          if (requestId !== requestIdRef.current || streamPersonaId !== persona.id) {
            return;
          }
          showTyping(streamPersonaId);
        },
        onText: (streamPersonaId, streamText, color) => {
          if (requestId !== requestIdRef.current || streamPersonaId !== persona.id) {
            return;
          }

          showTyping(null);
          setMessagesByPersona((current) => {
            const base = current[persona.id] ?? [buildIntroMessage(persona)];
            const existingIndex = base.findIndex((message) => message.id === streamMessageId);
            const streamedMessage = {
              id: streamMessageId,
              role: 'persona' as const,
              senderName: persona.name,
              senderIcon: persona.icon,
              senderColor: color || persona.color,
              text: streamText,
              timestamp: ts(),
            };

            if (existingIndex >= 0) {
              const next = [...base];
              next[existingIndex] = streamedMessage;
              return {
                ...current,
                [persona.id]: next,
              };
            }

            return {
              ...current,
              [persona.id]: [...base, streamedMessage],
            };
          });
          setIsAnalyzing(false);
          setForceAudioRequest(false);
          forceAudioRequestRef.current = false;
        },
        onAudio: (streamPersonaId, audioUrl, meta) => {
          if (requestId !== requestIdRef.current || streamPersonaId !== persona.id) {
            return;
          }

          setLastPersonaAudioUrl(audioUrl);
          setLastServerTtsEngine(meta?.ttsEngineUsed ?? null);
          setLastServerTtsMimeType(meta?.ttsMimeType ?? null);
          setTtsTelemetryStatus(meta?.ttsEngineUsed ? 'ok' : audioUrl ? 'missing' : 'idle');
          setIsPersonaSpeaking(true);
          void runtimeLiveTalk.playAudio(audioUrl)
            .catch((error: unknown) => {
              console.error('[LiveTalk] autoplay failed', error);
            })
            .finally(() => {
              setIsPersonaSpeaking(false);
            });
        },
        onDone: () => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          showTyping(null);
          setIsAnalyzing(false);
          setForceAudioRequest(false);
          forceAudioRequestRef.current = false;
        },
      },
    );

    if (requestId === requestIdRef.current) {
      showTyping(null);
      setIsAnalyzing(false);
    }
  }, [appMode, callStream, liveTalk.selectedVoice, profile?.id, runtimeLiveTalk, selectedPersonaId, showAudioDevTools, showTyping]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    const speechDraft = runtimeLiveTalk.transcript.trim();

    if (!liveTalk.liveTalkActive || !liveTalk.micEnabled) {
      speechDraftRef.current = '';
      return;
    }

    setInput((current) => {
      const previousSpeechDraft = speechDraftRef.current.trim();
      const currentText = current.trim();

      if (!speechDraft) {
        speechDraftRef.current = '';
        return currentText === previousSpeechDraft ? '' : current;
      }

      if (currentText.length > 0 && currentText !== previousSpeechDraft) {
        return current;
      }

      speechDraftRef.current = speechDraft;
      return speechDraft;
    });
  }, [liveTalk.liveTalkActive, liveTalk.micEnabled, runtimeLiveTalk.transcript]);

  useEffect(() => {
    forceAudioRequestRef.current = forceAudioRequest;
  }, [forceAudioRequest]);

  useEffect(() => {
    if (liveTalk.liveTalkActive && liveTalk.micEnabled) {
      if (!runtimeLiveTalk.isActive) {
        runtimeLiveTalk.activate();
      }
      return;
    }

    if (runtimeLiveTalk.isActive) {
      runtimeLiveTalk.deactivate();
    }
  }, [liveTalk.liveTalkActive, liveTalk.micEnabled, runtimeLiveTalk]);

  useEffect(() => {
    if (!liveTalk.liveTalkActive) {
      cancel();
      showTyping(null);
      setIsAnalyzing(false);
    }
  }, [cancel, liveTalk.liveTalkActive, showTyping]);

  useEffect(() => () => clearTypingTimeout(), [clearTypingTimeout]);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  }, [activeMessages.length, isAnalyzing, selectedPersona.id]);

  const openSettingsForPersona = (persona: PersonaInfo) => {
    setPanelPersonaId(persona.id);
    setSettingsOpen(true);
    setGearOpen(false);
  };

  const resetCurrentConversation = () => {
    setMessagesByPersona((current) => ({
      ...current,
      [selectedPersona.id]: [buildIntroMessage(selectedPersona)],
    }));
    setInput('');
    setHistoryOpen(false);
  };

  const sendDevAudioProbe = useCallback(async () => {
    if (!showAudioDevTools) {
      return;
    }
    forceAudioRequestRef.current = true;
    setForceAudioRequest(true);
    await sendMessageRef.current('Audio Dev Probe');
  }, [showAudioDevTools]);

  const handleQuickCommand = (command: string) => {
    const lower = command.toLowerCase();
    const targetPersona = PERSONAS.find((persona) => lower.includes(persona.name.toLowerCase()));

    if (targetPersona) {
      setSelectedPersonaId(targetPersona.id);
    }

    if (lower.includes('livetalk')) {
      liveTalk.toggleLiveTalk();
    }
    if (lower.includes('mikrofon')) {
      liveTalk.toggleMic();
    }
    if (lower.includes('tts')) {
      liveTalk.toggleTTS();
    }

    if (!targetPersona || targetPersona.id === 'maya') {
      setSelectedPersonaId('maya');
      void sendMessage(command, 'maya');
    }

    setMayaOverlayOpen(false);
  };

  const historySummary = PERSONAS.filter((persona) => (messagesByPersona[persona.id]?.length ?? 0) > 1);
  const notificationCount = historySummary.length;
  const mayaState = personaSettings.maya ?? buildDefaultSettings(FALLBACK_PERSONA);
  const mayaChips = [
    profile?.name ? `Profil: ${profile.name}` : null,
    profile?.birthDate ? `Geburt: ${profile.birthDate}` : null,
    liveTalk.liveTalkActive ? 'LiveTalk aktiv' : null,
    mayaState.proactiveInsights ? 'Proaktive Insights an' : null,
    mayaState.mayaCoreSync ? 'Maya Core Sync an' : null,
    `${Math.max(0, (messagesByPersona.maya?.length ?? 1) - 1)} Maya-Spuren im Verlauf`,
  ].filter((chip): chip is string => Boolean(chip)).slice(0, 4);

  return (
    <>
      <style>{`
        .discussion-redesign-root {
          display: grid;
          grid-template-columns: 210px minmax(0, 1fr);
          min-height: calc(100vh - ${TOKENS.layout.topbarH}px);
          background: ${TOKENS.bg};
          color: ${TOKENS.text};
        }
        @media (max-width: 920px) {
          .discussion-redesign-root {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="discussion-redesign-root" id="s-chat">
        <div>
          <PersonaList
            activePersonaId={selectedPersona.id}
            liveTalkActive={liveTalk.liveTalkActive}
            onOpenMayaOverlay={() => setMayaOverlayOpen(true)}
            onOpenSettings={openSettingsForPersona}
            onSelect={(persona) => {
              setSelectedPersonaId(persona.id);
              setHistoryOpen(false);
            }}
            personas={PERSONAS}
          />
        </div>

        <div style={styles.main}>
          <div style={styles.topActions}>
            {onBack ? (
              <button onClick={onBack} style={styles.utilityButton} type="button">
                Zurueck
              </button>
            ) : null}
            <button
              onClick={liveTalk.toggleLiveTalk}
              style={{
                ...styles.primaryButton,
                ...(liveTalk.liveTalkActive ? styles.primaryButtonActive : null),
              }}
              type="button"
            >
              {liveTalk.liveTalkActive ? 'LiveTalk aktiv' : 'LiveTalk'}
            </button>
            <button onClick={resetCurrentConversation} style={styles.utilityButton} type="button">
              Neue Session
            </button>
            <button
              onClick={() => setHistoryOpen((current) => !current)}
              style={{
                ...styles.utilityButton,
                ...(historyOpen ? styles.utilityButtonActive : null),
              }}
              type="button"
            >
              Verlauf
            </button>
            <div style={styles.gearWrap}>
              <button
                onClick={() => setGearOpen((current) => !current)}
                style={{
                  ...styles.utilityButton,
                  ...(gearOpen ? styles.utilityButtonActive : null),
                }}
                type="button"
              >
                Gear
              </button>
              <GearDropdown
                liveTalk={liveTalk}
                onOpenSettings={() => openSettingsForPersona(selectedPersona)}
                open={gearOpen}
              />
            </div>
            <button style={styles.utilityButton} type="button">
              Benachrichtigungen {notificationCount > 0 ? `(${notificationCount})` : ''}
            </button>
          </div>

          <LiveTalkBanner
            active={liveTalk.liveTalkActive}
            micEnabled={liveTalk.micEnabled}
            selectedVoice={liveTalk.selectedVoice}
            ttsEnabled={liveTalk.ttsEnabled}
          />

          <MayaChips chips={mayaChips} visible={selectedPersona.id === 'maya'} />

          {historyOpen ? (
            <div style={styles.historyStrip}>
              {historySummary.length > 0 ? historySummary.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  style={{
                    ...styles.historyChip,
                    borderColor: selectedPersona.id === persona.id ? persona.color : TOKENS.b1,
                    color: selectedPersona.id === persona.id ? persona.color : TOKENS.text2,
                  }}
                  type="button"
                >
                  {persona.name} · {(messagesByPersona[persona.id]?.length ?? 0) - 1} Antworten
                </button>
              )) : <div style={styles.historyEmpty}>Noch kein Verlauf ausserhalb des Intros.</div>}
            </div>
          ) : null}

          <div style={styles.chatHeader}>
            <div style={{ ...styles.avatar, borderColor: selectedPersona.id === 'maya' ? TOKENS.gold : selectedPersona.color }}>
              {selectedPersona.icon}
            </div>
            <div>
              <div style={{ ...styles.headerName, color: selectedPersona.id === 'maya' ? TOKENS.gold : selectedPersona.color }}>
                {selectedPersona.name}
              </div>
              <div style={styles.headerSub}>
                {isPersonaSpeaking || runtimeLiveTalk.isSpeaking
                  ? `spricht gerade · ${liveTalk.selectedVoice}`
                  : runtimeLiveTalk.micBlocked
                  ? 'Mikrofon gesperrt'
                  : liveTalk.liveTalkActive
                    ? (liveTalk.micEnabled ? 'LiveTalk hoert zu' : 'LiveTalk aktiv · Mikrofon pausiert')
                    : 'online · bereit'}
              </div>
            </div>
            <button onClick={() => openSettingsForPersona(selectedPersona)} style={styles.utilityButton} type="button">
              Persona Settings
            </button>
          </div>

          <div ref={feedRef} style={styles.feed}>
            {activeMessages.map((message) => {
              const isUser = message.role === 'user';
              const isMayaMessage = !isUser && selectedPersona.id === 'maya';

              return (
                <div
                  key={message.id}
                  style={{
                    ...styles.messageRow,
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isUser ? (
                    <div style={{ ...styles.messageAvatar, borderColor: isMayaMessage ? TOKENS.gold : selectedPersona.color }}>
                      {message.senderIcon}
                    </div>
                  ) : null}
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(isUser ? styles.userBubble : styles.personaBubble),
                      ...(isMayaMessage ? styles.mayaBubble : null),
                    }}
                  >
                    <div style={{ ...styles.messageName, color: message.senderColor, textAlign: isUser ? 'right' : 'left' }}>
                      {message.senderName}
                    </div>
                    <div style={styles.messageText}>{message.text}</div>
                    <div style={{ ...styles.messageTime, textAlign: isUser ? 'right' : 'left' }}>{message.timestamp}</div>
                  </div>
                </div>
              );
            })}

            {typingPersonaId ? (
              <div style={styles.analyzing}>
                {(PERSONAS.find((persona) => persona.id === typingPersonaId)?.name ?? 'Persona')} tippt gerade…
              </div>
            ) : isAnalyzing ? <div style={styles.analyzing}>Antwort wird aufgebaut…</div> : null}
          </div>

          <div style={{ ...styles.inputWrap, borderColor: liveTalk.liveTalkActive ? 'rgba(74,222,128,0.55)' : TOKENS.b1 }}>
            <button
              onClick={liveTalk.toggleLiveTalk}
              style={{
                ...styles.micButton,
                ...(liveTalk.liveTalkActive ? styles.micButtonActive : null),
              }}
              type="button"
            >
              {liveTalk.liveTalkActive ? 'Stop' : 'Mic'}
            </button>
            <textarea
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  runtimeLiveTalk.resetTranscript();
                  void sendMessage(input);
                }
              }}
              placeholder={liveTalk.liveTalkActive
                ? (liveTalk.micEnabled ? 'Sprich frei oder schreibe weiter…' : 'LiveTalk aktiv · Mikrofon pausiert, tippen bleibt moeglich…')
                : 'Schreibe eine Nachricht…'}
              rows={1}
              style={styles.textarea}
              value={input}
            />
            <button
              onClick={() => {
                runtimeLiveTalk.resetTranscript();
                void sendMessage(input);
              }}
              style={styles.sendButton}
              type="button"
            >
              Senden
            </button>
          </div>

          {showAudioDevTools ? (
            <div style={styles.devTools}>
              <div style={styles.devTitle}>Audio Dev Tools</div>
              <label style={styles.devCheckRow}>
                <input checked={forceAudioRequest} onChange={(event) => setForceAudioRequest(event.target.checked)} type="checkbox" />
                Request TTS Audio (audioMode=true)
              </label>
              <div style={styles.devButtonRow}>
                <button onClick={() => { void playTestTone(); }} style={styles.utilityButton} type="button">Test Ton</button>
                <button disabled={!lastPersonaAudioUrl} onClick={() => { void playLastPersonaAudio(); }} style={styles.utilityButton} type="button">Letzte TTS</button>
                <button onClick={() => { void sendDevAudioProbe(); }} style={styles.utilityButton} type="button">Probe senden</button>
              </div>
              <div style={styles.devMeta}>
                <div>audioMode: {String(lastRequestedAudioMode)}</div>
                <div>audio_url: {lastPersonaAudioUrl ? lastPersonaAudioUrl.slice(0, 28) : 'none'}</div>
                <div>tts_engine_used: {lastServerTtsEngine ?? 'none'}</div>
                <div>tts_mime_type: {lastServerTtsMimeType ?? 'none'}</div>
                <div>telemetry: {ttsTelemetryStatus}</div>
                <div>audio state: {audioDiag}</div>
                {audioDiagError ? <div>audio error: {audioDiagError}</div> : null}
              </div>
              {lastPersonaAudioUrl ? (
                <audio
                  controls
                  onCanPlay={(event) => setAudioDiag(`canplay rs=${event.currentTarget.readyState} ns=${event.currentTarget.networkState}`)}
                  onError={(event) => {
                    const code = event.currentTarget.error?.code;
                    setAudioDiag('error');
                    setAudioDiagError(code ? `MediaError code=${code}` : 'MediaError unknown');
                  }}
                  onLoadedMetadata={(event) => {
                    setAudioDiag(`loadedmetadata rs=${event.currentTarget.readyState} ns=${event.currentTarget.networkState}`);
                    setAudioDiagError(null);
                  }}
                  onPlay={() => setAudioDiag('play')}
                  src={lastPersonaAudioUrl}
                  style={{ width: '100%' }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <PersonaSettingsPanel
        liveTalk={liveTalk}
        onChange={(next) => setPersonaSettings((current) => ({
          ...current,
          [panelPersona.id]: next,
        }))}
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
        persona={panelPersona}
        settings={personaSettings[panelPersona.id] ?? buildDefaultSettings(panelPersona)}
      />

      <MayaOverlay
        liveTalkActive={liveTalk.liveTalkActive}
        onClose={() => setMayaOverlayOpen(false)}
        onQuickCommand={handleQuickCommand}
        open={mayaOverlayOpen}
      />

      {runtimeLiveTalk.showConsent ? (
        <SpeechConsentDialog onAccept={runtimeLiveTalk.acceptConsent} onCancel={runtimeLiveTalk.cancelConsent} />
      ) : null}
    </>
  );
}

function buildIntroMessage(persona: PersonaInfo): ChatMessage {
  return makeMessage({
    role: 'persona',
    senderName: persona.name,
    senderIcon: persona.icon,
    senderColor: persona.color,
    text: INTROS[persona.id] ?? 'Willkommen. Was moechtest du heute klaeren?',
  });
}

function buildDefaultSettings(persona: PersonaInfo): PersonaPanelSettings {
  return {
    signatureQuirks: persona.id === 'maya' ? ['Poetisch', 'Spiegelnd'] : ['Direkt'],
    characterTuning: persona.id === 'lilith' ? 4 : 3,
    toneMode: persona.id === 'maya' ? 'Ruhig' : 'Klar',
    voice: getSystemVoiceName(persona.id),
    accent: getSystemAccent(persona.id),
    preview: REPLIES[persona.id]?.[0] ?? `${persona.name} antwortet klar und praesent.`,
    mayaSpecialFunction: persona.id === 'maya'
      ? 'Maya verbindet Chat, Verlauf und App-Kontext, ohne zur verdeckten Wahrheitsinstanz zu werden.'
      : `Maya rahmt ${persona.name}, bleibt aber als Begleiterin getrennt sichtbar.`,
    appControl: persona.id === 'maya',
    proactiveInsights: persona.id === 'maya',
    mayaCoreSync: persona.id === 'maya',
  };
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    background: TOKENS.bg,
  },
  topActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    padding: '18px 22px 12px',
    borderBottom: `2px solid ${TOKENS.b1}`,
    background: TOKENS.bg2,
  },
  primaryButton: {
    padding: '10px 14px',
    borderRadius: 24,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(255,255,255,0.05)',
    color: TOKENS.text,
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
  },
  primaryButtonActive: {
    borderColor: 'rgba(74,222,128,0.55)',
    background: 'rgba(74,222,128,0.12)',
    boxShadow: '0 0 24px rgba(74,222,128,0.15)',
  },
  utilityButton: {
    padding: '10px 12px',
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(255,255,255,0.03)',
    color: TOKENS.text2,
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
  },
  utilityButtonActive: {
    borderColor: TOKENS.goldSoft,
    color: TOKENS.gold,
  },
  gearWrap: {
    position: 'relative',
  },
  historyStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    padding: '12px 22px 0',
  },
  historyChip: {
    padding: '8px 12px',
    borderRadius: 20,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.card2,
    cursor: 'pointer',
    fontFamily: TOKENS.font.body,
  },
  historyEmpty: {
    color: TOKENS.text2,
    fontSize: 12,
    fontFamily: TOKENS.font.body,
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '18px 22px 16px',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.bg3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    flexShrink: 0,
  },
  headerName: {
    fontFamily: TOKENS.font.display,
    fontSize: 24,
  },
  headerSub: {
    marginTop: 4,
    color: TOKENS.text2,
    fontSize: 13,
    fontFamily: TOKENS.font.body,
  },
  feed: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '0 22px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.bg3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '72%',
    padding: '14px 16px',
    borderRadius: 18,
  },
  personaBubble: {
    background: TOKENS.card2,
    border: `1.5px solid ${TOKENS.b2}`,
  },
  mayaBubble: {
    borderLeft: `2px solid ${TOKENS.gold}`,
    background: 'rgba(212,175,55,0.08)',
  },
  userBubble: {
    background: 'rgba(212,175,55,0.08)',
    border: '1.5px solid rgba(212,175,55,0.28)',
  },
  messageName: {
    fontFamily: TOKENS.font.serif,
    fontSize: 13,
    letterSpacing: '0.04em',
    marginBottom: 6,
  },
  messageText: {
    color: TOKENS.text,
    fontFamily: TOKENS.font.body,
    fontSize: 14,
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  messageTime: {
    marginTop: 8,
    color: TOKENS.text3,
    fontSize: 11,
    fontFamily: TOKENS.font.body,
  },
  analyzing: {
    color: TOKENS.gold,
    fontFamily: TOKENS.font.serif,
    fontSize: 15,
    padding: '4px 2px 0',
  },
  inputWrap: {
    margin: '0 22px 18px',
    padding: 12,
    borderRadius: 18,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.bg2,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
  },
  micButton: {
    width: 54,
    height: 46,
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b1}`,
    background: 'rgba(255,255,255,0.03)',
    color: TOKENS.text2,
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: TOKENS.font.body,
  },
  micButtonActive: {
    borderColor: 'rgba(74,222,128,0.55)',
    background: 'rgba(74,222,128,0.12)',
    color: TOKENS.text,
  },
  textarea: {
    flex: 1,
    minHeight: 46,
    maxHeight: 140,
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.b1}`,
    background: TOKENS.card2,
    color: TOKENS.text,
    padding: '12px 14px',
    resize: 'vertical',
    fontFamily: TOKENS.font.body,
    fontSize: 14,
  },
  sendButton: {
    padding: '0 18px',
    height: 46,
    borderRadius: 14,
    border: `1.5px solid ${TOKENS.goldSoft}`,
    background: TOKENS.gold,
    color: TOKENS.bg,
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: TOKENS.font.body,
    fontWeight: 600,
  },
  devTools: {
    margin: '0 22px 22px',
    padding: 14,
    borderRadius: 16,
    border: `1px dashed ${TOKENS.goldSoft}`,
    background: TOKENS.card2,
  },
  devTitle: {
    color: TOKENS.gold,
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: TOKENS.font.body,
  },
  devCheckRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: TOKENS.text2,
    marginBottom: 10,
    fontFamily: TOKENS.font.body,
  },
  devButtonRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  devMeta: {
    marginTop: 10,
    color: TOKENS.text2,
    fontSize: 11,
    display: 'grid',
    gap: 4,
    fontFamily: TOKENS.font.body,
  },
};
