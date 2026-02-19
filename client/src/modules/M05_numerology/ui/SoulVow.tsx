import { calcLifePath, calcSoulUrge } from '../lib/calc';

const VOWS: Record<number, { vow: string; affirmation: string; color: string; ritual: string }> = {
  1: { vow: 'Ich verspreche meiner Seele, mutig zu führen und meine Einzigartigkeit zu ehren — ohne mich für meine Stärke zu entschuldigen.', affirmation: 'Ich bin der Weg, den ich gehe.', color: '#ef4444', ritual: 'Morgens: Stehe aufrecht, atme tief und sage laut deinen Namen — mit Stolz.' },
  2: { vow: 'Ich verspreche meiner Seele, auf meine Intuition zu hören und mich selbst so fürsorglich zu behandeln wie andere.', affirmation: 'Ich bin tief verbunden und vollständig allein.', color: '#93c5fd', ritual: 'Abends: Halte eine Hand ans Herz und frage: "Was brauchst du heute?"' },
  3: { vow: 'Ich verspreche meiner Seele, meinen Ausdruck frei zu lassen — ohne Zensur, ohne Scham, mit voller Freude.', affirmation: 'Meine Stimme ist ein Geschenk an die Welt.', color: '#fbbf24', ritual: 'Täglich: Singe, zeichne oder schreibe — ohne Ziel, nur um des Ausdrucks willen.' },
  4: { vow: 'Ich verspreche meiner Seele, Fundamente zu bauen die tragen — und dabei zu vertrauen, dass Loslassen auch Aufbauen ist.', affirmation: 'Ich bin Sicherheit für mich selbst.', color: '#a16207', ritual: 'Wöchentlich: Räume einen Bereich auf — physisch als Metapher für innere Ordnung.' },
  5: { vow: 'Ich verspreche meiner Seele, frei zu sein — und in dieser Freiheit die Tiefe zu finden, nicht nur die Weite.', affirmation: 'Ich bin Freiheit die sich selbst wählt.', color: '#22d3ee', ritual: 'Täglich: Tue eine Sache bewusst anders als gewohnt.' },
  6: { vow: 'Ich verspreche meiner Seele, mich selbst mit der Liebe zu nähren, die ich so großzügig verschenke.', affirmation: 'Ich bin Liebe — für mich und andere gleichzeitig.', color: '#22c55e', ritual: 'Täglich: Tue eine Sache nur für dich — ohne es jemandem zu berichten.' },
  7: { vow: 'Ich verspreche meiner Seele, die Tiefe meiner inneren Welt zu ehren — und sie mutig mit der äußeren zu teilen.', affirmation: 'Ich bin Weisheit die sich zeigen darf.', color: '#7c3aed', ritual: 'Täglich: Schreibe einen Gedanken auf, der dir wichtig ist — auch wenn er noch unfertig ist.' },
  8: { vow: 'Ich verspreche meiner Seele, meine Kraft weise einzusetzen — im Dienst des Lebens, nicht der Angst.', affirmation: 'Ich manifestiere aus Fülle, nicht aus Mangel.', color: '#d4af37', ritual: 'Wöchentlich: Teile eine Ressource bewusst — Zeit, Geld, Aufmerksamkeit.' },
  9: { vow: 'Ich verspreche meiner Seele, loszulassen was nicht mehr ist — und das Geschenk jedes Endes zu ehren.', affirmation: 'Jedes Ende trägt einen Samen des Anfangs.', color: '#c026d3', ritual: 'Monatlich: Schreibe nieder was du loslässt — und verbrenne es symbolisch.' },
  11: { vow: 'Ich verspreche meiner Seele, meine Sensibilität als Gabe zu tragen — nicht als Last.', affirmation: 'Ich bin ein Kanal des Lichts.', color: '#818cf8', ritual: 'Täglich: Meditiere 5 Minuten in Stille — ohne Aufgabe, nur als Sein.' },
  22: { vow: 'Ich verspreche meiner Seele, groß zu träumen und klein zu beginnen — beides ist heilig.', affirmation: 'Ich baue Brücken zwischen Vision und Wirklichkeit.', color: '#a78bfa', ritual: 'Täglich: Setze einen konkreten Baustein für deine große Vision.' },
  33: { vow: 'Ich verspreche meiner Seele, mich selbst mit der universellen Liebe zu lieben, die ich für andere empfinde.', affirmation: 'Ich bin heilige Liebe in menschlicher Form.', color: '#f9a8d4', ritual: 'Täglich: Sprich mit dir selbst wie mit einem geliebten Kind.' },
};

const DEFAULT_VOW = { vow: 'Ich verspreche meiner Seele, authentisch zu leben.', affirmation: 'Ich bin genug.', color: '#d4af37', ritual: 'Täglich: Schaue in den Spiegel und nicke dir zu.' };

interface SoulVowProps { name: string; birthDate: string; }

export function SoulVow({ name, birthDate }: SoulVowProps) {
  const lp = calcLifePath(birthDate).value;
  const su = calcSoulUrge(name).value;
  const data = VOWS[lp] ?? DEFAULT_VOW;
  const suData = VOWS[su] ?? DEFAULT_VOW;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · Seelen-Versprechen</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: data.color }}>Dein heiliges Versprechen</div>
      </div>

      <div style={{ padding: '12px 15px', borderRadius: 12, background: `${data.color}08`, border: `1px solid ${data.color}25`, marginBottom: 12 }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, lineHeight: 1.7, fontStyle: 'italic' }}>„{data.vow}"</p>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }}>
        <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Affirmation</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#c8b870', fontStyle: 'italic' }}>{data.affirmation}</p>
      </div>

      <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}06`, border: `1px solid ${data.color}18`, marginBottom: 8 }}>
        <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Seelen-Ritual</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.ritual}</p>
      </div>

      {suData.color !== data.color && (
        <div style={{ padding: '7px 11px', borderRadius: 8, background: `${suData.color}06`, border: `1px solid ${suData.color}18` }}>
          <div style={{ fontSize: 7, color: suData.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Seelenimpuls-Versprechen</div>
          <p style={{ margin: 0, fontSize: 9, color: '#3a3530', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{suData.affirmation}</p>
        </div>
      )}
    </div>
  );
}
