import { forwardRef } from "react";
import type { AetheriaLocation } from "../lib/locations";
import { AetheriaLabels } from "./AetheriaLabels";

interface CameraStageProps {
  locations: AetheriaLocation[];
  onSelectLocation: (loc: AetheriaLocation) => void;
}

export const CameraStage = forwardRef<HTMLDivElement, CameraStageProps>(
  ({ locations, onSelectLocation }, ref) => {
    const hasMap = true; // Versucht Bild zu laden, fällt auf Gradient zurück

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
          willChange: "transform",
          transformOrigin: "50% 50%",
        }}
      >
        {/* Weltkarte — Bild oder Gradient-Fallback */}
        <div style={{ position: "absolute", inset: 0 }}>
          {hasMap && (
            <img
              src="/assets/aetheria/map.jpg"
              alt="Aetheria"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          )}
          {/* Gradient-Hintergrund (immer sichtbar als Fallback) */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse at 20% 30%, #0c1a2e 0%, transparent 45%),
              radial-gradient(ellipse at 75% 20%, #1a0e2e 0%, transparent 40%),
              radial-gradient(ellipse at 45% 42%, #2a1e0a 0%, transparent 35%),
              radial-gradient(ellipse at 20% 58%, #1e1a12 0%, transparent 35%),
              radial-gradient(ellipse at 70% 50%, #0a1e10 0%, transparent 35%),
              radial-gradient(ellipse at 45% 72%, #0a1820 0%, transparent 35%),
              #08060e
            `,
          }} />

          {/* Mystische Partikel / Sterne */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,0.4) 0%, transparent 100%),
              radial-gradient(1px 1px at 35% 15%, rgba(255,255,255,0.3) 0%, transparent 100%),
              radial-gradient(1px 1px at 55% 25%, rgba(255,255,255,0.35) 0%, transparent 100%),
              radial-gradient(1px 1px at 80% 18%, rgba(255,255,255,0.4) 0%, transparent 100%),
              radial-gradient(1px 1px at 25% 45%, rgba(255,255,255,0.25) 0%, transparent 100%),
              radial-gradient(1px 1px at 65% 38%, rgba(255,255,255,0.3) 0%, transparent 100%),
              radial-gradient(1px 1px at 88% 42%, rgba(255,255,255,0.35) 0%, transparent 100%),
              radial-gradient(1px 1px at 10% 65%, rgba(255,255,255,0.3) 0%, transparent 100%),
              radial-gradient(1px 1px at 50% 60%, rgba(255,255,255,0.25) 0%, transparent 100%),
              radial-gradient(1px 1px at 75% 55%, rgba(255,255,255,0.3) 0%, transparent 100%),
              radial-gradient(1px 1px at 30% 75%, rgba(255,255,255,0.35) 0%, transparent 100%),
              radial-gradient(1px 1px at 60% 80%, rgba(255,255,255,0.25) 0%, transparent 100%)
            `,
            pointerEvents: "none",
          }} />

          {/* Subtile Verbindungslinien zwischen Orten */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.15 }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line x1="19" y1="28" x2="44" y2="40" stroke="#d4af37" strokeWidth="0.15" strokeDasharray="0.5 1" />
            <line x1="74" y1="22" x2="44" y2="40" stroke="#d4af37" strokeWidth="0.15" strokeDasharray="0.5 1" />
            <line x1="44" y1="40" x2="20" y2="56" stroke="#d4af37" strokeWidth="0.15" strokeDasharray="0.5 1" />
            <line x1="44" y1="40" x2="70" y2="48" stroke="#d4af37" strokeWidth="0.15" strokeDasharray="0.5 1" />
            <line x1="44" y1="40" x2="44" y2="70" stroke="#d4af37" strokeWidth="0.15" strokeDasharray="0.5 1" />
            <line x1="20" y1="56" x2="44" y2="70" stroke="#d4af37" strokeWidth="0.15" strokeDasharray="0.5 1" />
            <line x1="70" y1="48" x2="44" y2="70" stroke="#d4af37" strokeWidth="0.15" strokeDasharray="0.5 1" />
          </svg>
        </div>

        {/* Ort-Labels */}
        <AetheriaLabels locations={locations} onSelect={onSelectLocation} />
      </div>
    );
  }
);

CameraStage.displayName = "CameraStage";
