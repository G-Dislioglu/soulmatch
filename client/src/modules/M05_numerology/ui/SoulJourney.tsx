import { calcLifePath } from '../lib/calc';

interface Milestone { age: string; theme: string; desc: string; }
interface JourneyDef { phases: { label: string; years: string; energy: string; desc: string }[]; milestones: Milestone[]; }

const JOURNEYS: Record<number, JourneyDef> = {
  1: {
    phases: [
      { label: 'Erwachen', years: '0–27', energy: 'Entdeckung', desc: 'Du erkennst deine Einzigartigkeit und lernst, dich zu behaupten.' },
      { label: 'Aufstieg', years: '27–45', energy: 'Führung', desc: 'Du übernimmst Verantwortung und baust deinen Weg aktiv auf.' },
      { label: 'Meisterschaft', years: '45+', energy: 'Vermächtnis', desc: 'Du wirst zur inspirierten Führungspersönlichkeit, die andere leitet.' },
    ],
    milestones: [
      { age: '~27', theme: 'Erste große Entscheidung', desc: 'Du triffst eine Wahl, die deinen eigenen Weg definiert — nicht den anderer.' },
      { age: '~36', theme: 'Führungsmoment', desc: 'Eine Möglichkeit, andere zu führen. Du kannst nicht mehr ausweichen.' },
      { age: '~45', theme: 'Reifeprüfung', desc: 'Deine Unabhängigkeit wird auf tiefste Weise getestet und bestätigt.' },
    ],
  },
  2: {
    phases: [
      { label: 'Verbindung', years: '0–27', energy: 'Lernen', desc: 'Du lernst, Beziehungen zu navigieren und Grenzen zu setzen.' },
      { label: 'Zusammenarbeit', years: '27–45', energy: 'Harmonisieren', desc: 'Du wirst zur Brücke zwischen Menschen und Ideen.' },
      { label: 'Weisheit', years: '45+', energy: 'Tiefe', desc: 'Du trägst kosmischen Frieden und teilst ihn mit der Welt.' },
    ],
    milestones: [
      { age: '~25', theme: 'Partnerschaft', desc: 'Eine tiefe Verbindung verändert deine Sichtweise auf Zusammenarbeit.' },
      { age: '~36', theme: 'Friedensstifter', desc: 'Du löst einen Konflikt auf eine Art, die allen zugutekkommt.' },
      { age: '~50', theme: 'Dienst', desc: 'Dein Lebenswerk wird im Dienst an anderen klar sichtbar.' },
    ],
  },
  3: {
    phases: [
      { label: 'Ausdruck', years: '0–27', energy: 'Spielen', desc: 'Kreativität und soziale Verbindung prägen deine frühen Jahre.' },
      { label: 'Erschaffung', years: '27–45', energy: 'Erschaffen', desc: 'Du manifestierst deine Kreativität in etwas Bleibendem.' },
      { label: 'Inspiration', years: '45+', energy: 'Inspirieren', desc: 'Deine Freude und dein Ausdruck inspirieren ganze Gemeinschaften.' },
    ],
    milestones: [
      { age: '~24', theme: 'Künstlerische Entfaltung', desc: 'Dein kreatives Talent findet seinen ersten großen Ausdruck.' },
      { age: '~33', theme: 'Plattform', desc: 'Du findest das Medium, durch das deine Botschaft die Welt erreicht.' },
      { age: '~45', theme: 'Erbe', desc: 'Dein kreatives Werk hinterlässt einen dauerhaften Abdruck.' },
    ],
  },
  4: {
    phases: [
      { label: 'Fundament', years: '0–27', energy: 'Aufbau', desc: 'Disziplin und Ausdauer formen deinen Charakter.' },
      { label: 'Errichten', years: '27–45', energy: 'Meistern', desc: 'Du baust systematisch auf, was deinen Werten entspricht.' },
      { label: 'Bleibend', years: '45+', energy: 'Vermächnis', desc: 'Dein Werk und deine Integrität werden zu deinem Erbe.' },
    ],
    milestones: [
      { age: '~28', theme: 'Erster Bau', desc: 'Etwas Konkretes entsteht durch deinen beharrlichen Einsatz.' },
      { age: '~40', theme: 'Krise der Rigidität', desc: 'Das Leben fordert Flexibilität. Eine wichtige Lektion in Loslassen.' },
      { age: '~52', theme: 'Vollendetes Werk', desc: 'Das Fundament ist gelegt. Andere profitieren von dem, was du geschaffen hast.' },
    ],
  },
  5: {
    phases: [
      { label: 'Abenteuer', years: '0–27', energy: 'Erkunden', desc: 'Freiheit und Erfahrung prägen deine frühe Reise.' },
      { label: 'Wandel', years: '27–45', energy: 'Transformieren', desc: 'Veränderungen sind der Motor deines Wachstums.' },
      { label: 'Weisheit der Freiheit', years: '45+', energy: 'Lehren', desc: 'Du lehrst andere, echte Freiheit zu leben.' },
    ],
    milestones: [
      { age: '~23', theme: 'Große Veränderung', desc: 'Ein Wendepunkt, der dein Leben grundlegend neuausrichtet.' },
      { age: '~36', theme: 'Verankerung', desc: 'Du entdeckst, was wirklich zählt — und was du nicht aufgeben willst.' },
      { age: '~50', theme: 'Freiheit mit Tiefe', desc: 'Echte Freiheit kommt aus Wahl, nicht aus Flucht.' },
    ],
  },
  6: {
    phases: [
      { label: 'Fürsorge', years: '0–27', energy: 'Pflegen', desc: 'Du lernst, zu geben — manchmal zu viel.' },
      { label: 'Harmonie', years: '27–45', energy: 'Balance', desc: 'Du findest die Balance zwischen Geben und Empfangen.' },
      { label: 'Heilung', years: '45+', energy: 'Heilen', desc: 'Deine Fürsorge weitet sich auf die Gemeinschaft aus.' },
    ],
    milestones: [
      { age: '~27', theme: 'Verantwortung', desc: 'Du übernimmst Verantwortung für jemanden oder etwas Wichtiges.' },
      { age: '~38', theme: 'Grenzen setzen', desc: 'Du lernst, Nein zu sagen ohne Schuldgefühle.' },
      { age: '~54', theme: 'Gemeinschaftswerk', desc: 'Deine Fürsorge erschafft etwas Bleibendes für viele.' },
    ],
  },
  7: {
    phases: [
      { label: 'Suche', years: '0–27', energy: 'Erforschen', desc: 'Fragen prägen dein inneres Leben stärker als Antworten.' },
      { label: 'Tiefe', years: '27–45', energy: 'Vertiefen', desc: 'Du stießt auf die Wahrheiten, nach denen du gesucht hast.' },
      { label: 'Weitergabe', years: '45+', energy: 'Teilen', desc: 'Deine Weisheit findet ihren Weg in die Welt.' },
    ],
    milestones: [
      { age: '~28', theme: 'Spirituelle Krise', desc: 'Eine tiefe innere Suche verändert dein Weltbild grundlegend.' },
      { age: '~42', theme: 'Erleuchtungsmoment', desc: 'Eine Erkenntnis, die alles in ein neues Licht taucht.' },
      { age: '~56', theme: 'Meister', desc: 'Du wirst zur Quelle der Weisheit für andere.' },
    ],
  },
  8: {
    phases: [
      { label: 'Aufbau', years: '0–27', energy: 'Lernen', desc: 'Du lernst die Spielregeln von Macht und Ressourcen.' },
      { label: 'Manifestation', years: '27–45', energy: 'Erschaffen', desc: 'Du erschaffst materielle und spirituelle Fülle.' },
      { label: 'Vermächtnis', years: '45+', energy: 'Geben', desc: 'Du gibst zurück, was du angehäuft hast.' },
    ],
    milestones: [
      { age: '~30', theme: 'Erfolgsmoment', desc: 'Ein erster bedeutsamer Durchbruch in deiner Karriere oder Karrierewahl.' },
      { age: '~40', theme: 'Macht und Verantwortung', desc: 'Du erkennst, dass wahre Macht Verantwortung bedeutet.' },
      { age: '~55', theme: 'Philanthropie', desc: 'Du findest Erfüllung darin, zu geben statt zu nehmen.' },
    ],
  },
  9: {
    phases: [
      { label: 'Lernen', years: '0–27', energy: 'Sammeln', desc: 'Du sammelst Erfahrungen und Weisheit aus der Welt.' },
      { label: 'Dienst', years: '27–45', energy: 'Geben', desc: 'Dein Lebenssinn zeigt sich im Dienst an anderen.' },
      { label: 'Vollendung', years: '45+', energy: 'Loslassen', desc: 'Du lässt los und öffnest Raum für das Neue.' },
    ],
    milestones: [
      { age: '~27', theme: 'Weltblick', desc: 'Reisen oder tiefe Erfahrungen erweitern deinen Horizont grundlegend.' },
      { age: '~45', theme: 'Abschluss', desc: 'Ein wichtiger Zyklus endet. Du wirst freier.' },
      { age: '~63', theme: 'Erbe der Liebe', desc: 'Was du der Welt gegeben hast, kommt zu dir zurück.' },
    ],
  },
};

