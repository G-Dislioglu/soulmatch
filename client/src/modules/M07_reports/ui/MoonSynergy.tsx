// Approximate birth moon phase
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z');
const SYNODIC = 29.530588853;

function getBirthMoonAge(birthDate: string): number {
  const d = new Date(birthDate + 'T12:00:00Z');
  const diffDays = (d.getTime() - KNOWN_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24);
  return ((diffDays % SYNODIC) + SYNODIC) % SYNODIC;
}

interface MoonPhaseInfo { name: string; icon: string; archetype: string; trait: string; shadow: string }

function getMoonPhaseInfo(age: number): MoonPhaseInfo {
  if (age < 3.7) return { name: 'Neumond', icon: '🌑', archetype: 'Der Pionier', trait: 'Instinktiv, visionär, setzt auf Intuition', shadow: 'Impulsivität' };
  if (age < 7.4) return { name: 'Zunehmende Sichel', icon: '🌒', archetype: 'Der Kämpfer', trait: 'Entschlossen, überwindet Hindernisse', shadow: 'Sturheit' };
  if (age < 11.1) return { name: 'Erstes Viertel', icon: '🌓', archetype: 'Der Handelnde', trait: 'Entscheidungsfreudig, direkt, mutig', shadow: 'Ungeduld' };
  if (age < 14.8) return { name: 'Zunehmend Gibbous', icon: '🌔', archetype: 'Der Perfektionist', trait: 'Analytisch, detailverliebt, zielstrebig', shadow: 'Überanalyse' };
  if (age < 18.5) return { name: 'Vollmond', icon: '🌕', archetype: 'Der Erfüller', trait: 'Expressiv, beziehungsorientiert, emotional tief', shadow: 'Überempfindlichkeit' };
  if (age < 22.2) return { name: 'Abnehmend Gibbous', icon: '🌖', archetype: 'Der Weiser', trait: 'Tiefgründig, teilt Wissen, sucht Sinn', shadow: 'Predigen' };
  if (age < 25.9) return { name: 'Letztes Viertel', icon: '🌗', archetype: 'Der Rebell', trait: 'Hinterfragt Konventionen, transformiert', shadow: 'Widerstand' };
  return { name: 'Abnehmende Sichel', icon: '🌘', archetype: 'Der Mystiker', trait: 'Intuitiv, spirituell, löst Altes auf', shadow: 'Isolation' };
}

const PHASE_PAIR_DESC: Record<string, string> = {
  'Neumond-Neumond': 'Zwei Pioniere — ihr folgt gemeinsam eurer Intuition und erschafft Neues.',
  'Vollmond-Vollmond': 'Zwei Erfüller — tiefe Emotionen, volle Expressivität, intensive Begegnung.',
  'Neumond-Vollmond': 'Instinkt trifft Ausdruck — einer fühlt den Weg, der andere zeigt ihn.',
  'Erstes Viertel-Letztes Viertel': 'Handeln und Loslassen — ihr ergänzt euch im ewigen Zyklus.',
  'Zunehmende Sichel-Abnehmend Gibbous': 'Aufbau trifft Weitergabe — eure Lebenskraft kreist als Einheit.',
};

function getPairDescription(phaseA: string, phaseB: string): string {
  const key1 = `${phaseA}-${phaseB}`;
  const key2 = `${phaseB}-${phaseA}`;
  return PHASE_PAIR_DESC[key1] ?? PHASE_PAIR_DESC[key2] ?? `${phaseA} und ${phaseB} — eure Mondphasen schaffen eine besondere, einzigartige Spannung.`;
}

interface MoonSynergyProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function MoonSynergy({ nameA, birthDateA, nameB, birthDateB }: MoonSynergyProps) {
  const ageA = getBirthMoonAge(birthDateA);
  const ageB = getBirthMoonAge(birthDateB);
  const phaseA = getMoonPhaseInfo(ageA);
  const phaseB = getMoonPhaseInfo(ageB);
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const pairDesc = getPairDescription(phaseA.name, phaseB.name);
  const SILVER = '#94a3b8';

  return (
    <div>
      {/* Pair header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24 }}>{phaseA.icon}</div>
          <div style={{ fontSize: 8, color: SILVER }}>{firstA}</div>
        </div>
        <div style={{ fontSize: 10, color: '#3a3530' }}>✦</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24 }}>{phaseB.icon}</div>
          <div style={{ fontSize: 8, color: SILVER }}>{firstB}</div>
        </div>
      </div>

      {/* Individual phases */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ name: firstA, phase: phaseA }, { name: firstB, phase: phaseB }].map(({ name, phase }) => (
          <div key={name} style={{ flex: 1, padding: '9px 10px', borderRadius: 10, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.15)' }}>
            <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 2 }}>{name}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: SILVER, fontFamily: "'Cormorant Garamond', serif", marginBottom: 3 }}>{phase.name}</div>
            <div style={{ fontSize: 8, color: '#d4af37', marginBottom: 2 }}>{phase.archetype}</div>
            <div style={{ fontSize: 8, color: '#5a5448', lineHeight: 1.4, marginBottom: 2 }}>{phase.trait}</div>
            <div style={{ fontSize: 7, color: '#ef4444aa' }}>Schatten: {phase.shadow}</div>
          </div>
        ))}
      </div>

      {/* Pair synergy */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <div style={{ fontSize: 8, color: SILVER, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>☽ Mondphasen-Synergie</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, lineHeight: 1.6, color: '#7a7468', fontStyle: 'italic' }}>
          {pairDesc}
        </p>
      </div>
    </div>
  );
}
