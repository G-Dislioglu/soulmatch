// Planet synodic periods and personal rhythm based on birth date
const PLANETS = [
  { name: 'Merkur', icon: '☿', color: '#fbbf24', period: 88, quality: 'Kommunikation & Denken' },
  { name: 'Venus', icon: '♀', color: '#f472b6', period: 225, quality: 'Liebe & Werte' },
  { name: 'Mars', icon: '♂', color: '#ef4444', period: 687, quality: 'Energie & Antrieb' },
  { name: 'Jupiter', icon: '♃', color: '#a3e635', period: 4333, quality: 'Wachstum & Weisheit' },
  { name: 'Saturn', icon: '♄', color: '#818cf8', period: 10759, quality: 'Struktur & Lektionen' },
];

function getPlanetPhase(birthDate: string, period: number): { pct: number; phase: string; label: string } {
  const parts = birthDate.split('-');
  const born = new Date(parseInt(parts[0]!, 10), parseInt(parts[1]!, 10) - 1, parseInt(parts[2]!, 10));
  const daysSinceBirth = (Date.now() - born.getTime()) / 86400000;
  const cyclePct = (daysSinceBirth % period) / period;
  const pct = Math.round(cyclePct * 100);

  let phase: string;
  let label: string;
  if (cyclePct < 0.25) { phase = 'Aufbau'; label = 'Neue Energie entsteht'; }
  else if (cyclePct < 0.5) { phase = 'Expansion'; label = 'Volle Kraft voraus'; }
  else if (cyclePct < 0.75) { phase = 'Ernte'; label = 'Früchte sammeln'; }
  else { phase = 'Rückzug'; label = 'Integrieren & loslassen'; }

  return { pct, phase, label };
}

interface PlanetRhythmProps { birthDate: string; }

export function PlanetRhythm({ birthDate }: PlanetRhythmProps) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Persönlicher Planeten-Rhythmus
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PLANETS.map(p => {
          const { pct, phase, label } = getPlanetPhase(birthDate, p.period);
          return (
            <div key={p.name} style={{ padding: '8px 11px', borderRadius: 9, background: `${p.color}07`, border: `1px solid ${p.color}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 14, minWidth: 18 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: p.color }}>{p.name}</span>
                    <span style={{ fontSize: 8, color: p.color, padding: '1px 5px', borderRadius: 4, background: `${p.color}15` }}>{phase} · {pct}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${p.color}80, ${p.color})`, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 8, color: '#5a5448' }}>{p.quality}</span>
                <span style={{ fontSize: 8, color: '#3a3530', fontStyle: 'italic' }}>{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        Basiert auf deinem Geburtstag · Planetare Zyklusposition
      </div>
    </div>
  );
}