const DEFAULT_JOURNEY: JourneyDef = {
  phases: [
    { label: 'Erwachen', years: '0–27', energy: 'Entdecken', desc: 'Die Grundlagen deines Seelenwegs formen sich.' },
    { label: 'Reifen', years: '27–45', energy: 'Wachsen', desc: 'Deine Stärken entfalten sich voll.' },
    { label: 'Vollendung', years: '45+', energy: 'Weitergeben', desc: 'Deine Weisheit fließt zurück in die Welt.' },
  ],
  milestones: [
    { age: '~27', theme: 'Saturn-Rückkehr', desc: 'Eine Phase tiefen Wandels und Neuausrichtung.' },
    { age: '~42', theme: 'Wendepunkt', desc: 'Du weißt, wer du bist — und wer du nicht bist.' },
  ],
};

interface SoulJourneyProps { name: string; birthDate: string; }

export function SoulJourney({ name: _name, birthDate }: SoulJourneyProps) {
  const lp = calcLifePath(birthDate).value;
  const journey = JOURNEYS[lp] ?? DEFAULT_JOURNEY;

  const birthYear = Number(birthDate.split('-')[0]);
  const currentAge = new Date().getFullYear() - birthYear;

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        LP {lp} · Alter {currentAge}
      </div>

      {/* Phases */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: 20, top: 16, bottom: 16, width: 1, background: 'rgba(212,175,55,0.15)' }} />
        {journey.phases.map((phase, i) => {
          const parts = phase.years.split('–').map(Number);
          const startAge = parts[0] ?? 0;
          const endAge = phase.years.includes('+') ? 999 : (parts[1] ?? 999);
          const isCurrent = currentAge >= startAge && currentAge <= endAge;
          const isPast = currentAge > endAge;
          return (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, opacity: isPast ? 0.5 : 1 }}>
              <div style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', marginTop: 2, flexShrink: 0,
                  background: isCurrent ? '#d4af37' : isPast ? '#2a2520' : 'transparent',
                  border: `1.5px solid ${isCurrent ? '#d4af37' : isPast ? '#3a3530' : '#d4af3740'}`,
                  zIndex: 1,
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: isCurrent ? '#d4af37' : isPast ? '#3a3530' : '#7a7468' }}>{phase.label}</span>
                  <span style={{ fontSize: 8, color: isCurrent ? '#d4af37' : '#3a3530', padding: '1px 5px', borderRadius: 4, background: isCurrent ? 'rgba(212,175,55,0.12)' : 'transparent', border: isCurrent ? '1px solid rgba(212,175,55,0.25)' : 'none' }}>{phase.years}</span>
                  {isCurrent && <span style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase' }}>← Jetzt</span>}
                </div>
                <div style={{ fontSize: 9, color: '#3a3530', marginBottom: 2 }}>{phase.energy}</div>
                <div style={{ fontSize: 10, color: isPast ? '#3a3530' : '#5a5448', lineHeight: 1.4 }}>{phase.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Milestones */}
      <div style={{ fontSize: 9, color: '#7a7468', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
        Schlüsselmomente
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {journey.milestones.map((m, i) => {
          const mAge = Number(m.age.replace('~', ''));
          const isPast = currentAge > mAge + 2;
          return (
            <div key={i} style={{ padding: '6px 10px', borderRadius: 8, background: isPast ? 'rgba(255,255,255,0.01)' : 'rgba(212,175,55,0.06)', border: `1px solid ${isPast ? 'rgba(255,255,255,0.04)' : 'rgba(212,175,55,0.18)'}`, opacity: isPast ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 9, color: '#d4af37', fontWeight: 700 }}>{m.age}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: isPast ? '#3a3530' : '#a09a8e' }}>{m.theme}</span>
                {isPast && <span style={{ fontSize: 7, color: '#2a2520', marginLeft: 'auto' }}>✓ Vergangenheit</span>}
              </div>
              <div style={{ fontSize: 9, color: isPast ? '#2a2520' : '#4a4540', lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
