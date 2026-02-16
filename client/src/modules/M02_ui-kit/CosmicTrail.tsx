import { useEffect, useRef } from 'react';

const ACCENT = '#d4af37';

interface CosmicTrailProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  intensity?: number;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export function CosmicTrail({ intensity = 70 }: CosmicTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<TrailPoint[]>([]);
  const smoothPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const moving = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef(0);
  const isTouch = useRef(false);

  useEffect(() => {
    // Detect touch-primary devices and skip canvas entirely
    if (window.matchMedia('(pointer: coarse)').matches) {
      isTouch.current = true;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const SMOOTH = 0.35; // lerp factor — lower = smoother (0.2–0.5 range)

    const handleMove = (e: MouseEvent) => {
      moving.current = true;
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => { moving.current = false; }, 100);

      const raw = { x: e.clientX, y: e.clientY };
      if (!hasMoved.current) {
        smoothPos.current = { ...raw };
        hasMoved.current = true;
      } else {
        smoothPos.current.x += (raw.x - smoothPos.current.x) * SMOOTH;
        smoothPos.current.y += (raw.y - smoothPos.current.y) * SMOOTH;
      }

      points.current.push({ x: smoothPos.current.x, y: smoothPos.current.y, time: Date.now() });
      if (points.current.length > 80) points.current.shift();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const maxAge = moving.current ? 600 : 250;
      const auraFactor = Math.max(0, Math.min(1, intensity / 100));

      points.current = points.current.filter((p) => now - p.time < maxAge);
      const pts = points.current;

      if (pts.length > 2) {
        // Helper: midpoint between two points
        const mid = (a: TrailPoint, b: TrailPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

        // Outer glow pass (wide, faint gold)
        for (let i = 1; i < pts.length; i++) {
          const cur = pts[i]!; const prev = pts[i - 1]!;
          const age = (now - cur.time) / maxAge;
          const progress = i / pts.length;
          const alpha = (1 - age) * progress * 0.12 * auraFactor;
          const width = progress * (6 + 8 * auraFactor);
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          if (i === 1) {
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(cur.x, cur.y);
          } else {
            const m = mid(prev, cur);
            ctx.moveTo(mid(pts[i - 2]!, prev).x, mid(pts[i - 2]!, prev).y);
            ctx.quadraticCurveTo(prev.x, prev.y, m.x, m.y);
          }
          ctx.stroke();
        }
        // Inner core pass (thin, bright cream)
        for (let i = 1; i < pts.length; i++) {
          const cur = pts[i]!; const prev = pts[i - 1]!;
          const age = (now - cur.time) / maxAge;
          const progress = i / pts.length;
          const alpha = (1 - age) * progress * (0.25 + 0.3 * auraFactor);
          const width = progress * (1.5 + 2.5 * auraFactor);
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#f5e6a3';
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          if (i === 1) {
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(cur.x, cur.y);
          } else {
            const m = mid(prev, cur);
            ctx.moveTo(mid(pts[i - 2]!, prev).x, mid(pts[i - 2]!, prev).y);
            ctx.quadraticCurveTo(prev.x, prev.y, m.x, m.y);
          }
          ctx.stroke();
        }
        for (let i = Math.max(1, pts.length - 14); i < pts.length; i++) {
          const cur = pts[i]!;
          const progress = i / pts.length;
          const age = (now - cur.time) / maxAge;
          const alpha = (1 - age) * progress * 0.14 * auraFactor;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          const g = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, (8 + 14 * auraFactor) * progress);
          g.addColorStop(0, '#f5e6a3');
          g.addColorStop(0.4, ACCENT);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cur.x, cur.y, 22 * progress, 0, Math.PI * 2);
          ctx.fill();
        }
        const head = pts[pts.length - 1];
        if (head && moving.current) {
          const headAge = (now - head.time) / maxAge;
          ctx.globalAlpha = (1 - headAge) * 0.35 * auraFactor;
          const hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 8 + 8 * auraFactor);
          hg.addColorStop(0, '#fffbe6');
          hg.addColorStop(0.3, '#f5e6a3');
          hg.addColorStop(0.6, ACCENT);
          hg.addColorStop(1, 'transparent');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 8 + 8 * auraFactor, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      frame.current = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', handleMove);
    animate();
    window.addEventListener('resize', resize);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame.current);
    };
  }, [intensity]);

  if (isTouch.current) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}
    />
  );
}
