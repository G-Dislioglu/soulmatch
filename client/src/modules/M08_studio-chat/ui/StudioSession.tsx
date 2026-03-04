import { useState, useEffect, useRef, useCallback } from 'react'
import { StudioConfig, TalkMode } from './StudioSetup'
import { PersonaTensionCard } from './PersonaTensionCard'
import { RelationshipLines } from './RelationshipLines'
import { useSpeechToText } from '../../../hooks/useSpeechToText'
import { SpeechConsentDialog } from './SpeechConsentDialog'
import { usePersonaTension } from '../../../hooks/usePersonaTension'
import { PersonaTuningBar, getPersonaAccentProfile, getPersonaHumorLevel } from './PersonaTuningBar'
import {
  EMOTION_CONFIG,
  inferAudienceEvent,
  calcDissensScore,
  dissensLabel,
  type EmotionState,
} from '../../../lib/emotionEngine'
import {
  PERSONA_COLORS,
  PERSONA_ICONS,
  PERSONA_NAMES,
} from '../lib/personaColors'

interface Message {
  id: string
  speakerId: string
  speakerName: string
  speakerColor: string
  text: string
  role: 'moderator' | 'persona' | 'user'
}

interface PersonaResponse {
  persona: string
  text: string
  color: string
  meta?: Record<string, unknown> | null
  audio_url?: string
  audio?: string
  mimeType?: string
  provider?: string
  model?: string
}

interface DiscussResult {
  responses: PersonaResponse[]
  creditsUsed: number
}

