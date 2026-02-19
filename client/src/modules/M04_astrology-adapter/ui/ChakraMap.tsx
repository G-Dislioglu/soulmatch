// Chakra mapping based on birth date numerology + sun sign element
const CHAKRAS = [
  { name: 'Wurzel', sanskrit: 'Muladhara', color: '#ef4444', number: 1, element: 'Erde', planet: 'Saturn', theme: 'Sicherheit & Erdung' },
  { name: 'Sakral', sanskrit: 'Svadhisthana', color: '#f97316', number: 2, element: 'Wasser', planet: 'Mond', theme: 'Kreativität & Genuss' },
  { name: 'Solarplexus', sanskrit: 'Manipura', color: '#fbbf24', number: 3, element: 'Feuer', planet: 'Mars/Sonne', theme: 'Willenskraft & Selbst' },
  { name: 'Herz', sanskrit: 'Anahata', color: '#22c55e', number: 4, element: 'Luft', planet: 'Venus', theme: 'Liebe & Mitgefühl' },
  { name: 'Kehle', sanskrit: 'Vishuddha', color: '#38bdf8', number: 5, element: 'Raum', planet: 'Merkur', theme: 'Ausdruck & Wahrheit' },
  { name: 'Drittes Auge', sanskrit: 'Ajna', color: '#818cf8', number: 6, element: 'Licht', planet: 'Jupiter', theme: 'Intuition & Weisheit' },
  { name: 'Krone', sanskrit: 'Sahasrara', color: '#c084fc', number: 7, element: 'Bewusstsein', planet: 'Neptun/Uranus', theme: 'Erleuchtung & Einheit' },
];

const LP_PRIMARY_CHAKRA: Record<number, number> = {
  1: 3, 2: 4, 3: 5, 4: 1, 5: 2, 6: 4, 7: 6, 8: 3, 9: 7, 11: 7, 22: 1, 33: 4,
};

const LP_SECONDARY_CHAKRA: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 5, 6: 2, 7: 7, 8: 1, 9: 4, 11: 6, 22: 3, 33: 7,
};

function calcLP(birthDate: string): number {
  const digits = birthDate.replace(/-/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum || 9;
}

const CHAKRA_PRACTICES: Record<number, string> = {
  1: 'Barfuß auf der Erde gehen · Rote Nahrungsmittel · Sicherheits-Affirmationen',
  2: 'Baden · Tanzen · Kreative Projekte · Orangefarbene Kleidung',
  3: 'Sonnenenergie empfangen · Core-Übungen · Eigene Grenzen setzen',
  4: 'Herzöffnende Yoga-Posen · Dankbarkeitspraxis · In der Natur sein',
  5: 'Singen · Mantras sprechen · Schreiben · Stille Meditation',
  6: 'Visualisierungen · Traumtagebuch · Augenpflege · Tiefes Atmen',
  7: 'Stille · Meditation · Schauen in den Sternenhimmel · Fasten',
};

interface ChakraMapProps { birthDate: string; }

export function ChakraMap({ birthDate }: ChakraMapProps) {
  const lp = calcLP(birthDate);
  const primaryIdx = (LP_PRIMARY_CHAKRA[lp] ?? 4) - 1;
  const secondaryIdx = (LP_SECONDARY_CHAKRA[lp] ?? 1) - 1;
  const primaryChakra = CHAKRAS[primaryIdx]!;
  const secondaryChakra = CHAKRAS[secondaryIdx]!;
  const practice = CHAKRA_PRACTICES[primaryChakra.number] ?? CHAKRA_PRACTICES[4]!;

  return (
    <div>
      <div style={{ fontSize: 9, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, textAlign: 'center' }}>
        LP {lp} · Chakra-Profil
      </div>

      {/* Chakra column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 14 }}>
        {[...CHAKRAS].reverse().map((chakra, i) => {
          const isPrimary = chakra.number === primaryChakra.number;
          const isSecondary = chakra.number === secondaryChakra.number;
          const opacity = isPrimary ? 1 : isSecondary ? 0.75 : 0.3;
          const barWidth = isPrimary ? '100%' : isSecondary ? '65%' : '25%';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: chakra.color, flexShrink: 0 }} />
              <div style={{ width: 54, flexShrink: 0 }}>
                <div style={{ fontSize: 8, color: isPrimary ? chakra.color : '#5a5448', fontWeight: isPrimary ? 700 : 400 }}>{chakra.name}</div>
              </div>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: barWidth, background: chakra.color, transition: 'width 0.6s ease' }} />
              </div>
              {isPrimary && <span style={{ fontSize: 7, color: chakra.color, flexShrink: 0 }}>✦</span>}
              {isSecondary && !isPrimary && <span style={{ fontSize: 7, color: '#5a5448', flexShrink: 0 }}>○</span>}
            </div>
          );
        })}
      </div>

      {/* Primary chakra detail */}
      <div style={{ padding: '10px 12px', borderRadius: 10, background: `${primaryChakra.color}09`, border: `1px solid ${primaryChakra.color}28`, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${primaryChakra.color}20`, border: `1.5px solid ${primaryChakra.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: primaryChakra.color, fontWeight: 700 }}>{primaryChakra.number}</span>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: primaryChakra.color }}>{primaryChakra.name}-Chakra</div>
            <div style={{ fontSize: 8, color: '#5a5448' }}>{primaryChakra.theme} · {primaryChakra.planet}</div>
          </div>
        </div>
        <div style={{ fontSize: 8, color: primaryChakra.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Praxis</div>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.5 }}>{practice}</p>
      </div>

      <div style={{ fontSize: 8, color: '#3a3530', textAlign: 'center' }}>
        Sekundär aktiv: {secondaryChakra.name}-Chakra · {secondaryChakra.theme}
      </div>
    </div>
  );
}
