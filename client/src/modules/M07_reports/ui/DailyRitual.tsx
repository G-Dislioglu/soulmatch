import { calcLifePath, reduceToNumber } from '../../M05_numerology/lib/calc';

interface Ritual { title: string; morning: string; evening: string; touch: string; mantra: string }

const RITUALS: Ritual[] = [
  { title: 'Ritual der Stille', morning: 'Setzt euch 5 Minuten still gegenüber, ohne zu sprechen — nur atmen.', evening: 'Legt die Hände aufs Herz und sagt dem anderen innerlich Dank.', touch: 'Eine Umarmung von mindestens 20 Sekunden', mantra: 'In der Stille sind wir verbunden.' },
  { title: 'Ritual des Lichts', morning: 'Zündet eine Kerze gemeinsam an und setzt eine Absicht für den Tag.', evening: 'Löscht die Kerze und benennt je eine Sache, für die ihr dankbar seid.', touch: 'Haltet euch 60 Sekunden an den Händen', mantra: 'Unser Licht brennt füreinander.' },
  { title: 'Ritual des Wassers', morning: 'Trinkt gemeinsam ein Glas Wasser und wünscht dem anderen etwas Schönes.', evening: 'Wascht euch gegenseitig die Hände — ein Zeichen der Reinigung und Fürsorge.', touch: 'Stirn-an-Stirn stehen für einen Atemzug', mantra: 'Wir fließen gemeinsam.' },
  { title: 'Ritual der Erde', morning: 'Geht barfuß auf den Boden — erdet euch gemeinsam vor dem Tag.', evening: 'Massiert dem anderen die Füße kurz — Erdung und Dankbarkeit.', touch: 'Rücken-an-Rücken stehen und gemeinsam atmen', mantra: 'Zusammen haben wir Wurzeln.' },
  { title: 'Ritual des Windes', morning: 'Schreibt je einen Wunsch für den anderen auf — und tauscht sie aus.', evening: 'Bläst symbolisch drei Mal in Richtung des anderen — sendet Kraft.', touch: 'Atem synchronisieren — 3 tiefe Atemzüge gemeinsam', mantra: 'Unsere Gedanken tragen einander.' },
  { title: 'Ritual der Flamme', morning: 'Sagt dem anderen je eine Stärke, die ihr heute in ihm seht.', evening: 'Kerzenlicht, kein Bildschirm — 10 Minuten nur miteinander.', touch: 'Wange-an-Wange stehen und schweigen', mantra: 'Wir entfachen uns gegenseitig.' },
  { title: 'Ritual der Sterne', morning: 'Schaut gemeinsam aus dem Fenster — findet etwas Schönes.', evening: 'Legt euch hin und schaut an die Decke — träumt gemeinsam laut.', touch: 'Handflächen berühren ohne zu greifen', mantra: 'Wir sind aus Sternenstaub gemacht.' },
];

function getRitual(lpA: number, lpB: number, birthDateA: string, birthDateB: string): Ritual {
  const d = new Date();
  const partsA = birthDateA.split('-');
  const partsB = birthDateB.split('-');
  const seed = lpA + lpB + d.getDate() + parseInt(partsA[2] ?? '0', 10) + parseInt(partsB[2] ?? '0', 10);
  return RITUALS[seed % RITUALS.length]!;
}

interface DailyRitualProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function DailyRitual({ nameA, birthDateA, nameB, birthDateB }: DailyRitualProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const ritual = getRitual(lpA, lpB, birthDateA, birthDateB);
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const GOLD = '#d4af37';
  const pairNum = reduceToNumber(lpA + lpB) || 9;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Beziehungszahl {pairNum}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: GOLD }}>{ritual.title}</div>
      </div>

      {/* Morning & evening */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: '9px 10px', borderRadius: 9, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
          <div style={{ fontSize: 8, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>☀ Morgen</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{ritual.morning}</p>
        </div>
        <div style={{ padding: '9px 10px', borderRadius: 9, background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.18)' }}>
          <div style={{ fontSize: 8, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>☽ Abend</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{ritual.evening}</p>
        </div>
      </div>

      {/* Touch */}
      <div style={{ padding: '7px 11px', borderRadius: 8, background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.18)', marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: '#f472b6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>✦ Berührung des Tages</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{ritual.touch}</p>
      </div>

      {/* Mantra */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Gemeinsames Tages-Mantra</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, lineHeight: 1.7, color: '#e8d9a0', fontStyle: 'italic' }}>
          „{ritual.mantra}"
        </p>
      </div>

      <div style={{ marginTop: 8, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>Ritual wechselt täglich</div>
    </div>
  );
}
