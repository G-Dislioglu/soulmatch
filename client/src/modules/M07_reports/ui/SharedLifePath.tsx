import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

const LP_SHORT: Record<number, { keyword: string; color: string }> = {
  1: { keyword: 'Pionier', color: '#ef4444' },
  2: { keyword: 'Diplomat', color: '#93c5fd' },
  3: { keyword: 'Kreativer', color: '#fbbf24' },
  4: { keyword: 'Erbauer', color: '#a16207' },
  5: { keyword: 'Freigeist', color: '#22d3ee' },
  6: { keyword: 'Heiler', color: '#22c55e' },
  7: { keyword: 'Weiser', color: '#7c3aed' },
  8: { keyword: 'Manifestierer', color: '#d4af37' },
  9: { keyword: 'Humanist', color: '#c026d3' },
  11: { keyword: 'Illuminierter', color: '#f472b6' },
  22: { keyword: 'Meisterbauer', color: '#38bdf8' },
  33: { keyword: 'Meisterlehrer', color: '#a78bfa' },
};

const COMBO_THEMES: Record<string, { dynamic: string; strength: string; tension: string; mission: string }> = {
  'same':     { dynamic: 'Seelenspiegel', strength: 'Ihr versteht euch intuitiv — gleiche Lebenslektion', tension: 'Ihr könnt euch gegenseitig in Mustern bestärken', mission: 'Gemeinsam meistert ihr eure geteilte Lektion doppelt so schnell' },
  'fire':     { dynamic: 'Feuer-Resonanz', strength: 'Explosive Energie, Begeisterung und gegenseitige Inspiration', tension: 'Beide wollen führen — Kompromisse nötig', mission: 'Entzündet gemeinsam ein Feuer das die Welt erhellt' },
  'earth':    { dynamic: 'Erd-Stabilität', strength: 'Gemeinsam baut ihr Dauerhaftes mit Geduld und Beständigkeit', tension: 'Starrheit und Widerstand gegen Veränderung', mission: 'Erschafft gemeinsam ein Fundament das Generationen trägt' },
  'air':      { dynamic: 'Luft-Austausch', strength: 'Intellektueller Austausch, Kommunikation und Ideen', tension: 'Beide können unbeständig oder zerstreut sein', mission: 'Verbindet eure Ideen zu einer Vision die andere inspiriert' },
  'water':    { dynamic: 'Wasser-Tiefe', strength: 'Emotionale Tiefe, Intuition und spirituelle Verbindung', tension: 'Überempfindlichkeit und emotionale Überwältigung', mission: 'Taucht gemeinsam in die Tiefen des Lebens und heilt euch gegenseitig' },
  'balance':  { dynamic: 'Polare Ergänzung', strength: 'Eure Unterschiede ergänzen sich perfekt', tension: 'Verschiedene Lebensrhythmen können zu Missverständnissen führen', mission: 'Lernt voneinander was ihr allein nie lernen könntet' },
  'growth':   { dynamic: 'Wachstums-Spannung', strength: 'Diese Verbindung fordert euch heraus zu wachsen', tension: 'Reibung ist real — aber sie poliert euch zu Diamanten', mission: 'Durch die Herausforderung werdet ihr beide zu besseren Versionen eurer selbst' },
};

function getComboType(lpA: number, lpB: number): string {
  if (lpA === lpB) return 'same';
  const fire = [1, 3, 5, 9];
  const earth = [4, 8, 22];
  const air = [2, 6, 11];
  const water = [7, 33];
  const getGroup = (n: number) => fire.includes(n) ? 'fire' : earth.includes(n) ? 'earth' : air.includes(n) ? 'air' : water.includes(n) ? 'water' : 'balance';
  const gA = getGroup(lpA);
  const gB = getGroup(lpB);
  if (gA === gB) return gA;
  const balanced = [['fire', 'air'], ['earth', 'water']];
  if (balanced.some(([x, y]) => (x === gA && y === gB) || (x === gB && y === gA))) return 'balance';
  return 'growth';
}

interface SharedLifePathProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function SharedLifePath({ nameA, birthDateA, nameB, birthDateB }: SharedLifePathProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const sharedNum = reduceToNumber(lpA + lpB);
  const comboType = getComboType(lpA, lpB);
  const combo = COMBO_THEMES[comboType] ?? COMBO_THEMES['balance']!;
  const dataA = LP_SHORT[lpA] ?? { keyword: 'Einzigartiger', color: '#d4af37' };
  const dataB = LP_SHORT[lpB] ?? { keyword: 'Einzigartiger', color: '#d4af37' };
  const sharedData = LP_SHORT[sharedNum] ?? { keyword: 'Besonderer', color: '#d4af37' };
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Gemeinsamer Lebensweg
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: '#d4af37' }}>{combo.dynamic}</div>
      </div>

      {/* Individual LP display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ padding: '9px', borderRadius: 9, background: `${dataA.color}08`, border: `1px solid ${dataA.color}25`, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: dataA.color }}>{lpA}</div>
          <div style={{ fontSize: 8, color: dataA.color, fontWeight: 600 }}>{dataA.keyword}</div>
          <div style={{ fontSize: 7, color: '#3a3530', marginTop: 1 }}>{firstA}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#5a5448' }}>+</div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${sharedData.color}15`, border: `1px solid ${sharedData.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: sharedData.color }}>{sharedNum}</span>
          </div>
          <div style={{ fontSize: 6, color: '#5a5448' }}>Gemeinsam</div>
        </div>
        <div style={{ padding: '9px', borderRadius: 9, background: `${dataB.color}08`, border: `1px solid ${dataB.color}25`, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: dataB.color }}>{lpB}</div>
          <div style={{ fontSize: 8, color: dataB.color, fontWeight: 600 }}>{dataB.keyword}</div>
          <div style={{ fontSize: 7, color: '#3a3530', marginTop: 1 }}>{firstB}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✦ Stärke</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{combo.strength}</p>
          </div>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Spannung</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{combo.tension}</p>
          </div>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>★ Gemeinsame Mission</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>„{combo.mission}"</p>
        </div>
      </div>
    </div>
  );
}
