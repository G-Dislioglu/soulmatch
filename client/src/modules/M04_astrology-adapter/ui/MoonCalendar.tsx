// Moon phase calendar — deterministic Julian Date calculation, no deps.

const SYNODIC = 29.530588853; // days per lunar cycle
const NEW_MOON_REF = new Date('2000-01-06T18:14:00Z'); // known new moon (J2000)

function moonAge(date: Date): number {
  const msPerDay = 86400000;
  const diff = (date.getTime() - NEW_MOON_REF.getTime()) / msPerDay;
  return ((diff % SYNODIC) + SYNODIC) % SYNODIC;
}

function moonEmoji(age: number): string {
  if (age < 1.85) return '🌑';
  if (age < 5.54) return '🌒';
  if (age < 9.22) return '🌓';
  if (age < 12.91) return '🌔';
  if (age < 16.61) return '🌕';
  if (age < 20.30) return '🌖';
  if (age < 23.99) return '🌗';
  if (age < 27.68) return '🌘';
  return '🌑';
}

function moonPhaseName(age: number): string {
  if (age < 1.85) return 'Neumond';
  if (age < 5.54) return 'Zunehmende Sichel';
  if (age < 9.22) return 'Erstes Viertel';
  if (age < 12.91) return 'Zunehmender Halbmond';
  if (age < 16.61) return 'Vollmond';
  if (age < 20.30) return 'Abnehmender Halbmond';
  if (age < 23.99) return 'Letztes Viertel';
  return 'Abnehmende Sichel';
}

function isKeyPhase(age: number): boolean {
  return age < 1.85 || (age > 6.9 && age < 8.5) || (age > 14.7 && age < 16.6) || (age > 22.1 && age < 23.7);
}

const WEEKDAY_DE_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTH_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function MoonCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWday = (firstDay.getDay() + 6) % 7; // Mon=0

  // Today's phase
  const todayAge = moonAge(today);
  const todayPhase = moonPhaseName(todayAge);
  const todayEmoji = moonEmoji(todayAge);

  // Build calendar grid
  const cells: (number | null)[] = Array(startWday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: '#f0eadc' }}>
          {MONTH_DE[month]} {year}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16 }}>{todayEmoji}</div>
          <div style={{ fontSize: 9, color: '#7a7468', marginTop: 1 }}>{todayPhase}</div>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAY_DE_SHORT.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#4a4540', fontWeight: 600, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const date = new Date(year, month, day, 12);
          const age = moonAge(date);
          const emoji = moonEmoji(age);
          const isToday = day === today.getDate();
          const keyPhase = isKeyPhase(age);
          return (
            <div key={idx} style={{
              aspectRatio: '1', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, padding: '2px',
              background: isToday ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.02)',
              border: isToday ? '1px solid rgba(212,175,55,0.4)' : keyPhase ? '1px solid rgba(192,132,252,0.2)' : '1px solid transparent',
            }}>
              <div style={{ fontSize: 13, lineHeight: 1 }}>{emoji}</div>
              <div style={{ fontSize: 8, color: isToday ? '#d4af37' : '#4a4540', fontWeight: isToday ? 700 : 400, marginTop: 1 }}>{day}</div>
            </div>
          );
        })}
      </div>

      {/* Key phase legend */}
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['🌑 Neumond', '🌓 Viertel', '🌕 Vollmond', '🌗 Viertel'].map((phase) => (
          <span key={phase} style={{ fontSize: 9, color: '#4a4540' }}>{phase}</span>
        ))}
      </div>
    </div>
  );
}
