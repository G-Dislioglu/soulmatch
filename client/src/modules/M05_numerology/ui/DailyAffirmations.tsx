import { calcLifePath, reduceToNumber } from '../lib/calc';

// 9 sets of affirmations — one per Life Path number (1-9, + master 11/22/33)
const AFFIRMATIONS: Record<number, string[]> = {
  1: [
    'Ich bin eine Pionierin / ein Pionier meines eigenen Schicksals.',
    'Meine Unabhängigkeit ist meine Stärke.',
    'Ich erschaffe mutig neue Wege.',
    'Mein Wille ist mein Kompass.',
    'Ich vertraue meinem einzigartigen Weg.',
  ],
  2: [
    'Meine Empathie ist ein Geschenk an die Welt.',
    'Harmonie wächst überall, wo ich erscheine.',
    'Ich bin eine Brücke zwischen Seelen.',
    'Friede beginnt in meinem Herzen.',
    'Ich empfange und gebe Liebe in Fülle.',
  ],
  3: [
    'Meine Kreativität berührt andere tief.',
    'Ich drücke meine Seele frei und freudig aus.',
    'Freude ist mein natürlicher Zustand.',
    'Meine Worte heilen und inspirieren.',
    'Ich erschaffe Schönheit überall wo ich bin.',
  ],
  4: [
    'Meine Beständigkeit baut Fundamente für Großes.',
    'Ich bin Zuverlässigkeit und Stärke.',
    'Schritt für Schritt erschaffe ich mein Meisterwerk.',
    'Disziplin ist meine geheime Superkraft.',
    'Ich vertraue dem langsamen Wachstum.',
  ],
  5: [
    'Freiheit nährt meine Seele und meinen Geist.',
    'Jeder Tag birgt ein neues Abenteuer.',
    'Ich umarme Veränderung mit offenen Armen.',
    'Meine Anpassungsfähigkeit ist göttlich.',
    'Das Leben ist reich und voller Möglichkeiten.',
  ],
  6: [
    'Meine Fürsorge verwandelt Welten.',
    'Ich erschaffe Heimat und Geborgenheit.',
    'Liebe fließt durch mich zu allen.',
    'Ich bin Harmonie in meiner Familie und Gemeinschaft.',
    'Mein Herz ist ein Leuchtturm der Wärme.',
  ],
  7: [
    'Meine Tiefe ist mein größtes Geschenk.',
    'In der Stille finde ich alle Antworten.',
    'Ich vertraue der Weisheit meiner Seele.',
    'Mein Verstand erleuchtet das Unbekannte.',
    'Ich bin ein Kanal göttlichen Wissens.',
  ],
  8: [
    'Ich manifestiere Fülle auf allen Ebenen.',
    'Meine Kraft schafft nachhaltige Wirkung.',
    'Erfolg und Integrität gehen Hand in Hand.',
    'Ich führe mit Weisheit und Mitgefühl.',
    'Überfluss ist mein geburtsrecht.',
  ],
  9: [
    'Ich bin ein Kanal des Lichts für alle.',
    'Mitgefühl führt mich zu meiner wahren Mission.',
    'Ich lasse los was war und umarme was kommen wird.',
    'Meine Liebe kennt keine Grenzen.',
    'Ich diene der Menschheit mit offenem Herzen.',
  ],
  11: [
    'Ich bin ein Leuchtturm der Inspiration.',
    'Meine Intuition ist mein göttlicher Kompass.',
    'Ich transformiere durch mein bloßes Sein.',
    'Meine Vision erleuchtet den Weg für andere.',
    'Ich bin ein Brücke zwischen Himmel und Erde.',
  ],
  22: [
    'Ich erschaffe Großartiges im Dienst der Welt.',
    'Meine Visionen werden zu dauerhaften Realitäten.',
    'Ich bin ein Meisterbauer des Lebens.',
    'Jede Handlung trägt einen kosmischen Sinn.',
    'Meine Kraft verändert Generationen.',
  ],
  33: [
    'Ich bin ein Meister der bedingungslosen Liebe.',
    'Heilung fließt durch mich zu allen.',
    'Ich lehre durch mein gelebtes Beispiel.',
    'Meine Präsenz erweckt das Beste in anderen.',
    'Ich bin ein Segen für diese Erde.',
  ],
};

const GENERAL: string[] = [
  'Ich bin genau dort, wo ich sein soll.',
  'Heute öffne ich mich für neue Möglichkeiten.',
  'Mein Herz ist ein Zuhause für Frieden.',
  'Ich bin dankbar für diesen Tag und all seine Geschenke.',
  'Ich wähle Liebe über Angst.',
];

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function pickAffirmations(birthDate: string, count = 3): string[] {
  const lp = calcLifePath(birthDate).value;
  const py = personalYear(birthDate);
  const doy = dayOfYear();
  const pool = AFFIRMATIONS[lp] ?? GENERAL;
  const result: string[] = [];

  // Pick from life-path pool using day-based offset
  const idx1 = (doy + py) % pool.length;
  result.push(pool[idx1] ?? pool[0] ?? '');

  // Pick general affirmation
  const idx2 = (doy * 3 + py) % GENERAL.length;
  result.push(GENERAL[idx2] ?? GENERAL[0] ?? '');

  // Pick from a neighboring life path
  if (count > 2) {
    const neighbor = ((lp - 1 + 9) % 9) + 1;
    const nPool = AFFIRMATIONS[neighbor] ?? GENERAL;
    const idx3 = (doy + lp) % nPool.length;
    result.push(nPool[idx3] ?? nPool[0] ?? '');
  }

  return result;
}

interface DailyAffirmationsProps {
  birthDate: string;
}

export function DailyAffirmations({ birthDate }: DailyAffirmationsProps) {
  const affirmations = pickAffirmations(birthDate, 3);
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        {dateStr}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {affirmations.map((aff, i) => (
          <div key={i} style={{
            padding: '10px 14px', borderRadius: 10,
            background: i === 0 ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 12, color: i === 0 ? '#d4af37' : '#4a4540', flexShrink: 0, marginTop: 1 }}>
              {i === 0 ? '✦' : '◆'}
            </span>
            <p style={{
              margin: 0, fontSize: 13, lineHeight: 1.6,
              color: i === 0 ? '#d4ccbc' : '#7a7468',
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontWeight: i === 0 ? 500 : 400,
            }}>
              {aff}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
