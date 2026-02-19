import { calcLifePath, calcSoulUrge } from '../../M05_numerology/lib/calc';

const SOUL_COLORS: Record<number, { name: string; hex: string; meaning: string; element: string }> = {
  1: { name: 'Feuerrot', hex: '#dc2626', meaning: 'Kraft, Mut und Lebensenergie', element: 'Feuer' },
  2: { name: 'Mondsilber', hex: '#94a3b8', meaning: 'Intuition, Sanftheit und Verbindung', element: 'Wasser' },
  3: { name: 'Sonnengelb', hex: '#f59e0b', meaning: 'Freude, Kreativität und Ausdruck', element: 'Luft' },
  4: { name: 'Waldgrün', hex: '#15803d', meaning: 'Stabilität, Wachstum und Verwurzelung', element: 'Erde' },
  5: { name: 'Ozeanblau', hex: '#0891b2', meaning: 'Freiheit, Wandel und Abenteuer', element: 'Äther' },
  6: { name: 'Rosenquarz', hex: '#fb7185', meaning: 'Liebe, Fürsorge und Harmonie', element: 'Herz' },
  7: { name: 'Amethystviolett', hex: '#7c3aed', meaning: 'Weisheit, Mystik und Spiritualität', element: 'Geist' },
  8: { name: 'Goldenes Bernstein', hex: '#d97706', meaning: 'Fülle, Macht und Manifestation', element: 'Erde' },
  9: { name: 'Tiefmagenta', hex: '#a21caf', meaning: 'Universelle Liebe und Vollendung', element: 'Kosmos' },
  11: { name: 'Perlmuttweiss', hex: '#e2e8f0', meaning: 'Erleuchtung und spirituelle Klarheit', element: 'Licht' },
  22: { name: 'Saphirblau', hex: '#1d4ed8', meaning: 'Meisterschaft und kosmische Ordnung', element: 'Alle' },
  33: { name: 'Kristallviolett', hex: '#6d28d9', meaning: 'Göttliche Liebe und Meisterlehre', element: 'Göttlich' },
};

const DEFAULT_COLOR = { name: 'Opaleszent', hex: '#818cf8', meaning: 'Einzigartigkeit und Multidimensionalität', element: 'Alle' };

const FUSION_MEANINGS: string[] = [
  'Eure Seelenfarben erschaffen eine neue Frequenz die vorher nicht existierte',
  'Das Licht eurer Seelen verstärkt sich gegenseitig zu einem neuen Spektrum',
  'Eure Farben tanzen zusammen in einem Rhythmus der euch beide heilt und nährt',
  'Zusammen erschafft ihr eine Farbsignatur die einzigartig in diesem Universum ist',
  'Euer gemeinsames Farbfeld zieht an was ihr beide braucht um zu wachsen',
];

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

interface SoulColorMatchProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SoulColorMatch({ nameA, birthDateA, nameB, birthDateB }: SoulColorMatchProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;

  const lpColorA = SOUL_COLORS[lpA] ?? DEFAULT_COLOR;
  const lpColorB = SOUL_COLORS[lpB] ?? DEFAULT_COLOR;
  const suColorA = SOUL_COLORS[suA] ?? DEFAULT_COLOR;
  const suColorB = SOUL_COLORS[suB] ?? DEFAULT_COLOR;

  const blendLP = blendHex(lpColorA.hex, lpColorB.hex);
  const blendSU = blendHex(suColorA.hex, suColorB.hex);
  const masterBlend = blendHex(blendLP, blendSU);

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const msgIdx = (lpA + lpB + suA + suB) % FUSION_MEANINGS.length;
  const fusionMsg = FUSION_MEANINGS[msgIdx] ?? FUSION_MEANINGS[0]!;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          {firstA} & {firstB} · Seelenfarben-Fusion
        </div>
        {/* Master blend orb */}
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: `radial-gradient(circle, ${masterBlend}, ${masterBlend}88)`, boxShadow: `0 0 20px ${masterBlend}60`, margin: '0 auto 8px' }} />
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', fontStyle: 'italic', maxWidth: 280, margin: '0 auto' }}>{fusionMsg}</div>
      </div>

      {/* LP Colors */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, textAlign: 'center' }}>Lebensweg-Farben</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
          <div style={{ padding: '8px', borderRadius: 9, background: `${lpColorA.hex}12`, border: `1px solid ${lpColorA.hex}30`, textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: lpColorA.hex, margin: '0 auto 4px', boxShadow: `0 0 8px ${lpColorA.hex}50` }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: lpColorA.hex }}>{lpColorA.name}</div>
            <div style={{ fontSize: 6, color: '#3a3530' }}>{firstA}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: blendLP, boxShadow: `0 0 8px ${blendLP}60`, margin: '0 auto' }} />
          </div>
          <div style={{ padding: '8px', borderRadius: 9, background: `${lpColorB.hex}12`, border: `1px solid ${lpColorB.hex}30`, textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: lpColorB.hex, margin: '0 auto 4px', boxShadow: `0 0 8px ${lpColorB.hex}50` }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: lpColorB.hex }}>{lpColorB.name}</div>
            <div style={{ fontSize: 6, color: '#3a3530' }}>{firstB}</div>
          </div>
        </div>
      </div>

      {/* SU Colors */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, textAlign: 'center' }}>Seelen-Farben</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
          <div style={{ padding: '8px', borderRadius: 9, background: `${suColorA.hex}12`, border: `1px solid ${suColorA.hex}30`, textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: suColorA.hex, margin: '0 auto 4px', boxShadow: `0 0 8px ${suColorA.hex}50` }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: suColorA.hex }}>{suColorA.name}</div>
            <div style={{ fontSize: 6, color: '#3a3530' }}>{firstA}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: blendSU, boxShadow: `0 0 8px ${blendSU}60`, margin: '0 auto' }} />
          </div>
          <div style={{ padding: '8px', borderRadius: 9, background: `${suColorB.hex}12`, border: `1px solid ${suColorB.hex}30`, textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: suColorB.hex, margin: '0 auto 4px', boxShadow: `0 0 8px ${suColorB.hex}50` }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: suColorB.hex }}>{suColorB.name}</div>
            <div style={{ fontSize: 6, color: '#3a3530' }}>{firstB}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${masterBlend}10`, border: `1px solid ${masterBlend}30`, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Eure Meister-Seelenfarbe</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: masterBlend, boxShadow: `0 0 10px ${masterBlend}80` }} />
          <span style={{ fontSize: 10, color: '#c8b870', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
            {lpColorA.element} + {lpColorB.element} + {suColorA.element} + {suColorB.element}
          </span>
        </div>
      </div>
    </div>
  );
}
