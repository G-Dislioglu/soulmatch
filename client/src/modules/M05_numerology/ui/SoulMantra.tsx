import { calcLifePath, calcSoulUrge } from '../lib/calc';

const LP_MANTRAS: Record<number, string[]> = {
  1: ['Ich bin der Ursprung meiner eigenen Wirklichkeit.', 'Mein Mut öffnet Türen, die noch niemand gesehen hat.', 'Ich führe mit Herz und Stärke.'],
  2: ['Ich bin Brücke und Stille zugleich.', 'In meiner Sanftheit liegt eine unberührbare Stärke.', 'Ich empfange und gebe in vollkommener Balance.'],
  3: ['Meine Freude ist meine Botschaft an die Welt.', 'Ich erschaffe aus reiner Lebenslust.', 'Mein Ausdruck ist heilig und frei.'],
  4: ['Ich baue mit Geduld das Fundament meines Glücks.', 'Meine Zuverlässigkeit ist ein Geschenk.', 'Ich wurzle tief und stehe unerschütterlich.'],
  5: ['Ich bin der Wandel, den die Welt braucht.', 'Freiheit ist mein natürlicher Zustand.', 'Ich umarme das Unbekannte mit offenem Herzen.'],
  6: ['Meine Liebe heilt — mich und andere.', 'Ich sorge und werde umsorgt in heiliger Balance.', 'Mein Zuhause ist überall, wo Liebe ist.'],
  7: ['In der Stille finde ich alle Antworten.', 'Ich bin Weisheit, die sich selbst entfaltet.', 'Das Mysterium des Lebens ist mein vertrauter Begleiter.'],
  8: ['Ich manifestiere mit göttlicher Absicht.', 'Fülle ist mein Geburtsrecht.', 'Meine Kraft dient dem Großen und Ganzen.'],
  9: ['Ich liebe bedingungslos und lasse los mit Würde.', 'Mein Mitgefühl umfasst die ganze Welt.', 'Ich vollende, um Raum für Neues zu schaffen.'],
  11: ['Ich bin das Licht zwischen den Welten.', 'Meine Intuition ist mein sicherster Kompass.', 'Ich inspiriere durch mein bloßes Sein.'],
  22: ['Ich baue Brücken zwischen Vision und Wirklichkeit.', 'Meine Träume sind groß genug für alle.', 'Ich erschaffe das Unmögliche Schritt für Schritt.'],
  33: ['Meine Liebe kennt keine Grenzen.', 'Ich bin das Herz, das die Welt heilt.', 'Im Geben finde ich meine vollste Erfüllung.'],
};

const SU_AFFIRMATIONS: Record<number, string> = {
  1: 'Meine Einzigartigkeit ist meine Stärke.',
  2: 'Ich ziehe tiefe Verbindungen an.',
  3: 'Freude und Schöpfung fließen durch mich.',
  4: 'Ich schaffe Stabilität aus innerer Ruhe.',
  5: 'Ich bin frei und vollkommen in Bewegung.',
  6: 'Liebe ist mein Wesen und mein Weg.',
  7: 'Die Wahrheit offenbart sich mir in Stille.',
  8: 'Ich bin reich in jeder Dimension.',
  9: 'Meine Seele dient dem Höchsten.',
  11: 'Mein Licht leuchtet für alle.',
  22: 'Ich baue eine bessere Welt.',
  33: 'Bedingungslose Liebe ist mein Geschenk.',
};

const DEFAULT_MANTRA = 'Ich bin vollkommen so, wie ich bin.';

function getDailyMantraIdx(birthDate: string): number {
  const d = new Date();
  return (d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate() + parseInt(birthDate.replace(/-/g, ''), 10)) % 3;
}

interface SoulMantraProps { name: string; birthDate: string; }

export function SoulMantra({ name, birthDate }: SoulMantraProps) {
  const lp = calcLifePath(birthDate).value;
  const su = calcSoulUrge(name).value;
  const idx = getDailyMantraIdx(birthDate);

  const mantras = LP_MANTRAS[lp] ?? [DEFAULT_MANTRA];
  const mantra = mantras[idx % mantras.length] ?? mantras[0]!;
  const affirmation = SU_AFFIRMATIONS[su] ?? DEFAULT_MANTRA;

  const GOLD = '#d4af37';
  const PURPLE = '#c084fc';

  return (
    <div>
      {/* Main mantra */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
          Dein Seelen-Mantra · LP {lp}
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: `${GOLD}09`, border: `1px solid ${GOLD}30`, marginBottom: 8 }}>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, lineHeight: 1.7, color: '#e8d9a0', fontStyle: 'italic', fontWeight: 500 }}>
            „{mantra}"
          </p>
        </div>
        <div style={{ fontSize: 8, color: '#3a3530' }}>Wechselt täglich · Basiert auf Lebenspfad {lp}</div>
      </div>

      {/* Soul urge affirmation */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${PURPLE}08`, border: `1px solid ${PURPLE}22`, marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: PURPLE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Seelen-Affirmation · SU {su}
        </div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, lineHeight: 1.6, color: '#b09ad0', fontStyle: 'italic' }}>
          „{affirmation}"
        </p>
      </div>

      {/* Practice tip */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 10, color: GOLD, flexShrink: 0 }}>✦</span>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.5 }}>
          Sprich dein Mantra morgens dreimal laut aus. Lass es durch deinen Körper klingen und verweile einen Moment in der Stille danach.
        </p>
      </div>
    </div>
  );
}
