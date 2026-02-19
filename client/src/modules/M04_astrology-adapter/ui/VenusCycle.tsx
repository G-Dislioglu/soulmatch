// Venus synodic cycle ~584 days; approximate phase from birth date
function getVenusPhase(birthDate: string): { phase: string; icon: string; quality: string; love: string; color: string } {
  const d = new Date(birthDate);
  const ref = new Date('2000-01-01');
  const diff = Math.floor((d.getTime() - ref.getTime()) / 86400000);
  const cycle = ((diff % 584) + 584) % 584;
  const seg = Math.floor(cycle / 73); // 8 segments (~73 days each)

  const phases = [
    { phase: 'Innere Konjunktion', icon: '☀', quality: 'Erneuerung, neues Liebeskapitel beginnt', love: 'Frischer Start in der Liebe — was willst du wirklich?', color: '#f97316' },
    { phase: 'Morgenstern (Phosphoros)', icon: '🌟', quality: 'Mutige Liebe, Pionier des Herzens', love: 'Du ziehst durch Stärke und Authentizität an', color: '#ef4444' },
    { phase: 'Östliche Elongation', icon: '✨', quality: 'Sichtbarkeit, Selbstwert, Ausstrahlung', love: 'Deine Schönheit und Werte sind gut sichtbar', color: '#fbbf24' },
    { phase: 'Stationär rückläufig (Morgen)', icon: '🔄', quality: 'Überprüfung alter Beziehungen, Rückblick', love: 'Alte Lieben oder Muster tauchen wieder auf', color: '#a78bfa' },
    { phase: 'Äußere Konjunktion', icon: '🌙', quality: 'Reife Liebe, Tiefe, Verborgenes', love: 'Die tiefsten Werte und Wünsche zeigen sich', color: '#7c3aed' },
    { phase: 'Abendstern (Hesperos)', icon: '🌠', quality: 'Anziehung, Harmonie, Beziehungsblüte', love: 'Romantik und Anziehung sind auf dem Höhepunkt', color: '#f472b6' },
    { phase: 'Westliche Elongation', icon: '💫', quality: 'Genuss, Schönheit, Fülle in der Liebe', love: 'Eine Zeit der Ernte — genieße was du aufgebaut hast', color: '#22c55e' },
    { phase: 'Stationär rückläufig (Abend)', icon: '⭐', quality: 'Integration, was bleibt wirklich?', love: 'Kläre was wirklich wertvoll ist in deiner Liebe', color: '#818cf8' },
  ];

  return phases[seg] ?? phases[0]!;
}

const VENUS_GIFTS = [
  { title: 'In der Liebe', icon: '♥', desc: 'Venus zeigt wie du liebst und was du begehrst' },
  { title: 'Im Wert', icon: '✦', desc: 'Dein innerer Wert und materieller Sinn sind Venus-geprägt' },
  { title: 'In der Schönheit', icon: '◈', desc: 'Dein Schönheitssinn und Ästhetik folgen der Venus' },
  { title: 'In der Anziehung', icon: '☽', desc: 'Was du anziehst entspricht deiner Venus-Energie' },
];

interface VenusCycleProps { birthDate: string; }

export function VenusCycle({ birthDate }: VenusCycleProps) {
  const phase = getVenusPhase(birthDate);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Venus-Geburts-Zyklus</div>
        <div style={{ fontSize: 28, marginBottom: 5 }}>{phase.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: phase.color }}>{phase.phase}</div>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${phase.color}08`, border: `1px solid ${phase.color}22`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: phase.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Deine Venusqualität</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{phase.quality}</p>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.18)', marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: '#f472b6', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>♥ In der Liebe</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#f472b6', lineHeight: 1.5, fontStyle: 'italic' }}>„{phase.love}"</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {VENUS_GIFTS.map(g => (
          <div key={g.title} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 7, color: '#f472b6', fontWeight: 700, marginBottom: 2 }}>{g.icon} {g.title}</div>
            <div style={{ fontSize: 7, color: '#5a5448', lineHeight: 1.3 }}>{g.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
