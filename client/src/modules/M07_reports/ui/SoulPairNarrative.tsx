import { calcLifePath, calcSoulUrge } from '../../M05_numerology/lib/calc';

const ELEMENT: Record<number, string> = {
  1: 'Feuer', 2: 'Wasser', 3: 'Feuer', 4: 'Erde', 5: 'Luft',
  6: 'Erde', 7: 'Wasser', 8: 'Erde', 9: 'Feuer', 11: 'Äther', 22: 'Erde', 33: 'Äther',
};

const ARCH: Record<number, string> = {
  1: 'Pionier', 2: 'Heiler', 3: 'Erschaffer', 4: 'Baumeister', 5: 'Abenteurer',
  6: 'Hüter', 7: 'Weise', 8: 'Manifestor', 9: 'Humanist', 11: 'Visionär', 22: 'Meister', 33: 'Lichtträger',
};

const SU_DESIRE: Record<number, string> = {
  1: 'Einzigartigkeit und Führung', 2: 'Verbindung und Harmonie', 3: 'Freude und Ausdruck',
  4: 'Sicherheit und Beständigkeit', 5: 'Freiheit und Abenteuer', 6: 'Liebe und Zugehörigkeit',
  7: 'Wahrheit und Tiefe', 8: 'Fülle und Anerkennung', 9: 'Universalliebe und Vollendung',
  11: 'Erleuchtung und Inspiration', 22: 'Monumental zu erschaffen', 33: 'Bedingungslos zu lieben',
};

function elementSynergy(eA: string, eB: string): { quality: string; desc: string } {
  if (eA === eB) return { quality: 'Resonanz', desc: `Beide atmen dieselbe kosmische Luft. ${eA} trifft ${eB} — eine natürliche Verbindung, die wenig Erklärung braucht.` };
  const pairs: Record<string, string> = {
    'Feuer-Luft': 'Entfachung', 'Luft-Feuer': 'Entfachung',
    'Feuer-Erde': 'Spannung', 'Erde-Feuer': 'Spannung',
    'Wasser-Feuer': 'Transformation', 'Feuer-Wasser': 'Transformation',
    'Erde-Wasser': 'Nährung', 'Wasser-Erde': 'Nährung',
    'Luft-Wasser': 'Poesie', 'Wasser-Luft': 'Poesie',
    'Erde-Luft': 'Wachstum', 'Luft-Erde': 'Wachstum',
    'Äther-Feuer': 'Erleuchtung', 'Feuer-Äther': 'Erleuchtung',
    'Äther-Wasser': 'Vision', 'Wasser-Äther': 'Vision',
    'Äther-Erde': 'Manifestation', 'Erde-Äther': 'Manifestation',
    'Äther-Luft': 'Inspiration', 'Luft-Äther': 'Inspiration',
    'Äther-Äther': 'Magie',
  };
  const key = `${eA}-${eB}`;
  const quality = pairs[key] ?? 'Begegnung';
  const DESCS: Record<string, string> = {
    'Entfachung': `${eA} und ${eB} entfachen sich gegenseitig — diese Verbindung brennt hell und inspiriert.`,
    'Spannung': `${eA} und ${eB} stehen in kreativer Spannung — aus Reibung entsteht Wärme und Wandel.`,
    'Transformation': `${eA} und ${eB} verwandeln einander — was ihr berührt, wird niemals mehr dasselbe sein.`,
    'Nährung': `${eA} und ${eB} nähren sich gegenseitig — Stabilität trifft Tiefe zu einem reichen Boden.`,
    'Poesie': `${eA} und ${eB} tanzen miteinander — Gefühl und Idee erschaffen gemeinsam etwas Schönes.`,
    'Wachstum': `${eA} und ${eB} lassen einander wachsen — Gedanken werden Wirklichkeit, Wirklichkeit wird Verstehen.`,
    'Erleuchtung': `${eA} und ${eB} erleuchten den Weg füreinander — Visionen finden ihre Kraft.`,
    'Vision': `${eA} und ${eB} träumen zusammen — tiefe Empfindungen treffen auf kosmische Perspektiven.`,
    'Manifestation': `${eA} und ${eB} bauen gemeinsam an etwas Bleibendem — Visionen werden zu Wirklichkeit.`,
    'Inspiration': `${eA} und ${eB} inspirieren sich ohne Ende — Gedanken und Licht tanzen zusammen.`,
    'Magie': 'Zwei Äther-Wesen begegnen einander — selten, bedeutsam, unvergesslich.',
    'Begegnung': `${eA} und ${eB} finden zueinander — unterschiedliche Welten öffnen sich füreinander.`,
  };
  return { quality, desc: DESCS[quality] ?? `${eA} trifft ${eB} in besonderer Weise.` };
}

interface SoulPairNarrativeProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SoulPairNarrative({ nameA, birthDateA, nameB, birthDateB }: SoulPairNarrativeProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;

  const eA = ELEMENT[lpA] ?? 'Äther';
  const eB = ELEMENT[lpB] ?? 'Äther';
  const synergy = elementSynergy(eA, eB);

  const archA = ARCH[lpA] ?? 'Seelenwesen';
  const archB = ARCH[lpB] ?? 'Seelenwesen';
  const desA = SU_DESIRE[suA] ?? 'tiefe Verbindung';
  const desB = SU_DESIRE[suB] ?? 'tiefe Verbindung';

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  const GOLD = '#d4af37';

  return (
    <div>
      {/* Element synergy badge */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center', padding: '6px 14px', borderRadius: 20, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{eA}</span>
          <span style={{ fontSize: 14, color: GOLD }}>×</span>
          <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{eB}</span>
          <span style={{ fontSize: 9, color: '#7a7468' }}>·</span>
          <span style={{ fontSize: 11, color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{synergy.quality}</span>
        </div>
      </div>

      {/* Synergy prose */}
      <p style={{ margin: '0 0 14px', fontFamily: "'Cormorant Garamond', serif", fontSize: 14, lineHeight: 1.8, color: '#d4ccbc', textAlign: 'center', fontStyle: 'italic' }}>
        "{synergy.desc}"
      </p>

      {/* Archetype cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ name: firstA, lp: lpA, su: suA, arch: archA, des: desA, el: eA }, { name: firstB, lp: lpB, su: suB, arch: archB, des: desB, el: eB }].map(({ name, lp, su, arch, des, el }) => (
          <div key={name} style={{ flex: 1, padding: '9px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 9, color: '#5a5448', marginBottom: 2 }}>{name} · LP {lp} · SU {su}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 3 }}>{arch}</div>
            <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 3 }}>Element: {el}</div>
            <div style={{ fontSize: 9, color: '#4a4540', lineHeight: 1.4 }}>Sehnsucht: {des}</div>
          </div>
        ))}
      </div>

      {/* Combined desire */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)' }}>
        <div style={{ fontSize: 8, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Gemeinsame Seelenreise</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
          {firstA} sucht {desA}. {firstB} sucht {desB}. Zusammen habt ihr das Potenzial, einander genau das zu schenken, was die Seele am tiefsten begehrt.
        </p>
      </div>
    </div>
  );
}
