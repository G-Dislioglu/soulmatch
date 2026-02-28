import { useEffect, useRef } from 'react'
import { RelationTension } from '../../../lib/emotionEngine'

interface Props {
  relations: RelationTension[]
  personaIds: string[]
  containerId: string
  activeSpeakerId?: string
  activeColor?: string
  interruptQueue?: string[]
}

export function RelationshipLines({
  relations,
  personaIds,
  containerId,
  activeSpeakerId,
  activeColor,
  interruptQueue,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number | null>(null)

  function getCenter(id: string) {
    const card = document.getElementById(`ptc-${id}`)
    const wrap = document.getElementById(containerId)
    if (!card || !wrap) return null
    const cr = card.getBoundingClientRect()
    const sr = wrap.getBoundingClientRect()
    return { x: cr.left - sr.left + cr.width / 2, y: cr.top - sr.top + cr.height / 2 }
  }

  function ns<T extends keyof SVGElementTagNameMap>(tag: T) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag)
  }

  function drawBaton(c: { x: number; y: number }, color: string) {
    const svg = svgRef.current
    if (!svg) return
    const g = ns('g')
    g.setAttribute('opacity', '0.95')

    // Outer pulsing ring
    const outer = ns('circle')
    outer.setAttribute('cx', String(c.x))
    outer.setAttribute('cy', String(c.y))
    outer.setAttribute('r', '14')
    outer.setAttribute('fill', 'none')
    outer.setAttribute('stroke', color)
    outer.setAttribute('stroke-width', '1.8')
    outer.setAttribute('opacity', '0.55')
    const anim = ns('animate')
    anim.setAttribute('attributeName', 'opacity')
    anim.setAttribute('values', '0.55;0.18;0.55')
    anim.setAttribute('dur', '0.9s')
    anim.setAttribute('repeatCount', 'indefinite')
    outer.appendChild(anim)

    // Glow fill
    const glow = ns('circle')
    glow.setAttribute('cx', String(c.x))
    glow.setAttribute('cy', String(c.y))
    glow.setAttribute('r', '10')
    glow.setAttribute('fill', color)
    glow.setAttribute('opacity', '0.10')

    // Center dot
    const inner = ns('circle')
    inner.setAttribute('cx', String(c.x))
    inner.setAttribute('cy', String(c.y))
    inner.setAttribute('r', '5')
    inner.setAttribute('fill', color)
    inner.setAttribute('opacity', '0.85')

    // label
    const txt = ns('text')
    txt.setAttribute('x', String(c.x + 18))
    txt.setAttribute('y', String(c.y - 14))
    txt.setAttribute('font-size', '12')
    txt.setAttribute('fill', color)
    txt.setAttribute('opacity', '0.9')
    txt.setAttribute('font-family', 'DM Sans, sans-serif')
    txt.textContent = '🎙'

    g.appendChild(glow)
    g.appendChild(outer)
    g.appendChild(inner)
    g.appendChild(txt)
    svgRef.current!.appendChild(g)
  }

  function drawInterruptMarkers(queue: string[]) {
    const svg = svgRef.current
    if (!svg) return
    queue.forEach((id, idx) => {
      const c = getCenter(id)
      if (!c) return
      const g = ns('g')

      // Shiver animation
      const shake = ns('animateTransform')
      shake.setAttribute('attributeName', 'transform')
      shake.setAttribute('type', 'translate')
      shake.setAttribute('values', '0 0;-1 0;1 0;0 0')
      shake.setAttribute('dur', '0.22s')
      shake.setAttribute('repeatCount', 'indefinite')
      g.appendChild(shake)

      // Badge circle
      const badge = ns('circle')
      badge.setAttribute('cx', String(c.x + 22))
      badge.setAttribute('cy', String(c.y - 20))
      badge.setAttribute('r', '8')
      badge.setAttribute('fill', 'rgba(255,255,255,0.08)')
      badge.setAttribute('stroke', 'rgba(255,255,255,0.22)')
      badge.setAttribute('stroke-width', '1')

      // Queue number
      const txt = ns('text')
      txt.setAttribute('x', String(c.x + 22))
      txt.setAttribute('y', String(c.y - 16))
      txt.setAttribute('text-anchor', 'middle')
      txt.setAttribute('font-size', '9')
      txt.setAttribute('fill', 'rgba(255,255,255,0.85)')
      txt.setAttribute('font-family', 'DM Sans')
      txt.textContent = String(idx + 1)

      g.appendChild(badge)
      g.appendChild(txt)
      svg.appendChild(g)
    })
  }

  function redrawNow() {
    const svg = svgRef.current
    if (!svg) return
    svg.innerHTML = ''

    // Relationship lines
    relations.forEach((rel) => {
      if (!personaIds.includes(rel.personaA) || !personaIds.includes(rel.personaB)) return
      const ca = getCenter(rel.personaA)
      const cb = getCenter(rel.personaB)
      if (!ca || !cb) return
      const t = rel.tension
      if (t < 5) return

      const color = t < 30 ? 'rgba(240,236,224,0.12)' : t < 60 ? '#c8a45a' : t < 80 ? '#e06030' : '#d03020'
      const opacity = 0.15 + (t / 100) * 0.65
      const width = 0.8 + (t / 100) * 2.2

      const line = ns('line')
      line.setAttribute('x1', String(ca.x))
      line.setAttribute('y1', String(ca.y))
      line.setAttribute('x2', String(cb.x))
      line.setAttribute('y2', String(cb.y))
      line.setAttribute('stroke', color)
      line.setAttribute('stroke-width', String(width))
      line.setAttribute('opacity', String(opacity))
      if (t < 40) line.setAttribute('stroke-dasharray', '5,4')

      if (t > 70) {
        const anim = ns('animate')
        anim.setAttribute('attributeName', 'opacity')
        anim.setAttribute('values', `${opacity};${opacity * 0.4};${opacity}`)
        anim.setAttribute('dur', t > 85 ? '0.6s' : '1.2s')
        anim.setAttribute('repeatCount', 'indefinite')
        line.appendChild(anim)
      }
      svg.appendChild(line)

      if (t > 55) {
        const mx = (ca.x + cb.x) / 2
        const my = (ca.y + cb.y) / 2
        const txt = ns('text')
        txt.setAttribute('x', String(mx))
        txt.setAttribute('y', String(my - 4))
        txt.setAttribute('text-anchor', 'middle')
        txt.setAttribute('font-size', '9')
        txt.setAttribute('fill', color)
        txt.setAttribute('opacity', String(opacity * 1.2))
        txt.setAttribute('font-family', 'DM Sans')
        txt.setAttribute('letter-spacing', '0.08em')
        txt.textContent = `${Math.round(t)}%`
        svg.appendChild(txt)
      }
    })

    // Baton
    if (activeSpeakerId && personaIds.includes(activeSpeakerId)) {
      const c = getCenter(activeSpeakerId)
      if (c) drawBaton(c, activeColor ?? 'rgba(255,255,255,0.75)')
    }

    // Interrupt queue
    if (interruptQueue?.length) {
      const filtered = interruptQueue.filter((id) => personaIds.includes(id) && id !== activeSpeakerId)
      if (filtered.length) drawInterruptMarkers(filtered)
    }
  }

  function redraw() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setTimeout(redrawNow, 25)
    })
  }

  useEffect(
    () => {
      redraw()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relations, personaIds, activeSpeakerId, activeColor, interruptQueue?.join('|')],
  )

  useEffect(() => {
    window.addEventListener('resize', redraw)
    return () => window.removeEventListener('resize', redraw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    />
  )
}
