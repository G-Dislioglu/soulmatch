import { calcLifePath, reduceToNumber } from '../lib/calc';

const YEAR_THEMES: Record<number, { name: string; color: string; energy: string; focus: string; avoid: string }> = {
  1: { name: 'Neubeginn', color: '#ef4444', energy: 'Hoch, explosiv', focus: 'Neues starten, Entscheidungen treffen', avoid: 'Abwarten und Zögern' },
  2: { name: 'Wachstum', color: '#38bdf8', energy: 'Sanft, aufbauend', focus: 'Beziehungen pflegen, Geduld', avoid: 'Vorschnelle Entscheidungen' },
  3: { name: 'Ausdruck', color: '#fbbf24', energy: 'Kreativ, expansiv', focus: 'Kreativität, Kommunikation, Soziales', avoid: 'Isolation und Ernsthaftigkeit' },
  4: { name: 'Stabilisierung', color: '#a16207', energy: 'Geerdet, beständig', focus: 'Aufbauen, Organisieren, Grundlagen', avoid: 'Chaos und Spontaneität' },
  5: { name: 'Transformation', color: '#22d3ee', energy: 'Dynamisch, verändernd', focus: 'Freiheit, Reise, Veränderung', avoid: 'Starre Pläne' },
  6: { name: 'Harmonie', color: '#22c55e', energy: 'Fürsorglich, ausgleichend', focus: 'Familie, Zuhause, Heilung', avoid: 'Selbstvernachlässigung' },
  7: { name: 'Reflexion', color: '#7c3aed', energy: 'Still, tief', focus: 'Innenschau, Lernen, Spiritualität', avoid: 'Äußerliche Ablenkungen' },
  8: { name: 'Ernte', color: '#d4af37', energy: 'Kraftvoll, manifestierend', focus: 'Karriere, Finanzen, Macht', avoid: 'Faulheit und Prokrastination' },
  9: { name: 'Vollendung', color: '#c026d3', energy: 'Auflösend, befreiend', focus: 'Loslassen, Abschlüsse, Helfen', avoid: 'Festhalten und Neustarten' },
};

function getPersonalYear(birthDate: string): number {
  const currentYear = new Date().getFullYear();
  const parts = birthDate.split('-');
  const month = parseInt(parts[1] ?? '1', 10);
  const day = parseInt(parts[2] ?? '1', 10);
  const sum = currentYear + month + day;
  const digits = sum.toString().split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0)) || 9;
}

function getYearProgress(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
}

interface YearClockProps { name: string; birthDate: string; }

export function YearClock({ name: _name, birthDate }: YearClockProps) {
  const lp = calcLifePath(birthDate).value;
  const py = getPersonalYear(birthDate);
  const progress = getYearProgress();
  const theme = YEAR_THEMES[py];
  if (!theme) return null;

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  // 9-year cycle position
  const cyclePos = py;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · Persönliches Jahr {currentYear}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: theme.color }}>{py}</div>
        <div style={{ fontSize: 13, fontFamily: "'Cormorant Garamond', serif", color: theme.color, marginBottom: 2 }}>Jahr der {theme.name}</div>
        <div style={{ fontSize: 9, color: '#5a5448' }}>Energie: {theme.energy}</div>
      </div>

      {/* Year progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#3a3530', marginBottom: 4 }}>
          <span>Jan {currentYear}</span>
          <span style={{ color: theme.color, fontWeight: 700 }}>{progress}% durchlaufen</span>
          <span>Jan {nextYear}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, width: `${progress}%`, background: `linear-gradient(90deg, ${theme.color}80, ${theme.color})` }} />
        </div>
      </div>

      {/* Focus & avoid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>✦ Fokus</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{theme.focus}</p>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>✗ Meiden</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{theme.avoid}</p>
        </div>
      </div>

      {/* 9-year cycle minimap */}
      <div>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>9-Jahres-Zyklus</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const num = i + 1;
            const t = YEAR_THEMES[num]!;
            const isActive = num === cyclePos;
            return (
              <div key={num} style={{ flex: 1, textAlign: 'center', padding: '4px 2px', borderRadius: 5, background: isActive ? `${t.color}18` : 'transparent', border: `1px solid ${isActive ? t.color + '50' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? t.color : '#3a3530' }}>{num}</div>
                <div style={{ fontSize: 6, color: isActive ? t.color + 'aa' : '#2a2520', lineHeight: 1.2, marginTop: 1 }}>{t.name.split(' ')[0]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
