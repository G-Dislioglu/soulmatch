import { useState } from 'react'
import {
  PERSONA_COLORS,
  PERSONA_ICONS,
  PERSONA_NAMES,
} from '../lib/personaColors'
import { PersonaTuningBar } from './PersonaTuningBar'

export type DebateMode = 'kontrovers' | 'sokratisch' | 'offen'
export type TalkMode = 'live' | 'text'

export interface StudioConfig {
  topic: string
  selectedPersonaIds: string[] // 2–3, ohne Maya
  mode: DebateMode
  talkMode: TalkMode
}

interface Props {
  onStart: (config: StudioConfig) => void
}

const AVAILABLE_PERSONAS = Object.keys(PERSONA_NAMES)
  .filter((id) => id !== 'maya')
  .map((id) => ({
    id,
    name: PERSONA_NAMES[id] ?? id,
    symbol: PERSONA_ICONS[id] ?? '○',
    color: PERSONA_COLORS[id] ?? '#888888',
  }))

const DEBATE_MODES = [
  { id: 'kontrovers' as DebateMode, label: 'Kontrovers', desc: 'Gegensätze, echte Konflikte', icon: '⚡' },
  { id: 'sokratisch' as DebateMode, label: 'Sokratisch', desc: 'Fragen führen zur Wahrheit', icon: '🔍' },
  { id: 'offen' as DebateMode, label: 'Offen', desc: 'Freie Entwicklung, kein Ziel', icon: '◉' },
]

const TOPIC_SUGGESTIONS = [
  'Ist freier Wille eine Illusion?',
  'Macht vs. Moral – was bleibt?',
  'Gibt es eine Seele?',
  'Liebe – Schwäche oder Stärke?',
  'Ist Gott tot?',
  'Der Sinn des Leidens',
]

export function StudioSetup({ onStart }: Props) {
  const [topic, setTopic] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<DebateMode>('kontrovers')
  const [talkMode, setTalkMode] = useState<TalkMode>('text')

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    )
  }

  const canStart = topic.trim().length > 2 && selected.length >= 2

  return (
    <div className="ss">
      <div className="ss__header">
        <div className="ss__badge">◈ Studio Modus</div>
        <h1 className="ss__title">Bestimme das Thema.</h1>
        <p className="ss__sub">Maya moderiert · Du wählst die Stimmen</p>
      </div>

      <div className="ss__section">
        <div className="ss__label">Thema der Runde</div>
        <input
          className="ss__input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Was bewegt dich wirklich?"
          maxLength={140}
        />
        <div className="ss__chips">
          {TOPIC_SUGGESTIONS.map((t) => (
            <button key={t} className="ss__chip" onClick={() => setTopic(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="ss__section">
        <div className="ss__label-row">
          <span className="ss__label">Teilnehmer wählen</span>
          <span className="ss__hint">{selected.length}/3 · Maya moderiert immer</span>
        </div>
        <div className="ss__personas">
          <div className="ss__persona ss__persona--fixed" style={{ position: 'relative' }}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }}
            >
              <PersonaTuningBar
                seat="maya"
                accentColor={PERSONA_COLORS.maya ?? '#c8a45a'}
              />
            </div>
            <div
              className="ss__persona-avatar"
              style={{
                borderColor: (PERSONA_COLORS.maya ?? '#c8a45a') + '88',
                color: PERSONA_COLORS.maya ?? '#c8a45a',
              }}
            >
              {PERSONA_ICONS.maya ?? '◇'}
            </div>
            <div
              className="ss__persona-name"
              style={{ color: PERSONA_COLORS.maya ?? '#c8a45a' }}
            >
              {PERSONA_NAMES.maya ?? 'Maya'}
            </div>
            <div className="ss__persona-role">Moderatorin</div>
            <div className="ss__persona-fixed-badge">immer dabei</div>
          </div>

          {AVAILABLE_PERSONAS.map((p) => {
            const sel = selected.includes(p.id)
            return (
              <div
                key={p.id}
                className={`ss__persona ${sel ? 'ss__persona--selected' : ''}`}
                style={sel ? { borderColor: p.color + '60', background: p.color + '12' } : {}}
                onClick={() => toggle(p.id)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }}
                >
                  <PersonaTuningBar seat={p.id} accentColor={p.color} />
                </div>
                {sel && (
                  <div className="ss__persona-check" style={{ background: p.color }}>✓</div>
                )}
                <div
                  className="ss__persona-avatar"
                  style={{ borderColor: p.color + '50', color: p.color, background: p.color + '18' }}
                >
                  {p.symbol}
                </div>
                <div className="ss__persona-name" style={{ color: sel ? p.color : undefined }}>
                  {p.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="ss__section">
        <div className="ss__label">Gesprächsmodus vor Start</div>
        <div className="ss__modes" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <button
            type="button"
            className={`ss__mode ${talkMode === 'text' ? 'ss__mode--selected' : ''}`}
            onClick={() => setTalkMode('text')}
          >
            <span className="ss__mode-icon">⌨️</span>
            <span className="ss__mode-label">Text Talk</span>
            <span className="ss__mode-desc">Ohne Mikrofon, ohne Audio</span>
          </button>
          <button
            type="button"
            className={`ss__mode ${talkMode === 'live' ? 'ss__mode--selected' : ''}`}
            onClick={() => setTalkMode('live')}
          >
            <span className="ss__mode-icon">🎙️</span>
            <span className="ss__mode-label">Live Talk</span>
            <span className="ss__mode-desc">Mit Mikrofon + Audioausgabe</span>
          </button>
        </div>
      </div>

      <div className="ss__section">
        <div className="ss__label">Diskussions-Modus</div>
        <div className="ss__modes">
          {DEBATE_MODES.map((m) => (
            <div
              key={m.id}
              className={`ss__mode ${mode === m.id ? 'ss__mode--selected' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span className="ss__mode-icon">{m.icon}</span>
              <span className="ss__mode-label">{m.label}</span>
              <span className="ss__mode-desc">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        className={`ss__start ${!canStart ? 'ss__start--disabled' : ''}`}
        disabled={!canStart}
        onClick={() => canStart && onStart({ topic: topic.trim(), selectedPersonaIds: selected, mode, talkMode })}
      >
        ✦ Studio starten
      </button>
      {!canStart && (
        <p className="ss__start-hint">
          {!topic.trim() ? 'Thema eingeben' : 'Mindestens 2 Personas wählen'}
        </p>
      )}
    </div>
  )
}
