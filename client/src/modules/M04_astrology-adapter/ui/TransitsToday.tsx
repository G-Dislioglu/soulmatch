// Simplified daily transits based on day-of-year archetypes
// Uses current date to derive symbolic planetary energies

const PLANET_PAIRS: { moving: string; natal: string; icon: string; color: string; aspect: string; effect: string; advice: string }[] = [
  { moving: 'Sonne', natal: 'Mond', icon: '☉☽', color: '#fbbf24', aspect: 'Sextil', effect: 'Harmonie zwischen Wille und Gefühl', advice: 'Ideal für emotionale Entscheidungen' },
  { moving: 'Mars', natal: 'Venus', icon: '♂♀', color: '#f472b6', aspect: 'Trigon', effect: 'Leidenschaft und Anziehung erhöht', advice: 'Nutze diese Energie für Verbindungen' },
  { moving: 'Merkur', natal: 'Jupiter', icon: '☿♃', color: '#a3e635', aspect: 'Konjunktion', effect: 'Gedanken fließen weit und klar', advice: 'Perfekt für große Gespräche und Pläne' },
  { moving: 'Venus', natal: 'Saturn', icon: '♀♄', color: '#a78bfa', aspect: 'Quadrat', effect: 'Spannung zwischen Liebe und Pflicht', advice: 'Grenzen in Beziehungen ansprechen' },
  { moving: 'Jupiter', natal: 'Neptun', icon: '♃♆', color: '#818cf8', aspect: 'Sextil', effect: 'Spirituelle Expansion und Intuition', advice: 'Öffne dich für größere Visionen' },
  { moving: 'Saturn', natal: 'Pluto', icon: '♄♇', color: '#7c3aed', aspect: 'Trigon', effect: 'Tiefe strukturelle Transformation', advice: 'Alte Muster können jetzt auflösen' },
  { moving: 'Mars', natal: 'Saturn', icon: '♂♄', color: '#ef4444', aspect: 'Opposition', effect: 'Energie vs. Struktur — Reibung möglich', advice: 'Geduld mit Hindernissen üben' },
  { moving: 'Venus', natal: 'Jupiter', icon: '♀♃', color: '#d4af37', aspect: 'Konjunktion', effect: 'Überfluss, Genuss und soziale Wärme', advice: 'Genieße Schönheit und Verbindungen' },
];

function getDailyTransits(): typeof PLANET_PAIRS {
  const d = new Date();
  const seed = d.getFullYear() * 1000 + Math.floor(d.getMonth() * 30 + d.getDate());
  // Pick 4 transits deterministically from today's seed
  const indices: number[] = [];
  let s = seed;
  while (indices.length < 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const i = s % PLANET_PAIRS.length;
    if (!indices.includes(i)) indices.push(i);
  }
  return indices.map(i => PLANET_PAIRS[i]!);
}

const ASPECT_POWER: Record<string, number> = {
  'Konjunktion': 5, 'Opposition': 3, 'Quadrat': 2, 'Trigon': 4, 'Sextil': 3,
};

export function TransitsToday() {
  const transits = getDailyTransits();
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
          Aktive Transite
        </div>
        <div style={{ fontSize: 9, color: '#3a3530' }}>{today}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {transits.map((t, i) => {
          const power = ASPECT_POWER[t.aspect] ?? 3;
          return (
            <div key={i} style={{ padding: '8px 11px', borderRadius: 9, background: `${t.color}07`, border: `1px solid ${t.color}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, minWidth: 24 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.color }}>{t.moving} — {t.natal}</span>
                    <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: `${t.color}15`, color: t.color }}>{t.aspect}</span>
                  </div>
                  {/* Power bar */}
                  <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                    {Array.from({ length: 5 }, (_, p) => (
                      <div key={p} style={{ height: 2, flex: 1, borderRadius: 1, background: p < power ? t.color : 'rgba(255,255,255,0.05)' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#7a7468', lineHeight: 1.4, marginBottom: 2, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
                {t.effect}
              </div>
              <div style={{ fontSize: 8, color: t.color }}>✦ {t.advice}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        Symbolische Transite · täglich aktualisiert
      </div>
    </div>
  );
}
