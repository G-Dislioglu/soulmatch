import { useState } from "react";
import type { AetheriaLocation } from "../lib/locations";
import { TOKENS } from "../../../design/tokens";
import { useAssetImage } from "../lib/useAssetImage";
import { BackButton } from "../../M02_ui-kit";

interface RoomSceneProps {
  loc: AetheriaLocation;
  onBack: () => void;
  onAction?: (action: string, loc: AetheriaLocation) => void;
}

export function RoomScene({ loc, onBack, onAction }: RoomSceneProps) {
  const [hoveredObj, setHoveredObj] = useState<string | null>(null);
  const { url: bgUrl, loading: bgLoading } = useAssetImage("room", loc.id, true);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 40,
      display: "flex",
      flexDirection: "column",
      overflow: "auto",
    }}>
      {/* Hintergrund */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: loc.roomGrad,
        transition: "background 0.5s ease",
      }}>
        {/* Generiertes Bild (automatisch via fal.ai) */}
        {bgUrl && (
          <img
            src={bgUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.82,
              animation: "aetheriaFadeIn 1.2s ease",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Lade-Indikator */}
        {bgLoading && !bgUrl && (
          <div style={{
            position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
            fontSize: 10, color: `${loc.c}88`, letterSpacing: "0.12em",
            animation: "aetheriaOrbPulse 2s ease infinite",
          }}>
            ✦ Raum wird gemalt…
          </div>
        )}
        {/* Dunkler Overlay für Lesbarkeit */}
        <div style={{ position: "absolute", inset: 0, background: bgUrl ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.45)" }} />
      </div>

      {/* Header — sticky so image can never overlap it */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        background: "rgba(4,2,12,0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${loc.c}30`,
        boxShadow: `0 1px 20px rgba(0,0,0,0.5)`,
      }}>
        <BackButton onClick={onBack} variant="light" />

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: TOKENS.font.display,
            fontSize: 15,
            fontWeight: 600,
            color: loc.c,
            letterSpacing: "0.06em",
          }}>
            {loc.name}
          </div>
          <div style={{
            fontFamily: TOKENS.font.body,
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            marginTop: 1,
          }}>
            {loc.npc}
          </div>
        </div>

        <div style={{ width: 60 }} />
      </div>

      {/* Objekte-Grid */}
      <div style={{
        position: "relative",
        zIndex: 2,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 24px",
        gap: 16,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          width: "100%",
          maxWidth: 380,
        }}>
          {loc.objects.map((obj) => {
            const isHov = hoveredObj === obj.action;
            return (
              <button
                key={obj.action}
                onClick={() => onAction?.(obj.action, loc)}
                onMouseEnter={() => setHoveredObj(obj.action)}
                onMouseLeave={() => setHoveredObj(null)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "18px 12px",
                  borderRadius: 16,
                  background: isHov
                    ? `rgba(${hexToRgb(loc.c)},0.12)`
                    : "rgba(0,0,0,0.35)",
                  border: `1px solid ${loc.c}${isHov ? "55" : "22"}`,
                  backdropFilter: "blur(8px)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  transform: isHov ? "scale(1.04)" : "scale(1)",
                  boxShadow: isHov ? `0 0 20px ${loc.c}33` : "none",
                }}
              >
                {/* Icon-Orb */}
                <div style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 35% 35%, ${loc.c}44, ${loc.c}18)`,
                  border: `1.5px solid ${loc.c}${isHov ? "88" : "44"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  boxShadow: isHov ? `0 0 16px ${loc.c}55` : "none",
                  transition: "all 0.25s ease",
                }}>
                  {obj.icon}
                </div>

                {/* Name */}
                <div style={{
                  fontFamily: TOKENS.font.display,
                  fontSize: 9,
                  fontWeight: 600,
                  color: isHov ? loc.c : "rgba(255,255,255,0.7)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  transition: "color 0.25s ease",
                }}>
                  {obj.name}
                </div>

                {/* Beschreibung */}
                <div style={{
                  fontFamily: TOKENS.font.body,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}>
                  {obj.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Maya-Leiste unten */}
      <div style={{
        position: "relative",
        zIndex: 2,
        padding: "12px 20px 20px",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${loc.c}18`,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 14, opacity: 0.8 }}>✦</span>
          <span style={{
            fontFamily: TOKENS.font.serif,
            fontSize: 13,
            color: "rgba(255,255,255,0.55)",
            fontStyle: "italic",
            lineHeight: 1.4,
          }}>
            Maya · {loc.maya}
          </span>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
