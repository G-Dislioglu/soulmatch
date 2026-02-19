import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

const GEOMETRIES: Record<number, { name: string; shape: string; meaning: string; color: string }> = {
  1: { name: 'Punkt', shape: '·', meaning: 'Der Ursprung aller Formen — Einheit, Fokus, das ungeteilte Selbst', color: '#ef4444' },
  2: { name: 'Linie', shape: '—', meaning: 'Die erste Verbindung — Polarität, Brücke, der Raum zwischen zwei Wesen', color: '#93c5fd' },
  3: { name: 'Dreieck', shape: '△', meaning: 'Stärkste Form der Natur — Schöpferkraft, Trinität, die Pyramide', color: '#fbbf24' },
  4: { name: 'Quadrat', shape: '□', meaning: 'Das Fundament der Erde — Stabilität, vier Elemente, das Haus', color: '#a16207' },
  5: { name: 'Pentagramm', shape: '⭐', meaning: 'Stern des Lebens — fünf Elemente, Bewegung, das Menschliche', color: '#22d3ee' },
  6: { name: 'Hexagramm', shape: '✡', meaning: 'Stern Davids — Himmel trifft Erde, Herz des Universums, Gleichgewicht', color: '#22c55e' },
  7: { name: 'Heptagon', shape: '⬡', meaning: 'Sieben Himmelslichter — Vollkommenheit, das Kristall, das Chakra-System', color: '#7c3aed' },
  8: { name: 'Oktagon', shape: '⯃', meaning: 'Die Unendlichkeit — ∞ als Fläche, kosmische Ordnung, Manifestation', color: '#d4af37' },
  9: { name: 'Enneagramm', shape: '✤', meaning: 'Der vollendete Kreis — alles in allem, universelle Liebe, Vollendung', color: '#c026d3' },
};

const PAIR_GEOMETRIES: Record<number, { name: string; meaning: string }> = {
  1: { name: 'Vereinte Achse', meaning: 'Eure Verbindung schafft einen gemeinsamen Pol — kraftvoll und fokussiert' },
  2: { name: 'Gespiegelte Linie', meaning: 'Ihr seid zwei Hälften eines vollständigen Musters — perfekte Spiegelung' },
  3: { name: 'Heiliges Dreieck', meaning: 'Eure Verbindung bildet eine Trinität — Schöpferkraft zu dritt: Ich, Du, Wir' },
  4: { name: 'Kosmisches Quadrat', meaning: 'Ihr baut gemeinsam ein unerschütterliches Fundament — der Tempel eurer Liebe' },
  5: { name: 'Lebendiger Stern', meaning: 'Eure Verbindung pulsiert wie ein Stern — Lebenskraft und Bewegung' },
  6: { name: 'Herzens-Hexagramm', meaning: 'Himmel und Erde vereinen sich in eurer Liebe — vollkommene Balance' },
  7: { name: 'Kristall der Weisheit', meaning: 'Eure Verbindung trägt die sieben Qualitäten des Lichts — tief und klar' },
  8: { name: 'Unendlichkeitsfeld', meaning: 'Eure Liebe trägt das ∞-Zeichen — kein Anfang, kein Ende, nur Sein' },
  9: { name: 'Vollendeter Kreis', meaning: 'Eure Verbindung ist vollständig — sie enthält alle Formen, alle Möglichkeiten' },
};

interface SoulGeometryProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SoulGeometry({ nameA, birthDateA, nameB, birthDateB }: SoulGeometryProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const pairNum = reduceToNumber(lpA + lpB) || 9;

  const geoA = GEOMETRIES[lpA] ?? GEOMETRIES[9]!;
  const geoB = GEOMETRIES[lpB] ?? GEOMETRIES[9]!;
  const pairGeo = PAIR_GEOMETRIES[pairNum] ?? PAIR_GEOMETRIES[9]!;
  const pairColor = GEOMETRIES[pairNum]?.color ?? '#d4af37';

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Heilige Geometrie
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: pairColor }}>{pairGeo.name}</div>
      </div>

      {/* Individual geometry cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[{ first: firstA, lp: lpA, geo: geoA }, { first: firstB, lp: lpB, geo: geoB }].map(({ first, lp, geo }) => (
          <div key={first} style={{ padding: '10px 10px', borderRadius: 10, background: `${geo.color}08`, border: `1px solid ${geo.color}22`, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{geo.shape}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: geo.color }}>{geo.name}</div>
            <div style={{ fontSize: 7, color: '#3a3530', marginTop: 1 }}>LP {lp} · {first}</div>
            <div style={{ fontSize: 7, color: '#5a5448', marginTop: 4, lineHeight: 1.3 }}>{geo.meaning}</div>
          </div>
        ))}
      </div>

      {/* Pair geometry */}
      <div style={{ padding: '11px 14px', borderRadius: 11, background: `${pairColor}08`, border: `1px solid ${pairColor}22`, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 20 }}>{GEOMETRIES[pairNum]?.shape ?? '✦'}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: pairColor }}>{pairGeo.name} (Paarzahl {pairNum})</div>
          </div>
        </div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>{pairGeo.meaning}</p>
      </div>

      <div style={{ fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        LP {lpA} + LP {lpB} = Paarzahl {pairNum} · Heilige Geometrie eurer Seelenzahl
      </div>
    </div>
  );
}
