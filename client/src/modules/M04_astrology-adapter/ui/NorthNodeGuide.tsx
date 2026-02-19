// Approximate North Node sign from birth year (18.6-year cycle)
function getNorthNodeSign(birthDate: string): string {
  const y = parseInt(birthDate.split('-')[0] ?? '1990', 10);
  const cycle = ((y - 1950) % 19 + 19) % 19;
  const signs = ['Widder', 'Fische', 'Wassermann', 'Steinbock', 'Schütze', 'Skorpion', 'Waage', 'Jungfrau', 'Löwe', 'Krebs', 'Zwillinge', 'Stier', 'Widder', 'Fische', 'Wassermann', 'Steinbock', 'Schütze', 'Skorpion', 'Waage'];
  return signs[cycle] ?? 'Widder';
}

const NORTH_NODE_DATA: Record<string, { direction: string; pastLife: string; lesson: string; calling: string; fear: string; color: string }> = {
  'Widder': { direction: 'Entwickle Mut, Selbstständigkeit und eigene Initiative', pastLife: 'Zu viel Harmonie und Anpassung — andere zuerst, sich selbst zuletzt', lesson: 'Lerne, alleine zu handeln und dich selbst zu priorisieren', calling: 'Der mutige Pionier, der seinem eigenen Weg folgt', fear: 'Angst vor Konflikten und Alleinsein', color: '#ef4444' },
  'Stier': { direction: 'Entwickle Beständigkeit, Selbstwert und materielle Sicherheit', pastLife: 'Zu viel Kontrolle, Krisen und extremes Denken', lesson: 'Lerne, einfach zu sein, zu genießen und Sicherheit aufzubauen', calling: 'Der ruhige Weise der Beständigkeit und innerer Stärke', fear: 'Angst vor Kontrolle und Verlust des Besitzes', color: '#22c55e' },
  'Zwillinge': { direction: 'Entwickle Neugier, Kommunikation und Offenheit', pastLife: 'Zu viel absolutes Denken und Suche nach dem Sinn', lesson: 'Lerne, Fragen zu stellen statt Antworten zu kennen', calling: 'Der lebhafte Geist, der Brücken zwischen Ideen baut', fear: 'Angst vor Oberflächlichkeit und Unbeständigkeit', color: '#fbbf24' },
  'Krebs': { direction: 'Entwickle emotionale Tiefe, Fürsorge und innere Sicherheit', pastLife: 'Zu viel Karriere, öffentlicher Status und äußere Pflichten', lesson: 'Lerne, dich zu verwundbar zu zeigen und echte Intimität zu erlauben', calling: 'Der liebevolle Hüter der Gefühle und des Zuhauses', fear: 'Angst vor emotionaler Abhängigkeit', color: '#7c3aed' },
  'Löwe': { direction: 'Entwickle kreative Selbstentfaltung, Freude und Führung', pastLife: 'Zu viel Kollektiv und Aufgehen in der Gruppe', lesson: 'Lerne, du selbst zu sein ohne Rücksicht auf Gruppenerwartungen', calling: 'Der strahlende Ausdruck des einzigartigen Selbst', fear: 'Angst vor Eitelkeit und Rampenlicht', color: '#f97316' },
  'Jungfrau': { direction: 'Entwickle Dienst, Analyse und praktische Fähigkeiten', pastLife: 'Zu viel Träumen, Grenzenlosigkeit und Selbstauflösung', lesson: 'Lerne, Struktur zu schätzen und durch Arbeit zu wachsen', calling: 'Der heilende Diener der Präzision und Nützlichkeit', fear: 'Angst vor Kritik und Unvollkommenheit', color: '#34d399' },
  'Waage': { direction: 'Entwickle Partnerschaft, Fairness und Schönheitssinn', pastLife: 'Zu viel Unabhängigkeit und Kämpfe für sich selbst', lesson: 'Lerne, echter Partner zu sein und Kompromisse zu machen', calling: 'Der elegante Friedensstifter in echten Beziehungen', fear: 'Angst vor Abhängigkeit und Schwäche', color: '#f472b6' },
  'Skorpion': { direction: 'Entwickle Tiefe, Transformation und echte Intimität', pastLife: 'Zu viel materielle Sicherheit und Besitzdenken', lesson: 'Lerne, loszulassen und durch die Dunkelheit zu gehen', calling: 'Der mutige Transformator, der ins Tiefste taucht', fear: 'Angst vor Verlust und Kontrollverlust', color: '#c026d3' },
  'Schütze': { direction: 'Entwickle Philosophie, Weisheit und höheren Glauben', pastLife: 'Zu viel Details, Analyse und kleinteiliges Denken', lesson: 'Lerne, das Große zu sehen und Vertrauen zu haben', calling: 'Der inspirierende Lehrer, der andere in die Weite führt', fear: 'Angst vor Verallgemeinerung und Ungenauigkeit', color: '#d4af37' },
  'Steinbock': { direction: 'Entwickle Autorität, Disziplin und eigene Karriere', pastLife: 'Zu viel Abhängigkeit von Familie und emotionaler Sicherheit', lesson: 'Lerne, Verantwortung zu übernehmen und die eigene Kraft zu zeigen', calling: 'Der gereife Meister der Strukturen und der Berufung', fear: 'Angst vor Kälte und Versagen', color: '#818cf8' },
  'Wassermann': { direction: 'Entwickle soziales Bewusstsein, Originalität und Visionen', pastLife: 'Zu viel Ego, Selbstdarstellung und Streben nach Anerkennung', lesson: 'Lerne, das Kollektiv zu dienen und über dich hinauszuwachsen', calling: 'Der visionäre Reformer, der die Welt verändert', fear: 'Angst vor Unpersönlichkeit und Ablehnung', color: '#38bdf8' },
  'Fische': { direction: 'Entwickle Spiritualität, Mitgefühl und universale Liebe', pastLife: 'Zu viel Ordnung, Kritik und Perfektionismus', lesson: 'Lerne, loszulassen und dem Göttlichen zu vertrauen', calling: 'Der mystische Kanal für Heilung und Transzendenz', fear: 'Angst vor Chaos und Kontrollverlust', color: '#a78bfa' },
};

const DEFAULT_NN = { direction: 'Gehe deinen einzigartigen Weg mit Vertrauen', pastLife: 'Alte Muster prägen deinen Weg', lesson: 'Lerne aus der Vergangenheit und entwickle das Neue', calling: 'Dein Nordknoten zeigt den Weg', fear: 'Angst vor dem Unbekannten', color: '#d4af37' };

interface NorthNodeGuideProps { birthDate: string; }

export function NorthNodeGuide({ birthDate }: NorthNodeGuideProps) {
  const sign = getNorthNodeSign(birthDate);
  const data = NORTH_NODE_DATA[sign] ?? DEFAULT_NN;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Nordknoten im {sign} · Deine Seelenrichtung</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, fontStyle: 'italic', marginBottom: 4 }}>Wohin deine Seele in diesem Leben strebt</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}08`, border: `1px solid ${data.color}22` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Richtung</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.direction}</p>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Vergangene Leben (Südknoten)</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.pastLife}</p>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Lebenslektion</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.lesson}</p>
        </div>

        <div style={{ padding: '9px 12px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}18` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Deine Berufung</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, lineHeight: 1.5, fontStyle: 'italic' }}>„{data.calling}"</p>
        </div>

        <div style={{ padding: '7px 11px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✗ Die Angst zu überwinden</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.fear}</p>
        </div>
      </div>
    </div>
  );
}
