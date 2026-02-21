import { useRef, useState, useCallback } from "react";
import { LOCATIONS } from "../lib/locations";
import type { AetheriaLocation } from "../lib/locations";
import { useCamera } from "../lib/useCamera";
import { CameraStage } from "./CameraStage";
import { RoomScene } from "./RoomScene";
import { TOKENS } from "../../../design/tokens";

interface AetheriaScreenProps {
  onAction?: (action: string, loc: AetheriaLocation) => void;
}

type Phase = "map" | "flying" | "room";

export function AetheriaScreen({ onAction }: AetheriaScreenProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { flyTo, flyBack } = useCamera(stageRef);

  const [phase, setPhase] = useState<Phase>("map");
  const [activeRoom, setActiveRoom] = useState<AetheriaLocation | null>(null);

  const handleSelectLocation = useCallback((loc: AetheriaLocation) => {
    if (phase !== "map") return;
    setPhase("flying");

    flyTo(loc.x, loc.y, () => {
      setActiveRoom(loc);
      setPhase("room");
    });
  }, [phase, flyTo]);

  const handleBack = useCallback(() => {
    setPhase("flying");
    setActiveRoom(null);

    flyBack(() => {
      setPhase("map");
    });
  }, [flyBack]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      minHeight: "calc(100vh - 130px)",
      overflow: "hidden",
      background: TOKENS.bg,
    }}>
      {/* Kamera-Container — AUSSERHALB von UILayer */}
      <div style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}>
        <CameraStage
          ref={stageRef}
          locations={LOCATIONS}
          onSelectLocation={handleSelectLocation}
        />
      </div>

      {/* Overlay-Hinweis während Kamerafahrt */}
      {phase === "flying" && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            fontFamily: TOKENS.font.serif,
            fontSize: 14,
            color: "rgba(255,255,255,0.4)",
            fontStyle: "italic",
            animation: "aetheriaFadeIn 0.5s ease",
          }}>
            Reise beginnt…
          </div>
        </div>
      )}

      {/* Raum-Overlay — AUSSERHALB von CameraStage */}
      {phase === "room" && activeRoom && (
        <RoomScene
          loc={activeRoom}
          onBack={handleBack}
          onAction={onAction}
        />
      )}

      {/* Titel-Overlay auf der Karte */}
      {phase === "map" && (
        <div style={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          zIndex: 20,
          textAlign: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            fontFamily: TOKENS.font.display,
            fontSize: 22,
            fontWeight: 600,
            color: TOKENS.gold,
            letterSpacing: "0.12em",
            textShadow: `0 0 20px ${TOKENS.goldGlow}`,
          }}>
            AETHERIA
          </div>
          <div style={{
            fontFamily: TOKENS.font.body,
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginTop: 3,
            letterSpacing: "0.06em",
          }}>
            Wähle einen Ort
          </div>
        </div>
      )}
    </div>
  );
}
