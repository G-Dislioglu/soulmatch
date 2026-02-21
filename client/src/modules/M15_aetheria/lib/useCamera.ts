import gsap from "gsap";
import { useRef, useCallback } from "react";

interface CameraState {
  scale: number;
  originX: number;
  originY: number;
}

export function useCamera(stageRef: React.RefObject<HTMLDivElement>) {
  const state = useRef<CameraState>({ scale: 1, originX: 50, originY: 50 });

  const flyTo = useCallback((x: number, y: number, onComplete?: () => void) => {
    if (!stageRef.current) return;
    const el = stageRef.current;

    const tl = gsap.timeline({
      onComplete,
      defaults: { ease: "power3.out" },
    });

    tl.to(state.current, {
      scale: 4.5,
      originX: x,
      originY: y,
      duration: 2.4,
      ease: "power2.inOut",
      onUpdate: () => {
        const s = state.current;
        el.style.transform = `scale(${s.scale})`;
        el.style.transformOrigin = `${s.originX}% ${s.originY}%`;
      },
    });

    return tl;
  }, [stageRef]);

  const flyBack = useCallback((onComplete?: () => void) => {
    if (!stageRef.current) return;
    const el = stageRef.current;

    gsap.to(state.current, {
      scale: 1,
      originX: 50,
      originY: 50,
      duration: 1.8,
      ease: "power2.inOut",
      onUpdate: () => {
        const s = state.current;
        el.style.transform = `scale(${s.scale})`;
        el.style.transformOrigin = `${s.originX}% ${s.originY}%`;
      },
      onComplete,
    });
  }, [stageRef]);

  return { flyTo, flyBack, state };
}
