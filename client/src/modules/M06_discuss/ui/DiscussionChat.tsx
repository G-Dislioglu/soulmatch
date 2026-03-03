import { useEffect, useMemo, useRef, useState } from 'react';
import { loadProfile } from '../../M03_profile';
import { SpeechConsentDialog } from '../../M08_studio-chat/ui/SpeechConsentDialog';
import { useDiscussApi } from '../hooks/useDiscussApi';
import { useLiveTalk } from '../hooks/useLiveTalk';
import { ChatSidebar } from './ChatSidebar';
import { CompanionPanel } from './CompanionPanel';
import { CompanionSelectScreen } from './CompanionSelectScreen';
import { LiveTalkButton } from './LiveTalkButton';
import { PersonaSelectScreen } from './PersonaSelectScreen';
import { PersonaSettingsModal } from './PersonaSettingsModal';
import { type ChatMessage, type InsightCard, type PersonaInfo } from '../types';

interface Props {
  onBack?: () => void;
}

type Step = 'companion-select' | 'persona-select' | 'chat';

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

const COMPANION_REMARKS = [
  'Ich bemerke dass du ausweichst. Das Thema sitzt tiefer als du zugibst.',
  'Dieser Moment war wichtig. Ich habe ihn archiviert.',
  'Du hast gerade etwas sehr Mutiges gesagt. Bemerkst du das?',
  'Ein Muster das ich schon öfter beobachtet habe. Sprechen wir später darüber?',
  'Die Energie in diesem Gespräch hat sich gerade verändert.',
];

const LIVE_INSIGHTS: Array<{ type: string; text: string; category: InsightCard['category'] }> = [
  { type: 'Schlüsselmoment', text: 'Erste Öffnung erkannt – emotionaler Kanal aktiv.', category: 'new' },
  { type: 'Tension', text: 'Widerstand spürbar. Schutzreaktion aktiv.', category: 'tension' },
  { type: 'Harmonie', text: 'Resonanz gestiegen. Gespräch fließt authentisch.', category: 'harmony' },
  { type: 'Durchbruch', text: 'Tiefe Selbstreflexion – seltener und wichtiger Moment.', category: 'key' },
  { type: 'Energie-Shift', text: 'Tonfall: Abwehr → Neugier. Wichtige Verschiebung.', category: 'new' },
];

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

function getAudioUrlFromResponse(response: { audio_url?: string; audio?: string; mimeType?: string } | undefined): string | undefined {
  if (!response) return undefined;
  if ((response as { audioUrl?: string }).audioUrl) return (response as { audioUrl?: string }).audioUrl;
  if (response.audio_url) return response.audio_url;
  if (response.audio && response.audio.trim().length > 0) {
    if (response.audio.startsWith('http://') || response.audio.startsWith('https://') || response.audio.startsWith('data:')) {
      return response.audio;
    }
    return `data:${response.mimeType ?? 'audio/wav'};base64,${response.audio}`;
  }
  return undefined;
}

