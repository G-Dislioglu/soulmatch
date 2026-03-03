import { useState, useEffect, useRef, useCallback } from 'react'
import { StudioConfig } from './StudioSetup'
import { PersonaTensionCard } from './PersonaTensionCard'
import { RelationshipLines } from './RelationshipLines'
import { useSpeechToText } from '../../../hooks/useSpeechToText'
import { SpeechConsentDialog } from './SpeechConsentDialog'
import { usePersonaTension } from '../../../hooks/usePersonaTension'
import {
  EMOTION_CONFIG,
  inferAudienceEvent,
  calcDissensScore,
  dissensLabel,
  type EmotionState,
} from '../../../lib/emotionEngine'
import {
  playAudienceEvent,
  setAudienceEnabled,
} from '../../../lib/audienceEngine'
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
  const [audienceOn, setAudienceOn] = useState(true)
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
  const autoRoundsSinceUserRef = useRef(0)
  const errorCountRef = useRef(0)
  const MAX_ERRORS = 2
  const MAX_AUTO_ROUNDS = 10

  const speech = useSpeechToText('de', (text) => {
    const spoken = text.trim()
    if (!spoken) return
    void handleSend(spoken)
  })

  const discussPersonas = Array.from(new Set(['maya', ...config.selectedPersonaIds.filter((id) => id !== 'maya')])).slice(0, 3)
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
    void runTurn()
    return () => {
      isMountedRef.current = false
      runningRef.current = false
      isContinuousModeRef.current = false
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      }
      speech.setPlaybackActive(false)
      speech.stopContinuous()
    }
  }, [])

  useEffect(() => {
    if (speech.transcript.length > 0) {
      setUserInput(speech.transcript)
    }
  }, [speech.transcript])

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

  async function callDiscuss(userMessage?: string) {
    const isAutoTurn = typeof userMessage !== 'string'
    const allowUserCheckIn = isAutoTurn && turnRef.current > 0 && turnRef.current % 4 === 0
    const message = userMessage
      ?? (turnRef.current === 0
        ? `Studio-Diskussion starten. Thema: ${config.topic}. Maya moderiert. Der User beobachtet nur.`
        : allowUserCheckIn
        ? `Setzt die Studio-Diskussion intern fort. Fokus bleibt strikt auf dem Thema "${config.topic}". Maya moderiert und fragt am Ende dieser Runde den User genau einmal kurz nach seiner Sicht.`
        : `Setzt die Studio-Diskussion intern fort. Fokus bleibt strikt auf dem Thema "${config.topic}". Maya moderiert.`)

    const body = {
      personas: discussPersonas,
      message,
      conversationHistory: messages.slice(-12).map((m) => ({
        role: m.speakerId === 'user' ? 'user' : 'assistant',
        content: `${m.speakerName}: ${m.text}`,
      })),
      end_session: false,
      stream: false,
      audioMode: speech.isContinuousMode,

      studioMode: true,
      topic: config.topic,
      debateMode: config.mode,
      turn: turnRef.current,
      autoTurn: isAutoTurn,
      allowUserCheckIn,
    }

    const res = await fetch('/api/discuss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error('API ' + res.status)
    return res.json() as Promise<{
      responses: PersonaResponse[]
      creditsUsed: number
    }>
  }

  const generateReport = useCallback(async () => {
    if (isGeneratingReport) return
    setIsGeneratingReport(true)
    setReportText('Report wird generiert...')

    try {
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
          audioMode: speech.isContinuousMode,
          studioMode: true,
          topic: config.topic,
          debateMode: config.mode,
          turn: turnRef.current,
          autoTurn: true,
        }),
      })

      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json() as { responses?: PersonaResponse[] }
      const maya = (data.responses ?? []).find((r) => r.persona === 'maya') ?? data.responses?.[0]
      if (!maya) {
        setReportText('Kein Report verfügbar.')
        return
      }

      setReportText(maya.text)
      const reportAudio = getAudioUrlFromResponse(maya)
      if (reportAudio && speech.isContinuousMode) {
        void playPersonaAudio(reportAudio)
      }
    } catch (err) {
      setReportText(err instanceof Error ? err.message : 'Report konnte nicht erzeugt werden.')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [config.mode, config.topic, isGeneratingReport, messages, playPersonaAudio, speech.isContinuousMode])

  async function runTurn(userMessage?: string) {
    if (runningRef.current) return
    if (errorCountRef.current >= MAX_ERRORS && !userMessage) return

    runningRef.current = true
    setIsLoading(true)

    try {
      const data = await callDiscuss(userMessage)
      const responses = data.responses ?? []

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

          if (evt && audienceOn) {
            setTimeout(() => playAudienceEvent(evt as Parameters<typeof playAudienceEvent>[0]), 700)
          }
        }

        if (speech.isContinuousMode) {
          await playPersonaAudio(audioUrl)
        }
        await sleep(320)
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
        setTimeout(() => {
          void runTurn()
        }, speech.isContinuousMode ? 2100 : 2600)
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
    await runTurn(text)
  }, [isLoading, runTurn, speech, userInput])

  function handleToggleLiveTalk() {
    if (speech.isContinuousMode) {
      isContinuousModeRef.current = false
      shouldResumeSpeechAfterAudioRef.current = false
      speech.stopContinuous()
      return
    }

    if (!speech.hasConsent) {
      setShowConsent(true)
      return
    }

    isContinuousModeRef.current = true
    speech.startContinuous()
  }

  function handleConsentAccept() {
    speech.grantConsent()
    setShowConsent(false)
    isContinuousModeRef.current = true
    speech.startContinuous()
  }

  function handleConsentCancel() {
    setShowConsent(false)
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
            onClick={() => {
              const n = !audienceOn
              setAudienceOn(n)
              setAudienceEnabled(n)
            }}
          >
            {audienceOn ? '🔊' : '🔇'} Publikum
          </button>
          <button
            className="studio-session__ctrl-btn"
            onClick={() => void generateReport()}
            disabled={isGeneratingReport}
          >
            {isGeneratingReport ? '⏳ Report...' : '📋 Report'}
          </button>
          {speech.isSupported && (
            <button
              className="studio-session__ctrl-btn"
              onClick={handleToggleLiveTalk}
              style={{
                border: speech.isContinuousMode
                  ? '2px solid rgba(34,197,94,0.65)'
                  : speech.micBlocked
                  ? '1px solid rgba(239,68,68,0.65)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: speech.isContinuousMode
                  ? 'rgba(34,197,94,0.16)'
                  : speech.micBlocked
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(255,255,255,0.04)',
                color: speech.isContinuousMode
                  ? '#22c55e'
                  : speech.micBlocked
                  ? '#f87171'
                  : '#d8c69f',
                fontWeight: speech.isContinuousMode ? 700 : 500,
              }}
            >
              🎙️ Live Talk
            </button>
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
              <PersonaTensionCard
                key={p.id}
                persona={p}
                onMicroReactionExpired={clearMicroReaction}
              />
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
