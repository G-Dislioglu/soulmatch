// Planetary Hours — Chaldean order, approximate sunrise=06:00/sunset=18:00

const CHALDEAN: string[] = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];

// Day rulers (Sunday=0 .. Saturday=6)
const DAY_RULER_IDX = [3, 6, 2, 5, 1, 4, 0]; // sun, moon, mars, mercury, jupiter, venus, saturn

const PLANET_SYMBOL: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀',
  mars: '♂', jupiter: '♃', saturn: '♄',
};
const PLANET_DE: Record<string, string> = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};
const PLANET_COLOR: Record<string, string> = {
  sun: '#fbbf24', moon: '#c084fc', mercury: '#38bdf8', venus: '#f472b6',
  mars: '#ef4444', jupiter: '#d4af37', saturn: '#a3a3a3',
};

const APPROX_SUNRISE_H = 6;  // 06:00
const APPROX_SUNSET_H = 18; // 18:00

interface PlanetaryHour {
  hour: number;  // 1-24
  planet: string;
  startH: number; // decimal hour
  endH: number;
  isDaytime: boolean;
  isCurrent: boolean;
}

function computeHours(): PlanetaryHour[] {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const currentH = now.getHours() + now.getMinutes() / 60;

  const dayHourLen = (APPROX_SUNSET_H - APPROX_SUNRISE_H) / 12;  // 1.0 h
  const nightHourLen = (24 - APPROX_SUNSET_H + APPROX_SUNRISE_H) / 12; // 1.0 h

  const rulerIdx = DAY_RULER_IDX[dow] ?? 0;
  const hours: PlanetaryHour[] = [];

  // 12 daytime hours starting at sunrise
  for (let i = 0; i < 12; i++) {
    const startH = APPROX_SUNRISE_H + i * dayHourLen;
    const endH = startH + dayHourLen;
    const planetIdx = (rulerIdx + i) % 7;
    hours.push({
      hour: i + 1,
      planet: CHALDEAN[planetIdx] ?? 'sun',
      startH,
      endH,
      isDaytime: true,
      isCurrent: currentH >= startH && currentH < endH,
    });
  }

  // 12 nighttime hours starting at sunset
  for (let i = 0; i < 12; i++) {
    const base = APPROX_SUNSET_H + i * nightHourLen;
    const startH = base >= 24 ? base - 24 : base;
    const endH = startH + nightHourLen;
    const planetIdx = (rulerIdx + 12 + i) % 7;
    hours.push({
      hour: i + 13,
      planet: CHALDEAN[planetIdx] ?? 'moon',
      startH,
      endH,
      isDaytime: false,
      isCurrent: currentH >= startH && currentH < (startH + nightHourLen),
    });
  }

  return hours;
}

function fmtH(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h % 1) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const SHOW_HOURS = 8; // show next N hours around current

export function PlanetaryHours() {
  const hours = computeHours();
  const currentIdx = hours.findIndex((h) => h.isCurrent);
  const start = Math.max(0, currentIdx - 1);
  const visible = hours.slice(start, start + SHOW_HOURS);

  const now = new Date();
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayRuler = CHALDEAN[DAY_RULER_IDX[now.getDay()] ?? 0] ?? 'sun';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tag der</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: PLANET_COLOR[dayRuler] }}>
            {PLANET_SYMBOL[dayRuler]} {dayNames[now.getDay()]} · {PLANET_DE[dayRuler]}stag
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: '#7a7468', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Aktuelle Planetenstunden (≈ Sonnenauf/-untergang 6/18 Uhr)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {visible.map((ph) => {
          const color = PLANET_COLOR[ph.planet] ?? '#a09a8e';
          return (
            <div key={ph.hour} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 9,
              background: ph.isCurrent ? `${color}14` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${ph.isCurrent ? color + '45' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.2s',
            }}>
              {/* Hour number */}
              <div style={{ width: 20, fontSize: 10, color: '#4a4540', textAlign: 'right' }}>{ph.hour}</div>

              {/* Planet symbol */}
              <div style={{ width: 20, fontSize: 16, textAlign: 'center', color, flexShrink: 0 }}>
                {PLANET_SYMBOL[ph.planet]}
              </div>

              {/* Name */}
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: ph.isCurrent ? 700 : 400, color: ph.isCurrent ? '#f0eadc' : '#a09a8e' }}>
                  {PLANET_DE[ph.planet]}
                </span>
                {ph.isCurrent && (
                  <span style={{ fontSize: 9, color, fontWeight: 600, marginLeft: 6, padding: '1px 5px', borderRadius: 5, background: `${color}18`, border: `1px solid ${color}30` }}>
                    JETZT
                  </span>
                )}
              </div>

              {/* Time */}
              <div style={{ fontSize: 10, color: '#4a4540', textAlign: 'right' }}>
                {fmtH(ph.startH)}–{fmtH(ph.endH)}
              </div>

              {/* Day/Night */}
              <div style={{ fontSize: 11 }}>{ph.isDaytime ? '☀' : '☽'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
