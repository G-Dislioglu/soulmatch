import { useEffect, useRef } from 'react';

const ACCENT = '#d4af37';

interface CosmicTrailProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export function CosmicTrail(_props: CosmicTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<TrailPoint[]>([]);
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

    const handleMove = (e: MouseEvent) => {
      moving.current = true;
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => { moving.current = false; }, 80);
      points.current.push({ x: e.clientX, y: e.clientY, time: Date.now() });
      if (points.current.length > 60) points.current.shift();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      const maxAge = moving.current ? 600 : 250;

      points.current = points.current.filter((p) => now - p.time < maxAge);
      const pts = points.current;

      if (pts.length > 2) {
        for (let i = 1; i < pts.length; i++) {
          const cur = pts[i]!; const prev = pts[i - 1]!;
          const age = (now - cur.time) / maxAge;
          const progress = i / pts.length;
          const alpha = (1 - age) * progress * 0.12;
          const width = progress * 14;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(cur.x, cur.y);
          ctx.stroke();
        }
        for (let i = 1; i < pts.length; i++) {
          const cur = pts[i]!; const prev = pts[i - 1]!;
          const age = (now - cur.time) / maxAge;
          const progress = i / pts.length;
          const alpha = (1 - age) * progress * 0.55;
          const width = progress * 4;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#f5e6a3';
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(cur.x, cur.y);
          ctx.stroke();
        }
        for (let i = Math.max(1, pts.length - 14); i < pts.length; i++) {
          const cur = pts[i]!;
          const progress = i / pts.length;
          const age = (now - cur.time) / maxAge;
          const alpha = (1 - age) * progress * 0.14;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          const g = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, 22 * progress);
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
          ctx.globalAlpha = (1 - headAge) * 0.35;
          const hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 16);
          hg.addColorStop(0, '#fffbe6');
          hg.addColorStop(0.3, '#f5e6a3');
          hg.addColorStop(0.6, ACCENT);
          hg.addColorStop(1, 'transparent');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 16, 0, Math.PI * 2);
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
  }, []);

  if (isTouch.current) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}
    />
  );
}
