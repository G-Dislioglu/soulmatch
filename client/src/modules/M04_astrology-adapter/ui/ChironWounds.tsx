// Approximate Chiron sign from birth year (Chiron takes ~50 years for full orbit)
function getChironSign(birthDate: string): string {
  const y = parseInt(birthDate.split('-')[0] ?? '1990', 10);
  if (y >= 1968 && y <= 1976) return 'Widder';
  if (y >= 1977 && y <= 1983) return 'Stier';
  if (y >= 1984 && y <= 1988) return 'Zwillinge';
  if (y >= 1989 && y <= 1993) return 'Krebs';
  if (y >= 1994 && y <= 1999) return 'Löwe';
  if (y >= 2000 && y <= 2005) return 'Jungfrau';
  if (y >= 2006 && y <= 2010) return 'Fisch/Aquarius';
  if (y >= 2011 && y <= 2018) return 'Fische';
  if (y >= 2019 && y <= 2026) return 'Widder';
  return 'Steinbock';
}

const CHIRON_DATA: Record<string, { wound: string; gift: string; healing: string; affirmation: string; color: string }> = {
  'Widder': { wound: 'Die Wunde der Identität — das Recht zu existieren und zu handeln wurde in Frage gestellt', gift: 'Unerschütterlicher Mut und die Fähigkeit, anderen bei ihrer Selbstfindung zu helfen', healing: 'Kleine mutige Handlungen ohne Erlaubnis zu brauchen', affirmation: 'Ich habe das Recht zu sein, zu handeln und zu führen', color: '#ef4444' },
  'Stier': { wound: 'Die Wunde des Wertes — Selbstwert und materielle Sicherheit wurden erschüttert', gift: 'Tiefes Verständnis für wahren Wert jenseits von Besitz und Status', healing: 'Den Körper als heilig behandeln und sich selbst beschenken', affirmation: 'Ich bin wertvoll — einfach weil ich bin', color: '#22c55e' },
  'Zwillinge': { wound: 'Die Wunde des Ausdrucks — die eigene Stimme und Intelligenz wurden nicht gehört', gift: 'Fähigkeit, anderen zu helfen, ihre Stimme zu finden und sich auszudrücken', healing: 'Schreiben, sprechen, zuhören ohne das Ergebnis zu kontrollieren', affirmation: 'Meine Stimme und meine Gedanken haben Wert und verdienen Gehör', color: '#fbbf24' },
  'Krebs': { wound: 'Die Wunde der Zugehörigkeit — Familie und emotionale Sicherheit fehlten', gift: 'Tiefste Empathie und die Fähigkeit, für andere ein wirkliches Zuhause zu sein', healing: 'Eine eigene Heimat im Inneren erschaffen', affirmation: 'Ich gehöre mir selbst — und das ist genug', color: '#7c3aed' },
  'Löwe': { wound: 'Die Wunde der Anerkennung — der eigene Glanz wurde nicht gesehen oder wurde beschämt', gift: 'Fähigkeit, anderen zu helfen zu strahlen ohne in den Schatten zu treten', healing: 'Sich ohne Publikum ausdrücken — tanzen wenn niemand zuschaut', affirmation: 'Ich darf strahlen — meine Einzigartigkeit ist ein Geschenk', color: '#f97316' },
  'Jungfrau': { wound: 'Die Wunde der Unvollkommenheit — das Gefühl nie gut genug zu sein', gift: 'Heilende Fähigkeiten und tiefes Verständnis für Körper und Dienst', healing: 'Unvollständiges abgeben und das Unvollkommene als vollständig ansehen', affirmation: 'Ich bin genug — genauso wie ich bin, jetzt', color: '#34d399' },
  'Waage': { wound: 'Die Wunde der Beziehung — Partnerschaften brachten Schmerz oder Verlust', gift: 'Tiefe Weisheit über Balance, Gerechtigkeit und echte Verbindung', healing: 'Beziehungen als Spiegel und nicht als Rettung sehen', affirmation: 'Ich bin vollständig alleine — Beziehungen bereichern mich, definieren mich nicht', color: '#f472b6' },
  'Skorpion': { wound: 'Die Wunde der Transformation — Verlust, Verrat oder Tod haben tiefe Spuren hinterlassen', gift: 'Schamanische Fähigkeit zur Heilung durch die tiefsten Tiefen', healing: 'Die eigene Dunkelheit als Kraft und nicht als Schwäche annehmen', affirmation: 'Ich bin aus dem Dunkel aufgestiegen — und das macht mich weise', color: '#c026d3' },
  'Schütze': { wound: 'Die Wunde des Glaubens — Glaube, Philosophie oder Freiheit wurden unterdrückt', gift: 'Weisheit jenseits aller Dogmen und die Fähigkeit, andere zu inspirieren', healing: 'Den eigenen inneren Kompass über äußere Autoritäten stellen', affirmation: 'Ich habe meine eigene Wahrheit — und sie ist gültig', color: '#d4af37' },
  'Steinbock': { wound: 'Die Wunde der Leistung — Würde hing von Erfolg und Pflicht ab', gift: 'Tiefe Integrität und Fähigkeit, andere bei ihrer Berufung zu unterstützen', healing: 'Sein ohne Leisten zu müssen — einfach da sein', affirmation: 'Mein Wert hat nichts mit meiner Leistung zu tun', color: '#818cf8' },
  'Wassermann': { wound: 'Die Wunde der Zugehörigkeit — das Gefühl ein Außenseiter zu sein unter Menschen', gift: 'Visionäre Kraft und Fähigkeit, Kollektive zu heilen', healing: 'Die eigene Andersartigkeit als Superkraft annehmen', affirmation: 'Ich gehöre genau dorthin wo ich bin — als der Mensch der ich bin', color: '#38bdf8' },
  'Fische': { wound: 'Die Wunde der Auflösung — Grenzen zwischen Selbst und anderem fehlen', gift: 'Mystische Empathie und die Fähigkeit zur spirituellen Heilung', healing: 'Klare Grenzen als Akt der Liebe und nicht der Ablehnung setzen', affirmation: 'Ich bin ein eigenes Wesen — tiefgreifend verbunden und doch ganz', color: '#a78bfa' },
  'Fisch/Aquarius': { wound: 'Die Wunde der Dualität — zwischen Individuum und Kollektiv zerrissen', gift: 'Einzigartiger Brückenbauer zwischen Menschheit und Mystik', healing: 'Beiden Seiten gleichzeitig treu bleiben', affirmation: 'Ich bin einzigartig und universell zugleich', color: '#a78bfa' },
};

const DEFAULT_CHIRON = { wound: 'Die Wunde des Unbekannten — ein tiefer Schmerz der keine Worte kennt', gift: 'Fähigkeit zu heilen was keine Sprache hat', healing: 'Der Wunde mit Sanftheit begegnen', affirmation: 'Auch meine tiefsten Wunden sind Lehrmeister', color: '#818cf8' };

interface ChironWoundsProps { birthDate: string; }

export function ChironWounds({ birthDate }: ChironWoundsProps) {
  const sign = getChironSign(birthDate);
  const data = CHIRON_DATA[sign] ?? DEFAULT_CHIRON;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Chiron im {sign} · Der verwundete Heiler</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, fontStyle: 'italic' }}>Deine tiefste Wunde ist dein größtes Geschenk</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Die Wunde</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.wound}</p>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}20` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Das Geschenk</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.gift}</p>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Heilungsweg</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.healing}</p>
        </div>

        <div style={{ padding: '9px 12px', borderRadius: 9, background: `${data.color}08`, border: `1px solid ${data.color}22`, textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Affirmation</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, lineHeight: 1.5, fontStyle: 'italic' }}>„{data.affirmation}"</p>
        </div>
      </div>
    </div>
  );
}
