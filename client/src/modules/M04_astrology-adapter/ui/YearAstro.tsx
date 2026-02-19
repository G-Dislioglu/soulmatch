// Static yearly planet overview based on current year
// Key astrological themes per month (simplified, archetypal)

interface MonthTheme { month: string; planet: string; icon: string; color: string; theme: string; tip: string }

const MONTHLY_THEMES: MonthTheme[] = [
  { month: 'Jan', planet: 'Saturn', icon: '♄', color: '#a78bfa', theme: 'Struktur & Neuplanung', tip: 'Setze feste Vorsätze mit realistischem Fundament.' },
  { month: 'Feb', planet: 'Uranus', icon: '⛢', color: '#22d3ee', theme: 'Überraschungen & Wandel', tip: 'Bleib offen für unerwartete Wendungen.' },
  { month: 'Mär', planet: 'Mars', icon: '♂', color: '#ef4444', theme: 'Aktion & Initiative', tip: 'Handle jetzt — die Energie trägt dich.' },
  { month: 'Apr', planet: 'Venus', icon: '♀', color: '#f472b6', theme: 'Liebe & Schönheit', tip: 'Pflege wichtige Beziehungen bewusst.' },
  { month: 'Mai', planet: 'Merkur', icon: '☿', color: '#a3e635', theme: 'Kommunikation & Ideen', tip: 'Führe schwierige Gespräche jetzt — Merkur unterstützt.' },
  { month: 'Jun', planet: 'Mond', icon: '☽', color: '#94a3b8', theme: 'Gefühle & Intuition', tip: 'Hör auf dein inneres Wissen.' },
  { month: 'Jul', planet: 'Sonne', icon: '☉', color: '#fbbf24', theme: 'Vitalität & Ausdruck', tip: 'Zeige dich — die Sonne steht im Zenit.' },
  { month: 'Aug', planet: 'Jupiter', icon: '♃', color: '#d4af37', theme: 'Expansion & Glück', tip: 'Wachstumschancen wahrnehmen und vertrauen.' },
  { month: 'Sep', planet: 'Chiron', icon: '⚷', color: '#34d399', theme: 'Heilung & Wachstum', tip: 'Alte Wunden können jetzt heilen.' },
  { month: 'Okt', planet: 'Pluto', icon: '♇', color: '#7c3aed', theme: 'Transformation', tip: 'Lass los was nicht mehr dient — tiefgreifend.' },
  { month: 'Nov', planet: 'Mars', icon: '♂', color: '#ef4444', theme: 'Energie & Abschlüsse', tip: 'Vollende Projekte mit voller Kraft.' },
  { month: 'Dez', planet: 'Jupiter', icon: '♃', color: '#d4af37', theme: 'Dankbarkeit & Rückblick', tip: 'Würdige das Gejahr — und das kommende.' },
];

export function YearAstro() {
  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div style={{ fontSize: 9, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, textAlign: 'center' }}>
        Kosmische Jahres-Übersicht {currentYear}
      </div>

      {/* Current month highlight */}
      {(() => {
        const cm = MONTHLY_THEMES[currentMonth]!;
        return (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 11, background: `${cm.color}10`, border: `1px solid ${cm.color}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 20 }}>{cm.icon}</span>
              <div>
                <div style={{ fontSize: 8, color: '#5a5448' }}>Aktuell · {cm.month}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: cm.color }}>{cm.theme}</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#7a7468', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>✦ {cm.tip}</p>
          </div>
        );
      })()}

      {/* Month grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {MONTHLY_THEMES.map((m, i) => {
          const isActive = i === currentMonth;
          const isPast = i < currentMonth;
          return (
            <div key={i} style={{
              padding: '5px 4px', borderRadius: 7, textAlign: 'center',
              background: isActive ? `${m.color}15` : isPast ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isActive ? m.color + '40' : 'rgba(255,255,255,0.05)'}`,
              opacity: isPast ? 0.5 : 1,
            }}>
              <div style={{ fontSize: 7, color: isActive ? m.color : '#3a3530', fontWeight: isActive ? 700 : 400 }}>{m.month}</div>
              <div style={{ fontSize: 10 }}>{m.icon}</div>
              <div style={{ fontSize: 6, color: isActive ? m.color + 'cc' : '#3a3530', lineHeight: 1.2 }}>{m.theme.split(' ')[0]}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        Basiert auf universellen Planetenrhythmen · Kein Echtzeit-Ephemeris
      </div>
    </div>
  );
}