export function DiscussionChat({ onBack }: Props) {
  const [step, setStep] = useState<Step>('companion-select');
  const [companion, setCompanion] = useState<PersonaInfo | null>(null);
  const [persona, setPersona] = useState<PersonaInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [companionMessages, setCompanionMessages] = useState<ChatMessage[]>([]);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [companionQuote, setCompanionQuote] = useState('Ich beobachte dein Gespräch still mit. Wenn etwas Wichtiges passiert, melde ich mich.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [focusCompanionToken, setFocusCompanionToken] = useState(0);
  const [insightIdx, setInsightIdx] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const sendMessageRef = useRef<(textRaw: string) => Promise<void>>(async () => {});
  const sendToCompanionRef = useRef<(textRaw: string) => Promise<void>>(async () => {});
  const personaRequestIdRef = useRef(0);
  const { call } = useDiscussApi();
  const personaLiveTalk = useLiveTalk({ onTranscript: (text) => {
    setInput(text);
    void sendMessageRef.current(text);
  } });
  const companionLiveTalk = useLiveTalk({ onTranscript: (text) => {
    void sendToCompanionRef.current(text);
  } });

  const profile = useMemo(() => loadProfile(), []);

  useEffect(() => {
    if (personaLiveTalk.transcript) {
      setInput(personaLiveTalk.transcript);
    }
  }, [personaLiveTalk.transcript]);

  const handleCompanionSelect = (selected: PersonaInfo) => {
    setCompanion(selected);
    document.documentElement.style.setProperty('--sm-cc', selected.color);
    document.documentElement.style.setProperty('--sm-cg', `${selected.color}38`);
    setStep('persona-select');
  };

  const handlePersonaSelect = (selected: PersonaInfo) => {
    setPersona(selected);
    setMessages([
      makeMessage({
        role: 'persona',
        senderName: selected.name,
        senderIcon: selected.icon,
        senderColor: selected.color,
        text: INTROS[selected.id] ?? 'Willkommen in dieser Nacht. Ich bin bereit zu lauschen – was bewegt dich gerade?',
      }),
    ]);
    setCompanionMessages([]);
    setInsights([]);
    setInsightIdx(0);
    setMessageCount(0);
    setStep('chat');
  };

  const sendMessage = async (textRaw: string) => {
    if (!persona || !companion) return;
    const text = textRaw.trim();
    if (!text) return;
    const requestId = personaRequestIdRef.current + 1;
    personaRequestIdRef.current = requestId;

    const userMessage = makeMessage({
      role: 'user',
      senderName: 'Du',
      senderIcon: '🌟',
      senderColor: 'var(--sm-gold)',
      text,
    });

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsAnalyzing(true);

    const historyForCall = nextMessages.slice(-12).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.role === 'user' ? m.text : `${m.senderName}: ${m.text}`,
    }));

    const response = await call({
      personas: [persona.id],
      message: text,
      conversationHistory: historyForCall,
      userId: profile?.id,
      audioMode: personaLiveTalk.isActive,
      stream: false,
    });

    if (requestId !== personaRequestIdRef.current) return;

    if (response?.responses?.length) {
      const first = response.responses[0];
      const personaText = first?.text?.trim() || REPLIES[persona.id]?.[0] || 'Ich höre dich.';
      const audioUrl = getAudioUrlFromResponse(first);
      console.log('[Discuss] response audio diagnostics', {
        personaId: persona.id,
        hasAudioUrl: Boolean(audioUrl),
        audioUrlPrefix: audioUrl ? audioUrl.slice(0, 40) : null,
        hasAudioUrlField: typeof first?.audio_url === 'string' && first.audio_url.length > 0,
        hasAudioField: typeof first?.audio === 'string' && first.audio.length > 0,
      });
      setMessages((prev) => [
        ...prev,
        makeMessage({
          role: 'persona',
          senderName: persona.name,
          senderIcon: persona.icon,
          senderColor: persona.color,
          text: personaText,
        }),
      ]);
      await personaLiveTalk.playAudio(audioUrl);
    } else {
      const fallbackList = REPLIES[persona.id] ?? REPLIES.luna ?? ['Ich höre dich.'];
      const fallbackText = fallbackList[Math.floor(Math.random() * fallbackList.length)] ?? 'Ich höre dich.';
      setMessages((prev) => [
        ...prev,
        makeMessage({
          role: 'persona',
          senderName: persona.name,
          senderIcon: persona.icon,
          senderColor: persona.color,
          text: fallbackText,
        }),
      ]);
    }

    if (requestId !== personaRequestIdRef.current) return;

    const nextCount = messageCount + 1;
    setMessageCount(nextCount);
    setIsAnalyzing(false);

    if (insightIdx < LIVE_INSIGHTS.length) {
      const ins = LIVE_INSIGHTS[insightIdx];
      if (ins) {
        setInsights((prev) => [{ type: ins.type, text: ins.text, category: ins.category, timestamp: ts() }, ...prev]);
        setInsightIdx((idx) => idx + 1);
      }
    }

    if (nextCount % 3 === 0) {
      const remark = COMPANION_REMARKS[Math.floor(nextCount / 3) % COMPANION_REMARKS.length] ?? COMPANION_REMARKS[0] ?? 'Ich beobachte weiter.';
      setCompanionQuote(remark);
      setMessages((prev) => [
        ...prev,
        makeMessage({
          role: 'companion',
          senderName: `${companion.name} · Begleitung`,
          senderIcon: companion.icon,
          senderColor: companion.color,
          text: remark,
        }),
      ]);
    }
  };

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const sendToCompanion = async (message: string, context?: string): Promise<string | undefined> => {
    if (!companion) return;
    const userMessage = makeMessage({
      role: 'user',
      senderName: 'Du',
      senderIcon: '🌟',
      senderColor: 'var(--sm-gold)',
      text: message,
    });
    setCompanionMessages((prev) => [...prev, userMessage]);

    setIsAnalyzing(true);
    const response = await call({
      personas: [companion.id],
      message: context ? `[Kontext: ${context}] ${message}` : message,
      conversationHistory: companionMessages.slice(-12).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'user' ? m.text : `${m.senderName}: ${m.text}`,
      })),
      userId: profile?.id,
      audioMode: companionLiveTalk.isActive,
    });
    setIsAnalyzing(false);

    const first = response?.responses?.[0];
    const replyText = first?.text?.trim() || `${companion.name} ist hier. Ich höre dir weiter zu.`;
    setCompanionMessages((prev) => [
      ...prev,
      makeMessage({
        role: 'companion',
        senderName: companion.name,
        senderIcon: companion.icon,
        senderColor: companion.color,
        text: replyText,
      }),
    ]);
    return getAudioUrlFromResponse(first);
  };

  useEffect(() => {
    sendToCompanionRef.current = async (textRaw: string) => {
      const audioUrl = await sendToCompanion(textRaw);
      await companionLiveTalk.playAudio(audioUrl);
    };
  }, [companionLiveTalk, sendToCompanion]);

  const togglePersonaLive = () => {
    if (companionLiveTalk.isActive) {
      companionLiveTalk.deactivate();
    }
    personaLiveTalk.toggle();
  };

  const toggleCompanionLive = () => {
    if (personaLiveTalk.isActive) {
      personaLiveTalk.deactivate();
    }
    companionLiveTalk.toggle();
  };

  if (step === 'companion-select') {
    return <CompanionSelectScreen onSelect={handleCompanionSelect} />;
  }

  if (step === 'persona-select' && companion) {
    return <PersonaSelectScreen companion={companion} onSelect={handlePersonaSelect} onBack={() => setStep('companion-select')} />;
  }

  if (!companion || !persona) {
    return null;
  }

  const personaLiveActive = personaLiveTalk.isActive;

  return (
    <div className="sm-chat-root" id="s-chat" style={{ overflow: 'hidden' }}>
      <ChatSidebar
        companion={companion}
        persona={persona}
        companionQuote={companionQuote}
        onNewChat={() => setStep('persona-select')}
        onCompanionChatClick={() => setFocusCompanionToken((t) => t + 1)}
      />

      <div className="sm-chat-col">
        <div className="sm-chat-top">
          <button className="sm-back-btn" onClick={() => setStep('persona-select')} type="button">← Zurück</button>
          <div className="sm-ap-av" style={{ borderColor: persona.color }}>{persona.icon}</div>
          <div>
            <div className="sm-ap-name" style={{ color: persona.color }}>{persona.name}</div>
            <div className="sm-ap-status">
              {personaLiveTalk.micBlocked
                ? 'Mikrofon gesperrt'
                : personaLiveTalk.isActive
                  ? '🎙 Live aktiv'
                  : 'online · bereit'}
            </div>
          </div>
          <div className="sm-live-controls">
            {personaLiveTalk.isSupported ? <LiveTalkButton isActive={personaLiveActive} onClick={togglePersonaLive} /> : null}
            <button className="sm-settings-btn" onClick={() => setSettingsOpen(true)} type="button" title="Persona-Einstellungen">⚙</button>
          </div>
        </div>

        <div className="sm-chat-feed">
          {messages.map((msg) => {
            if (msg.role === 'companion') {
              return (
                <div className="sm-comp-remark" key={msg.id}>
                  <div className="sm-cr-av" style={{ borderColor: companion.color, boxShadow: `0 0 10px ${companion.color}40` }}>{companion.icon}</div>
                  <div className="sm-cr-bub">
                    <div className="sm-cr-who" style={{ color: companion.color }}>{companion.icon} {companion.name} · Begleitung</div>
                    {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div className={`sm-msg ${msg.role === 'user' ? 'user' : 'persona'}`} key={msg.id}>
                <div className="sm-m-av" style={msg.role === 'persona' ? { borderColor: persona.color, boxShadow: `0 0 10px ${persona.color}40` } : {}}>{msg.senderIcon}</div>
                <div className="sm-m-bub">
                  <div className="sm-m-who" style={{ color: msg.senderColor, textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.senderName}</div>
                  {msg.text}
                  <div className="sm-m-time" style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.timestamp}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sm-chat-in-row">
          <textarea
            className="sm-chat-ta"
            placeholder="Schreibe eine Nachricht…"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                personaLiveTalk.resetTranscript();
                void sendMessage(input);
              }
            }}
          />
          <button
            className="sm-send-btn"
            onClick={() => {
              personaLiveTalk.resetTranscript();
              void sendMessage(input);
            }}
            type="button"
          >
            ↑
          </button>
        </div>
      </div>

      <CompanionPanel
        companion={companion}
        insights={insights}
        isAnalyzing={isAnalyzing}
        onSendToCompanion={sendToCompanion}
        companionMessages={companionMessages}
        focusInputToken={focusCompanionToken}
        liveActive={companionLiveTalk.isActive}
        onLiveToggle={toggleCompanionLive}
        onPlayAudio={companionLiveTalk.playAudio}
      />

      <PersonaSettingsModal persona={persona} open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {personaLiveTalk.showConsent ? <SpeechConsentDialog onAccept={personaLiveTalk.acceptConsent} onCancel={personaLiveTalk.cancelConsent} /> : null}
      {companionLiveTalk.showConsent ? <SpeechConsentDialog onAccept={companionLiveTalk.acceptConsent} onCancel={companionLiveTalk.cancelConsent} /> : null}

      {onBack ? <button className="sm-hidden-exit" type="button" onClick={onBack} aria-hidden="true" tabIndex={-1} /> : null}
    </div>
  );
}
