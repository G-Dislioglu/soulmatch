import { PersonaTensionState, EMOTION_CONFIG } from '../../../lib/emotionEngine'
import { MicroReactionBadge } from './MicroReactions'
import { PersonaVisualizer } from './PersonaVisualizer'

interface Props {
  persona: PersonaTensionState
  onMicroReactionExpired: (id: string) => void
  analyserNode?: AnalyserNode | null
  isSpeaking?: boolean
}

export function PersonaTensionCard({ persona, onMicroReactionExpired, analyserNode, isSpeaking }: Props) {
  const em = EMOTION_CONFIG[persona.emotion]
  const cardClass = `persona-tension-card${persona.speaking ? ' speaking' : ''}${persona.wantsInterrupt ? ' wants-interrupt' : ''}`

  return (
    <div
      id={`ptc-${persona.id}`}
      className={cardClass}
      style={{
        position: 'relative',
        border: `1px solid ${em.color}66`,
        borderRadius: 12,
        background: `${em.color}14`,
        padding: '6px 4px 6px',
        minWidth: 80,
        textAlign: 'center',
        zIndex: 1,
      }}
    >
      <MicroReactionBadge
        reaction={persona.microReaction ?? null}
        personaColor={em.color}
        onExpired={() => onMicroReactionExpired(persona.id)}
      />

      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
        <PersonaVisualizer
          analyserNode={analyserNode ?? null}
          isActive={!!isSpeaking}
          color={em.color}
          size={80}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}>
          {persona.icon}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#f0eadc', marginTop: 2 }}>{persona.name}</div>
      <div style={{ fontSize: 10, color: em.color, marginTop: 2 }}>{em.label}</div>
      <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${persona.tension}%`,
            height: '100%',
            background: em.color,
            transition: 'width 240ms ease',
          }}
        />
      </div>
    </div>
  )
}
