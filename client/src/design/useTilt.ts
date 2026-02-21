import { useRef, useState, useCallback } from "react";
import { TOKENS } from "./tokens";

interface TiltState {
  x: number;       // rotateX Grad
  y: number;       // rotateY Grad
  mx: number;      // Maus-X in % (für Lichtpunkt)
  my: number;      // Maus-Y in %
  active: boolean; // Maus über Karte?
}

/**
 * Universeller Tilt-Hook für ALLE Karten in Soulmatch.
 * 
 * REGEL: Diesen Hook verwenden. Keine eigenen Tilt-Implementierungen.
 * 
 * @param maxDeg  — Maximaler Kippwinkel (default: TOKENS.tilt.maxDeg = 6)
 */
export function useTilt(maxDeg: number = TOKENS.tilt.maxDeg) {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const [tilt, setTilt] = useState<TiltState>({
    x: 0, y: 0, mx: 50, my: 50, active: false,
  });

  const onEnter = useCallback(() => {
    if (ref.current) rectRef.current = ref.current.getBoundingClientRect();
    setTilt(t => ({ ...t, active: true }));
  }, []);

  const onMove = useCallback((e: React.MouseEvent) => {
    const r = rectRef.current;
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({
      x: (0.5 - y) * maxDeg,
      y: (x - 0.5) * maxDeg,
      mx: x * 100,
      my: y * 100,
      active: true,
    });
  }, [maxDeg]);

  const onLeave = useCallback(() => {
    setTilt({ x: 0, y: 0, mx: 50, my: 50, active: false });
  }, []);

  // Touch-Support (für Mobile / Capacitor)
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const r = rectRef.current;
    if (!r || !e.touches[0]) return;
    const t = e.touches[0];
    const x = (t.clientX - r.left) / r.width;
    const y = (t.clientY - r.top) / r.height;
    setTilt({
      x: (0.5 - y) * maxDeg * 0.6, // Touch = 60% Intensität
      y: (x - 0.5) * maxDeg * 0.6,
      mx: x * 100,
      my: y * 100,
      active: true,
    });
  }, [maxDeg]);

  const onTouchEnd = useCallback(() => {
    setTilt({ x: 0, y: 0, mx: 50, my: 50, active: false });
  }, []);

  return {
    ref,
    tilt,
    handlers: {
      onMouseEnter: onEnter,
      onMouseMove: onMove,
      onMouseLeave: onLeave,
      onTouchStart: onEnter,
      onTouchMove: onTouchMove,
      onTouchEnd: onTouchEnd,
    },
  };
}
