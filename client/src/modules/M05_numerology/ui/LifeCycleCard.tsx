import { calcLifePath } from '../lib/calc';

// Numerology life cycles: 3 major cycles of ~27 years each
// Each cycle number = reduced digits of birth month, day, year
function getLifeCycles(birthDate: string): { first: number; second: number; third: number; currentCycle: 1 | 2 | 3; ageInCycle: number } {
  const parts = birthDate.split('-');
  const y = parseInt(parts[0] ?? '1990', 10);
  const m = parseInt(parts[1] ?? '1', 10);
  const d = parseInt(parts[2] ?? '1', 10);
  const today = new Date();
  const age = today.getFullYear() - y;

  const reduce = (n: number): number => {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce((a, b) => a + parseInt(b, 10), 0);
    }
    return n;
  };

  const lp = calcLifePath(birthDate).value;
  const firstEnd = 36 - lp;
  const secondEnd = firstEnd + 27;

  const first = reduce(m);
  const second = reduce(d);
  const third = reduce(y);

  let currentCycle: 1 | 2 | 3 = 1;
  let ageInCycle = age;
  if (age > firstEnd && age <= secondEnd) { currentCycle = 2; ageInCycle = age - firstEnd; }
  else if (age > secondEnd) { currentCycle = 3; ageInCycle = age - secondEnd; }

  return { first, second, third, currentCycle, ageInCycle };
}

const CYCLE_DATA: Record<number, { theme: string; energy: string; lesson: string; color: string }> = {
  1: { theme: 'Selbstfindung & Unabhängigkeit', energy: 'Pioniergeist, Individualität, Mut zum Eigenen', lesson: 'Lerne auf dich selbst zu vertrauen und deinen eigenen Weg zu gehen', color: '#ef4444' },
  2: { theme: 'Beziehungen & Kooperation', energy: 'Sensibilität, Partnerschaft, Diplomatie', lesson: 'Lerne zu geben und zu empfangen ohne dich selbst zu verlieren', color: '#93c5fd' },
  3: { theme: 'Ausdruck & Kreativität', energy: 'Freude, Kommunikation, künstlerischer Ausdruck', lesson: 'Lerne deine innere Welt mit der Außenwelt zu teilen', color: '#fbbf24' },
  4: { theme: 'Aufbau & Disziplin', energy: 'Struktur, Fleiß, Beständigkeit', lesson: 'Lerne durch harte Arbeit solide Fundamente zu erschaffen', color: '#a16207' },
  5: { theme: 'Freiheit & Wandel', energy: 'Abenteuer, Veränderung, Vielseitigkeit', lesson: 'Lerne Freiheit zu leben ohne Verantwortung zu fliehen', color: '#22d3ee' },
  6: { theme: 'Verantwortung & Fürsorge', energy: 'Familie, Heilung, Harmonie', lesson: 'Lerne zu dienen ohne dich dabei zu opfern', color: '#22c55e' },
  7: { theme: 'Innenschau & Spiritualität', energy: 'Analyse, Weisheit, innere Stille', lesson: 'Lerne in der Stille die Antworten zu finden die du suchst', color: '#7c3aed' },
  8: { theme: 'Macht & Manifestation', energy: 'Erfolg, Fülle, Führung', lesson: 'Lerne Macht mit Integrität zu nutzen und Fülle zu erschaffen', color: '#d4af37' },
  9: { theme: 'Vollendung & Hingabe', energy: 'Universelle Liebe, Abschluss, Mitgefühl', lesson: 'Lerne loszulassen und dem Größeren zu dienen', color: '#c026d3' },
  11: { theme: 'Erleuchtung & Inspiration', energy: 'Spirituelle Führung, Intuition, Licht', lesson: 'Lerne deine Sensibilität als Stärke zu nutzen', color: '#f472b6' },
  22: { theme: 'Meisterbau & Vermächtnis', energy: 'Monumentales erschaffen, Visionen verwirklichen', lesson: 'Lerne deine große Vision Schritt für Schritt in die Realität zu bringen', color: '#38bdf8' },
};

const DEFAULT_CYCLE = { theme: 'Einzigartiger Weg', energy: 'Deine Energie ist einzigartig', lesson: 'Deine Lektion entfaltet sich auf deinem eigenen Weg', color: '#d4af37' };

interface LifeCycleCardProps { birthDate: string; }

export function LifeCycleCard({ birthDate }: LifeCycleCardProps) {
  const { first, second, third, currentCycle, ageInCycle } = getLifeCycles(birthDate);
  const cycles = [first, second, third];
  const currentNum = cycles[currentCycle - 1] ?? first;
  const currentData = CYCLE_DATA[currentNum] ?? DEFAULT_CYCLE;
  const cycleNames = ['Erster Zyklus', 'Zweiter Zyklus', 'Dritter Zyklus'];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Lebenszyklus-Analyse</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: currentData.color }}>
          {cycleNames[currentCycle - 1]} · Jahr {ageInCycle}
        </div>
        <div style={{ display: 'inline-block', marginTop: 5, padding: '2px 10px', borderRadius: 10, background: `${currentData.color}15`, border: `1px solid ${currentData.color}35`, fontSize: 8, color: currentData.color, fontWeight: 700 }}>
          ◉ AKTIVER ZYKLUS: {currentNum}
        </div>
      </div>

      {/* All 3 cycles overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 10 }}>
        {cycles.map((num, i) => {
          const d = CYCLE_DATA[num] ?? DEFAULT_CYCLE;
          const isActive = i + 1 === currentCycle;
          return (
            <div key={i} style={{ padding: '7px 6px', borderRadius: 8, background: isActive ? `${d.color}12` : 'rgba(90,84,72,0.04)', border: `1px solid ${isActive ? d.color + '35' : 'rgba(90,84,72,0.12)'}`, textAlign: 'center', opacity: isActive ? 1 : 0.6 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: d.color }}>{num}</div>
              <div style={{ fontSize: 6, color: '#5a5448', lineHeight: 1.3 }}>{cycleNames[i]}</div>
              {isActive && <div style={{ fontSize: 6, color: d.color, fontWeight: 700, marginTop: 2 }}>← Jetzt</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: `${currentData.color}07`, border: `1px solid ${currentData.color}20` }}>
          <div style={{ fontSize: 7, color: currentData.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Zyklus-Thema</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{currentData.theme}</p>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✦ Energie dieser Phase</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{currentData.energy}</p>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>★ Deine Lektion</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>„{currentData.lesson}"</p>
        </div>
      </div>
    </div>
  );
}
