import { calcLifePath, reduceToNumber } from '../lib/calc';

const MONTH_NAMES_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const ENERGY_THEMES: Record<number, { word: string; color: string; icon: string }> = {
  1: { word: 'Neubeginn', color: '#ef4444', icon: '🔥' },
  2: { word: 'Kooperation', color: '#38bdf8', icon: '🌊' },
  3: { word: 'Kreativität', color: '#fbbf24', icon: '✨' },
  4: { word: 'Aufbau', color: '#a16207', icon: '🏗' },
  5: { word: 'Wandel', color: '#22d3ee', icon: '🌬' },
  6: { word: 'Harmonie', color: '#22c55e', icon: '🌿' },
  7: { word: 'Reflexion', color: '#7c3aed', icon: '🌙' },
  8: { word: 'Fülle', color: '#d4af37', icon: '💎' },
  9: { word: 'Vollendung', color: '#c026d3', icon: '✦' },
};

function getMonthlyNumber(birthDate: string, year: number, month: number): number {
  const parts = birthDate.split('-');
  const bMonth = Number(parts[1] ?? '1');
  const bDay = Number(parts[2] ?? '1');
  const digits = `${year}${String(month).padStart(2, '0')}${String(bMonth).padStart(2, '0')}${String(bDay).padStart(2, '0')}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

interface YearCalendarProps { birthDate: string; }

export function YearCalendar({ birthDate }: YearCalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const lp = calcLifePath(birthDate).value;

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const num = getMonthlyNumber(birthDate, year, m);
    const theme = ENERGY_THEMES[num] ?? { word: '—', color: '#a09a8e', icon: '·' };
    return { m, num, theme, isCurrent: m === currentMonth, isPast: m < currentMonth };
  });

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        LP {lp} · Monatsenergien {year}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        {months.map(({ m, num, theme, isCurrent, isPast }) => (
          <div key={m} style={{
            padding: '7px 5px',
            borderRadius: 8,
            textAlign: 'center',
            background: isCurrent ? `${theme.color}15` : isPast ? 'rgba(255,255,255,0.02)' : `${theme.color}06`,
            border: isCurrent ? `1.5px solid ${theme.color}50` : `1px solid ${isPast ? 'rgba(255,255,255,0.05)' : theme.color + '20'}`,
            opacity: isPast ? 0.55 : 1,
            position: 'relative',
          }}>
            {isCurrent && (
              <div style={{ position: 'absolute', top: 2, right: 3, width: 5, height: 5, borderRadius: '50%', background: theme.color }} />
            )}
            <div style={{ fontSize: 8, color: isPast ? '#3a3530' : '#7a7468', marginBottom: 2 }}>{MONTH_NAMES_DE[m - 1]}</div>
            <div style={{ fontSize: 9, marginBottom: 1 }}>{theme.icon}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: isPast ? '#3a3530' : theme.color, lineHeight: 1 }}>{num}</div>
            <div style={{ fontSize: 7, color: isPast ? '#2a2520' : theme.color + 'cc', marginTop: 1, lineHeight: 1.2 }}>{theme.word}</div>
          </div>
        ))}
      </div>

      {/* Legend for current month */}
      {months.find((m) => m.isCurrent) && (() => {
        const cur = months.find((m) => m.isCurrent)!;
        return (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: `${cur.theme.color}0a`, border: `1px solid ${cur.theme.color}25` }}>
            <div style={{ fontSize: 9, color: cur.theme.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
              {cur.theme.icon} Aktuell: {MONTH_NAMES_DE[cur.m - 1]} — Zahl {cur.num} · {cur.theme.word}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
