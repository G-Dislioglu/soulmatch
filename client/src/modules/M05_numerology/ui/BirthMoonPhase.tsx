interface MoonPhaseInfo {
  name: string;
  icon: string;
  color: string;
  energy: string;
  traits: string[];
  desc: string;
}

const MOON_PHASES: MoonPhaseInfo[] = [
  { name: 'Neumond', icon: '🌑', color: '#6366f1', energy: 'Neuanfang', traits: ['Visionär', 'Intuitiv', 'Geheimnisvoll'], desc: 'Du trägst das Potenzial aller Möglichkeiten in dir. Neuanfänge und unsichtbare Kräfte sind dein Element.' },
  { name: 'Zunehmend (Sichel)', icon: '🌒', color: '#8b5cf6', energy: 'Aufbau', traits: ['Entschlossen', 'Ehrgeizig', 'Kämpferisch'], desc: 'Deine Energie baut sich auf wie die Mondsichel. Du drängst vorwärts mit natürlicher Entschlossenheit.' },
  { name: 'Halbmond (erstes Viertel)', icon: '🌓', color: '#a78bfa', energy: 'Herausforderung', traits: ['Aktiv', 'Entscheidungsfreudig', 'Couragiert'], desc: 'Du bist eine Seele der Tat. Entscheidungen treffen und Hindernisse überwinden liegt dir im Blut.' },
  { name: 'Zunehmend (Gibbous)', icon: '🌔', color: '#c084fc', energy: 'Verfeinerung', traits: ['Analytisch', 'Perfektionistisch', 'Engagiert'], desc: 'Du bist der ewige Verfeinerer. Verbesserung und Perfektion treiben dich an.' },
  { name: 'Vollmond', icon: '🌕', color: '#d4af37', energy: 'Fülle', traits: ['Intensiv', 'Expressiv', 'Beziehungsorientiert'], desc: 'Vollmond-Geborene sind intensiv und leuchten hell. Deine Emotionen sind dein Kompass und dein Geschenk.' },
  { name: 'Abnehmend (Gibbous)', icon: '🌖', color: '#f59e0b', energy: 'Weitergabe', traits: ['Weise', 'Lehrend', 'Reflektierend'], desc: 'Du bist hier, um Weisheit zu teilen. Dein Wissen will weitergegeben werden.' },
  { name: 'Halbmond (letztes Viertel)', icon: '🌗', color: '#10b981', energy: 'Transformation', traits: ['Philosophisch', 'Hinterfragend', 'Transformierend'], desc: 'Du trägst die Kraft der Transformation. Alte Strukturen loszulassen fällt dir natürlich.' },
  { name: 'Abnehmend (Balsam)', icon: '🌘', color: '#38bdf8', energy: 'Vollendung', traits: ['Spirituell', 'Visionär', 'Abschließend'], desc: 'Du stehst am Ende eines kosmischen Zyklus. Spiritualität und Vollendung sind dein natürlicher Weg.' },
];

// Simplified moon phase calculation
// Based on lunar cycle from a known new moon: Jan 6, 2000
function getMoonPhaseIndex(dateStr: string): number {
  const date = new Date(dateStr);
  const knownNewMoon = new Date('2000-01-06');
  const daysDiff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const lunarCycle = 29.53058867;
  const phase = ((daysDiff % lunarCycle) + lunarCycle) % lunarCycle;
  return Math.floor((phase / lunarCycle) * 8) % 8;
}

interface BirthMoonPhaseProps { birthDate: string; }

export function BirthMoonPhase({ birthDate }: BirthMoonPhaseProps) {
  const phaseIdx = getMoonPhaseIndex(birthDate);
  const phase = MOON_PHASES[phaseIdx] ?? MOON_PHASES[0]!;

  return (
    <div>
      {/* Phase display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{phase.icon}</div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: phase.color, lineHeight: 1.2 }}>
            {phase.name}
          </div>
          <div style={{ fontSize: 9, color: '#5a5448', marginTop: 2 }}>Geburtsmond · Energie: {phase.energy}</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.7, color: '#8a8278', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
        {phase.desc}
      </p>

      {/* Traits */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {phase.traits.map((t) => (
          <span key={t} style={{ fontSize: 9, color: phase.color, padding: '2px 7px', borderRadius: 5, background: `${phase.color}0d`, border: `1px solid ${phase.color}25` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
