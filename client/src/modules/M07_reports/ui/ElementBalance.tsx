import { calcLifePath } from '../../M05_numerology/lib/calc';

const LP_ELEMENT: Record<number, string> = {
  1: 'Feuer', 2: 'Wasser', 3: 'Luft', 4: 'Erde',
  5: 'Luft', 6: 'Erde', 7: 'Wasser', 8: 'Erde',
  9: 'Feuer', 11: 'Luft', 22: 'Erde', 33: 'Wasser',
};

const ELEMENT_DATA: Record<string, { color: string; icon: string; traits: string[]; need: string }> = {
  Feuer: { color: '#ef4444', icon: '🔥', traits: ['Enthusiasmus', 'Mut', 'Leidenschaft', 'Initiative'], need: 'Inspiration und Freiheit' },
  Erde: { color: '#a16207', icon: '🌍', traits: ['Stabilität', 'Pragmatismus', 'Zuverlässigkeit', 'Geduld'], need: 'Sicherheit und Struktur' },
  Luft: { color: '#22d3ee', icon: '💨', traits: ['Kommunikation', 'Ideen', 'Flexibilität', 'Vernunft'], need: 'Austausch und Freiheit' },
  Wasser: { color: '#38bdf8', icon: '💧', traits: ['Intuition', 'Empathie', 'Tiefe', 'Fürsorge'], need: 'Verbindung und Sicherheit' },
};

const COMBO_SYNERGY: Record<string, { name: string; desc: string; tip: string }> = {
  'Feuer-Feuer': { name: 'Doppeltes Feuer', desc: 'Explosive Energie und gemeinsame Leidenschaft — ihr entzündet euch gegenseitig.', tip: 'Achtet darauf, euch nicht zu verbrennen. Plant bewusste Ruhepausen ein.' },
  'Erde-Erde': { name: 'Doppelte Erde', desc: 'Solides Fundament und gemeinsame Beständigkeit — ihr baut eine stabile Welt.', tip: 'Fügt bewusst Abwechslung und Spontaneität in eure Beziehung ein.' },
  'Luft-Luft': { name: 'Doppelte Luft', desc: 'Intellektueller Austausch und gemeinsame Ideen — ihr inspiriert euch endlos.', tip: 'Verankert eure Pläne in konkreten Handlungen, nicht nur in Konzepten.' },
  'Wasser-Wasser': { name: 'Doppeltes Wasser', desc: 'Tiefe emotionale Verbindung — ihr fühlt einander ohne Worte.', tip: 'Schützt eure gemeinsame Energie vor äußeren Einflüssen.' },
  'Feuer-Erde': { name: 'Feuer trifft Erde', desc: 'Leidenschaft trifft Beständigkeit — ihr ergänzt euch durch Gegensätze.', tip: 'Feuer bringt Inspiration, Erde gibt Struktur. Respektiert beide Rhythmen.' },
  'Feuer-Luft': { name: 'Feuer & Luft', desc: 'Luft facht das Feuer an — eure Energie ist ansteckend und kreativ.', tip: 'Ihr könnt leicht überhitzen. Plant Zeiten der Stille ein.' },
  'Feuer-Wasser': { name: 'Feuer & Wasser', desc: 'Spannung und Transformation — ihr lernt voneinander durch Gegensätze.', tip: 'Feuer und Wasser können sich annullieren oder Dampf erzeugen. Wählt bewusst.' },
  'Erde-Luft': { name: 'Erde & Luft', desc: 'Ideen treffen auf Umsetzung — ihr könnt gemeinsam Großes erschaffen.', tip: 'Luft bringt die Ideen, Erde setzt sie um. Schätzt beide Beiträge.' },
  'Erde-Wasser': { name: 'Erde & Wasser', desc: 'Tiefe Fürsorge und stabile Sicherheit — eine nährende, heilsame Verbindung.', tip: 'Wasser befeuchtet die Erde — ihr gedeiht gemeinsam in Ruhe und Tiefe.' },
  'Luft-Wasser': { name: 'Luft & Wasser', desc: 'Gedanken treffen auf Gefühle — ihr verbindet Herz und Verstand.', tip: 'Luft kann Wasser aufwühlen — bleibt geduldig mit unterschiedlichen Verarbeitungsstilen.' },
};

function getComboKey(eA: string, eB: string): string {
  const sorted = [eA, eB].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

interface ElementBalanceProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function ElementBalance({ nameA, birthDateA, nameB, birthDateB }: ElementBalanceProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const eA = LP_ELEMENT[lpA] ?? 'Erde';
  const eB = LP_ELEMENT[lpB] ?? 'Erde';
  const dA = ELEMENT_DATA[eA]!;
  const dB = ELEMENT_DATA[eB]!;
  const combo = COMBO_SYNERGY[getComboKey(eA, eB)] ?? { name: `${eA} & ${eB}`, desc: 'Eure Elemente ergänzen sich auf einzigartige Weise.', tip: 'Erkundet gemeinsam die Synergien eurer Elemente.' };
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  // All 4 elements — count occurrences
  const all = ['Feuer', 'Erde', 'Luft', 'Wasser'];
  const counts = Object.fromEntries(all.map(e => [e, [eA, eB].filter(x => x === e).length]));
  const maxCount = Math.max(...Object.values(counts));

  return (
    <div>
      {/* Element pair */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[{ name: firstA, lp: lpA, elem: eA, data: dA }, { name: firstB, lp: lpB, elem: eB, data: dB }].map(({ name, lp, elem, data }) => (
          <div key={name} style={{ flex: 1, padding: '9px 11px', borderRadius: 10, background: `${data.color}08`, border: `1px solid ${data.color}22` }}>
            <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 2 }}>{name} · LP {lp}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 16 }}>{data.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: data.color, fontFamily: "'Cormorant Garamond', serif" }}>{elem}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {data.traits.slice(0, 3).map(t => (
                <span key={t} style={{ fontSize: 7, padding: '2px 5px', borderRadius: 4, background: `${data.color}12`, color: data.color }}>{t}</span>
              ))}
            </div>
            <div style={{ marginTop: 4, fontSize: 8, color: '#5a5448' }}>Braucht: {data.need}</div>
          </div>
        ))}
      </div>

      {/* Element balance bars */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Elementares Gleichgewicht</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {all.map(e => {
            const count = counts[e] ?? 0;
            const d = ELEMENT_DATA[e]!;
            const pct = (count / maxCount) * 100;
            return (
              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 10, width: 16 }}>{d.icon}</span>
                <span style={{ fontSize: 8, color: d.color, width: 46 }}>{e}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: count > 0 ? `${pct}%` : '8%', background: count > 0 ? d.color : 'rgba(255,255,255,0.08)', opacity: count > 0 ? 1 : 0.3 }} />
                </div>
                <span style={{ fontSize: 8, color: count > 0 ? d.color : '#3a3530', width: 8 }}>{count > 0 ? count : '–'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Combo synergy */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ fontSize: 9, color: '#d4af37', fontWeight: 700, marginBottom: 4 }}>{combo.name}</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.5, marginBottom: 5, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{combo.desc}</p>
        <div style={{ fontSize: 8, color: '#22c55e' }}>✦ {combo.tip}</div>
      </div>
    </div>
  );
}
