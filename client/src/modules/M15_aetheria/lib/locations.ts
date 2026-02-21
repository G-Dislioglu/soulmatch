export interface AetheriaLocation {
  id: string;
  name: string;
  sub: string;
  sym: string;
  x: number;
  y: number;
  c: string;
  roomGrad: string;
  objects: { name: string; icon: string; desc: string; action: string }[];
  maya: string;
  npc: string;
}

export const LOCATIONS: AetheriaLocation[] = [
  {
    id: "stern", name: "Sternenwarte", sub: "Astrologie", sym: "✦",
    x: 19, y: 28, c: "#7eb8da", npc: "Astrologin Selenia",
    roomGrad: "radial-gradient(ellipse at 50% 30%, #0c1a2e 0%, #060d18 50%, #020408 100%)",
    objects: [
      { name: "Teleskop", icon: "🔭", desc: "Blicke in die Sterne", action: "birth-chart" },
      { name: "Sternenkarte", icon: "✦", desc: "Himmelskörper-Positionen", action: "transits" },
      { name: "Astrolabium", icon: "◎", desc: "Aspekte zwischen Planeten", action: "aspects" },
      { name: "Zwei Spiegel", icon: "♊", desc: "Seelen vergleichen", action: "synastry" },
    ],
    maya: "Die Sterne lügen nie — aber sie sprechen in Rätseln.",
  },
  {
    id: "turm", name: "Turm der Zahlen", sub: "Numerologie", sym: "◈",
    x: 74, y: 22, c: "#b388ff", npc: "Numerologe Kael",
    roomGrad: "radial-gradient(ellipse at 50% 40%, #1a0e2e 0%, #0d0618 50%, #040208 100%)",
    objects: [
      { name: "Zahlentafel", icon: "𝍸", desc: "Dein Lebensweg", action: "life-path" },
      { name: "Seelenkristall", icon: "◇", desc: "Die Zahl deiner Seele", action: "soul-urge" },
      { name: "Runenspiegel", icon: "◈", desc: "Wer du wirklich bist", action: "personality" },
      { name: "Schicksalsbuch", icon: "📖", desc: "Karmische Lektionen", action: "karmic-debt" },
    ],
    maya: "Jede Zahl erzählt eine Geschichte.",
  },
  {
    id: "rat", name: "Rat der Meister", sub: "KI-Personas", sym: "⚜",
    x: 44, y: 40, c: "#d4af37", npc: "Die vier Stimmen",
    roomGrad: "radial-gradient(ellipse at 50% 35%, #2a1e0a 0%, #18100a 50%, #080402 100%)",
    objects: [
      { name: "Runder Tisch", icon: "⚜", desc: "Alle Stimmen vereint", action: "roundtable" },
      { name: "Flüsterstuhl", icon: "💬", desc: "Einzelgespräch", action: "solo-chat" },
      { name: "Seelenspiegel", icon: "♡", desc: "Finde dein Match", action: "match-mode" },
      { name: "Kartenaltar", icon: "✧", desc: "Weisheit festhalten", action: "soul-cards" },
    ],
    maya: "Hier versammelt sich die Weisheit aller Stimmen.",
  },
  {
    id: "mond", name: "Mondlichtung", sub: "Tarot & Orakel", sym: "☽",
    x: 20, y: 56, c: "#e8dcc8", npc: "Vesper",
    roomGrad: "radial-gradient(ellipse at 50% 30%, #1e1a12 0%, #100e08 50%, #060402 100%)",
    objects: [
      { name: "Tageskarte", icon: "🃏", desc: "Was bringt der Tag?", action: "daily-card" },
      { name: "Drei Kerzen", icon: "☽", desc: "Vergangenheit · Jetzt · Zukunft", action: "three-card" },
      { name: "Keltischer Kreis", icon: "✦", desc: "Die große Legung", action: "celtic-cross" },
      { name: "Zwei Flammen", icon: "♡", desc: "Beziehungsdeutung", action: "love-spread" },
    ],
    maya: "Die Karten zeigen nicht die Zukunft. Sie zeigen dich.",
  },
  {
    id: "krist", name: "Kristallgarten", sub: "Chakra & Energie", sym: "❋",
    x: 70, y: 48, c: "#4ade80", npc: "Amara",
    roomGrad: "radial-gradient(ellipse at 50% 40%, #0a1e10 0%, #06120a 50%, #020804 100%)",
    objects: [
      { name: "Sieben Säulen", icon: "❋", desc: "Deine 7 Chakren", action: "chakra-scan" },
      { name: "Energiequelle", icon: "◉", desc: "Aura sichtbar machen", action: "energy-body" },
      { name: "Dunkler Kristall", icon: "◆", desc: "Blockaden finden", action: "blockages" },
      { name: "Stiller Teich", icon: "🧘", desc: "Geführte Stille", action: "meditation" },
    ],
    maya: "Spüre, wo es fließt — und wo nicht.",
  },
  {
    id: "hall", name: "Hall of Souls", sub: "Seelen-Galerie", sym: "♢",
    x: 44, y: 70, c: "#06b6d4", npc: "Deine Weisheiten",
    roomGrad: "radial-gradient(ellipse at 50% 30%, #0a1820 0%, #060e14 50%, #020608 100%)",
    objects: [
      { name: "Schwebende Orbs", icon: "♢", desc: "Deine Soul Cards", action: "soul-gallery" },
      { name: "Kreuzungsaltar", icon: "✦", desc: "Karten verbinden", action: "crossing" },
      { name: "Zeitlinie", icon: "〰", desc: "Dein Seelen-Verlauf", action: "score-timeline" },
      { name: "Ritualkreis", icon: "◎", desc: "Tiefes Crossing", action: "crossing-ritual" },
    ],
    maya: "Jede Karte ist ein Stück deiner Reise.",
  },
];
