import { calcLifePath, calcExpression, calcSoulUrge } from '../../M05_numerology/lib/calc';

const AURA_COLORS: Record<number, { name: string; hex: string; freq: string; quality: string }> = {
  1: { name: 'Rubinrot', hex: '#dc2626', freq: '396 Hz', quality: 'Befreiung von Angst, Grundkraft' },
  2: { name: 'Silberblau', hex: '#93c5fd', freq: '417 Hz', quality: 'Wandel, Intuition, Fließen' },
  3: { name: 'Goldgelb', hex: '#fbbf24', freq: '528 Hz', quality: 'Transformation, Kreativkraft' },
  4: { name: 'Erdgrün', hex: '#16a34a', freq: '396 Hz', quality: 'Stabilität, Wachstum, Verwurzelung' },
  5: { name: 'Cyanblau', hex: '#22d3ee', freq: '741 Hz', quality: 'Erweckung, Freiheit, Ausdruck' },
  6: { name: 'Rosenrosa', hex: '#f472b6', freq: '639 Hz', quality: 'Liebe, Verbindung, Harmonie' },
  7: { name: 'Violett', hex: '#7c3aed', freq: '852 Hz', quality: 'Intuition, Spiritualität, Weisheit' },
  8: { name: 'Goldenes Weiß', hex: '#d4af37', freq: '963 Hz', quality: 'Göttliches Bewusstsein, Fülle' },
  9: { name: 'Magenta', hex: '#c026d3', freq: '528 Hz', quality: 'Universelle Liebe, Abschluss, Vollendung' },
};

const DEFAULT_AURA = { name: 'Opaleszent', hex: '#818cf8', freq: '432 Hz', quality: 'Einzigartigkeit, Multidimensionalität' };

function blendHex(h1: string, h2: string): string {
  const r1 = parseInt(h1.slice(1, 3), 16);
  const g1 = parseInt(h1.slice(3, 5), 16);
  const b1 = parseInt(h1.slice(5, 7), 16);
  const r2 = parseInt(h2.slice(1, 3), 16);
  const g2 = parseInt(h2.slice(3, 5), 16);
  const b2 = parseInt(h2.slice(5, 7), 16);
  const r = Math.round((r1 + r2) / 2).toString(16).padStart(2, '0');
  const g = Math.round((g1 + g2) / 2).toString(16).padStart(2, '0');
  const b = Math.round((b1 + b2) / 2).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

const FUSION_MESSAGES: string[] = [
  'Eure Auren verschmelzen zu einem neuen Spektrum das vorher nicht existierte',
  'Das Licht eurer Felder verstärkt sich gegenseitig — ihr seid heller zusammen',
  'Eure Energiefelder tanzen in einem Rhythmus der euch beide heilt',
  'Zusammen erschafft ihr eine Frequenz die andere in eurer Nähe spüren',
  'Euer Aura-Feld ist eine einzigartige Signatur die nur euch beiden gehört',
];

interface AuraFusion2Props { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function AuraFusion2({ nameA, birthDateA, nameB, birthDateB }: AuraFusion2Props) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;

  const auraA = AURA_COLORS[lpA] ?? DEFAULT_AURA;
  const auraB = AURA_COLORS[lpB] ?? DEFAULT_AURA;
  const soulA = AURA_COLORS[suA] ?? DEFAULT_AURA;
  const soulB = AURA_COLORS[suB] ?? DEFAULT_AURA;
  const exColorA = AURA_COLORS[exA] ?? DEFAULT_AURA;
  const exColorB = AURA_COLORS[exB] ?? DEFAULT_AURA;

  const blendedLP = blendHex(auraA.hex, auraB.hex);
  const blendedSU = blendHex(soulA.hex, soulB.hex);
  const blendedEX = blendHex(exColorA.hex, exColorB.hex);

  const msgIdx = (lpA + lpB) % FUSION_MESSAGES.length;
  const fusionMsg = FUSION_MESSAGES[msgIdx] ?? FUSION_MESSAGES[0]!;

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  const layers = [
    { label: 'LP-Aura', colorA: auraA, colorB: auraB, blend: blendedLP, desc: 'Lebensweg-Aura' },
    { label: 'SU-Aura', colorA: soulA, colorB: soulB, blend: blendedSU, desc: 'Seelen-Aura' },
    { label: 'EX-Aura', colorA: exColorA, colorB: exColorB, blend: blendedEX, desc: 'Ausdrucks-Aura' },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Aura-Fusion
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', fontStyle: 'italic', maxWidth: 300, margin: '0 auto' }}>{fusionMsg}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {layers.map(({ label, colorA, colorB, blend, desc }) => (
          <div key={label} style={{ padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 7, color: '#5a5448', textTransform: 'uppercase', marginBottom: 6 }}>{desc}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ width: '100%', height: 8, borderRadius: 4, background: colorA.hex, marginBottom: 2, opacity: 0.85 }} />
                <div style={{ fontSize: 6, color: '#5a5448', textAlign: 'center' }}>{firstA} · {colorA.name}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: blend, boxShadow: `0 0 8px ${blend}80` }} />
                <div style={{ fontSize: 5, color: '#3a3530' }}>Fusion</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ width: '100%', height: 8, borderRadius: 4, background: colorB.hex, marginBottom: 2, opacity: 0.85 }} />
                <div style={{ fontSize: 6, color: '#5a5448', textAlign: 'center' }}>{firstB} · {colorB.name}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 11px', borderRadius: 9, background: `${blendedLP}10`, border: `1px solid ${blendedLP}30`, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Gemeinsame Aura-Frequenz</div>
        <div style={{ fontSize: 10, color: '#c8b870' }}>{auraA.freq} + {auraB.freq} → Resonanzfeld</div>
      </div>
    </div>
  );
}
