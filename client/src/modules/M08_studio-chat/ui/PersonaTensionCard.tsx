import { PersonaTensionState, EMOTION_CONFIG } from '../../../lib/emotionEngine'
import { MicroReactionBadge } from './MicroReactions'

interface Props {
  persona: PersonaTensionState
  onMicroReactionExpired: (id: string) => void
}

export function PersonaTensionCard({ persona, onMicroReactionExpired }: Props) {
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
        padding: '10px 10px 8px',
        minWidth: 90,
        textAlign: 'center',
        zIndex: 1,
      }}
    >
      <MicroReactionBadge
        reaction={persona.microReaction ?? null}
        personaColor={em.color}
        onExpired={() => onMicroReactionExpired(persona.id)}
      />

      <div style={{ fontSize: 20, lineHeight: 1 }}>{persona.icon}</div>
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
