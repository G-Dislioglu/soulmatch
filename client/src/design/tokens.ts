// ═══ SOULMATCH DESIGN TOKENS ═══
// DIESE WERTE SIND VERBINDLICH. NICHT ÄNDERN.

export const TOKENS = {
  // Farben
  bg:         "#08060e",
  bg2:        "#0e0b18",
  bg3:        "#140f22",
  cardBg:     "rgba(22,17,36,0.72)",
  border:     "rgba(255,255,255,0.10)",
  borderHover:"rgba(255,255,255,0.18)",
  text:       "rgba(255,255,255,0.90)",
  text2:      "rgba(255,255,255,0.50)",
  text3:      "rgba(255,255,255,0.25)",
  gold:       "#d4af37",
  goldSoft:   "rgba(212,175,55,0.20)",
  goldGlow:   "rgba(212,175,55,0.12)",

  // Akzentfarben
  accent: {
    gold:   "#d4af37",
    purple: "#a78bfa",
    cyan:   "#22d3ee",
    rose:   "#f472b6",
    green:  "#4ade80",
    blue:   "#7eb8da",
  },

  // Glasmorphism (Hybrid: nicht voll transparent, nicht voll solid)
  glass: {
    blur:    14,       // px
    opacity: 0.72,     // cardBg alpha — 72% solid, 28% durchsichtig
  },

  // Radien
  radius:  18,  // px — Standard für Karten
  radius2: 22,  // px — für große Container
  radiusSm: 10, // px — für Buttons, Tags

  // Tilt-Effekt (Subtle Preset)
  tilt: {
    maxDeg:         6,    // Maximaler Kipp-Winkel in Grad
    glowStrength:   0.2,  // 0-1 Stärke des farbigen Leuchtens
    borderStrength: 0.08, // Basis-Border-Opacity
    scale:          1.015,// Leichte Vergrößerung beim Hover
  },

  // Transitions
  transition: {
    page:  "0.5s cubic-bezier(0.4, 0, 0.2, 1)",   // Seitenwechsel
    card:  "0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",  // Karten-Hover
    tiltReturn: "0.5s cubic-bezier(0.2, 0.8, 0.2, 1)", // Tilt zurück auf 0
    fast:  "0.25s ease",                             // Buttons, kleine Elemente
  },

  // Schatten
  shadow: {
    card:     "0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
    cardHover:"0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
  },

  // Fonts
  font: {
    body:    "'DM Sans', sans-serif",
    serif:   "'Cormorant Garamond', serif",
    display: "'Cinzel', serif",
  },

  // Layout
  layout: {
    topbarH:  56,  // px
    bottomNavH: 70, // px
    maxWidth: 430, // px — Mobile-First
  },
} as const;

// Akzentfarbe für eine Karte abrufen
export function accentColor(color: string): string {
  return TOKENS.accent[color as keyof typeof TOKENS.accent] || TOKENS.accent.gold;
}
