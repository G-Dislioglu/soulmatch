interface AstroPlanet { key: string; lon: number; signKey: string; degreeInSign: number; }

const PLANET_ICON: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};
const PLANET_DE: Record<string, string> = {
  sun: 'Sonne', moon: 'Mond', mercury: 'Merkur', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptun', pluto: 'Pluto',
};

interface AspectDef { name: string; angle: number; orb: number; glyph: string; color: string; quality: string; meaning: string; }
const ASPECT_DEFS: AspectDef[] = [
  { name: 'Konjunktion', angle: 0, orb: 8, glyph: '☌', color: '#d4af37', quality: 'Fusion', meaning: 'Verschmelzung der Energien — intensiv und bedeutsam.' },
  { name: 'Opposition', angle: 180, orb: 8, glyph: '☍', color: '#ef4444', quality: 'Spannung', meaning: 'Magnetische Anziehung durch Polarität — wachstumsreich.' },
  { name: 'Trigon', angle: 120, orb: 6, glyph: '△', color: '#22c55e', quality: 'Harmonie', meaning: 'Natürlicher Fluss und gegenseitige Unterstützung.' },
  { name: 'Quadrat', angle: 90, orb: 6, glyph: '□', color: '#f59e0b', quality: 'Herausforderung', meaning: 'Reibung, die Wachstum erzeugt — dynamische Spannung.' },
  { name: 'Sextil', angle: 60, orb: 4, glyph: '✶', color: '#38bdf8', quality: 'Chance', meaning: 'Sanfte Harmonie und gegenseitige Ergänzung.' },
];

const KEY_PAIRS = ['sun-moon', 'sun-venus', 'moon-venus', 'sun-mars', 'moon-mars', 'venus-mars', 'sun-sun', 'moon-moon'];

function angleDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

interface SynastryAspectsProps { planetsA: AstroPlanet[]; planetsB: AstroPlanet[]; nameA: string; nameB: string; }

export function SynastryAspects({ planetsA, planetsB, nameA, nameB }: SynastryAspectsProps) {
  const mapA = new Map(planetsA.map((p) => [p.key, p]));
  const mapB = new Map(planetsB.map((p) => [p.key, p]));

  // Compute aspects for key pairs + all remaining
  const aspects: { a: string; b: string; def: AspectDef; orb: number }[] = [];
  const allPairs: [string, string][] = [
    ...KEY_PAIRS.map((kp) => kp.split('-') as [string, string]),
  ];
  // Also add outer planet pairs
  ['sun', 'moon', 'venus', 'mars'].forEach((pa) => {
    ['jupiter', 'saturn', 'uranus', 'neptune'].forEach((pb) => {
      allPairs.push([pa, pb]);
    });
  });

  allPairs.forEach(([ka, kb]) => {
    const pA = mapA.get(ka);
    const pB = mapB.get(kb);
    if (!pA || !pB) return;
    const diff = angleDiff(pA.lon, pB.lon);
    for (const def of ASPECT_DEFS) {
      const orbDiff = Math.abs(diff - def.angle);
      if (orbDiff <= def.orb) {
        aspects.push({ a: ka, b: kb, def, orb: orbDiff });
        break;
      }
    }
  });

  // Sort by harmoniousness and orb tightness
  const ORDER = ['conjunction', 'trine', 'sextile', 'opposition', 'square'];
  aspects.sort((x, y) => {
    const xi = ORDER.indexOf(x.def.name.toLowerCase().replace('ä', 'a').replace('ü', 'u').replace('o', 'o'));
    const yi = ORDER.indexOf(y.def.name.toLowerCase().replace('ä', 'a').replace('ü', 'u').replace('o', 'o'));
    if (xi !== yi) return (xi === -1 ? 9 : xi) - (yi === -1 ? 9 : yi);
    return x.orb - y.orb;
  });

  const topAspects = aspects.slice(0, 7);

  if (topAspects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 12, fontSize: 11, color: '#4a4540' }}>
        Keine Synastrie-Aspekte berechnet.<br />
        <span style={{ fontSize: 9, color: '#3a3530' }}>Geburtshoroskope beider Profile benötigt.</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {nameA.split(' ')[0]} × {nameB.split(' ')[0]} · {topAspects.length} Aspekte
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {topAspects.map(({ a, b, def, orb }, i) => (
          <div key={i} style={{ padding: '7px 10px', borderRadius: 8, background: `${def.color}07`, border: `1px solid ${def.color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13, color: def.color, flexShrink: 0 }}>{def.glyph}</span>
              <span style={{ fontSize: 10, color: '#d4ccbc', fontWeight: 600 }}>
                {PLANET_ICON[a] ?? ''} {PLANET_DE[a] ?? a}(A)
              </span>
              <span style={{ fontSize: 9, color: '#3a3530' }}>—</span>
              <span style={{ fontSize: 10, color: '#d4ccbc', fontWeight: 600 }}>
                {PLANET_ICON[b] ?? ''} {PLANET_DE[b] ?? b}(B)
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 8, color: def.color, padding: '1px 5px', borderRadius: 4, background: `${def.color}12`, flexShrink: 0 }}>{def.quality}</span>
              <span style={{ fontSize: 8, color: '#3a3530', flexShrink: 0 }}>{orb.toFixed(1)}°</span>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.5, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{def.meaning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
