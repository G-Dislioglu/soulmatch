import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

interface GrowthStage {
  phase: string;
  theme: string;
  challenge: string;
  milestone: string;
}

const LP_GROWTH: Record<number, GrowthStage[]> = {
  1: [
    { phase: 'Erwachen', theme: 'Individuelle Identität finden', challenge: 'Abhängigkeiten loslassen', milestone: 'Erster mutiger Alleingang' },
    { phase: 'Aufbau', theme: 'Führung aus Stärke', challenge: 'Ego integrieren', milestone: 'Andere inspirieren ohne zu dominieren' },
    { phase: 'Reife', theme: 'Pionier mit Herz', challenge: 'Verletzlichkeit zulassen', milestone: 'Ein Lebenswerk, das bleibt' },
  ],
  2: [
    { phase: 'Erwachen', theme: 'Eigene Bedürfnisse erkennen', challenge: 'Grenzen setzen lernen', milestone: 'Erstes Nein aus Selbstliebe' },
    { phase: 'Aufbau', theme: 'Tiefe Verbindungen schaffen', challenge: 'Nicht in anderen aufgehen', milestone: 'Partnerschaft auf Augenhöhe' },
    { phase: 'Reife', theme: 'Friedensstifter', challenge: 'Eigene Wahrheit sprechen', milestone: 'Gemeinschaft um sich erschaffen' },
  ],
  3: [
    { phase: 'Erwachen', theme: 'Kreativen Ausdruck finden', challenge: 'Oberflächlichkeit überwinden', milestone: 'Erstes authentisches Werk' },
    { phase: 'Aufbau', theme: 'Freude als Berufung', challenge: 'Konsequenz entwickeln', milestone: 'Kreativität in Beruf integrieren' },
    { phase: 'Reife', theme: 'Inspirationsquelle für andere', challenge: 'Tiefe ohne Leichtigkeit zu verlieren', milestone: 'Bleibendes kreatives Vermächtnis' },
  ],
  4: [
    { phase: 'Erwachen', theme: 'Zuverlässigkeit als Stärke', challenge: 'Flexibilität entwickeln', milestone: 'Erstes nachhaltiges Projekt' },
    { phase: 'Aufbau', theme: 'Systeme und Fundamente', challenge: 'Kontrolle loslassen', milestone: 'Team oder Familie stabil aufbauen' },
    { phase: 'Reife', theme: 'Meister der Beständigkeit', challenge: 'Freude im Alltag finden', milestone: 'Dauerhaftes Lebenswerk' },
  ],
  5: [
    { phase: 'Erwachen', theme: 'Freiheit und Wandel annehmen', challenge: 'Verbindlichkeit üben', milestone: 'Erste vollendete Reise oder Phase' },
    { phase: 'Aufbau', theme: 'Abenteuer mit Wurzeln', challenge: 'Verantwortung ohne Enge', milestone: 'Stabile Basis trotz Bewegung' },
    { phase: 'Reife', theme: 'Freiheit lehren', challenge: 'Ankommen ohne Stillstand', milestone: 'Bewusst gewählte Heimat' },
  ],
  6: [
    { phase: 'Erwachen', theme: 'Fürsorge ohne Selbstverlust', challenge: 'Eigene Bedürfnisse sehen', milestone: 'Selbstfürsorge als Routine' },
    { phase: 'Aufbau', theme: 'Liebe als Lebenswerk', challenge: 'Perfektionismus loslassen', milestone: 'Harmonisches Zuhause erschaffen' },
    { phase: 'Reife', theme: 'Heilende Präsenz', challenge: 'Loslassen von Kontrolle', milestone: 'Andere befähigen, sich selbst zu helfen' },
  ],
  7: [
    { phase: 'Erwachen', theme: 'Wissen und Stille suchen', challenge: 'Isolation überwinden', milestone: 'Vertrauter Seelenmensch gefunden' },
    { phase: 'Aufbau', theme: 'Weisheit teilen', challenge: 'Vertrauen in andere', milestone: 'Erkenntnisse weitergeben' },
    { phase: 'Reife', theme: 'Weiser Mentor', challenge: 'Im Hier-und-Jetzt bleiben', milestone: 'Lebensphilosophie gelebt und weitergegeben' },
  ],
  8: [
    { phase: 'Erwachen', theme: 'Eigene Kraft erkennen', challenge: 'Machtmissbrauch vermeiden', milestone: 'Erster großer Erfolg aus Integrität' },
    { phase: 'Aufbau', theme: 'Fülle manifestieren', challenge: 'Großzügigkeit lernen', milestone: 'Vermögen oder Einfluss für Gutes nutzen' },
    { phase: 'Reife', theme: 'Steward der Ressourcen', challenge: 'Genug wissen', milestone: 'Philanthropisches Lebenswerk' },
  ],
  9: [
    { phase: 'Erwachen', theme: 'Mitgefühl kultivieren', challenge: 'Bitterkeit überwinden', milestone: 'Vergeben — sich selbst und anderen' },
    { phase: 'Aufbau', theme: 'Dienst an der Gemeinschaft', challenge: 'Selbstaufopferung vermeiden', milestone: 'Projekt für das Gemeinwohl' },
    { phase: 'Reife', theme: 'Universaler Weiser', challenge: 'Abschluss als Geschenk sehen', milestone: 'Leben als vollständiger Kreis' },
  ],
};

const DEFAULT_STAGES: GrowthStage[] = [
  { phase: 'Erwachen', theme: 'Sich selbst kennenlernen', challenge: 'Muster erkennen', milestone: 'Erste bewusste Entscheidung' },
  { phase: 'Aufbau', theme: 'Stärken einsetzen', challenge: 'Schwächen integrieren', milestone: 'Stabiles Leben erschaffen' },
  { phase: 'Reife', theme: 'Vermächtnis hinterlassen', challenge: 'Loslassen lernen', milestone: 'Leben im Einklang mit der Seele' },
];

function getPairNumber(lpA: number, lpB: number): number {
  return reduceToNumber(lpA + lpB) || 9;
}

interface GrowthPathProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function GrowthPath({ nameA, birthDateA, nameB, birthDateB }: GrowthPathProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const pairNum = getPairNumber(lpA, lpB);
  const stages = LP_GROWTH[pairNum] ?? DEFAULT_STAGES;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const GOLD = '#d4af37';
  const COLORS = ['#38bdf8', '#d4af37', '#c084fc'];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Beziehungszahl {pairNum}
        </div>
        <div style={{ fontSize: 11, color: GOLD, fontFamily: "'Cormorant Garamond', serif" }}>
          Gemeinsamer Wachstumspfad
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((stage, i) => {
          const color = COLORS[i] ?? GOLD;
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Step indicator */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${color}15`, border: `1.5px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color }}>{i + 1}</span>
                </div>
                {i < stages.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 12, background: `${color}20`, margin: '3px 0' }} />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color }}>{stage.phase}</span>
                  <span style={{ fontSize: 8, color: '#3a3530' }}>{stage.theme}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <div style={{ padding: '4px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                    <div style={{ fontSize: 7, color: '#ef4444', marginBottom: 1 }}>Herausforderung</div>
                    <div style={{ fontSize: 9, color: '#5a5448', lineHeight: 1.3 }}>{stage.challenge}</div>
                  </div>
                  <div style={{ padding: '4px 7px', borderRadius: 6, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <div style={{ fontSize: 7, color: '#22c55e', marginBottom: 1 }}>Meilenstein</div>
                    <div style={{ fontSize: 9, color: '#5a5448', lineHeight: 1.3 }}>{stage.milestone}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
