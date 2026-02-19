import { calcLifePath, calcExpression, calcSoulUrge } from '../../M05_numerology/lib/calc';

const KARMIC_NUMBERS = [13, 14, 16, 19];

interface KarmicInfo { name: string; lesson: string; gift: string; color: string; }
const KARMIC_DEFS: Record<number, KarmicInfo> = {
  13: { name: 'Karma 13 – Faulheit → Fleiß', lesson: 'Beide tragen die Lektion, durch konsequenten Einsatz Früchte zu ernten. Abkürzungen schaden mehr als sie helfen.', gift: 'Gemeinsam baut ihr etwas Bleibendes — wenn ihr die Arbeit nicht scheut.', color: '#f59e0b' },
  14: { name: 'Karma 14 – Missbrauch → Freiheit', lesson: 'Diese Verbindung lädt ein, Freiheit verantwortungsvoll zu leben. Kontrolle und Exzesse lösen sich durch bewusstes Maß.', gift: 'Gemeinsam entfaltet ihr eine außergewöhnliche Anpassungsfähigkeit.', color: '#22d3ee' },
  16: { name: 'Karma 16 – Ego → Demut', lesson: 'Alte Ego-Muster kommen ans Licht. Das Zusammenspiel verlangt Ehrlichkeit und das Loslassen von Stolz.', gift: 'Tiefe spirituelle Reife wächst durch gemeinsame Prüfungen.', color: '#7c3aed' },
  19: { name: 'Karma 19 – Isolation → Gemeinschaft', lesson: 'Unabhängigkeit darf nicht zur Isolation werden. Diese Verbindung lehrt gegenseitiges Vertrauen und Öffnung.', gift: 'Beide lernen, wahre Stärke im Miteinander zu finden.', color: '#ef4444' },
};

function extractKarmic(name: string, birthDate: string): Set<number> {
  const lp = calcLifePath(birthDate);
  const ex = calcExpression(name);
  const su = calcSoulUrge(name);
  const found = new Set<number>();
  [lp.trace, ex.trace, su.trace].forEach((trace) => {
    KARMIC_NUMBERS.forEach((k) => {
      if (trace.includes(String(k))) found.add(k);
    });
  });
  return found;
}

interface KarmicPairCardProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function KarmicPairCard({ nameA, birthDateA, nameB, birthDateB }: KarmicPairCardProps) {
  const karmaA = extractKarmic(nameA, birthDateA);
  const karmaB = extractKarmic(nameB, birthDateB);

  const shared = KARMIC_NUMBERS.filter((k) => karmaA.has(k) && karmaB.has(k));
  const onlyA = KARMIC_NUMBERS.filter((k) => karmaA.has(k) && !karmaB.has(k));
  const onlyB = KARMIC_NUMBERS.filter((k) => karmaB.has(k) && !karmaA.has(k));

  const allRelevant = [...new Set([...shared, ...onlyA, ...onlyB])];

  if (allRelevant.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: '#5a5448', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
        ✦ Keine Karma-Schulden-Zahlen in euren Kern-Zahlen erkannt.<br />
        <span style={{ fontSize: 10, color: '#3a3530' }}>Ein Zeichen karmic freier Energie.</span>
      </div>
    );
  }

  return (
    <div>
      {shared.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ☽ Gemeinsame Karma-Lektionen
          </div>
          {shared.map((k) => {
            const def = KARMIC_DEFS[k]!;
            return (
              <div key={k} style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 9, background: `${def.color}0a`, border: `1px solid ${def.color}30` }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: def.color, marginBottom: 4 }}>{def.name}</div>
                <p style={{ margin: '0 0 4px', fontSize: 11, lineHeight: 1.5, color: '#6a6460', fontStyle: 'italic' }}>{def.lesson}</p>
                <div style={{ fontSize: 10, color: def.color + 'cc' }}>✦ {def.gift}</div>
              </div>
            );
          })}
        </div>
      )}

      {(onlyA.length > 0 || onlyB.length > 0) && (
        <div>
          <div style={{ fontSize: 9, color: '#7a7468', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Individuelle Karma-Zahlen
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {onlyA.map((k) => {
              const def = KARMIC_DEFS[k]!;
              return (
                <div key={`a-${k}`} style={{ padding: '4px 9px', borderRadius: 7, background: `${def.color}08`, border: `1px solid ${def.color}20`, fontSize: 9, color: def.color }}>
                  {nameA.split(' ')[0]}: Karma {k}
                </div>
              );
            })}
            {onlyB.map((k) => {
              const def = KARMIC_DEFS[k]!;
              return (
                <div key={`b-${k}`} style={{ padding: '4px 9px', borderRadius: 7, background: `${def.color}08`, border: `1px solid ${def.color}20`, fontSize: 9, color: def.color }}>
                  {nameB.split(' ')[0]}: Karma {k}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
