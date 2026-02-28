import { useState, useCallback } from 'react'
import {
  PersonaTensionState,
  RelationTension,
  EmotionState,
  MicroReaction,
  tensionToEmotion,
  pushTensionHistory,
  parseTurnMeta,
  clampTension,
  smoothTension,
} from '../lib/emotionEngine'

interface InitPersona {
  id: string
  name: string
  icon: string
  baseColor: string
  baseTension?: number
}

export function usePersonaTension(initPersonas: InitPersona[]) {
  const [personas, setPersonas] = useState<PersonaTensionState[]>(
    initPersonas.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      baseColor: p.baseColor,
      emotion: 'calm' as EmotionState,
      tension: clampTension(p.baseTension ?? 30),
      speaking: false,
      wantsInterrupt: false,
      tensionHistory: [clampTension(p.baseTension ?? 30)],
      microReaction: null,
    })),
  )

  const [relations, setRelations] = useState<RelationTension[]>([])

  // Atomarer State-Update – NUR 1× setPersonas pro Turn
  const applyTurn = useCallback((rawMeta: any) => {
    const meta = parseTurnMeta(rawMeta)
    if (!meta) return

    setPersonas((prev) => {
      const speakerId = meta.speakerId
      const interruptSet = new Set((meta.interruptQueue ?? []).filter((x) => x && x !== speakerId))

      // Micro-Reactions map: personaId → reaction
      const microMap = new Map<string, MicroReaction>()
      ;(meta.microReactions ?? []).forEach((mr) => {
        if (mr.personaId !== speakerId) microMap.set(mr.personaId, mr.reaction)
      })

      return prev.map((p) => {
        if (p.id === speakerId) {
          const targetT = meta.tension ?? p.tension
          const smoothedT = smoothTension(p.tension, targetT, 12)
          const emo = meta.emotion ?? tensionToEmotion(smoothedT)
          const hist = pushTensionHistory(p.tensionHistory, smoothedT)
          return {
            ...p,
            name: meta.speakerName ?? p.name,
            tension: smoothedT,
            emotion: emo,
            tensionHistory: hist,
            speaking: true,
            wantsInterrupt: false,
            microReaction: null,
          }
        }

        return {
          ...p,
          speaking: false,
          wantsInterrupt: interruptSet.has(p.id),
          microReaction: microMap.get(p.id) ?? null,
        }
      })
    })

    // Relations updaten
    if (meta.relationUpdates && meta.relationUpdates.length > 0) {
      setRelations((prev) => {
        const updated = [...prev]
        meta.relationUpdates!.forEach((ru) => {
          const a = meta.speakerId
          const b = ru.with
          const key1 = `${a}-${b}`
          const key2 = `${b}-${a}`
          const idx = updated.findIndex((r) => `${r.personaA}-${r.personaB}` === key1 || `${r.personaA}-${r.personaB}` === key2)
          const nextT = clampTension(ru.tension)
          if (idx >= 0 && updated[idx]) updated[idx] = { ...updated[idx], tension: nextT }
          else updated.push({ personaA: a, personaB: b, tension: nextT })
        })
        return updated
      })
    }
  }, [])

  const setInterrupt = useCallback((personaId: string, wants: boolean) => {
    setPersonas((prev) => prev.map((p) => (p.id === personaId ? { ...p, wantsInterrupt: wants } : p)))
  }, [])

  const clearSpeaking = useCallback(() => {
    setPersonas((prev) => prev.map((p) => ({ ...p, speaking: false, wantsInterrupt: false, microReaction: null })))
  }, [])

  // Micro-Reactions nach Timeout löschen (auto-clear nach 2.5s)
  const clearMicroReaction = useCallback((personaId: string) => {
    setPersonas((prev) => prev.map((p) => (p.id === personaId ? { ...p, microReaction: null } : p)))
  }, [])

  return { personas, relations, applyTurn, setInterrupt, clearSpeaking, clearMicroReaction }
}
