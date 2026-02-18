import { useState, useEffect } from 'react';
import type { AstrologyResult, PlanetPosition } from '../../../shared/types/astrology';

const SIGN_DE: Record<string, string> = {
  aries: 'Wid', taurus: 'Sti', gemini: 'Zwi', cancer: 'Kre',
  leo: 'Löw', virgo: 'Jun', libra: 'Waa', scorpio: 'Sko',
  sagittarius: 'Sch', capricorn: 'Stb', aquarius: 'Was', pisces: 'Fis',
};
const SIGN_FULL_DE: Record<string, string> = {
  aries: 'Widder', taurus: 'Stier', gemini: 'Zwillinge', cancer: 'Krebs',
  leo: 'Löwe', virgo: 'Jungfrau', libra: 'Waage', scorpio: 'Skorpion',
  sagittarius: 'Schütze', capricorn: 'Steinbock', aquarius: 'Wassermann', pisces: 'Fische',
};
const SIGN_COLOR: Record<string, string> = {
  aries: '#ef4444', taurus: '#22c55e', gemini: '#fbbf24', cancer: '#38bdf8',
  leo: '#f59e0b', virgo: '#84cc16', libra: '#c084fc', scorpio: '#dc2626',
  sagittarius: '#8b5cf6', capricorn: '#a16207', aquarius: '#0ea5e9', pisces: '#818cf8',
};
const PLANET_ICON: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};
const PLANET_DE: Record<string, string> = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun', pluto: 'Pluto',
};
const PRIMARY = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const OUTER = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

export function CurrentSkyCard() {
  const [result, setResult] = useState<AstrologyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOuter, setShowOuter] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch('/api/astro/calc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthDate: today, unknownTime: true }),
    })
      .then((r) => r.json() as Promise<AstrologyResult & { error?: string }>)
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Fehler'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 12, fontSize: 11, color: '#5a5448' }}>Heutigen Himmel berechnen…</div>;
  if (error || !result) return <div style={{ fontSize: 10, color: '#fca5a5', padding: 8 }}>⚠ {error ?? 'Keine Daten'}</div>;

  const byKey = new Map<string, PlanetPosition>(result.planets?.map((p) => [p.key, p]) ?? []);

  function PlanetRow({ planetKey }: { planetKey: string }) {
    const p = byKey.get(planetKey);
    if (!p) return null;
    const sign = p.pos?.sign ?? '';
    const color = SIGN_COLOR[sign] ?? '#a09a8e';
    const short = SIGN_DE[sign] ?? sign;
    const deg = typeof p.pos?.deg === 'number' ? `${p.pos.deg.toFixed(0)}°` : '';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ width: 16, textAlign: 'center', fontSize: 13, color, flexShrink: 0 }}>{PLANET_ICON[planetKey] ?? '✦'}</div>
        <div style={{ fontSize: 10, color: '#7a7468', width: 48, flexShrink: 0 }}>{PLANET_DE[planetKey] ?? planetKey}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color }}>
          {SIGN_FULL_DE[sign] ?? sign}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 9, color: '#4a4540' }}>{deg} {short}</div>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <div style={{ fontSize: 10, color: '#5a5448', marginBottom: 10 }}>{todayStr}</div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: '#d4af37', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Persönliche Planeten</div>
        {PRIMARY.map((k) => <PlanetRow key={k} planetKey={k} />)}
      </div>

      <button type="button" onClick={() => setShowOuter((v) => !v)}
        style={{ fontSize: 10, color: '#5a5448', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginBottom: showOuter ? 6 : 0 }}>
        {showOuter ? '▲ Äußere Planeten verbergen' : '▼ Äußere Planeten anzeigen'}
      </button>

      {showOuter && (
        <div>
          <div style={{ fontSize: 9, color: '#a09a8e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Äußere Planeten</div>
          {OUTER.map((k) => <PlanetRow key={k} planetKey={k} />)}
        </div>
      )}
    </div>
  );
}