interface PrefetchedAutoTurn {
  turn: number
  promise: Promise<DiscussResult | null>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getAudioUrlFromResponse(response: PersonaResponse): string | undefined {
  if (typeof response.audio_url === 'string' && response.audio_url.length > 0) return response.audio_url
  if (typeof response.audio === 'string' && response.audio.length > 0) {
    if (response.audio.startsWith('data:') || response.audio.startsWith('http://') || response.audio.startsWith('https://')) {
      return response.audio
    }
    return `data:${response.mimeType ?? 'audio/wav'};base64,${response.audio}`
  }
  return undefined
}

interface Props {
  config: StudioConfig
  onBack: () => void
}

export function StudioSession({ config, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const [talkMode, setTalkMode] = useState<TalkMode>(config.talkMode ?? 'text')
  const [sessionStarted, setSessionStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reportText, setReportText] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showConsent, setShowConsent] = useState(false)

  const feedRef = useRef<HTMLDivElement>(null)
  const turnRef = useRef(0)
  const runningRef = useRef(false)
  const isMountedRef = useRef(true)
  const isContinuousModeRef = useRef(false)
  const shouldResumeSpeechAfterAudioRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const nextTurnTimerRef = useRef<number | null>(null)
  const prefetchedAutoTurnRef = useRef<PrefetchedAutoTurn | null>(null)
  const autoRoundsSinceUserRef = useRef(0)
  const errorCountRef = useRef(0)
  const MAX_ERRORS = 2
  const MAX_AUTO_ROUNDS = 10

  const clearNextTurnTimer = useCallback(() => {
    if (nextTurnTimerRef.current !== null) {
      window.clearTimeout(nextTurnTimerRef.current)
      nextTurnTimerRef.current = null
    }
  }, [])

  const speech = useSpeechToText('de', (text) => {
    const spoken = text.trim()
    if (!spoken) return
    void handleSend(spoken)
  })

  const discussPersonas = Array.from(new Set(['maya', ...config.selectedPersonaIds.filter((id) => id !== 'maya')])).slice(0, 4)
  const activeIds = discussPersonas
  const initPersonas = activeIds.map((id) => ({
    id,
    name: PERSONA_NAMES[id] ?? id,
    icon: PERSONA_ICONS[id] ?? '○',
    baseColor: PERSONA_COLORS[id] ?? '#888',
    baseTension: id === 'maya' ? 20 : 40,
  }))

  const {
    personas,
    relations,
    applyTurn,
    clearSpeaking,
    clearMicroReaction,
  } = usePersonaTension(initPersonas)

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    isMountedRef.current = true
    if (config.talkMode === 'live') {
      if (speech.hasConsent) {
        setTalkMode('live')
        isContinuousModeRef.current = true
        speech.startContinuous()
        setSessionStarted(true)
      } else {
        setShowConsent(true)
      }
    } else {
      setTalkMode('text')
      isContinuousModeRef.current = false
      speech.stopContinuous()
      setSessionStarted(true)
    }

    return () => {
      isMountedRef.current = false
      clearNextTurnTimer()
      runningRef.current = false
      isContinuousModeRef.current = false
      prefetchedAutoTurnRef.current = null
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      }
      speech.setPlaybackActive(false)
      speech.stopContinuous()
    }
  }, [clearNextTurnTimer, config.talkMode])

  useEffect(() => {
    if (!sessionStarted) return
    if (turnRef.current > 0) return
    if (runningRef.current) return
    void runTurn()
  }, [sessionStarted])

  const getInterSpeakerPauseMs = useCallback((speakerId: string) => {
    const baseByPersona: Record<string, number> = {
      maya: 320,
      luna: 460,
      orion: 360,
      lilith: 240,
      stella: 340,
      kael: 420,
      lian: 360,
      sibyl: 390,
      amara: 410,
    }
    const base = baseByPersona[speakerId] ?? 340
    const jitter = Math.floor(Math.random() * 90) - 30
    return Math.max(180, base + jitter)
  }, [])

  useEffect(() => {
    if (speech.transcript.length > 0) {
      setUserInput(speech.transcript)
    }
  }, [speech.transcript])

  useEffect(() => {
    isContinuousModeRef.current = speech.isContinuousMode
  }, [speech.isContinuousMode])

  useEffect(() => {
    isContinuousModeRef.current = talkMode === 'live'
  }, [talkMode])

  const pauseSpeechForAudio = useCallback(() => {
    if (speech.isContinuousMode) {
      shouldResumeSpeechAfterAudioRef.current = true
      speech.stopContinuous()
      return
    }
    shouldResumeSpeechAfterAudioRef.current = false
  }, [speech])

  const resumeSpeechAfterAudioIfNeeded = useCallback(() => {
    if (!isMountedRef.current) return
    if (!shouldResumeSpeechAfterAudioRef.current) return
    shouldResumeSpeechAfterAudioRef.current = false
    if (!speech.micBlocked) {
      speech.startContinuous()
      isContinuousModeRef.current = true
    }
  }, [speech])

  const playPersonaAudio = useCallback(async (audioUrl: string | undefined): Promise<void> => {
    if (!audioUrl) return

    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      }

      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio
      audio.preload = 'auto'

      speech.setPlaybackActive(true)
      pauseSpeechForAudio()

      await new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          resolve()
        }

        audio.onended = finish
        audio.onerror = finish

        const p = audio.play()
        if (p && typeof p.catch === 'function') {
          p.catch(() => finish())
        }
      })
    } finally {
      if (currentAudioRef.current) {
        currentAudioRef.current = null
      }
      speech.setPlaybackActive(false)
      resumeSpeechAfterAudioIfNeeded()
    }
  }, [pauseSpeechForAudio, resumeSpeechAfterAudioIfNeeded, speech])

  function addMessage(msg: Omit<Message, 'id'>) {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: Date.now().toString(36) + Math.random().toString(36).slice(2) },
    ])
  }

  function getNextAutoTurnDelayMs() {
    if (prefetchedAutoTurnRef.current?.turn === turnRef.current) {
      return isContinuousModeRef.current ? 280 : 420
    }
    return isContinuousModeRef.current ? 1350 : 1650
  }

  async function callDiscuss(userMessage?: string, turnOverride = turnRef.current, historyOverride = messages) {
    const personaSettings = Object.fromEntries(
      discussPersonas.map((id) => [
        id,
        {
          humor: getPersonaHumorLevel(id),
          accentProfile: getPersonaAccentProfile(id),
        },
      ]),
    )

    const isAutoTurn = typeof userMessage !== 'string'
    const allowUserCheckIn = isAutoTurn && turnOverride > 0 && turnOverride % 4 === 0
    const cadencePhase = turnOverride % 3

    const cadenceInstruction = cadencePhase === 0
      ? 'Maya setzt den Frame und verteilt klar das Wort.'
      : cadencePhase === 1
      ? 'Maya bringt zwei Positionen in Kontrast und hält die Diskussion fokussiert.'
      : 'Maya liefert ein kurzes Zwischenfazit und eröffnet den nächsten Gedankenschritt.'

    const message = userMessage
      ?? (turnOverride === 0
        ? `Studio-Diskussion starten. Thema: ${config.topic}. Maya moderiert. Der User beobachtet nur.`
        : allowUserCheckIn
        ? `Setzt die Studio-Diskussion intern fort. Fokus bleibt strikt auf dem Thema "${config.topic}". ${cadenceInstruction} Maya fragt am Ende dieser Runde den User genau einmal kurz nach seiner Sicht.`
        : `Setzt die Studio-Diskussion intern fort. Fokus bleibt strikt auf dem Thema "${config.topic}". ${cadenceInstruction}`)

    const body = {
      personas: discussPersonas,
      message,
      conversationHistory: historyOverride.slice(-12).map((m) => ({
        role: m.speakerId === 'user' ? 'user' : 'assistant',
        content: `${m.speakerName}: ${m.text}`,
      })),
      end_session: false,
      stream: false,
      audioMode: isContinuousModeRef.current,
      personaSettings,

      studioMode: true,
      topic: config.topic,
      debateMode: config.mode,
      turn: turnOverride,
      autoTurn: isAutoTurn,
      allowUserCheckIn,
    }

    const res = await fetch('/api/discuss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error('API ' + res.status)
    return res.json() as Promise<DiscussResult>
  }

  const generateReport = useCallback(async () => {
    if (isGeneratingReport) return
    if (isLoading) {
      setReportText('Bitte kurz warten, bis die aktuelle Runde abgeschlossen ist.')
      return
    }
    setIsGeneratingReport(true)
    setReportText('Report wird generiert...')

    try {
      console.info('[StudioSession] report: request started', {
        topic: config.topic,
        mode: config.mode,
        turn: turnRef.current,
      })

      const res = await fetch('/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personas: ['maya'],
          message: `Erstelle einen Studio-Report zum Thema "${config.topic}". Der User ist Beobachter. Gib 5-8 Sätze: kurze Zusammenfassung der Positionen, Hauptkonflikte, Schnittmengen und klaren Ausblick für die nächste Runde.`,
          conversationHistory: messages.slice(-24).map((m) => ({
            role: m.speakerId === 'user' ? 'user' : 'assistant',
            content: `${m.speakerName}: ${m.text}`,
          })),
          end_session: false,
          stream: false,
          audioMode: isContinuousModeRef.current,
          personaSettings: {
            maya: {
              humor: getPersonaHumorLevel('maya'),
              accentProfile: getPersonaAccentProfile('maya'),
            },
          },
          studioMode: true,
          topic: config.topic,
          debateMode: config.mode,
          turn: turnRef.current,
          autoTurn: true,
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`API ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`)
      }
      const data = await res.json() as { responses?: PersonaResponse[] }
      const maya = (data.responses ?? []).find((r) => r.persona === 'maya') ?? data.responses?.[0]
      if (!maya) {
        setReportText('Kein Report verfügbar.')
        console.warn('[StudioSession] report: maya response missing', data)
        return
      }

      setReportText(maya.text)
      const reportAudio = getAudioUrlFromResponse(maya)
      if (reportAudio && isContinuousModeRef.current) {
        void playPersonaAudio(reportAudio)
      }
    } catch (err) {
      console.warn('[StudioSession] report failed', err)
      setReportText(err instanceof Error ? err.message : 'Report konnte nicht erzeugt werden.')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [config.mode, config.topic, isGeneratingReport, isLoading, messages, playPersonaAudio])

  async function runTurn(userMessage?: string) {
    if (runningRef.current) return
    if (errorCountRef.current >= MAX_ERRORS && !userMessage) return

    clearNextTurnTimer()
    runningRef.current = true
    setIsLoading(true)

    try {
      const currentTurn = turnRef.current
      const baseHistory: Message[] = userMessage
        ? [
            ...messages,
            {
              id: `user_${Date.now().toString(36)}`,
              speakerId: 'user',
              speakerName: 'Du',
              speakerColor: '#ffffff',
              text: userMessage,
              role: 'user',
            },
          ]
        : messages
      const prefetched = typeof userMessage === 'string'
        ? null
        : prefetchedAutoTurnRef.current?.turn === currentTurn
        ? prefetchedAutoTurnRef.current
        : null
      if (prefetched) {
        prefetchedAutoTurnRef.current = null
      }

      const prefetchedData = prefetched ? await prefetched.promise : null
      const data = prefetchedData ?? await callDiscuss(userMessage, currentTurn, baseHistory)
      const responses = data.responses ?? []

      const shouldContinueAuto = (userMessage ? 0 : autoRoundsSinceUserRef.current + 1) < MAX_AUTO_ROUNDS
      if (shouldContinueAuto && isMountedRef.current) {
        const stitchedHistory = [
          ...baseHistory,
          ...responses.map((resp) => ({
            id: `prefetch_${resp.persona}_${Date.now().toString(36)}`,
            speakerId: resp.persona,
            speakerName: PERSONA_NAMES[resp.persona] ?? resp.persona,
            speakerColor: PERSONA_COLORS[resp.persona] ?? resp.color ?? '#888',
            text: resp.text ?? '',
            role: (resp.persona === 'maya' ? 'moderator' : 'persona') as Message['role'],
          })),
        ]

        prefetchedAutoTurnRef.current = {
          turn: currentTurn + 1,
          promise: callDiscuss(undefined, currentTurn + 1, stitchedHistory).catch((err) => {
            console.warn('[StudioSession] prefetch failed', err)
            return null
          }),
        }
      } else {
        prefetchedAutoTurnRef.current = null
      }

      errorCountRef.current = 0

      for (const resp of responses) {
        if (!isMountedRef.current) break

        const speakerId = resp.persona
        const speakerName = PERSONA_NAMES[speakerId] ?? speakerId
        const speakerColor = PERSONA_COLORS[speakerId] ?? resp.color ?? '#888'
        const text = resp.text ?? ''
        const meta = resp.meta ?? null
        const audioUrl = getAudioUrlFromResponse(resp)

        addMessage({
          speakerId,
          speakerName,
          speakerColor,
          text,
          role: speakerId === 'maya' ? 'moderator' : 'persona',
        })

        if (meta) {
          const emotion: EmotionState = ['calm', 'neutral', 'engaged', 'heated', 'angry'].includes(String(meta.emotion))
            ? (meta.emotion as EmotionState)
            : 'neutral'

          applyTurn({ ...meta, speakerId: meta.speakerId ?? speakerId })

          const evt =
            meta.audienceEvent ??
            inferAudienceEvent(
              calcDissensScore(personas),
              emotion,
              text,
              speakerId === 'maya' && text.length > 100,
            )

          void evt
        }

        if (isContinuousModeRef.current) {
          await playPersonaAudio(audioUrl)
        }
        await sleep(getInterSpeakerPauseMs(speakerId))
      }

      turnRef.current++
      if (userMessage) {
        autoRoundsSinceUserRef.current = 0
      } else {
        autoRoundsSinceUserRef.current += 1
      }
      setIsLoading(false)
      clearSpeaking()
      runningRef.current = false

      if (autoRoundsSinceUserRef.current < MAX_AUTO_ROUNDS) {
        clearNextTurnTimer()
        nextTurnTimerRef.current = window.setTimeout(() => {
          nextTurnTimerRef.current = null
          if (!isMountedRef.current) return
          void runTurn()
        }, getNextAutoTurnDelayMs())
      }
    } catch (err) {
      console.error('[StudioSession]', err)
      errorCountRef.current++

      if (errorCountRef.current >= MAX_ERRORS) {
        addMessage({
          speakerId: 'maya',
          speakerName: PERSONA_NAMES['maya'] ?? 'Maya',
          speakerColor: PERSONA_COLORS['maya'] ?? '#c8a45a',
          text: 'Die Verbindung wurde unterbrochen. Nutze "Wort ergreifen" um fortzufahren.',
          role: 'moderator',
        })
      }

      setIsLoading(false)
      clearSpeaking()
      runningRef.current = false
    }
  }

  const handleSend = useCallback(async (textRaw?: string) => {
    const text = (textRaw ?? userInput).trim()
    if (!text || isLoading) return

    addMessage({
      speakerId: 'user',
      speakerName: 'Du',
      speakerColor: '#ffffff',
      text,
      role: 'user',
    })

    setUserInput('')
    speech.resetTranscript()
    clearNextTurnTimer()
    prefetchedAutoTurnRef.current = null
    await runTurn(text)
  }, [clearNextTurnTimer, isLoading, runTurn, speech, userInput])

  function handleSetTextTalk() {
    setTalkMode('text')
    isContinuousModeRef.current = false
    shouldResumeSpeechAfterAudioRef.current = false
    speech.stopContinuous()
    if (!sessionStarted) setSessionStarted(true)
  }

  function handleSetLiveTalk() {
    if (!speech.hasConsent) {
      setShowConsent(true)
      return
    }
    setTalkMode('live')
    isContinuousModeRef.current = true
    speech.startContinuous()
    if (!sessionStarted) setSessionStarted(true)
  }

  function handleConsentAccept() {
    speech.grantConsent()
    setShowConsent(false)
    setTalkMode('live')
    isContinuousModeRef.current = true
    speech.startContinuous()
    if (!sessionStarted) setSessionStarted(true)
  }

  function handleConsentCancel() {
    setShowConsent(false)
    handleSetTextTalk()
  }

  const active = personas.find((p) => p.speaking)
  const activeColor = active ? EMOTION_CONFIG[active.emotion].color : undefined
  const interruptQ = personas.filter((p) => p.wantsInterrupt).map((p) => p.id)
  const dissens = calcDissensScore(personas)

  return (
    <div className="studio-session">
      <div className="studio-session__topbar">
        <button className="studio-session__back" onClick={onBack}>← Zurück</button>
        <div className="studio-session__topic">
          <span className="studio-session__topic-badge">◈ Studio</span>
          {config.topic}
        </div>
        <div className="studio-session__top-controls">
          <button
            className="studio-session__ctrl-btn"
            onClick={() => void generateReport()}
            disabled={isGeneratingReport}
          >
            {isGeneratingReport ? '⏳ Report...' : '📋 Report'}
          </button>
          <button
            className="studio-session__ctrl-btn"
            onClick={handleSetTextTalk}
            style={{
              border: talkMode === 'text' ? '2px solid rgba(34,197,94,0.65)' : '1px solid rgba(255,255,255,0.1)',
              background: talkMode === 'text' ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.04)',
              color: talkMode === 'text' ? '#22c55e' : '#d8c69f',
              fontWeight: talkMode === 'text' ? 700 : 500,
            }}
          >
            ⌨️ Text Talk
          </button>
          {speech.isSupported && (
            <>
              <button
                className="studio-session__ctrl-btn"
                onClick={handleSetLiveTalk}
                style={{
                  border: talkMode === 'live'
                    ? '2px solid rgba(34,197,94,0.65)'
                    : speech.micBlocked
                    ? '1px solid rgba(239,68,68,0.65)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: talkMode === 'live'
                    ? 'rgba(34,197,94,0.16)'
                    : speech.micBlocked
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  color: talkMode === 'live'
                    ? '#22c55e'
                    : speech.micBlocked
                    ? '#f87171'
                    : '#d8c69f',
                  fontWeight: talkMode === 'live' ? 700 : 500,
                }}
              >
                🎙️ Live Talk
              </button>
              <span style={{ fontSize: 11, color: talkMode === 'live' ? '#7be4a3' : 'rgba(240,236,224,0.55)' }}>
                {talkMode === 'live' ? 'Audio aktiv' : 'Text-only'}
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 18px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(240,236,224,0.45)', marginBottom: 6 }}>
          <span>Dissens</span>
          <span>{dissensLabel(dissens)} · {dissens}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${dissens}%`, height: '100%', background: '#c8a45a', transition: 'width 260ms ease' }} />
        </div>
      </div>

      <div className="studio-session__main">
        <div className="studio-session__sidebar" id="studio-stage">
          <RelationshipLines
            relations={relations}
            personaIds={personas.map((p) => p.id)}
            containerId="studio-stage"
            activeSpeakerId={active?.id}
            activeColor={activeColor}
            interruptQueue={interruptQ}
          />
          <div className="studio-session__cards">
            {personas.map((p) => (
              <div key={p.id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 6 }}>
                  <PersonaTuningBar seat={p.id} accentColor={PERSONA_COLORS[p.id] ?? '#c8a45a'} />
                </div>
                <PersonaTensionCard
                  persona={p}
                  onMicroReactionExpired={clearMicroReaction}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="studio-session__feed-wrap">
          <div className="studio-session__feed" ref={feedRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`studio-msg studio-msg--${msg.role}`}>
                <div className="studio-msg__header">
                  <span className="studio-msg__name" style={{ color: msg.speakerColor }}>
                    {msg.speakerName}
                  </span>
                  {msg.role === 'moderator' && <span className="studio-msg__badge">Moderatorin</span>}
                </div>
                <div className="studio-msg__text">{msg.text}</div>
              </div>
            ))}
            {isLoading && (
              <div className="studio-msg studio-msg--loading">
                <div className="studio-msg__dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          <div className="studio-session__input-wrap">
            <textarea
              className="studio-session__textarea"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={speech.isListening ? 'Spreche oder tippe...' : 'Dein Beitrag zur Diskussion...'}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
            <button
              className="studio-session__send-btn"
              onClick={() => void handleSend()}
              disabled={!userInput.trim() || isLoading}
            >
              Senden
            </button>
          </div>
        </div>
      </div>

      {reportText && (
        <div className="studio-report-overlay" onClick={() => setReportText(null)}>
          <div className="studio-report" onClick={(e) => e.stopPropagation()}>
            <div className="studio-report__header">
              <span>Studio Report · {config.topic}</span>
              <button onClick={() => setReportText(null)}>✕</button>
            </div>
            <div className="studio-report__body">
              <pre>{reportText}</pre>
            </div>
          </div>
        </div>
      )}

      {showConsent && (
        <SpeechConsentDialog
          onAccept={handleConsentAccept}
          onCancel={handleConsentCancel}
        />
      )}
    </div>
  )
}
