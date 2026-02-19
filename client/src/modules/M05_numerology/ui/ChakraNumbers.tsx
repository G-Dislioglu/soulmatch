import { calcLifePath, calcExpression, calcSoulUrge, calcPersonality } from '../lib/calc';

const CHAKRAS = [
  { name: 'Wurzelchakra', sanskrit: 'Muladhara', num: 1, color: '#ef4444', element: 'Erde', quality: 'Sicherheit, Überleben, Erdung' },
  { name: 'Sakralchakra', sanskrit: 'Svadhisthana', num: 2, color: '#f97316', element: 'Wasser', quality: 'Kreativität, Sexualität, Gefühle' },
  { name: 'Solarplexus', sanskrit: 'Manipura', num: 3, color: '#fbbf24', element: 'Feuer', quality: 'Willenskraft, Selbstwert, Macht' },
  { name: 'Herzchakra', sanskrit: 'Anahata', num: 4, color: '#22c55e', element: 'Luft', quality: 'Liebe, Mitgefühl, Verbindung' },
  { name: 'Halskhakra', sanskrit: 'Vishuddha', num: 5, color: '#22d3ee', element: 'Äther', quality: 'Ausdruck, Wahrheit, Kommunikation' },
  { name: 'Drittes Auge', sanskrit: 'Ajna', num: 6, color: '#7c3aed', element: 'Licht', quality: 'Intuition, Weisheit, Klarsicht' },
  { name: 'Kronenchakra', sanskrit: 'Sahasrara', num: 7, color: '#c026d3', element: 'Gedanke', quality: 'Erleuchtung, Einheit, Transzendenz' },
];

function getActivation(coreNum: number, chakraNum: number): number {
  const diff = Math.abs(coreNum - chakraNum);
  const base = diff === 0 ? 100 : diff === 1 ? 85 : diff === 2 ? 70 : diff === 3 ? 55 : 40;
  return Math.min(100, base + ((coreNum * chakraNum) % 10));
}

interface ChakraNumbersProps { name: string; birthDate: string; }

export function ChakraNumbers({ name, birthDate }: ChakraNumbersProps) {
  const lp = calcLifePath(birthDate).value % 7 || 7;
  const ex = calcExpression(name).value % 7 || 7;
  const su = calcSoulUrge(name).value % 7 || 7;
  const pe = calcPersonality(name).value % 7 || 7;

  const primaryChakra = CHAKRAS[lp - 1] ?? CHAKRAS[0]!;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Chakra-Zahlen-Karte</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: primaryChakra.color }}>
          Primärchakra: {primaryChakra.name}
        </div>
        <div style={{ fontSize: 8, color: '#3a3530', marginTop: 2 }}>LP→{lp} · EX→{ex} · SU→{su} · PE→{pe}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {CHAKRAS.map(chakra => {
          const activation = getActivation(lp, chakra.num);
          const isActive = [lp, ex, su, pe].includes(chakra.num);
          return (
            <div key={chakra.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? chakra.color : `${chakra.color}40`, flexShrink: 0 }} />
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: 8, fontWeight: isActive ? 700 : 400, color: isActive ? chakra.color : '#3a3530' }}>{chakra.name}</div>
                <div style={{ fontSize: 6, color: '#2a2520' }}>{chakra.element}</div>
              </div>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${activation}%`, background: `linear-gradient(90deg, ${chakra.color}50, ${chakra.color})`, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 7, color: '#3a3530', minWidth: 28 }}>{activation}%</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, background: `${primaryChakra.color}07`, border: `1px solid ${primaryChakra.color}18` }}>
        <div style={{ fontSize: 7, color: primaryChakra.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Dein Primärchakra · {primaryChakra.sanskrit}</div>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{primaryChakra.quality}</p>
      </div>
    </div>
  );
}
