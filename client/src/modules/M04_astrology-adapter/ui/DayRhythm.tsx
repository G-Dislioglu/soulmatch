// Chaldean order of planets for hour rulers
const CHALDEAN = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'] as const;
type Planet = typeof CHALDEAN[number];

const DAY_START_PLANET: Record<number, Planet> = {
  0: 'sun', 1: 'moon', 2: 'mars', 3: 'mercury', 4: 'jupiter', 5: 'venus', 6: 'saturn',
};

const PLANET_ICON: Record<Planet, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄',
};
const PLANET_DE: Record<Planet, string> = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};
const PLANET_COLOR: Record<Planet, string> = {
  sun: '#fbbf24', moon: '#38bdf8', mercury: '#a3e635', venus: '#f472b6',
  mars: '#ef4444', jupiter: '#d4af37', saturn: '#a78bfa',
};
const PLANET_ENERGY: Record<Planet, string> = {
  sun: 'Vitalität', moon: 'Intuition', mercury: 'Geist', venus: 'Liebe',
  mars: 'Energie', jupiter: 'Wachstum', saturn: 'Struktur',
};

function getPlanetHour(dow: number, hour: number): Planet {
  const startIdx = CHALDEAN.indexOf(DAY_START_PLANET[dow]!);
  const idx = (startIdx + hour) % 7;
  return CHALDEAN[idx]!;
}

export function DayRhythm() {
  const now = new Date();
  const dow = now.getDay();
  const currentHour = now.getHours();

  const hours = Array.from({ length: 24 }, (_, h) => ({
    h,
    planet: getPlanetHour(dow, h),
    isCurrent: h === currentHour,
    isPast: h < currentHour,
  }));

  const currentPlanet = hours[currentHour]?.planet ?? 'sun';
  const currentColor = PLANET_COLOR[currentPlanet];

  return (
    <div>
      {/* Current hour highlight */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 12px', borderRadius: 9, background: `${currentColor}0f`, border: `1px solid ${currentColor}30` }}>
        <span style={{ fontSize: 20 }}>{PLANET_ICON[currentPlanet]}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: currentColor, fontFamily: "'Cormorant Garamond', serif" }}>
            Stunde {currentHour}:00 · {PLANET_DE[currentPlanet]}
          </div>
          <div style={{ fontSize: 10, color: '#5a5448' }}>{PLANET_ENERGY[currentPlanet]}</div>
        </div>
      </div>

      {/* 24h grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
        {hours.map(({ h, planet, isCurrent, isPast }) => {
          const color = PLANET_COLOR[planet];
          return (
            <div key={h} style={{
              textAlign: 'center', padding: '4px 2px', borderRadius: 6,
              background: isCurrent ? `${color}18` : 'rgba(255,255,255,0.02)',
              border: `${isCurrent ? 1.5 : 1}px solid ${isCurrent ? color + '50' : 'rgba(255,255,255,0.05)'}`,
              opacity: isPast ? 0.45 : 1,
            }}>
              <div style={{ fontSize: 7, color: isPast ? '#2a2520' : '#3a3530' }}>{h}h</div>
              <div style={{ fontSize: 10 }}>{PLANET_ICON[planet]}</div>
              <div style={{ fontSize: 6, color: isCurrent ? color : '#2a2520', lineHeight: 1 }}>{PLANET_DE[planet].slice(0, 3)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        Chaldäische Stunden · Herrscher nach traditioneller Astrologie
      </div>
    </div>
  );
}
