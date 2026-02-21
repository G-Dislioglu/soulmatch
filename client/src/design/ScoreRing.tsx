import { accentColor, TOKENS } from "./tokens";

export function ScoreRing({ pct, color = "gold", size = 54 }: { pct: number; color?: string; size?: number }) {
  const c = accentColor(color);
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.3)", flexShrink: 0,
    }}>
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="3"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${c}66)` }}/>
      </svg>
      <span style={{
        fontFamily: TOKENS.font.display, fontSize: size * 0.26,
        fontWeight: 600, position: "relative",
      }}>{pct}</span>
    </div>
  );
}
