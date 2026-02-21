import { useState } from "react";
import type { AetheriaLocation } from "../lib/locations";

interface AetheriaLabelsProps {
  locations: AetheriaLocation[];
  onSelect: (loc: AetheriaLocation) => void;
}

export function AetheriaLabels({ locations, onSelect }: AetheriaLabelsProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <>
      {locations.map((loc) => {
        const isHovered = hovered === loc.id;
        return (
          <button
            key={loc.id}
            onClick={() => onSelect(loc)}
            onMouseEnter={() => setHovered(loc.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: "absolute",
              left: `${loc.x}%`,
              top: `${loc.y}%`,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              zIndex: 10,
            }}
          >
            {/* Orb */}
            <div style={{
              width: isHovered ? 44 : 36,
              height: isHovered ? 44 : 36,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${loc.c}55, ${loc.c}22)`,
              border: `1.5px solid ${loc.c}${isHovered ? "cc" : "66"}`,
              boxShadow: isHovered
                ? `0 0 18px ${loc.c}88, 0 0 6px ${loc.c}44`
                : `0 0 8px ${loc.c}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isHovered ? 18 : 14,
              transition: "all 0.25s ease",
              willChange: "transform",
            }}>
              {loc.sym}
            </div>

            {/* Label */}
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 8,
              fontWeight: 600,
              color: isHovered ? loc.c : "rgba(255,255,255,0.55)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textShadow: isHovered ? `0 0 8px ${loc.c}88` : "0 1px 3px rgba(0,0,0,0.8)",
              transition: "all 0.25s ease",
              whiteSpace: "nowrap",
            }}>
              {loc.name}
            </div>

            {/* Pulsing ring on hover */}
            {isHovered && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -60%)",
                width: 60,
                height: 60,
                borderRadius: "50%",
                border: `1px solid ${loc.c}44`,
                animation: "aetheriaOrbPulse 1.5s ease-out infinite",
                pointerEvents: "none",
              }} />
            )}
          </button>
        );
      })}
    </>
  );
}
