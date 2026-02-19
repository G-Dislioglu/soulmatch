import { calcLifePath, calcExpression } from '../lib/calc';

const CONTRACTS: Record<number, { title: string; vow: string; lesson: string; gift: string; test: string }> = {
  1: {
    title: 'Vertrag des Pioniers',
    vow: 'Ich verpflichte mich, den Weg zu gehen auch wenn kein Weg sichtbar ist.',
    lesson: 'Unabhängigkeit zu üben ohne Isolation zu suchen',
    gift: 'Anderen zeigen, dass Neubeginn jederzeit möglich ist',
    test: 'Unterdrückung des eigenen Willens durch Konformitätsdruck',
  },
  2: {
    title: 'Vertrag des Friedensstifters',
    vow: 'Ich verpflichte mich, Brücken zu bauen ohne mich dabei zu verlieren.',
    lesson: 'Die eigene Meinung zu vertreten auch wenn Harmonie auf dem Spiel steht',
    gift: 'Feindliche Energien in Zusammenarbeit zu verwandeln',
    test: 'Chronische Selbstverleugnung im Dienst der Harmonie',
  },
  3: {
    title: 'Vertrag des Schöpfers',
    vow: 'Ich verpflichte mich, meinen Ausdruck in die Welt zu bringen ohne Scham.',
    lesson: 'Die Tiefe des Lebens zu umarmen ohne die Freude zu verlieren',
    gift: 'Die Welt durch Kreativität und Freude zu erleuchten',
    test: 'Selbstzensur aus Angst vor Ablehnung oder Kritik',
  },
  4: {
    title: 'Vertrag des Baumeisters',
    vow: 'Ich verpflichte mich, das Fundament zu legen das anderen Stabilität schenkt.',
    lesson: 'Flexibilität und Leichtigkeit in Beständigkeit zu integrieren',
    gift: 'Das Dauerhafte in einer vergänglichen Welt zu erschaffen',
    test: 'Starrheit und Widerstand gegen notwendige Veränderung',
  },
  5: {
    title: 'Vertrag des Freiheitskämpfers',
    vow: 'Ich verpflichte mich, die Freiheit zu leben und sie anderen zu zeigen.',
    lesson: 'Verantwortung als Erweiterung — nicht als Einschränkung — von Freiheit',
    gift: 'Die Welt daran erinnern, dass jeder Moment neu beginnen kann',
    test: 'Flucht vor Verbindlichkeit wenn Wachstum sie erfordert',
  },
  6: {
    title: 'Vertrag des Hüters',
    vow: 'Ich verpflichte mich, Liebe als tägliche Praxis zu verkörpern.',
    lesson: 'Sich selbst dieselbe Fürsorge zu schenken, die man anderen gibt',
    gift: 'Einen Ort zu erschaffen, an dem andere heilen und wachsen können',
    test: 'Selbstaufgabe durch übermäßige Verantwortungsübernahme',
  },
  7: {
    title: 'Vertrag des Weisen',
    vow: 'Ich verpflichte mich, die Wahrheit zu suchen und sie mutig zu teilen.',
    lesson: 'Das Herz zu öffnen ohne die Weisheit zu verlieren',
    gift: 'Das Verborgene sichtbar zu machen für jene, die bereit sind zu sehen',
    test: 'Isolation als Schutz vor Verletzlichkeit',
  },
  8: {
    title: 'Vertrag des Manifestors',
    vow: 'Ich verpflichte mich, meine Kraft in den Dienst des Ganzen zu stellen.',
    lesson: 'Macht als Werkzeug des Dienens — nicht als Endzweck',
    gift: 'Die materielle Welt in Übereinstimmung mit spirituellen Werten zu gestalten',
    test: 'Machtmissbrauch oder Verhaftung in materiellem Streben',
  },
  9: {
    title: 'Vertrag des Vollenders',
    vow: 'Ich verpflichte mich, mit Würde loszulassen was vollendet ist.',
    lesson: 'Das Selbst zu bewahren während man der Menschheit dient',
    gift: 'Den Kreislauf des Lebens durch vollständige Hingabe zu ehren',
    test: 'Bitterkeit wenn Geben ohne Gegenseitigkeit bleibt',
  },
  11: {
    title: 'Vertrag des Lichtbringers',
    vow: 'Ich verpflichte mich, als lebendiger Beweis des Möglichen zu stehen.',
    lesson: 'Die eigene Sensitivität als Stärke — nicht als Last — zu erleben',
    gift: 'Das kosmische Licht durch einen menschlichen Kanal in die Welt zu bringen',
    test: 'Überwältigung durch die Intensität der eigenen Wahrnehmung',
  },
  22: {
    title: 'Vertrag des Meisterbauers',
    vow: 'Ich verpflichte mich, das Unmögliche möglich zu machen.',
    lesson: 'Im menschlichen Maßstab zu bleiben während man für Generationen baut',
    gift: 'Systeme und Strukturen zu erschaffen, die die Menschheit erheben',
    test: 'Lähmung durch den Abstand zwischen Vision und gegenwärtiger Realität',
  },
  33: {
    title: 'Vertrag der universalen Liebe',
    vow: 'Ich verpflichte mich, bedingungslose Liebe zu verkörpern — beginnend bei mir.',
    lesson: 'Die eigenen Grenzen zu kennen und zu halten ohne Schuldgefühle',
    gift: 'Heilung durch bloße Präsenz in einer Welt voller Trennung',
    test: 'Vollständiger Selbstverlust im Dienst anderer',
  },
};

const DEFAULT_CONTRACT = {
  title: 'Vertrag der Seele',
  vow: 'Ich verpflichte mich, meinen einzigartigen Weg mit Mut zu gehen.',
  lesson: 'Die eigene Wahrheit zu leben trotz äußerem Druck',
  gift: 'Die Welt durch das zu bereichern, was nur ich einbringen kann',
  test: 'Verrat an sich selbst zugunsten von Zustimmung',
};

interface SoulContractProps { name: string; birthDate: string; }

export function SoulContract({ name, birthDate }: SoulContractProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const contract = CONTRACTS[lp] ?? DEFAULT_CONTRACT;
  const GOLD = '#d4af37';
  const PURPLE = '#c084fc';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · EX {ex} · Vor dieser Inkarnation vereinbart</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: GOLD }}>{contract.title}</div>
      </div>

      {/* Sacred vow */}
      <div style={{ padding: '12px 14px', borderRadius: 11, background: `${GOLD}08`, border: `1px solid ${GOLD}28`, marginBottom: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Heiliges Versprechen</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, lineHeight: 1.7, color: '#e8d9a0', fontStyle: 'italic' }}>
          „{contract.vow}"
        </p>
      </div>

      {/* Three aspects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ padding: '7px 11px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Kernlektion</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{contract.lesson}</p>
        </div>
        <div style={{ padding: '7px 11px', borderRadius: 8, background: `${PURPLE}06`, border: `1px solid ${PURPLE}18` }}>
          <div style={{ fontSize: 7, color: PURPLE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Seelengeschenk</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{contract.gift}</p>
        </div>
        <div style={{ padding: '7px 11px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Seelenprüfung</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{contract.test}</p>
        </div>
      </div>
    </div>
  );
}
