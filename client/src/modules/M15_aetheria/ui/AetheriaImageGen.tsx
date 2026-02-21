import { useState } from "react";
import { TOKENS } from "../../../design/tokens";

interface GenResult {
  id: string;
  url?: string;
  error?: string;
  status: "pending" | "done" | "error";
}

const ROOM_IDS = ["stern", "turm", "rat", "mond", "krist", "hall"];
const ROOM_NAMES: Record<string, string> = {
  stern: "Sternenwarte", turm: "Turm der Zahlen", rat: "Rat der Meister",
  mond: "Mondlichtung", krist: "Kristallgarten", hall: "Hall of Souls",
};
const PERSONA_IDS = ["maya", "luna", "orion", "lilith"];

interface AetheriaImageGenProps {
  onClose: () => void;
}

export function AetheriaImageGen({ onClose }: AetheriaImageGenProps) {
  const [roomResults, setRoomResults] = useState<GenResult[]>([]);
  const [personaResults, setPersonaResults] = useState<GenResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"rooms" | "personas">("rooms");

  async function generateSingle(type: "room" | "persona", id: string) {
    const setter = type === "room" ? setRoomResults : setPersonaResults;

    setter((prev) => {
      const existing = prev.find((r) => r.id === id);
      if (existing) return prev.map((r) => r.id === id ? { ...r, status: "pending" } : r);
      return [...prev, { id, status: "pending" }];
    });

    try {
      const res = await fetch("/api/zimage/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json() as { url?: string; error?: string };

      setter((prev) => prev.map((r) =>
        r.id === id
          ? { id, url: data.url, error: data.error, status: data.url ? "done" : "error" }
          : r
      ));
    } catch (err) {
      setter((prev) => prev.map((r) =>
        r.id === id ? { id, error: String(err), status: "error" } : r
      ));
    }
  }

  async function generateAll(type: "room" | "persona") {
    setGenerating(true);
    const ids = type === "room" ? ROOM_IDS : PERSONA_IDS;
    const setter = type === "room" ? setRoomResults : setPersonaResults;

    setter(ids.map((id) => ({ id, status: "pending" })));

    try {
      const res = await fetch("/api/zimage/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json() as { results: { id: string; url?: string; error?: string }[] };

      setter(data.results.map((r) => ({
        id: r.id,
        url: r.url,
        error: r.error,
        status: r.url ? "done" : "error",
      })));
    } catch (err) {
      setter(ids.map((id) => ({ id, error: String(err), status: "error" })));
    } finally {
      setGenerating(false);
    }
  }

  const results = activeTab === "rooms" ? roomResults : personaResults;
  const ids = activeTab === "rooms" ? ROOM_IDS : PERSONA_IDS;
  const names = activeTab === "rooms" ? ROOM_NAMES : Object.fromEntries(PERSONA_IDS.map((id) => [id, id.charAt(0).toUpperCase() + id.slice(1)]));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 560,
        background: TOKENS.bg2, borderRadius: TOKENS.radius2,
        border: `1px solid ${TOKENS.border}`,
        overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${TOKENS.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: TOKENS.font.display, fontSize: 16, color: TOKENS.gold, letterSpacing: "0.06em" }}>
              Z-Image Generator
            </div>
            <div style={{ fontSize: 11, color: TOKENS.text2, marginTop: 2 }}>
              Bilder via fal.ai generieren · ~$0.002 pro Bild
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TOKENS.text2, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${TOKENS.border}` }}>
          {(["rooms", "personas"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: "10px 0", background: "none", border: "none",
              fontFamily: TOKENS.font.body, fontSize: 12, cursor: "pointer",
              color: activeTab === tab ? TOKENS.gold : TOKENS.text2,
              borderBottom: `2px solid ${activeTab === tab ? TOKENS.gold : "transparent"}`,
              transition: "all 0.2s",
            }}>
              {tab === "rooms" ? "🗺 Aetheria-Räume (6)" : "👤 Persona-Portraits (4)"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* Batch-Button */}
          <button
            onClick={() => generateAll(activeTab === "rooms" ? "room" : "persona")}
            disabled={generating}
            style={{
              width: "100%", padding: "10px 0", marginBottom: 16,
              borderRadius: TOKENS.radiusSm, border: `1px solid ${TOKENS.gold}44`,
              background: generating ? "rgba(212,175,55,0.04)" : "rgba(212,175,55,0.08)",
              color: TOKENS.gold, fontFamily: TOKENS.font.body, fontSize: 13,
              fontWeight: 600, cursor: generating ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {generating ? "⏳ Generiere alle…" : `✦ Alle ${activeTab === "rooms" ? "6 Räume" : "4 Personas"} generieren`}
          </button>

          {/* Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ids.map((id) => {
              const result = results.find((r) => r.id === id);
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: TOKENS.radiusSm,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${result?.status === "done" ? "rgba(74,222,128,0.2)" : result?.status === "error" ? "rgba(239,68,68,0.2)" : TOKENS.border}`,
                }}>
                  {/* Preview */}
                  <div style={{
                    width: 56, height: 40, borderRadius: 6, flexShrink: 0,
                    background: "rgba(255,255,255,0.04)",
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {result?.url ? (
                      <img src={result.url} alt={id} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 18, opacity: 0.3 }}>
                        {result?.status === "pending" ? "⏳" : result?.status === "error" ? "✕" : "◻"}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: TOKENS.text, fontWeight: 600 }}>{names[id]}</div>
                    {result?.error && (
                      <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {result.error}
                      </div>
                    )}
                    {result?.url && (
                      <a href={result.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#4ade80", marginTop: 2, display: "block" }}>
                        ✓ Generiert — URL öffnen
                      </a>
                    )}
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => generateSingle(activeTab === "rooms" ? "room" : "persona", id)}
                    disabled={result?.status === "pending" || generating}
                    style={{
                      padding: "5px 12px", borderRadius: 8, fontSize: 11,
                      background: result?.status === "done" ? "rgba(74,222,128,0.08)" : "rgba(212,175,55,0.08)",
                      border: `1px solid ${result?.status === "done" ? "rgba(74,222,128,0.3)" : "rgba(212,175,55,0.3)"}`,
                      color: result?.status === "done" ? "#4ade80" : TOKENS.gold,
                      cursor: result?.status === "pending" ? "default" : "pointer",
                      fontFamily: TOKENS.font.body, fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {result?.status === "pending" ? "…" : result?.status === "done" ? "↺ Neu" : "▶ Gen"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Hinweis */}
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: TOKENS.radiusSm,
            background: "rgba(212,175,55,0.04)", border: `1px solid rgba(212,175,55,0.12)`,
          }}>
            <div style={{ fontSize: 11, color: TOKENS.text2, lineHeight: 1.6 }}>
              <strong style={{ color: TOKENS.gold }}>Hinweis:</strong> Die generierten URLs sind temporär (~1h gültig).
              Lade die Bilder herunter und speichere sie in <code style={{ color: TOKENS.text }}>client/public/assets/aetheria/</code> als
              <code style={{ color: TOKENS.text }}> room-[id].jpg</code> bzw. <code style={{ color: TOKENS.text }}>persona-[id].webp</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
