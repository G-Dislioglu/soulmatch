// Approximate lunar phase calculation (synodic period ~29.53 days)
function getLunarPhase(date: Date): { name: string; icon: string; age: number } {
  const KNOWN_NEW_MOON = new Date('2024-01-11T11:57:00Z');
  const SYNODIC = 29.530588853;
  const diffMs = date.getTime() - KNOWN_NEW_MOON.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const age = ((diffDays % SYNODIC) + SYNODIC) % SYNODIC;

  if (age < 1.85) return { name: 'Neumond', icon: '🌑', age };
  if (age < 7.38) return { name: 'Zunehmend', icon: '🌒', age };
  if (age < 9.22) return { name: 'Erstes Viertel', icon: '🌓', age };
  if (age < 14.76) return { name: 'Zunehm. Gibbous', icon: '🌔', age };
  if (age < 16.61) return { name: 'Vollmond', icon: '🌕', age };
  if (age < 22.15) return { name: 'Abnehmend', icon: '🌖', age };
  if (age < 23.99) return { name: 'Letztes Viertel', icon: '🌗', age };
  return { name: 'Abnehm. Gibbous', icon: '🌘', age };
}

const PHASE_ENERGY: Record<string, string> = {
  'Neumond': 'Neubeginn setzen, Absichten pflanzen',
  'Zunehmend': 'Momentum aufbauen, Handeln',
  'Erstes Viertel': 'Hindernisse überwinden, Entscheiden',
  'Zunehm. Gibbous': 'Verfeinern, letzter Antrieb',
  'Vollmond': 'Manifestation, Emotionen hochpräsent',
  'Abnehmend': 'Loslassen, Dankbarkeit',
  'Letztes Viertel': 'Reflexion, Bereinigen',
  'Abnehm. Gibbous': 'Ruhe, nach innen gehen',
};

const PHASE_COLOR: Record<string, string> = {
  'Neumond': '#2a2520',
  'Zunehmend': '#38bdf8',
  'Erstes Viertel': '#818cf8',
  'Zunehm. Gibbous': '#c084fc',
  'Vollmond': '#fbbf24',
  'Abnehmend': '#c084fc',
  'Letztes Viertel': '#818cf8',
  'Abnehm. Gibbous': '#38bdf8',
};

export function LunarCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  // Shift so Monday=0
  const offset = (firstDow + 6) % 7;

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return { day: i + 1, phase: getLunarPhase(d) };
  });

  const todayPhase = getLunarPhase(today);
  const GOLD = '#d4af37';

  return (
    <div>
      {/* Current phase hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 28 }}>{todayPhase.icon}</span>
        <div>
          <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 1 }}>Heute · Tag {Math.floor(todayPhase.age) + 1} des Mondmonats</div>
          <div style={{ fontSize: 13, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: GOLD }}>{todayPhase.name}</div>
          <div style={{ fontSize: 9, color: '#5a5448' }}>{PHASE_ENERGY[todayPhase.name] ?? '—'}</div>
        </div>
      </div>

      {/* Month header */}
      <div style={{ fontSize: 9, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, textAlign: 'center' }}>
        {monthName}
      </div>

      {/* Weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 3 }}>
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 7, color: '#3a3530', paddingBottom: 2 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: offset }, (_, i) => <div key={`e-${i}`} />)}
        {days.map(({ day, phase }) => {
          const isToday = day === today.getDate();
          const color = PHASE_COLOR[phase.name] ?? GOLD;
          return (
            <div key={day} style={{
              textAlign: 'center', padding: '3px 1px', borderRadius: 5,
              background: isToday ? `${color}18` : 'transparent',
              border: isToday ? `1px solid ${color}40` : '1px solid transparent',
            }}>
              <div style={{ fontSize: 7, color: isToday ? color : '#3a3530', fontWeight: isToday ? 700 : 400 }}>{day}</div>
              <div style={{ fontSize: 8, lineHeight: 1 }}>{phase.icon}</div>
            </div>
          );
        })}
      </div>

      {/* Phase legend */}
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'].map((icon, i) => {
          const names = ['Neumond', 'Zunehmend', 'Erst. Viertel', 'Zun. Gibbous', 'Vollmond', 'Abnehm.', 'Letz. Viertel', 'Abn. Gibbous'];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 7, color: '#3a3530' }}>
              <span>{icon}</span><span>{names[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
