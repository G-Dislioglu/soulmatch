// Approximate North Node sign from birth year (18.6-year cycle)
function getNorthNodeSign(birthDate: string): string {
  const y = parseInt(birthDate.split('-')[0] ?? '1990', 10);
  const cycle = ((y - 1950) % 19 + 19) % 19;
  const signs = ['Widder', 'Fische', 'Wassermann', 'Steinbock', 'Schütze', 'Skorpion', 'Waage', 'Jungfrau', 'Löwe', 'Krebs', 'Zwillinge', 'Stier', 'Widder', 'Fische', 'Wassermann', 'Steinbock', 'Schütze', 'Skorpion', 'Waage'];
  return signs[cycle] ?? 'Widder';
}

const COMPAT_MAP: Record<string, { resonance: string; score: number; gift: string; challenge: string }> = {
  'gleich':     { resonance: 'Seelische Gleichrichtung', score: 92, gift: 'Ihr lernt dieselbe Lektion — gemeinsam wächst ihr doppelt so schnell', challenge: 'Ihr könnt euch gegenseitig in alten Mustern bestärken' },
  'gegenüber':  { resonance: 'Polarer Seelenmagnet', score: 88, gift: 'Ihr spiegelt euch perfekt — was einer lernt lehrt er den anderen', challenge: 'Spannung zwischen Vergangenheit und Zukunft' },
  'harmonisch': { resonance: 'Fließende Seelenunterstützung', score: 82, gift: 'Eure Seelenrichtungen ergänzen sich ohne Reibung', challenge: 'Weniger Wachstumsdruck kann zu Stagnation führen' },
  'heraus':     { resonance: 'Wachstums-Spannung', score: 71, gift: 'Diese Verbindung fordert euch heraus zu wachsen', challenge: 'Die unterschiedlichen Richtungen brauchen bewusste Arbeit' },
};

function getCompatType(signA: string, signB: string): string {
  if (signA === signB) return 'gleich';
  const opposites: Record<string, string> = {
    'Widder': 'Waage', 'Waage': 'Widder', 'Stier': 'Skorpion', 'Skorpion': 'Stier',
    'Zwillinge': 'Schütze', 'Schütze': 'Zwillinge', 'Krebs': 'Steinbock', 'Steinbock': 'Krebs',
    'Löwe': 'Wassermann', 'Wassermann': 'Löwe', 'Jungfrau': 'Fische', 'Fische': 'Jungfrau',
  };
  if (opposites[signA] === signB) return 'gegenüber';
  const fire = ['Widder', 'Löwe', 'Schütze'];
  const earth = ['Stier', 'Jungfrau', 'Steinbock'];
  const air = ['Zwillinge', 'Waage', 'Wassermann'];
  const getElem = (s: string) => fire.includes(s) ? 'F' : earth.includes(s) ? 'E' : air.includes(s) ? 'A' : 'W';
  const harmonious = [['F', 'A'], ['E', 'W'], ['F', 'F'], ['E', 'E'], ['A', 'A'], ['W', 'W']];
  const eA = getElem(signA);
  const eB = getElem(signB);
  if (harmonious.some(([x, y]) => (x === eA && y === eB) || (x === eB && y === eA))) return 'harmonisch';
  return 'heraus';
}

interface NodalCompatProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function NodalCompat({ nameA, birthDateA, nameB, birthDateB }: NodalCompatProps) {
  const nnA = getNorthNodeSign(birthDateA);
  const nnB = getNorthNodeSign(birthDateB);
  const snA = /* South Node is opposite */ nnA;
  const compatType = getCompatType(nnA, nnB);
  const compat = COMPAT_MAP[compatType] ?? COMPAT_MAP['harmonisch']!;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  void snA;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Mondknoten-Kompatibilität
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: '#818cf8' }}>{compat.resonance}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[{ name: firstA, nn: nnA }, { name: firstB, nn: nnB }].map(({ name, nn }) => (
          <div key={name} style={{ padding: '9px', borderRadius: 9, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 3 }}>☊</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#818cf8' }}>Nordknoten</div>
            <div style={{ fontSize: 10, color: '#c8b870', fontWeight: 600 }}>{nn}</div>
            <div style={{ fontSize: 7, color: '#3a3530', marginTop: 1 }}>{name}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: '#818cf8', fontWeight: 700 }}>Seelen-Ausrichtung</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8' }}>{compat.score}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 7 }}>
          <div style={{ height: '100%', width: `${compat.score}%`, background: 'linear-gradient(90deg, #818cf860, #818cf8)', borderRadius: 3 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✦ Gemeinsames Geschenk</div>
          <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{compat.gift}</p>
        </div>
        <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Herausforderung</div>
          <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{compat.challenge}</p>
        </div>
      </div>
    </div>
  );
}
