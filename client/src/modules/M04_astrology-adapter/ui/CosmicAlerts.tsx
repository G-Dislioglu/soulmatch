// Hardcoded 2025 significant cosmic events — no server needed.

interface CosmicEvent {
  date: string; // YYYY-MM-DD
  title: string;
  type: 'eclipse' | 'retrograde' | 'retrograde_end' | 'ingress' | 'full_moon' | 'new_moon' | 'conjunction';
  desc: string;
  color: string;
}

const EVENTS_2025: CosmicEvent[] = [
  { date: '2025-01-13', title: 'Neumond Steinbock', type: 'new_moon', desc: 'Neue Vorsätze in Struktur und Karriere setzen.', color: '#a3a3a3' },
  { date: '2025-01-29', title: 'Vollmond Löwe', type: 'full_moon', desc: 'Kreativität und Selbstausdruck erreichen Höhepunkt.', color: '#f59e0b' },
  { date: '2025-03-14', title: 'Totale Mondfinsternis', type: 'eclipse', desc: 'Kraftvolle Transformation im Jungfrau/Fische-Achse.', color: '#c084fc' },
  { date: '2025-03-29', title: 'Partielle Sonnenfinsternis', type: 'eclipse', desc: 'Neubeginn in Widder — Mut und Initiative.', color: '#ef4444' },
  { date: '2025-04-07', title: 'Neumond Widder', type: 'new_moon', desc: 'Kraftvoller Start für mutige neue Projekte.', color: '#ef4444' },
  { date: '2025-04-12', title: 'Merkur Rückläufig', type: 'retrograde', desc: 'Kommunikation & Technik: Sorgfalt und Überprüfung.', color: '#38bdf8' },
  { date: '2025-05-06', title: 'Merkur direkt', type: 'retrograde_end', desc: 'Merkur läuft wieder vorwärts. Klärung und Bewegung.', color: '#38bdf8' },
  { date: '2025-06-11', title: 'Saturn Rückläufig', type: 'retrograde', desc: 'Strukturen überdenken. Karmische Lektionen vertiefen sich.', color: '#a3a3a3' },
  { date: '2025-07-18', title: 'Vollmond Steinbock', type: 'full_moon', desc: 'Erntezeit für geduldig aufgebaute Strukturen.', color: '#a3a3a3' },
  { date: '2025-07-24', title: 'Venus Rückläufig', type: 'retrograde', desc: 'Beziehungen, Werte und Selbstliebe neu bewerten.', color: '#f472b6' },
  { date: '2025-08-02', title: 'Jupiter Rückläufig', type: 'retrograde', desc: 'Inneres Wachstum statt äußerer Expansion.', color: '#d4af37' },
  { date: '2025-09-06', title: 'Venus direkt', type: 'retrograde_end', desc: 'Beziehungsklarheit kehrt zurück.', color: '#f472b6' },
  { date: '2025-09-07', title: 'Totale Mondfinsternis', type: 'eclipse', desc: 'Abschlüsse und Transformationen in Fische/Jungfrau.', color: '#c084fc' },
  { date: '2025-09-21', title: 'Sonnenfinsternis Jungfrau', type: 'eclipse', desc: 'Heilung, Dienst und Neuausrichtung.', color: '#34d399' },
  { date: '2025-10-07', title: 'Pluto Direkt', type: 'retrograde_end', desc: 'Tiefe Transformation manifestiert sich nun äußerlich.', color: '#818cf8' },
  { date: '2025-11-09', title: 'Saturn Direkt', type: 'retrograde_end', desc: 'Strukturen stabilisieren sich wieder.', color: '#a3a3a3' },
  { date: '2025-12-04', title: 'Jupiter Direkt', type: 'retrograde_end', desc: 'Expansion und Wachstum nehmen Fahrt auf.', color: '#d4af37' },
  { date: '2025-12-20', title: 'Merkur Rückläufig', type: 'retrograde', desc: 'Jahresabschluss mit Überprüfung und Reflexion.', color: '#38bdf8' },
];

const TYPE_ICON: Record<string, string> = {
  eclipse: '🌑', retrograde: '⟳', retrograde_end: '→', ingress: '↠',
  full_moon: '🌕', new_moon: '🌑', conjunction: '⊕',
};
const TYPE_DE: Record<string, string> = {
  eclipse: 'Finsternis', retrograde: 'Rückläufig', retrograde_end: 'Direkt',
  ingress: 'Einzug', full_moon: 'Vollmond', new_moon: 'Neumond', conjunction: 'Konjunktion',
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function CosmicAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Show: past 7 days + next 60 days
  const relevant = EVENTS_2025.filter((e) => {
    const d = daysUntil(e.date);
    return d >= -7 && d <= 60;
  }).slice(0, 6);

  if (relevant.length === 0) {
    return <div style={{ fontSize: 11, color: '#4a4540', textAlign: 'center', padding: '12px 0' }}>Keine Ereignisse in den nächsten 60 Tagen.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {relevant.map((ev) => {
        const d = daysUntil(ev.date);
        const isPast = d < 0;
        const isToday = d === 0;
        const isSoon = d >= 0 && d <= 7;

        return (
          <div key={ev.date} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 9, opacity: isPast ? 0.45 : 1,
            background: isToday ? `${ev.color}15` : isSoon ? `${ev.color}08` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isToday ? ev.color + '50' : isSoon ? ev.color + '25' : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div style={{ fontSize: 14, flexShrink: 0 }}>{TYPE_ICON[ev.type] ?? '✦'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: isToday || isSoon ? 700 : 400, color: isSoon ? '#f0eadc' : '#7a7468' }}>
                {ev.title}
                {isToday && <span style={{ fontSize: 8, color: ev.color, marginLeft: 6, padding: '1px 5px', borderRadius: 4, background: `${ev.color}20` }}>HEUTE</span>}
              </div>
              {(isToday || isSoon) && <div style={{ fontSize: 10, color: '#5a5448', marginTop: 1 }}>{ev.desc}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: isPast ? '#3a3530' : ev.color }}>
                {isPast ? `vor ${Math.abs(d)}d` : isToday ? 'heute' : `in ${d}d`}
              </div>
              <div style={{ fontSize: 8, color: '#3a3530' }}>{TYPE_DE[ev.type]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
