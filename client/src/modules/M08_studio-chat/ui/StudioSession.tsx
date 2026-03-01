import { useState, useEffect, useRef } from 'react'
import { StudioConfig } from './StudioSetup'
import { PersonaTensionCard } from './PersonaTensionCard'
import { RelationshipLines } from './RelationshipLines'
import { usePersonaTension } from '../../../hooks/usePersonaTension'
import {
  EMOTION_CONFIG,
  inferAudienceEvent,
  calcDissensScore,
  dissensLabel,
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

interface Props {
  config: StudioConfig
  onBack: () => void
}

export function StudioSession({ config, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const [userHasWord, setUserHasWord] = useState(false)
  const [audienceOn, setAudienceOn] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [reportText, setReportText] = useState<string | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)
  const turnRef = useRef(0)
  const runningRef = useRef(false)
  const errorCountRef = useRef(0)
  const MAX_ERRORS = 2

  const activeIds = ['maya', ...config.selectedPersonaIds]
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
    void runTurn()
    return () => {
      runningRef.current = false
    }
  }, [])

  function addMessage(msg: Omit<Message, 'id'>) {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: Date.now().toString(36) + Math.random().toString(36).slice(2) },
    ])
  }

  async function callDiscuss(userMessage?: string) {
    const message = userMessage
      ?? (turnRef.current === 0
        ? `Studio-Diskussion starten. Thema: ${config.topic}`
        : 'Weiter')

    const body = {
      personas: config.selectedPersonaIds,
      message,
      conversationHistory: messages.slice(-12).map((m) => ({
        role: m.speakerId === 'user' ? 'user' : 'assistant',
        content: `${m.speakerName}: ${m.text}`,
      })),
      end_session: false,
      stream: false,
      audioMode: false,

      studioMode: true,
      topic: config.topic,
      debateMode: config.mode,
      turn: turnRef.current,
    }

    const res = await fetch('/api/discuss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error('API ' + res.status)
    return res.json() as Promise<{
      responses: Array<{ persona: string; text: string; color: string; meta?: any }>
      creditsUsed: number
    }>
  }

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
        const speakerId = resp.persona
        const speakerName = PERSONA_NAMES[speakerId] ?? speakerId
        const speakerColor = PERSONA_COLORS[speakerId] ?? resp.color ?? '#888'
        const text = resp.text ?? ''
        const meta = resp.meta ?? null

        addMessage({
          speakerId,
          speakerName,
          speakerColor,
          text,
          role: speakerId === 'maya' ? 'moderator' : 'persona',
        })

        if (meta) {
          applyTurn({ ...meta, speakerId: meta.speakerId ?? speakerId })

          const evt =
            meta.audienceEvent ??
            inferAudienceEvent(
              calcDissensScore(personas),
              meta.emotion ?? 'neutral',
              text,
              speakerId === 'maya' && text.length > 100,
            )

          if (evt && audienceOn) {
            setTimeout(() => playAudienceEvent(evt), 700)
          }
        }
      }

      turnRef.current++
      setIsLoading(false)
      clearSpeaking()
      runningRef.current = false

      if (!userHasWord) {
        setTimeout(() => {
          void runTurn()
        }, 3000)
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

  function handleSend() {
    const text = userInput.trim()
    if (!text || isLoading) return

    addMessage({
      speakerId: 'user',
      speakerName: 'Du',
      speakerColor: '#ffffff',
      text,
      role: 'user',
    })

    setUserInput('')
    setUserHasWord(false)
    void runTurn(text)
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
            onClick={() => setReportText('Report wird generiert...')}
          >
            📋 Report
          </button>
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
            {userHasWord ? (
              <>
                <textarea
                  className="studio-session__textarea"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Dein Beitrag zur Diskussion..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <button
                  className="studio-session__send-btn"
                  onClick={handleSend}
                  disabled={!userInput.trim() || isLoading}
                >
                  Senden
                </button>
                <button
                  className="studio-session__cancel-btn"
                  onClick={() => setUserHasWord(false)}
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <button
                className="studio-session__wort-btn"
                onClick={() => setUserHasWord(true)}
              >
                ✋ Wort ergreifen
              </button>
            )}
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
    </div>
  )
}
