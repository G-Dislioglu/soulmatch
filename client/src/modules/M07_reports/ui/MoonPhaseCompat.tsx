function getMoonPhase(birthDate: string): { name: string; icon: string; energy: string; color: string } {
  const d = new Date(birthDate);
  const ref = new Date('2000-01-06');
  const diff = Math.floor((d.getTime() - ref.getTime()) / 86400000);
  const phase = ((diff % 29.53) + 29.53) % 29.53;
  if (phase < 1.85) return { name: 'Neumond', icon: '🌑', energy: 'Neuanfang, Intention, Stille', color: '#1e1b4b' };
  if (phase < 7.38) return { name: 'Sichelmond (zun.)', icon: '🌒', energy: 'Aufbau, Ausdruck, erste Schritte', color: '#3730a3' };
  if (phase < 11.08) return { name: 'Erstes Viertel', icon: '🌓', energy: 'Aktion, Entscheidung, Dynamik', color: '#4f46e5' };
  if (phase < 14.77) return { name: 'Gibbous (zun.)', icon: '🌔', energy: 'Verfeinerung, Analyse, Vorbereitung', color: '#7c3aed' };
  if (phase < 16.61) return { name: 'Vollmond', icon: '🌕', energy: 'Fülle, Erleuchtung, Höhepunkt', color: '#d4af37' };
  if (phase < 22.15) return { name: 'Gibbous (abn.)', icon: '🌖', energy: 'Weitergabe, Dankbarkeit, Teilen', color: '#c026d3' };
  if (phase < 25.85) return { name: 'Letztes Viertel', icon: '🌗', energy: 'Loslassen, Überprüfung, Ruhe', color: '#9333ea' };
  return { name: 'Sichelmond (abn.)', icon: '🌘', energy: 'Rückzug, Integration, Vollendung', color: '#6b21a8' };
}

const PAIR_DESCS: [string, string, number, string][] = [
  ['Neumond', 'Vollmond', 95, 'Perfekte Polarität — ihr ergänzt euch wie Yin und Yang'],
  ['Neumond', 'Neumond', 88, 'Geteilte Tiefe — Stille und neue Anfänge verbinden euch'],
  ['Vollmond', 'Vollmond', 82, 'Intensiv und kraftvoll — Energie in Hülle und Fülle'],
  ['Erstes Viertel', 'Letztes Viertel', 90, 'Aktion trifft Loslassen — ein vollständiger Zyklus'],
  ['Gibbous (zun.)', 'Gibbous (abn.)', 84, 'Zwei Seiten derselben Fülle — tiefe Resonanz'],
];

function getCompat(a: string, b: string): { score: number; desc: string } {
  for (const [pa, pb, score, desc] of PAIR_DESCS) {
    if ((pa === a && pb === b) || (pa === b && pb === a)) return { score, desc };
  }
  const base = 65 + ((a.length + b.length) % 20);
  return { score: base, desc: 'Einzigartige Mondenergie — eure Kombination ist selten und wertvoll' };
}

interface MoonPhaseCompatProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function MoonPhaseCompat({ nameA, birthDateA, nameB, birthDateB }: MoonPhaseCompatProps) {
  const moonA = getMoonPhase(birthDateA);
  const moonB = getMoonPhase(birthDateB);
  const compat = getCompat(moonA.name, moonB.name);
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const blendColor = '#818cf8';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Mondphasen-Kompatibilität
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[{ first: firstA, moon: moonA }, { first: firstB, moon: moonB }].map(({ first, moon }) => (
          <div key={first} style={{ padding: '10px', borderRadius: 10, background: `${moon.color}18`, border: `1px solid ${moon.color}30`, textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 3 }}>{moon.icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: moon.color }}>{moon.name}</div>
            <div style={{ fontSize: 7, color: '#3a3530', marginTop: 1 }}>{first}</div>
            <div style={{ fontSize: 7, color: '#5a5448', marginTop: 4, lineHeight: 1.3 }}>{moon.energy}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 13px', borderRadius: 10, background: `${blendColor}08`, border: `1px solid ${blendColor}22`, marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: blendColor, fontWeight: 700 }}>Mondresonanz</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: blendColor }}>{compat.score}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 7 }}>
          <div style={{ height: '100%', width: `${compat.score}%`, background: `linear-gradient(90deg, ${blendColor}60, ${blendColor})`, borderRadius: 3 }} />
        </div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>{compat.desc}</p>
      </div>
    </div>
  );
}
