import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

function getDayEnergy(lpA: number, lpB: number, daysOffset: number): { level: number; color: string; label: string } {
  const base = reduceToNumber(lpA + lpB + daysOffset) || 5;
  if (base >= 8) return { level: 3, color: '#fbbf24', label: 'Hoch' };
  if (base >= 5) return { level: 2, color: '#22c55e', label: 'Mittel' };
  return { level: 1, color: '#818cf8', label: 'Ruhig' };
}

const WEEK_FOCUS: Record<number, string> = {
  1: 'Neue Impulse', 2: 'Verbindung', 3: 'Ausdruck', 4: 'Aufbau',
  5: 'Wandel', 6: 'Fürsorge', 7: 'Reflexion', 8: 'Manifestation', 9: 'Loslassen',
};

interface EnergyForecastProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function EnergyForecast({ nameA, birthDateA, nameB, birthDateB }: EnergyForecastProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const pairNum = reduceToNumber(lpA + lpB) || 9;

  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const offset = d.getDate() + d.getMonth();
    return { date: d, energy: getDayEnergy(lpA, lpB, offset), dayNum: i + 1 };
  });

  const peaks = days.filter(d => d.energy.level === 3).slice(0, 3);
  const rests = days.filter(d => d.energy.level === 1).slice(0, 3);
  const weekFocus = WEEK_FOCUS[pairNum] ?? 'Wachstum';
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const GOLD = '#d4af37';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · 30-Tage Energie-Prognose
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: GOLD }}>Paarzahl {pairNum} · Fokus: {weekFocus}</div>
      </div>

      {/* 30-day bar chart */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40, marginBottom: 10 }}>
        {days.map(({ dayNum, energy }) => (
          <div key={dayNum} style={{ flex: 1, background: energy.color, borderRadius: '1px 1px 0 0', height: `${energy.level * 33}%`, minHeight: 4, opacity: dayNum === 1 ? 1 : 0.7 }} title={`Tag ${dayNum}: ${energy.label}`} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#2a2520', marginBottom: 12 }}>
        <span>Heute</span><span>+15</span><span>+30 Tage</span>
      </div>

      {/* Peak & rest days */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
          <div style={{ fontSize: 7, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Höchstenergie</div>
          {peaks.map(({ date, dayNum }) => (
            <div key={dayNum} style={{ fontSize: 8, color: '#5a5448' }}>
              {date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            </div>
          ))}
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.18)' }}>
          <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>☽ Ruhetage</div>
          {rests.map(({ date, dayNum }) => (
            <div key={dayNum} style={{ fontSize: 8, color: '#5a5448' }}>
              {date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', fontSize: 7 }}>
        {[{ c: '#fbbf24', l: 'Hoch' }, { c: '#22c55e', l: 'Mittel' }, { c: '#818cf8', l: 'Ruhig' }].map(({ c, l }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ color: '#3a3530' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
