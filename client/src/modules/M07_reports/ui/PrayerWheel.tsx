import { calcLifePath, calcSoulUrge } from '../../M05_numerology/lib/calc';

const SHARED_AFFIRMATIONS: [number, number, string[]][] = [
  [1, 1, ['Gemeinsam sind wir unaufhaltbar.', 'Unsere Stärke multipliziert sich.', 'Wir erschaffen, was andere für unmöglich halten.']],
  [1, 2, ['Wir ergänzen uns wie Tag und Nacht.', 'Stärke und Sanftheit weben uns zusammen.', 'Ich führe, du verbindest — zusammen sind wir ganz.']],
  [2, 6, ['Unsere Liebe heilt alles, was sie berührt.', 'Wir sind Heimat füreinander.', 'In unserer Verbindung liegt tiefe Sicherheit.']],
  [3, 5, ['Das Leben ist unser gemeinsames Kunstwerk.', 'Mit dir ist jeder Tag ein Abenteuer.', 'Freude ist unser gemeinsames Gebet.']],
  [4, 8, ['Was wir aufbauen, bleibt für Generationen.', 'Unsere Beständigkeit ist unser Geschenk.', 'Wir bauen das Fundament eines reichen Lebens.']],
  [7, 11, ['Wir berühren das Unsichtbare gemeinsam.', 'Unsere Verbindung ist ein spiritueller Bund.', 'In der Stille sprechen unsere Seelen.']],
  [6, 9, ['Unsere Liebe strahlt weit über uns hinaus.', 'Wir heilen gemeinsam — uns und die Welt.', 'Dankbarkeit ist unser tägliches Gebet.']],
];

const LP_AFFIRMATIONS: Record<number, string> = {
  1: 'Ich erschaffe meinen eigenen Weg.',
  2: 'Ich empfange Liebe genauso leicht wie ich sie gebe.',
  3: 'Mein Ausdruck ist ein Geschenk an die Welt.',
  4: 'Ich baue mit Beständigkeit und Freude.',
  5: 'Ich bin frei und vollkommen geerdet.',
  6: 'Meine Fürsorge kommt aus voller Kraft.',
  7: 'Die Stille zeigt mir den Weg.',
  8: 'Ich manifestiere Fülle für alle.',
  9: 'Ich lasse los und empfange das Neue.',
  11: 'Mein Licht leuchtet ohne Anstrengung.',
  22: 'Meine Vision wird Wirklichkeit.',
  33: 'Meine Liebe kennt keine Grenzen.',
};

const DEFAULT_AFF = ['Wir wachsen gemeinsam.', 'Unsere Verbindung trägt uns.', 'Gemeinsam sind wir mehr als die Summe unserer Teile.'];

function getSharedAffirmations(lpA: number, lpB: number): string[] {
  const low = Math.min(lpA, lpB), high = Math.max(lpA, lpB);
  const found = SHARED_AFFIRMATIONS.find(([a, b]) => a === low && b === high);
  return found ? found[2] : DEFAULT_AFF;
}

function getDayIndex(birthDateA: string, birthDateB: string): number {
  const d = new Date();
  return (d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate() + parseInt(birthDateA.replace(/-/g, ''), 10) + parseInt(birthDateB.replace(/-/g, ''), 10)) % 3;
}

interface PrayerWheelProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function PrayerWheel({ nameA, birthDateA, nameB, birthDateB }: PrayerWheelProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const suA = calcSoulUrge(nameA).value;
  const suB = calcSoulUrge(nameB).value;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;
  const idx = getDayIndex(birthDateA, birthDateB);
  const sharedAffs = getSharedAffirmations(lpA, lpB);
  const dailyAff = sharedAffs[idx % sharedAffs.length]!;
  const affA = LP_AFFIRMATIONS[lpA] ?? DEFAULT_AFF[0]!;
  const affB = LP_AFFIRMATIONS[lpB] ?? DEFAULT_AFF[0]!;
  const GOLD = '#d4af37';

  return (
    <div>
      {/* Daily shared affirmation */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Gemeinsame Tages-Affirmation
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: `${GOLD}09`, border: `1px solid ${GOLD}28` }}>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, lineHeight: 1.7, color: '#e8d9a0', fontStyle: 'italic', fontWeight: 500 }}>
            „{dailyAff}"
          </p>
        </div>
        <div style={{ fontSize: 8, color: '#3a3530', marginTop: 5 }}>Wechselt täglich · Für {firstA} & {firstB}</div>
      </div>

      {/* Individual affirmations */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ name: firstA, lp: lpA, su: suA, aff: affA, color: GOLD }, { name: firstB, lp: lpB, su: suB, aff: affB, color: '#c084fc' }].map(({ name, lp, su, aff, color }) => (
          <div key={name} style={{ flex: 1, padding: '9px 10px', borderRadius: 10, background: `${color}07`, border: `1px solid ${color}20` }}>
            <div style={{ fontSize: 8, color: '#5a5448', marginBottom: 4 }}>{name} · LP {lp} · SU {su}</div>
            <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, lineHeight: 1.6, color: color + 'cc', fontStyle: 'italic' }}>
              „{aff}"
            </p>
          </div>
        ))}
      </div>

      {/* Practice ritual */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 8, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Gemeinsames Ritual</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.5 }}>
          Sprecht eure Affirmationen morgens gemeinsam aus — jede/r die eigene, dann die gemeinsame. Berührt dabei die Hände oder schaut euch in die Augen.
        </p>
      </div>
    </div>
  );
}
