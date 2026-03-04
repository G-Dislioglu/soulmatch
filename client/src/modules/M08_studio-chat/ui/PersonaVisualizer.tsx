import { useEffect, useRef } from 'react'

interface PersonaVisualizerProps {
  analyserNode: AnalyserNode | null
  isActive: boolean
  color: string
  size?: number
}

function bandColor(i: number, total: number): string {
  const r = i / total
  if (r < 0.12) return '255,40,40'
  if (r < 0.28) return '255,110,30'
  if (r < 0.45) return '240,192,40'
  if (r < 0.65) return '80,220,140'
  if (r < 0.85) return '60,180,250'
  return '140,80,255'
}

export function PersonaVisualizer({ analyserNode, isActive, color, size = 80 }: PersonaVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const SLICES = 80
    const cx = size / 2
    const cy = size / 2
    const baseR = size * 0.28
    const bufSize = analyserNode ? analyserNode.frequencyBinCount : 128
    const buf = new Uint8Array(bufSize)

    function frame() {
      rafRef.current = requestAnimationFrame(frame)
      ctx!.clearRect(0, 0, size, size)

      if (!isActive || !analyserNode) {
        ctx!.beginPath()
        ctx!.arc(cx, cy, baseR, 0, Math.PI * 2)
        ctx!.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx!.lineWidth = 1
        ctx!.stroke()

        ctx!.beginPath()
        ctx!.arc(cx, cy, 4, 0, Math.PI * 2)
        ctx!.fillStyle = color + '30'
        ctx!.fill()
        return
      }

      analyserNode.getByteFrequencyData(buf)

      let energySum = 0
      for (let k = 0; k < 30; k++) energySum += (buf[k] ?? 0)
      const energy = energySum / (30 * 255)

      rotRef.current += 0.006 + energy * 0.045

      for (let i = 0; i < SLICES; i++) {
        const angle = (i / SLICES) * Math.PI * 2 + rotRef.current
        const fi = Math.floor((i / SLICES) * buf.length)
        const val = (buf[fi] ?? 0) / 255
        const spikeLen = baseR * 0.7 * val
        const alpha = 0.45 + val * 0.55

        ctx!.beginPath()
        ctx!.moveTo(cx + Math.cos(angle) * baseR, cy + Math.sin(angle) * baseR)
        ctx!.lineTo(
          cx + Math.cos(angle) * (baseR + spikeLen),
          cy + Math.sin(angle) * (baseR + spikeLen),
        )
        ctx!.strokeStyle = `rgba(${bandColor(i, SLICES)},${alpha})`
        ctx!.lineWidth = 1.5
        ctx!.stroke()
      }

      ctx!.shadowBlur = 20
      ctx!.shadowColor = color
      ctx!.beginPath()
      ctx!.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx!.fillStyle = color
      ctx!.fill()
      ctx!.shadowBlur = 0
    }

    frame()
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyserNode, isActive, color, size])

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block', width: size, height: size }} />
}
