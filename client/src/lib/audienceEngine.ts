/**
 * Audience Engine – Zuschauer-Reaktionen via Web Audio API
 *
 * KOSTEN: 0€ – alles prozedural im Browser.
 * Kein API-Call, kein externes File, kein Server.
 *
 * Wie es funktioniert:
 * - Web Audio API erzeugt weißes Rauschen
 * - BiquadFilter formt es zu Murmeln/Lachen/Applaus
 * - GainNode steuert Lautstärke-Kurve (Envelope)
 * - Alles wird nach < 5 Sekunden automatisch gestoppt
 */

import { AudienceEvent } from './emotionEngine'

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let enabled = true // User kann deaktivieren

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.18 // Dezent – nie aufdringlich
    masterGain.connect(audioCtx.destination)
  }
  return audioCtx
}

function createNoise(ctx: AudioContext, durationSec: number): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * durationSec
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  return src
}

function envelope(
  gainNode: GainNode,
  startTime: number,
  attackTime: number,
  sustainTime: number,
  releaseTime: number,
  peakGain: number,
) {
  const g = gainNode.gain
  g.setValueAtTime(0, startTime)
  g.linearRampToValueAtTime(peakGain, startTime + attackTime)
  g.setValueAtTime(peakGain, startTime + attackTime + sustainTime)
  g.linearRampToValueAtTime(0, startTime + attackTime + sustainTime + releaseTime)
}

// ── EVENT PLAYER ─────────────────────────────────────────────────────────────

function playMurmur() {
  if (!enabled) return
  const ctx = getCtx()
  const now = ctx.currentTime

  // Leises Murmeln: mittlere Sprachfrequenzen statt tiefer "Meereswelle"
  const noise = createNoise(ctx, 2.2)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 720
  filter.Q.value = 3.2

  // Kürzere, lebendigere Bewegung in Sprachbereichen
  filter.frequency.setValueAtTime(640, now)
  filter.frequency.linearRampToValueAtTime(900, now + 0.8)
  filter.frequency.linearRampToValueAtTime(760, now + 1.6)
  filter.frequency.linearRampToValueAtTime(680, now + 2.1)

  const gain = ctx.createGain()
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain!)

  envelope(gain, now, 0.08, 1.55, 0.55, 0.7)
  noise.start(now)
  noise.stop(now + 2.2)
}

function playLaughter() {
  if (!enabled) return
  const ctx = getCtx()
  const now = ctx.currentTime

  // Lachen: 3-4 kurze Bursts mit leicht verschiedenen Frequenzen
  const burstCount = 3 + Math.floor(Math.random() * 2)
  for (let i = 0; i < burstCount; i++) {
    const offset = i * 0.22
    const noise = createNoise(ctx, 0.18)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 650 + Math.random() * 200 // leichte Variation
    filter.Q.value = 3.5

    const gain = ctx.createGain()
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(masterGain!)

    envelope(gain, now + offset, 0.03, 0.08, 0.07, 0.7 + Math.random() * 0.3)
    noise.start(now + offset)
    noise.stop(now + offset + 0.25)
  }
}

function playApproval() {
  if (!enabled) return
  const ctx = getCtx()
  const now = ctx.currentTime

  // Zustimmungsraunen: wärmer, tiefer als Murmeln, kurz anschwellend
  const noise = createNoise(ctx, 2.5)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 420
  filter.Q.value = 2.0

  const gain = ctx.createGain()
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain!)

  envelope(gain, now, 0.2, 1.4, 0.8, 1.1)
  noise.start(now)
  noise.stop(now + 2.5)
}

function playUnrest() {
  if (!enabled) return
  const ctx = getCtx()
  const now = ctx.currentTime

  // Unruhe: kürzere, nervösere Sprachcluster statt langes Low-End-Rauschen
  for (let i = 0; i < 3; i++) {
    const noise = createNoise(ctx, 1.4)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = i === 0 ? 620 : i === 1 ? 980 : 1320
    filter.Q.value = 3.0

    // Leichte, schnelle Schwankungen simulieren aufgeregte Zwischenrufe
    const start = now + i * 0.12
    filter.frequency.setValueAtTime(filter.frequency.value, start)
    filter.frequency.linearRampToValueAtTime(filter.frequency.value + 140, start + 0.45)
    filter.frequency.linearRampToValueAtTime(filter.frequency.value - 90, start + 0.9)

    const gain = ctx.createGain()
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(masterGain!)

    envelope(gain, start, 0.04, 0.85, 0.45, i === 0 ? 0.6 : i === 1 ? 0.48 : 0.4)
    noise.start(start)
    noise.stop(start + 1.35)
  }
}

function playApplause() {
  if (!enabled) return
  const ctx = getCtx()
  const now = ctx.currentTime

  // Applaus: breites Rauschen, hoher Frequenzbereich, klatschen-typisches Profil
  const noise = createNoise(ctx, 4.0)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1800
  filter.Q.value = 1.2

  const noise2 = createNoise(ctx, 4.0)
  const filter2 = ctx.createBiquadFilter()
  filter2.type = 'bandpass'
  filter2.frequency.value = 900
  filter2.Q.value = 1.5

  const gain = ctx.createGain()
  const gain2 = ctx.createGain()
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain!)
  noise2.connect(filter2)
  filter2.connect(gain2)
  gain2.connect(masterGain!)

  // Kurz anschwellen dann abflauen (höflicher kurzer Applaus)
  envelope(gain, now, 0.15, 1.8, 1.5, 1.0)
  envelope(gain2, now, 0.15, 1.8, 1.5, 0.7)

  noise.start(now)
  noise.stop(now + 4.0)
  noise2.start(now)
  noise2.stop(now + 4.0)
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export function playAudienceEvent(event: AudienceEvent): void {
  if (!enabled) return
  try {
    // AudioContext resume (Browser-Policy erfordert User-Gesture)
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    switch (event) {
      case 'murmur':
        playMurmur()
        break
      case 'laughter':
        playLaughter()
        break
      case 'approval':
        playApproval()
        break
      case 'unrest':
        playUnrest()
        break
      case 'applause':
        playApplause()
        break
    }
  } catch (err) {
    // Audio-Fehler sollen nie den Chat blockieren
    console.warn('[audienceEngine]', err)
  }
}

export function setAudienceEnabled(on: boolean): void {
  enabled = on
}

export function isAudienceEnabled(): boolean {
  return enabled
}

// Master-Lautstärke (0.0 - 1.0)
export function setAudienceVolume(vol: number): void {
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, vol)) * 0.3
  }
}
