const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const DAY_RULER: Record<number, { planet: string; icon: string; color: string; energy: string }> = {
  0: { planet: 'Sonne', icon: '☉', color: '#fbbf24', energy: 'Vitalität & Ausdruck' },
  1: { planet: 'Mond', icon: '☽', color: '#38bdf8', energy: 'Gefühl & Intuition' },
  2: { planet: 'Mars', icon: '♂', color: '#ef4444', energy: 'Energie & Antrieb' },
  3: { planet: 'Merkur', icon: '☿', color: '#a3e635', energy: 'Kommunikation & Geist' },
  4: { planet: 'Jupiter', icon: '♃', color: '#d4af37', energy: 'Wachstum & Weisheit' },
  5: { planet: 'Venus', icon: '♀', color: '#f472b6', energy: 'Liebe & Harmonie' },
  6: { planet: 'Saturn', icon: '♄', color: '#a78bfa', energy: 'Struktur & Disziplin' },
};

const DAY_TIPS: Record<number, string[]> = {
  0: ['Zeige dich und deine Talente', 'Treffe wichtige Entscheidungen', 'Verbinde dich mit deinem Kern'],
  1: ['Pflege deine Beziehungen', 'Höre auf deine Träume', 'Schreib Tagebuch'],
  2: ['Starte neue Projekte mit Energie', 'Sport und körperliche Aktivität', 'Setze klare Grenzen'],
  3: ['Führe wichtige Gespräche', 'Lerne etwas Neues', 'Schreibe Nachrichten und Briefe'],
  4: ['Expandiere deinen Horizont', 'Plane Zukunftsprojekte', 'Sei großzügig'],
  5: ['Feiere Schönheit und Kunst', 'Pflege Liebesbeziehungen', 'Kaufe etwas Schönes'],
  6: ['Arbeite an langfristigen Zielen', 'Räume auf und organisiere', 'Übe Disziplin'],
};

interface WeeklyAstroViewProps { compact?: boolean; }

export function WeeklyAstroView({ compact = false }: WeeklyAstroViewProps) {
  const today = new Date();
  const todayDow = today.getDay();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - todayDow + i);
    const dow = d.getDay();
    const ruler = DAY_RULER[dow]!;
    const tips = DAY_TIPS[dow] ?? [];
    const isToday = dow === todayDow;
    return { d, dow, ruler, tips, isToday, label: DAYS_DE[dow] ?? '?', dayNum: d.getDate() };
  });

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
        {days.map(({ dow, ruler, isToday, label, dayNum }) => (
          <div key={dow} style={{
            flexShrink: 0, width: 52, textAlign: 'center', padding: '7px 4px',
            borderRadius: 9, background: isToday ? `${ruler.color}14` : 'rgba(255,255,255,0.02)',
            border: `${isToday ? 1.5 : 1}px solid ${isToday ? ruler.color + '50' : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div style={{ fontSize: 7, color: isToday ? ruler.color : '#3a3530', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 8, color: '#3a3530', marginBottom: 4 }}>{dayNum}</div>
            <div style={{ fontSize: 14 }}>{ruler.icon}</div>
            <div style={{ fontSize: 7, color: isToday ? ruler.color : '#4a4540', marginTop: 2, lineHeight: 1.2 }}>{ruler.planet}</div>
          </div>
        ))}
      </div>
    );
  }

  const today_ = days.find((d) => d.isToday)!;

  return (
    <div>
      {/* Compact week row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {days.map(({ dow, ruler, isToday, label, dayNum }) => (
          <div key={dow} style={{
            flexShrink: 0, flex: 1, textAlign: 'center', padding: '6px 2px',
            borderRadius: 8, background: isToday ? `${ruler.color}12` : 'rgba(255,255,255,0.02)',
            border: `${isToday ? 1.5 : 1}px solid ${isToday ? ruler.color + '45' : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div style={{ fontSize: 7, color: isToday ? ruler.color : '#3a3530', textTransform: 'uppercase', fontWeight: isToday ? 700 : 400 }}>{label}</div>
            <div style={{ fontSize: 7, color: '#2a2520', marginBottom: 3 }}>{dayNum}.</div>
            <div style={{ fontSize: 12 }}>{ruler.icon}</div>
            <div style={{ fontSize: 7, color: isToday ? ruler.color : '#3a3530', marginTop: 2 }}>{ruler.planet}</div>
          </div>
        ))}
      </div>

      {/* Today detail */}
      {today_ && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: `${today_.ruler.color}0a`, border: `1px solid ${today_.ruler.color}25` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{today_.ruler.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: today_.ruler.color, fontFamily: "'Cormorant Garamond', serif" }}>
                {DAYS_DE[today_.dow]}-Tag · Herrscher: {today_.ruler.planet}
              </div>
              <div style={{ fontSize: 10, color: '#5a5448' }}>{today_.ruler.energy}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {today_.tips.map((tip) => (
              <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: today_.ruler.color, fontSize: 8, marginTop: 1, flexShrink: 0 }}>✦</span>
                <span style={{ fontSize: 10, color: '#5a5448' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
