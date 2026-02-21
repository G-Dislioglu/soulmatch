import React from "react";
import { useTilt } from "./useTilt";
import { TOKENS, accentColor } from "./tokens";

interface SCardProps {
  color?: string;          // "gold" | "purple" | "cyan" | "rose" | "green" | "blue"
  accentHex?: string;      // Direkte Hex-Farbe (überschreibt color)
  tiltMax?: number;        // Überschreibt Default
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function SCard({
  color = "gold",
  accentHex,
  tiltMax = TOKENS.tilt.maxDeg,
  onClick,
  className,
  style,
  children,
}: SCardProps) {
  const { ref, tilt, handlers } = useTilt(tiltMax);
  const c = accentHex ?? accentColor(color);
  const T = TOKENS.tilt;

  const cardStyle: React.CSSProperties = {
    background: TOKENS.cardBg,
    border: `1px solid rgba(255,255,255,${tilt.active ? T.borderStrength + 0.08 : T.borderStrength})`,
    borderRadius: TOKENS.radius,
    padding: 20,
    backdropFilter: `blur(${TOKENS.glass.blur}px)`,
    WebkitBackdropFilter: `blur(${TOKENS.glass.blur}px)`,
    position: "relative",
    overflow: "hidden",
    cursor: onClick ? "pointer" : "default",
    transform: tilt.active
      ? `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${T.scale})`
      : `perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)`,
    // WICHTIG: Keine transition auf transform während Hover (sonst laggt es)
    transition: tilt.active
      ? "box-shadow 0.3s, border-color 0.2s"
      : `transform ${TOKENS.transition.tiltReturn}, box-shadow 0.3s, border-color 0.2s`,
    boxShadow: tilt.active
      ? `0 ${8 + tilt.x * 1.5}px ${25 + Math.abs(tilt.x) * 2}px rgba(0,0,0,0.5),
         0 0 ${T.glowStrength * 30}px ${c}${Math.round(T.glowStrength * 40).toString(16).padStart(2, "0")},
         inset 0 1px 0 rgba(255,255,255,0.08)`
      : TOKENS.shadow.card,
    transformStyle: "preserve-3d",
    willChange: "transform",
    ...style,
  };

  return (
    <div ref={ref} style={cardStyle} onClick={onClick} className={className} {...handlers}>
      {/* Obere Akzentlinie (Glasrand-Effekt) */}
      <div style={{
        position: "absolute", top: 0, left: 16, right: 16, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,${tilt.active ? 0.1 : 0.05}), transparent)`,
        transition: "background 0.3s",
      }}/>

      {/* Lichtpunkt folgt der Maus */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
        background: `radial-gradient(circle 200px at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,${tilt.active ? 0.06 : 0}), transparent 60%)`,
        transition: tilt.active ? "none" : "background 0.4s",
      }}/>

      {/* Farbiger Glow am unteren Rand */}
      <div style={{
        position: "absolute", bottom: -20, left: "20%", right: "20%", height: 40,
        background: `radial-gradient(ellipse, ${c}${tilt.active ? "18" : "08"}, transparent 70%)`,
        filter: "blur(12px)", pointerEvents: "none", transition: "background 0.3s",
      }}/>

      {/* Inhalt */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}
