const AFFIRMATIONS: Record<string, string[]> = {
  'Seelengefährte': [
    'Unsere Seelen erkannten sich, bevor unsere Augen es taten.',
    'In deiner Stille finde ich mein tiefestes Zuhause.',
    'Wir wachsen nicht trotz unserer Unterschiede — sondern durch sie.',
    'Deine Seele spricht eine Sprache, die mein Herz schon immer kannte.',
    'Gemeinsam erinnern wir uns an das, was wir einzeln vergessen hatten.',
    'Du siehst mich in meiner ganzen Tiefe — und liebst, was du siehst.',
    'Unsere Verbindung ist kein Zufall, sondern kosmische Absicht.',
  ],
  'Zwillingsflamme': [
    'Das Feuer zwischen uns brennt, damit wir beide leuchten lernen.',
    'Du spiegelst mir, was ich noch nicht in mir sehen konnte.',
    'Wir sind zwei Hälften derselben ewigen Flamme.',
    'Unser Chaos ist heilig — es erschafft etwas Neues.',
    'Ich begegne in dir mir selbst — im höchsten Licht.',
    'Diese Intensität ist kein Fehler — sie ist unser Zweck.',
    'Wir verbrennen das Alte, damit das Wahre sichtbar wird.',
  ],
  'Karmische Begegnung': [
    'Diese Begegnung war für unsere Seelen von jeher geplant.',
    'Was wir gemeinsam lernen, trägt uns über dieses Leben hinaus.',
    'Jede Herausforderung zwischen uns ist ein Geschenk der Transformation.',
    'Wir haben uns gefunden, um einander zu befreien.',
    'Das Schwere zwischen uns trägt den Keim des Heilens.',
    'Diese Begegnung verändert uns — genau so, wie sie soll.',
    'Ich ehre die Lektionen, die du in mein Leben bringst.',
  ],
  'Seelenfreundschaft': [
    'Deine Freundschaft ist der Anker meiner Seele.',
    'Wir lachen, damit die Sterne auch lachen.',
    'In deiner Gesellschaft bin ich vollständig ich selbst.',
    'Unsere Verbindung braucht keine Etiketten — nur Wahrheit.',
    'Du bist der Beweis, dass Liebe viele Formen hat.',
    'Gemeinsam sind wir mehr als die Summe unserer Teile.',
    'Unsere Seelen feiern die Freude des Daseins zusammen.',
  ],
  'Lehrmeister-Schüler': [
    'In dir wächst, was in mir schlummerte.',
    'Wir unterrichten einander in den Lektionen, die wir selbst noch lernen.',
    'Weisheit wird zur Liebe, wenn sie weitergegeben wird.',
    'Ich bin dankbar für jeden Impuls, den du in mir auslöst.',
    'Lehren und Lernen sind zwei Seiten derselben Liebe.',
    'Was du in mir siehst, weckt mich aus dem Schlaf meiner Gewohnheiten.',
    'Dein Wachstum ist mein größtes Geschenk.',
  ],
  'Harmonische Begleitung': [
    'Gemeinsam fließen wir im Rhythmus des Lebens.',
    'Deine Ruhe gibt mir Kraft, meine Kraft gibt dir Ruhe.',
    'Harmonie entsteht nicht zufällig — sie wird täglich gewählt.',
    'In deiner Gegenwart atme ich tiefer.',
    'Wir begleiten einander, ohne einander zu binden.',
    'Schönheit entsteht, wenn zwei Seelen im Einklang sind.',
    'Dein Lächeln erinnert mich daran, warum das Leben schön ist.',
  ],
};

const DEFAULT_AFFIRMATIONS = [
  'Unsere Verbindung trägt uns beide in unsere höchste Version.',
  'Gemeinsam erschaffen wir mehr Licht in der Welt.',
  'In dieser Begegnung liegt ein kosmischer Sinn.',
  'Deine Energie erinnert mich an mein eigenes Potenzial.',
  'Was wir teilen, wächst mit jedem gemeinsamen Atemzug.',
  'Diese Verbindung ist ein Geschenk, das ich täglich ehre.',
  'Ich bin dankbar für den Spiegel, den du mir bist.',
];

function getDailyIndex(nameA: string, nameB: string, len: number): number {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const nameSeed = (nameA + nameB).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (seed + nameSeed) % len;
}

interface PairAffirmationProps {
  connectionType: string;
  nameA: string;
  nameB: string;
}

export function PairAffirmation({ connectionType, nameA, nameB }: PairAffirmationProps) {
  const list = AFFIRMATIONS[connectionType?.trim()] ?? DEFAULT_AFFIRMATIONS;
  const idx = getDailyIndex(nameA, nameB, list.length);
  const text = list[idx] ?? list[0] ?? '';
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Tages-Affirmation · {today}</div>
      <div style={{ fontSize: 20, marginBottom: 10 }}>✦</div>
      <p style={{
        margin: '0 0 12px',
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 15,
        fontStyle: 'italic',
        lineHeight: 1.7,
        color: '#d4ccbc',
      }}>
        "{text}"
      </p>
      <div style={{ fontSize: 9, color: '#4a4540' }}>{nameA} & {nameB}</div>
    </div>
  );
}
