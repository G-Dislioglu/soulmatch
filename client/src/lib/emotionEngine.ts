// ── TYPES ────────────────────────────────────────────────────────────────────

export type EmotionState = 'calm' | 'neutral' | 'engaged' | 'heated' | 'angry'

export interface EmotionConfig {
  color: string
  label: string
  oscSpeed: number
  ringPulseSpeed: number
}

export interface PersonaTensionState {
  id: string
  name: string
  icon: string
  emotion: EmotionState
  tension: number // 0-100
  speaking: boolean
  wantsInterrupt: boolean
  tensionHistory: number[] // last 10 values
  baseColor: string
  microReaction?: MicroReaction | null
}

export interface RelationTension {
  personaA: string
  personaB: string
  tension: number // 0-100
}

// Micro-Reaktionen für nicht-sprechende Personas
export type MicroReaction = 'agree' | 'disagree' | 'curious' | 'shocked' | 'amused'

export const MICRO_REACTION_SYMBOLS: Record<MicroReaction, string> = {
  agree: '👍',
  disagree: '⚡',
  curious: '❓',
  shocked: '😶',
  amused: '😌',
}

export const EMOTION_CONFIG: Record<EmotionState, EmotionConfig> = {
  calm: { color: '#4ecdc4', label: 'ruhig', oscSpeed: 0.8, ringPulseSpeed: 2.0 },
  neutral: { color: '#c8a45a', label: 'neutral', oscSpeed: 0.65, ringPulseSpeed: 1.8 },
  engaged: { color: '#e8a030', label: 'engaged', oscSpeed: 0.5, ringPulseSpeed: 1.4 },
  heated: { color: '#e06030', label: 'heated', oscSpeed: 0.34, ringPulseSpeed: 1.0 },
  angry: { color: '#d03020', label: 'wütend', oscSpeed: 0.17, ringPulseSpeed: 0.6 },
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

export function clampTension(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function smoothTension(prev: number, next: number, maxStep = 12): number {
  const p = clampTension(prev)
  const n = clampTension(next)
  const d = n - p
  if (Math.abs(d) <= maxStep) return n
  return clampTension(p + Math.sign(d) * maxStep)
}

export function isEmotionState(x: any): x is EmotionState {
  return ['calm', 'neutral', 'engaged', 'heated', 'angry'].includes(x)
}

export function isMicroReaction(x: any): x is MicroReaction {
  return ['agree', 'disagree', 'curious', 'shocked', 'amused'].includes(x)
}

// ── TENSION → EMOTION ────────────────────────────────────────────────────────

export function tensionToEmotion(tension: number): EmotionState {
  const t = clampTension(tension)
  if (t < 25) return 'calm'
  if (t < 45) return 'neutral'
  if (t < 65) return 'engaged'
  if (t < 82) return 'heated'
  return 'angry'
}

// ── HISTORY ──────────────────────────────────────────────────────────────────

export function pushTensionHistory(history: number[], value: number): number[] {
  const v = clampTension(value)
  const next = [...history, v]
  return next.length > 10 ? next.slice(-10) : next
}

// ── DISSENS ──────────────────────────────────────────────────────────────────

export function calcDissensScore(personas: PersonaTensionState[]): number {
  if (personas.length === 0) return 0
  const tensions = personas.map((p) => clampTension(p.tension))
  const avg = tensions.reduce((a, b) => a + b, 0) / tensions.length
  const maxDev = Math.max(...tensions.map((t) => Math.abs(t - avg)))
  return clampTension(avg * 0.5 + maxDev * 0.5)
}

export function dissensLabel(score: number): string {
  const s = clampTension(score)
  if (s < 20) return 'Einigkeit'
  if (s < 40) return 'Ruhig'
  if (s < 60) return 'Kontrovers'
  if (s < 80) return 'Erhitzt'
  return 'Konflikt'
}

export function dissensColor(score: number): string {
  const s = clampTension(score)
  if (s < 30) return '#4ecdc4'
  if (s < 55) return '#c8a45a'
  if (s < 75) return '#e06030'
  return '#d03020'
}

// ── AUDIENCE TRIGGER ─────────────────────────────────────────────────────────
// Welches Publikums-Event soll ausgelöst werden?

export type AudienceEvent =
  | 'murmur' // leises Murmeln – überraschendes Statement
  | 'laughter' // kurzes Lachen – trockener Witz
  | 'approval' // Zustimmungsraunen – starkes Argument
  | 'unrest' // Unruhe/Gemurmel – Dissens > 80%
  | 'applause' // kurzer Applaus – Maya fasst elegant zusammen

// Bestimmt automatisch das Audience-Event aus Kontext
export function inferAudienceEvent(
  dissensScore: number,
  speakerEmotion: EmotionState,
  turnText: string,
  isMayaSummary: boolean,
): AudienceEvent | null {
  if (isMayaSummary && dissensScore < 50) return 'applause'
  if (dissensScore > 80 && speakerEmotion === 'angry') return 'unrest'

  const textLower = turnText.toLowerCase()
  const jokeSignals = ['ironie', 'sarkasmus', 'scherz', 'lachen', 'lustig', 'witzig', '😄', 'aber mal ehrlich']
  const approvalSignals = ['genau', 'präzise', 'richtig', 'treffend', 'das ist der kern', 'gut gesagt']
  const surpriseSignals = ['überraschend', 'unerwartet', 'das war', 'moment mal', 'halt']

  if (jokeSignals.some((w) => textLower.includes(w)) && speakerEmotion !== 'angry') return 'laughter'
  if (approvalSignals.some((w) => textLower.includes(w))) return 'approval'
  if (surpriseSignals.some((w) => textLower.includes(w))) return 'murmur'

  // Sporadisch bei emotional aufgeladenen Turns
  if (speakerEmotion === 'angry' && Math.random() < 0.35) return 'unrest'
  if (speakerEmotion === 'heated' && Math.random() < 0.2) return 'murmur'

  return null
}

// ── LLM META CONTRACT v1.1 ───────────────────────────────────────────────────

export interface PersonaMicroReactionMeta {
  personaId: string
  reaction: MicroReaction
}

export interface LLMTurnMeta {
  speakerId: string
  speakerName?: string
  emotion?: EmotionState
  tension?: number
  interruptQueue?: string[]
  relationUpdates?: { with: string; tension: number }[]
  // v1.2 additions:
  audienceEvent?: AudienceEvent // Server kann explizit angeben
  microReactions?: PersonaMicroReactionMeta[] // Reaktionen anderer Personas
}

export function parseTurnMeta(raw: any): LLMTurnMeta | null {
  if (!raw) return null
  const speakerId = String(raw.speakerId ?? raw.speaker ?? '').trim()
  if (!speakerId) return null

  const speakerName = typeof raw.speakerName === 'string' ? raw.speakerName.trim() : undefined
  const tensionNum = typeof raw.tension === 'number' ? raw.tension : Number(raw.tension)
  const tension = Number.isFinite(tensionNum) ? clampTension(tensionNum) : undefined
  const emotion = isEmotionState(raw.emotion) ? raw.emotion : undefined

  const irqRaw = raw.interruptQueue ?? (raw.nextInterrupt ? [raw.nextInterrupt] : undefined)
  const interruptQueue = Array.isArray(irqRaw)
    ? irqRaw.filter((x: any) => typeof x === 'string').map((s: string) => s.trim()).filter(Boolean)
    : undefined

  const ruRaw = raw.relationUpdates
  const relationUpdates = Array.isArray(ruRaw)
    ? ruRaw
        .map((x: any) => ({
          with: typeof x?.with === 'string' ? x.with.trim() : '',
          tension: clampTension(Number(x?.tension ?? 0)),
        }))
        .filter((x: any) => !!x.with)
    : undefined

  const audienceEvent = raw.audienceEvent ?? undefined

  const mrRaw = raw.microReactions
  const microReactions = Array.isArray(mrRaw)
    ? mrRaw.filter((x: any) => x?.personaId && isMicroReaction(x?.reaction))
    : undefined

  return {
    speakerId,
    speakerName,
    tension,
    emotion,
    interruptQueue,
    relationUpdates,
    audienceEvent,
    microReactions,
  }
}
