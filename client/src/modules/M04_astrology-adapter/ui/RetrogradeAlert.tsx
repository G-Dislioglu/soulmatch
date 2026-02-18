import { useState, useEffect } from 'react';
import type { AstrologyResult } from '../../../shared/types/astrology';

const PLANET_DE: Record<string, string> = {
  mercury: 'Merkur', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun', pluto: 'Pluto',
};
const PLANET_ICON: Record<string, string> = {
  mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};
const RETROGRADE_TIPS: Record<string, string> = {
  mercury: 'Verträge prüfen, Kommunikation doppelt checken, Reisen mit Puffer planen.',
  venus: 'Keine neuen Beziehungen starten — alte Verbindungen reflektieren.',
  mars: 'Impulse bremsen, Energie weise einsetzen, Konflikte vermeiden.',
  jupiter: 'Inneres Wachstum statt äußerer Expansion — Weisheit vertiefen.',
  saturn: 'Vergangene Strukturen prüfen, Verantwortlichkeiten neu bewerten.',
  uranus: 'Innere Rebellionen integrieren, persönliche Freiheit neu definieren.',
  neptune: 'Illusionen auflösen, Träume hinterfragen, Klarheit suchen.',
  pluto: 'Tiefe Transformation von innen — Kontrolle loslassen.',
};

export function RetrogradeAlert() {
  const [retrogrades, setRetrogrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch('/api/astro/calc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthDate: today, unknownTime: true }),
    })
      .then((r) => r.json() as Promise<AstrologyResult>)
      .then((data) => {
        const rx = (data.planets ?? [])
          .filter((p) => p.retro && PLANET_DE[p.key])
          .map((p) => p.key);
        setRetrogrades(rx);
      })
      .catch(() => setRetrogrades([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (retrogrades.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: '#22c55e' }}>
        ✦ Aktuell keine Planeten rückläufig — klarer Himmelsweg
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        ⚠ {retrogrades.length} Rückläufige{retrogrades.length > 1 ? ' Planeten' : 'r Planet'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {retrogrades.map((key) => {
          const tip = RETROGRADE_TIPS[key] ?? 'Energie nach innen richten.';
          return (
            <div key={key} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderRadius: 9, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)' }}>
              <div style={{ fontSize: 16, flexShrink: 0, color: '#f59e0b' }}>{PLANET_ICON[key] ?? '✦'}ℛ</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', marginBottom: 2 }}>
                  {PLANET_DE[key]} Retrograd
                </div>
                <div style={{ fontSize: 10, color: '#5a5448', lineHeight: 1.5 }}>{tip}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
