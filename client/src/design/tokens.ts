// Soulmatch design tokens.
// This file is the canonical token surface for the redesign foundation.

export const TOKENS = {
  // Backgrounds
  bg: "#08060e",
  bg2: "#0d0a1a",
  bg3: "#13102a",
  card: "rgba(18,14,32,0.97)",
  card2: "rgba(22,17,42,0.95)",

  // Borders
  b1: "rgba(255,255,255,0.22)",
  b2: "rgba(255,255,255,0.14)",
  b3: "rgba(255,255,255,0.08)",

  // Text
  text: "rgba(255,255,255,0.92)",
  text2: "rgba(255,255,255,0.55)",
  text3: "rgba(255,255,255,0.28)",

  // Accents
  gold: "#d4af37",
  goldSoft: "rgba(212,175,55,0.25)",
  goldGlow: "rgba(212,175,55,0.10)",
  green: "#4ade80",
  greenSoft: "rgba(74,222,128,0.25)",
  purple: "#a78bfa",
  cyan: "#22d3ee",
  rose: "#f472b6",

  // Backward-compatible aliases used by current components
  cardBg: "rgba(18,14,32,0.97)",
  border: "rgba(255,255,255,0.14)",
  borderHover: "rgba(255,255,255,0.22)",

  accent: {
    gold: "#d4af37",
    purple: "#a78bfa",
    cyan: "#22d3ee",
    rose: "#f472b6",
    green: "#4ade80",
    blue: "#22d3ee",
  },

  glass: {
    blur: 14,
    opacity: 0.95,
  },

  radius: 18,
  radius2: 18,
  radiusSm: 12,
  radiusPill: 20,
  radiusRound: 24,

  tilt: {
    maxDeg: 6,
    glowStrength: 0.2,
    borderStrength: 0.14,
    scale: 1.015,
  },

  transition: {
    page: "0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    card: "0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
    tiltReturn: "0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
    fast: "0.25s ease",
  },

  shadow: {
    sidebar: "3px 0 30px rgba(0,0,0,0.6)",
    topbar: "0 2px 20px rgba(0,0,0,0.4)",
    panel: "-4px 0 40px rgba(0,0,0,0.7)",
    dropdown: "0 8px 40px rgba(0,0,0,0.7)",
    card: "0 12px 36px rgba(0,0,0,0.45)",
    cardHover: "0 18px 48px rgba(0,0,0,0.55)",
  },

  font: {
    body: "'DM Sans', sans-serif",
    serif: "'Cormorant Garamond', serif",
    display: "'Cinzel', serif",
  },

  layout: {
    sidebarW: 248,
    topbarH: 58,
    bottomNavH: 70,
    maxWidth: 430,
  },
} as const;

export function accentColor(color: string): string {
  return TOKENS.accent[color as keyof typeof TOKENS.accent] || TOKENS.accent.gold;
}
