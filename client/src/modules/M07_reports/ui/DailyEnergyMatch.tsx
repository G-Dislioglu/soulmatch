import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

const ENERGY_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#38bdf8', 3: '#fbbf24', 4: '#a16207',
  5: '#22d3ee', 6: '#22c55e', 7: '#7c3aed', 8: '#d4af37', 9: '#c026d3',
};
const ENERGY_THEMES: Record<number, { name: string; activity: string; avoid: string }> = {
  1: { name: 'Neubeginn', activity: 'Neue Projekte starten, mutige Entscheidungen', avoid: 'Passivität, Abwarten' },
  2: { name: 'Verbindung', activity: 'Gespräche, Zuhören, gemeinsame Zeit', avoid: 'Konflikte, Alleinsein' },
  3: { name: 'Ausdruck', activity: 'Kreativ sein, lachen, feiern', avoid: 'Einschränkungen, Ernsthaftigkeit' },
  4: { name: 'Aufbau', activity: 'Planen, organisieren, strukturieren', avoid: 'Chaos, Spontaneität' },
  5: { name: 'Freiheit', activity: 'Abenteuer, Neues entdecken', avoid: 'Routine, Einschränkungen' },
  6: { name: 'Fürsorge', activity: 'Für andere da sein, Zuhause pflegen', avoid: 'Selbstbezogenheit' },
  7: { name: 'Reflexion', activity: 'Meditieren, lesen, forschen', avoid: 'Lärm, oberflächliche Gespräche' },
  8: { name: 'Manifestation', activity: 'Wichtige Meetings, Verhandlungen', avoid: 'Prokrastination' },
  9: { name: 'Vollendung', activity: 'Abschließen, loslassen, helfen', avoid: 'Anfangen, festhalten' },
};

function getDayEnergy(birthDate: string): number {
  const d = new Date();
  const daySum = d.getFullYear() + d.getMonth() + d.getDate();
  const parts = birthDate.split('-');
  const lpSum = parts.reduce((s, p) => s + Number(p), 0);
  return reduceToNumber(daySum + lpSum) || 9;
}

function getCompatibility(eA: number, eB: number): { score: number; label: string; tip: string } {
  const diff = Math.abs(eA - eB);
  if (eA === eB) return { score: 100, label: 'Perfekte Resonanz', tip: 'Eure Energien fließen heute vollkommen synchron. Nutzt den Tag für gemeinsame Projekte.' };
  if (diff === 1 || diff === 8) return { score: 85, label: 'Harmonische Nähe', tip: 'Eure Energien ergänzen sich wunderbar. Unterstützt euch gegenseitig in euren Zielen.' };
  if (diff === 2 || diff === 7) return { score: 72, label: 'Lebendige Spannung', tip: 'Unterschiedliche Energien können kreativ sein. Bleibt offen für die Perspektive des anderen.' };
  if (diff === 3 || diff === 6) return { score: 60, label: 'Wachstumspotenzial', tip: 'Heute bietet sich eine Gelegenheit, voneinander zu lernen. Geduld hilft.' };
  return { score: 50, label: 'Individuelle Tage', tip: 'Schenkt euch heute bewusst Raum für eure eigene Energie. Reconnect am Abend.' };
}

interface DailyEnergyMatchProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function DailyEnergyMatch({ nameA, birthDateA, nameB, birthDateB }: DailyEnergyMatchProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const eA = getDayEnergy(birthDateA);
  const eB = getDayEnergy(birthDateB);
  const compat = getCompatibility(eA, eB);
  const colorA = ENERGY_COLORS[eA] ?? '#a09a8e';
  const colorB = ENERGY_COLORS[eB] ?? '#a09a8e';
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });

  return (
    <div>
      <div style={{ fontSize: 9, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        Heute · {today}
      </div>

      {/* Energy pair */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {[{ name: firstA, lp: lpA, e: eA, color: colorA }, { name: firstB, lp: lpB, e: eB, color: colorB }].map(({ name, lp, e, color }, i) => {
          const theme = ENERGY_THEMES[e];
          return (
            <div key={i} style={{ flex: 1, padding: '10px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}20` }}>
              <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 2 }}>{name} · LP {lp}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}20`, border: `1.5px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontWeight: 700, color }}>{e}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color }}>{theme?.name ?? '—'}</span>
              </div>
              {theme && (
                <>
                  <div style={{ fontSize: 8, color: '#22c55e', marginBottom: 1 }}>✦ {theme.activity}</div>
                  <div style={{ fontSize: 8, color: '#ef444480' }}>✗ {theme.avoid}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Compatibility bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: '#7a7468', fontWeight: 700 }}>{compat.label}</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: '#d4af37' }}>{compat.score}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${compat.score}%`, background: 'linear-gradient(90deg, #d4af37, #c084fc)', transition: 'width 0.8s ease' }} />
        </div>
      </div>

      {/* Daily tip */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ fontSize: 8, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Tages-Impuls</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{compat.tip}</p>
      </div>
    </div>
  );
}
