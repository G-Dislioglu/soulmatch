import { useEffect } from 'react'
import { MicroReaction, MICRO_REACTION_SYMBOLS } from '../../../lib/emotionEngine'

interface Props {
  reaction: MicroReaction | null
  personaColor: string
  onExpired: () => void // nach 2.5s aufrufen
}

export function MicroReactionBadge({ reaction, personaColor, onExpired }: Props) {
  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(onExpired, 2500)
    return () => clearTimeout(timer)
  }, [reaction, onExpired])

  if (!reaction) return null

  return (
    <div
      className="micro-reaction"
      style={{ borderColor: `${personaColor}50`, background: `${personaColor}18` }}
    >
      {MICRO_REACTION_SYMBOLS[reaction]}
    </div>
  )
}
