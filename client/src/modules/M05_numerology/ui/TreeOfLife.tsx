import { calcLifePath, calcExpression, calcSoulUrge } from '../lib/calc';

const SEPHIROTH = [
  { num: 1, name: 'Kether', meaning: 'Krone — Göttlicher Funke', color: '#ffffff' },
  { num: 2, name: 'Chokmah', meaning: 'Weisheit — Urprinzip', color: '#818cf8' },
  { num: 3, name: 'Binah', meaning: 'Verständnis — Form', color: '#7c3aed' },
  { num: 4, name: 'Chesed', meaning: 'Gnade — Expansion', color: '#38bdf8' },
  { num: 5, name: 'Geburah', meaning: 'Stärke — Kraft', color: '#ef4444' },
  { num: 6, name: 'Tiphareth', meaning: 'Schönheit — Herz', color: '#fbbf24' },
  { num: 7, name: 'Netzach', meaning: 'Sieg — Gefühle', color: '#22c55e' },
  { num: 8, name: 'Hod', meaning: 'Herrlichkeit — Intellekt', color: '#f97316' },
  { num: 9, name: 'Yesod', meaning: 'Fundament — Seele', color: '#c084fc' },
  { num: 10, name: 'Malkuth', meaning: 'Königreich — Manifestation', color: '#a16207' },
];

const LP_SEPHIRA: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 10, 5: 8, 6: 7, 7: 9, 8: 6, 9: 4, 11: 2, 22: 10, 33: 6,
};
const EX_SEPHIRA: Record<number, number> = {
  1: 6, 2: 9, 3: 7, 4: 8, 5: 5, 6: 4, 7: 3, 8: 2, 9: 1, 11: 3, 22: 4, 33: 6,
};
const SU_SEPHIRA: Record<number, number> = {
  1: 5, 2: 7, 3: 8, 4: 9, 5: 4, 6: 6, 7: 2, 8: 3, 9: 10, 11: 1, 22: 6, 33: 9,
};

interface TreeOfLifeProps { name: string; birthDate: string; }

export function TreeOfLife({ name, birthDate }: TreeOfLifeProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;
  const GOLD = '#d4af37';

  const primaryNum = LP_SEPHIRA[lp] ?? 6;
  const secondaryNum = EX_SEPHIRA[ex] ?? 9;
  const tertiaryNum = SU_SEPHIRA[su] ?? 7;

  const primary = SEPHIROTH.find(s => s.num === primaryNum)!;
  const secondary = SEPHIROTH.find(s => s.num === secondaryNum)!;
  const tertiary = SEPHIROTH.find(s => s.num === tertiaryNum)!;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          LP {lp} · EX {ex} · SU {su} · Lebensbaum-Profil
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: GOLD }}>Kabbalistischer Seelenbaum</div>
      </div>

      {/* Three active sephiroth */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Lebenspfad', num: lp, seph: primary, role: 'Primäre Kraft' },
          { label: 'Ausdruck', num: ex, seph: secondary, role: 'Sekundäre Kraft' },
          { label: 'Seelenimpuls', num: su, seph: tertiary, role: 'Innere Kraft' },
        ].map(({ label, num, seph, role }) => (
          <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 9, background: `${seph.color}08`, border: `1px solid ${seph.color}22` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${seph.color}20`, border: `1.5px solid ${seph.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: seph.color }}>{seph.num}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: seph.color }}>{seph.name}</span>
                <span style={{ fontSize: 7, color: '#3a3530' }}>{role} · {label} {num}</span>
              </div>
              <div style={{ fontSize: 9, color: '#5a5448', lineHeight: 1.3 }}>{seph.meaning}</div>
            </div>
          </div>
        ))}
      </div>

      {/* All 10 sephiroth mini-grid */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 8, color: '#3a3530', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Alle Sephiroth</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
          {SEPHIROTH.map(s => {
            const isActive = [primaryNum, secondaryNum, tertiaryNum].includes(s.num);
            return (
              <div key={s.num} style={{ padding: '4px 3px', borderRadius: 6, textAlign: 'center', background: isActive ? `${s.color}14` : 'rgba(255,255,255,0.01)', border: `1px solid ${isActive ? s.color + '40' : 'rgba(255,255,255,0.05)'}`, opacity: isActive ? 1 : 0.4 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: s.color, margin: '0 auto 2px' }} />
                <div style={{ fontSize: 6, color: isActive ? s.color : '#3a3530' }}>{s.num}</div>
                <div style={{ fontSize: 5, color: '#3a3530', lineHeight: 1.1 }}>{s.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '7px 11px', borderRadius: 8, background: `${GOLD}07`, border: `1px solid ${GOLD}20`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.5 }}>
          Der Lebensbaum zeigt die Kräfte, die durch deine Seele fließen — von der Krone bis zur Manifestation.
        </p>
      </div>
    </div>
  );
}
