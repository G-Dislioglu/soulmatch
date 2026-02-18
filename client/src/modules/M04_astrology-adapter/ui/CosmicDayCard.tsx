import { useState, useEffect } from 'react';

interface TodayPlanet { key: string; signDe: string; degreeInSign: number; }
interface TodayResponse {
  date: string;
  planets: TodayPlanet[];
  elements: { fire: number; earth: number; air: number; water: number };
  dominantElement: string;
  moonPhase: string;
  moonPhaseAngle: number;
  sunSign: string;
  moonSign: string;
}

const EL_COLOR: Record<string, string> = {
  fire: '#f97316', earth: '#84cc16', air: '#38bdf8', water: '#818cf8',
};
const EL_DE: Record<string, string> = {
  fire: 'Feuer', earth: 'Erde', air: 'Luft', water: 'Wasser',
};
const EL_EMOJI: Record<string, string> = {
  fire: '🔥', earth: '🌿', air: '💨', water: '🌊',
};
const MOON_PHASE_SYMBOL: Record<string, string> = {
  'Neumond': '🌑', 'Zunehmende Sichel': '🌒', 'Erstes Viertel': '🌓',
  'Zunehmender Halbmond': '🌔', 'Vollmond': '🌕', 'Abnehmender Halbmond': '🌖',
  'Letztes Viertel': '🌗', 'Abnehmende Sichel': '🌘',
};
const SHOW_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const PLANET_SYMBOL: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
};
const PLANET_DE: Record<string, string> = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars',
};
const PLANET_COLOR: Record<string, string> = {
  sun: '#fbbf24', moon: '#c084fc', mercury: '#38bdf8', venus: '#f472b6', mars: '#ef4444',
};

const WEEKDAY_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function CosmicDayCard() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/astro/today');
        const json = await res.json().catch(() => null) as TodayResponse | null;
        if (!cancelled) {
          if (!res.ok || !json) throw new Error(`HTTP ${res.status}`);
          setData(json);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Fehler');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const today = new Date();
  const dayName = WEEKDAY_DE[today.getDay()];
  const dateStr = today.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '18px 0', color: '#38bdf8', fontSize: 12 }}>
        Channeling kosmische Energien…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ fontSize: 11, color: '#fca5a5', padding: '8px 0' }}>
        Kosmische Verbindung unterbrochen: {error}
      </div>
    );
  }

  const domColor = EL_COLOR[data.dominantElement] ?? '#d4af37';
  const moonSymbol = MOON_PHASE_SYMBOL[data.moonPhase] ?? '🌙';
  const totalPlanets = Object.values(data.elements).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      {/* Date header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#7a7468', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{dayName}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: '#f0eadc', lineHeight: 1.2 }}>{dateStr}</div>
      </div>

      {/* Moon + Sun row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)' }}>
          <div style={{ fontSize: 18 }}>{moonSymbol}</div>
          <div style={{ fontSize: 10, color: '#c084fc', fontWeight: 600, marginTop: 4 }}>{data.moonPhase}</div>
          <div style={{ fontSize: 10, color: '#7a7468' }}>im {data.moonSign}</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div style={{ fontSize: 18 }}>☉</div>
          <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 600, marginTop: 4 }}>Sonne</div>
          <div style={{ fontSize: 10, color: '#7a7468' }}>im {data.sunSign}</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: `${domColor}0e`, border: `1px solid ${domColor}28` }}>
          <div style={{ fontSize: 18 }}>{EL_EMOJI[data.dominantElement] ?? '✦'}</div>
          <div style={{ fontSize: 10, color: domColor, fontWeight: 600, marginTop: 4 }}>Dominant</div>
          <div style={{ fontSize: 10, color: '#7a7468' }}>{EL_DE[data.dominantElement] ?? ''}</div>
        </div>
      </div>

      {/* Element bars */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: '#7a7468', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Elementverteilung heute</div>
        {(Object.entries(data.elements) as [string, number][]).map(([el, count]) => (
          <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 40, fontSize: 10, color: EL_COLOR[el], textAlign: 'right' }}>{EL_DE[el]}</div>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ height: '100%', borderRadius: 2, background: EL_COLOR[el], width: `${(count / totalPlanets) * 100}%`, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ width: 14, fontSize: 10, color: '#4a4540' }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Inner planet positions */}
      <div style={{ fontSize: 10, color: '#7a7468', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Planeten heute</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {data.planets.filter((p) => SHOW_PLANETS.includes(p.key)).map((planet) => {
          const color = PLANET_COLOR[planet.key] ?? '#a09a8e';
          return (
            <div key={planet.key} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 9px', borderRadius: 8,
              background: `${color}10`, border: `1px solid ${color}30`,
            }}>
              <span style={{ fontSize: 13, color }}>{PLANET_SYMBOL[planet.key]}</span>
              <div>
                <div style={{ fontSize: 10, color: '#c8c0b0', fontWeight: 600 }}>{PLANET_DE[planet.key]}</div>
                <div style={{ fontSize: 9, color: '#7a7468' }}>{planet.degreeInSign.toFixed(0)}° {planet.signDe}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
