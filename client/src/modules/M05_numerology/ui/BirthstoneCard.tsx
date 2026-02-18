import { calcLifePath } from '../lib/calc';

interface StoneDef {
  name: string;
  color: string;
  hex: string;
  element: string;
  planet: string;
  properties: string[];
  mantra: string;
}

const STONES: Record<number, StoneDef> = {
  1: { name: 'Rubin', color: 'Tiefrot', hex: '#e11d48', element: 'Feuer', planet: '☉ Sonne', properties: ['Lebenskraft', 'Mut', 'Leidenschaft', 'Führungsstärke'], mantra: 'Ich brenne mit klarem Feuer und führe meinen Weg.' },
  2: { name: 'Mondstein', color: 'Perlweiß', hex: '#c8d4e8', element: 'Wasser', planet: '☽ Mond', properties: ['Intuition', 'Emotionale Balance', 'Sensibilität', 'Weiblichkeit'], mantra: 'Ich fließe mit dem Rhythmus meines Herzens.' },
  3: { name: 'Citrin', color: 'Sonnengelb', hex: '#f59e0b', element: 'Feuer', planet: '♃ Jupiter', properties: ['Kreativität', 'Freude', 'Optimismus', 'Manifestation'], mantra: 'Ich erschaffe Licht und Freude in der Welt.' },
  4: { name: 'Jaspis', color: 'Terrakotta', hex: '#b45309', element: 'Erde', planet: '♄ Saturn', properties: ['Stabilität', 'Schutz', 'Geduld', 'Erdung'], mantra: 'Ich baue auf festem Fundament — Schritt für Schritt.' },
  5: { name: 'Türkis', color: 'Himmelblau', hex: '#0891b2', element: 'Luft', planet: '☿ Merkur', properties: ['Freiheit', 'Kommunikation', 'Abenteuer', 'Schutz'], mantra: 'Ich reise offen durch das Leben.' },
  6: { name: 'Smaragd', color: 'Sattgrün', hex: '#059669', element: 'Erde', planet: '♀ Venus', properties: ['Liebe', 'Heilung', 'Harmonie', 'Wachstum'], mantra: 'Ich nähre und werde genährt in bedingungsloser Liebe.' },
  7: { name: 'Amethyst', color: 'Violett', hex: '#7c3aed', element: 'Luft', planet: '♆ Neptun', properties: ['Spiritualität', 'Intuition', 'Klarheit', 'Schutz'], mantra: 'Ich höre die Stille und finde darin Wahrheit.' },
  8: { name: 'Onyx', color: 'Tiefschwarz', hex: '#d4af37', element: 'Erde', planet: '♄ Saturn', properties: ['Stärke', 'Willenskraft', 'Schutz', 'Manifestation'], mantra: 'Ich manifestiere Fülle durch Integrität und Kraft.' },
  9: { name: 'Granat', color: 'Dunkelrot', hex: '#9f1239', element: 'Feuer', planet: '♂ Mars', properties: ['Leidenschaft', 'Vollendung', 'Mitgefühl', 'Transformation'], mantra: 'Ich vollende, was ich begann, mit Liebe im Herzen.' },
  11: { name: 'Bergkristall', color: 'Kristallklar', hex: '#c084fc', element: 'Äther', planet: '☽☉ Mond/Sonne', properties: ['Erleuchtung', 'Amplifikation', 'Klarheit', 'Channeling'], mantra: 'Ich bin ein klarer Kanal des göttlichen Lichts.' },
  22: { name: 'Lapislazuli', color: 'Tiefblau', hex: '#1d4ed8', element: 'Äther', planet: '♄♃ Saturn/Jupiter', properties: ['Weisheit', 'Wahrheit', 'Vision', 'Manifestation'], mantra: 'Ich baue das Ewige im Dienst der Menschheit.' },
  33: { name: 'Rose Quarz', color: 'Zartrosa', hex: '#fda4af', element: 'Wasser', planet: '♀♃ Venus/Jupiter', properties: ['Bedingungslose Liebe', 'Heilung', 'Mitgefühl', 'Frieden'], mantra: 'Ich bin ein Kanal reiner Liebe für alle Wesen.' },
};

const DEFAULT_STONE: StoneDef = { name: 'Rosenquarz', color: 'Rosa', hex: '#f472b6', element: 'Wasser', planet: '♀ Venus', properties: ['Liebe', 'Harmonie', 'Heilung', 'Mitgefühl'], mantra: 'Ich öffne mein Herz für Liebe in all ihren Formen.' };

interface BirthstoneCardProps { birthDate: string; }

export function BirthstoneCard({ birthDate }: BirthstoneCardProps) {
  const lp = calcLifePath(birthDate);
  const stone: StoneDef = STONES[lp.value] ?? DEFAULT_STONE;

  return (
    <div>
      {/* Stone visual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        {/* Diamond SVG */}
        <svg width={54} height={54} viewBox="0 0 54 54" style={{ flexShrink: 0 }}>
          <defs>
            <radialGradient id={`stoneGrad${lp.value}`} cx="40%" cy="35%">
              <stop offset="0%" stopColor="white" stopOpacity="0.5" />
              <stop offset="40%" stopColor={stone.hex} stopOpacity="0.9" />
              <stop offset="100%" stopColor={stone.hex} stopOpacity="0.6" />
            </radialGradient>
          </defs>
          {/* Gem shape */}
          <polygon points="27,4 50,18 50,36 27,50 4,36 4,18"
            fill={`url(#stoneGrad${lp.value})`}
            stroke={stone.hex}
            strokeWidth="1"
          />
          <polygon points="27,4 50,18 27,27" fill="rgba(255,255,255,0.15)" />
          <polygon points="27,4 4,18 27,27" fill="rgba(255,255,255,0.08)" />
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </svg>

        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: stone.hex, lineHeight: 1.2 }}>{stone.name}</div>
          <div style={{ fontSize: 10, color: stone.hex, opacity: 0.7 }}>{stone.color}</div>
          <div style={{ fontSize: 9, color: '#4a4540', marginTop: 2 }}>
            {stone.element} · {stone.planet}
          </div>
        </div>
      </div>

      {/* Properties */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {stone.properties.map((p) => (
          <span key={p} style={{ fontSize: 9, color: stone.hex, padding: '2px 7px', borderRadius: 5, background: `${stone.hex}10`, border: `1px solid ${stone.hex}25` }}>{p}</span>
        ))}
      </div>

      {/* Mantra */}
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: '#8a8278', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', borderLeft: `2px solid ${stone.hex}40`, paddingLeft: 10 }}>
        "{stone.mantra}"
      </p>
    </div>
  );
}
