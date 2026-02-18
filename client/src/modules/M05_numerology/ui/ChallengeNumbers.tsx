import { reduceToNumber } from '../lib/calc';

interface ChallengeDef {
  title: string;
  lesson: string;
  color: string;
}

const CHALLENGE_DEF: Record<number, ChallengeDef> = {
  0: { title: 'Meisterschaft aller Herausforderungen', lesson: 'Du trägst das Potenzial aller Zahlen. Freie Wahl und Selbstverantwortung sind deine größte Lektion.', color: '#d4af37' },
  1: { title: 'Selbstvertrauen & Eigenständigkeit', lesson: 'Lerne, auf dich selbst zu vertrauen und deine eigene Stimme zu finden — ohne Abhängigkeit von der Meinung anderer.', color: '#ef4444' },
  2: { title: 'Überempfindlichkeit & Gleichmut', lesson: 'Finde innere Balance zwischen Mitgefühl und Selbstschutz. Deine Sensibilität ist Stärke — wenn du sie steuerst.', color: '#f472b6' },
  3: { title: 'Ausdruck & Selbstzweifel', lesson: 'Bringe deine Kreativität in die Welt, ohne dich hinter Selbstkritik zu verstecken. Deine Stimme hat Wert.', color: '#fbbf24' },
  4: { title: 'Struktur & Flexibilität', lesson: 'Lerne, Ordnung zu schaffen ohne starr zu werden. Disziplin ist dein Freund, nicht dein Gefängnis.', color: '#a3a3a3' },
  5: { title: 'Freiheit & Verantwortung', lesson: 'Erlebe Freiheit mit Bewusstsein. Unbeständigkeit ohne Anker führt zu Chaos — finde deine Mitte im Strom des Wandels.', color: '#38bdf8' },
  6: { title: 'Fürsorge ohne Kontrolle', lesson: 'Helfe und liebe, ohne zu kontrollieren. Die größte Fürsorge lässt dem anderen seinen Weg.', color: '#34d399' },
  7: { title: 'Vertrauen & Offenheit', lesson: 'Öffne dein analytisches Herz für das Unbeweisbare. Nicht alles Wahre lässt sich beweisen — vertraue dem Mysterium.', color: '#818cf8' },
  8: { title: 'Macht & Mitgefühl', lesson: 'Lerne, Erfolg und Macht im Dienst anderer zu nutzen, statt um sie kämpfen zu müssen. Führe durch Integrität.', color: '#d4af37' },
};

const DEFAULT_CHALLENGE: ChallengeDef = { title: 'Persönliche Herausforderung', lesson: 'Eine tiefe Lektion wartet auf dich.', color: '#a09a8e' };

function calcChallenges(birthDate: string): { num: number; label: string }[] {
  const parts = birthDate.split('-');
  const month = parseInt(parts[1] ?? '1', 10);
  const day = parseInt(parts[2] ?? '1', 10);
  const year = parseInt(parts[0] ?? '2000', 10);

  const m = reduceToNumber(month);
  const d = reduceToNumber(day);
  const y = reduceToNumber(year);

  const c1 = Math.abs(m - d);
  const c2 = Math.abs(d - y);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(m - y);

  return [
    { num: reduceToNumber(c1), label: '1. Herausforderung (Jung)' },
    { num: reduceToNumber(c2), label: '2. Herausforderung (Mitte)' },
    { num: reduceToNumber(c3), label: '3. Haupt-Herausforderung' },
    { num: reduceToNumber(c4), label: '4. Herausforderung (Reife)' },
  ];
}

interface ChallengeNumbersProps { birthDate: string; }

export function ChallengeNumbers({ birthDate }: ChallengeNumbersProps) {
  const challenges = calcChallenges(birthDate);
  const main = challenges[2];

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Karmische Herausforderungen
      </div>

      {/* Main challenge highlight */}
      {main && (() => {
        const def: ChallengeDef = CHALLENGE_DEF[main.num] ?? DEFAULT_CHALLENGE;
        return (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: `${def.color}0d`, border: `1px solid ${def.color}35`, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: def.color, lineHeight: 1, textShadow: `0 0 12px ${def.color}40`, flexShrink: 0 }}>{main.num}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f0eadc' }}>{def.title}</div>
                <div style={{ fontSize: 9, color: def.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Haupt-Herausforderung</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: '#8a8278', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{def.lesson}</p>
          </div>
        );
      })()}

      {/* All 4 challenges in a compact row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {challenges.map((c, i) => {
          const def: ChallengeDef = CHALLENGE_DEF[c.num] ?? DEFAULT_CHALLENGE;
          const isMain = i === 2;
          return (
            <div key={i} style={{
              textAlign: 'center', padding: '8px 4px', borderRadius: 8,
              background: isMain ? `${def.color}12` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isMain ? def.color + '35' : 'rgba(255,255,255,0.05)'}`,
            }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: isMain ? def.color : '#5a5448', lineHeight: 1 }}>{c.num}</div>
              <div style={{ fontSize: 7, color: '#3a3530', marginTop: 2, lineHeight: 1.2 }}>{['Jung', 'Mitte', 'Haupt', 'Reife'][i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
