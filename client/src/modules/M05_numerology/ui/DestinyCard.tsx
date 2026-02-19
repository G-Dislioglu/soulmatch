import { calcExpression } from '../lib/calc';

const DESTINY: Record<number, { title: string; calling: string; strength: string; shadow: string; life_test: string; master_gift: string; color: string }> = {
  1: { title: 'Der Pionier & Anführer', calling: 'Du bist dazu berufen, neue Wege zu gehen und andere durch deinen Mut zu führen', strength: 'Willensstärke, Eigeninitiative, visionäres Denken', shadow: 'Egozentrik, Sturheit, Ungeduld mit anderen', life_test: 'Lernst du, zu führen ohne zu dominieren?', master_gift: 'Die Fähigkeit, aus dem Nichts etwas Neues zu erschaffen', color: '#ef4444' },
  2: { title: 'Der Diplomat & Vermittler', calling: 'Du bist dazu berufen, Brücken zu bauen und tiefe Beziehungen zu pflegen', strength: 'Einfühlungsvermögen, Geduld, diplomatisches Geschick', shadow: 'Übersensibilität, Abhängigkeit, Entscheidungsangst', life_test: 'Lernst du, anderen zu dienen ohne dich zu verlieren?', master_gift: 'Die Fähigkeit, in jedem Menschen das Beste zu sehen', color: '#93c5fd' },
  3: { title: 'Der Kreativer & Kommunikator', calling: 'Du bist dazu berufen, durch Worte, Kunst und Freude die Welt zu erhellen', strength: 'Kreativität, Ausdrucksstärke, Begeisterungsfähigkeit', shadow: 'Oberflächlichkeit, Zerstreuung, Kritikempfindlichkeit', life_test: 'Lernst du, deine kreative Energie zu kanalisieren?', master_gift: 'Die Fähigkeit, andere durch Schönheit und Freude zu transformieren', color: '#fbbf24' },
  4: { title: 'Der Erbauer & Organisator', calling: 'Du bist dazu berufen, dauerhafte Strukturen zu erschaffen die anderen Halt geben', strength: 'Zuverlässigkeit, Disziplin, praktisches Können', shadow: 'Starrheit, Perfektionismus, Widerstand gegen Wandel', life_test: 'Lernst du, zu bauen ohne dich in Details zu verlieren?', master_gift: 'Die Fähigkeit, Träume in greifbare Realität zu verwandeln', color: '#a16207' },
  5: { title: 'Der Freigeist & Abenteurer', calling: 'Du bist dazu berufen, die Welt zu erleben und anderen den Weg zur Freiheit zu zeigen', strength: 'Anpassungsfähigkeit, Mut, Neugier und Vielseitigkeit', shadow: 'Unbeständigkeit, Suchtpotenzial, Verantwortungsscheu', life_test: 'Lernst du, Freiheit mit Verantwortung zu verbinden?', master_gift: 'Die Fähigkeit, überall Möglichkeiten zu sehen wo andere Grenzen sehen', color: '#22d3ee' },
  6: { title: 'Der Heiler & Fürsorger', calling: 'Du bist dazu berufen, zu heilen, zu pflegen und Schönheit in die Welt zu bringen', strength: 'Mitgefühl, Verantwortungsgefühl, Ästhetik und Wärme', shadow: 'Selbstaufopferung, Kontrollbedürfnis, Martyrertum', life_test: 'Lernst du, zu geben ohne dich selbst zu vergessen?', master_gift: 'Die Fähigkeit, bedingungslose Liebe zu verkörpern', color: '#22c55e' },
  7: { title: 'Der Sucher & Weise', calling: 'Du bist dazu berufen, die Tiefen des Lebens zu erforschen und Weisheit zu teilen', strength: 'Intuition, analytisches Denken, spirituelle Tiefe', shadow: 'Isolation, Zynismus, Misstrauen gegenüber anderen', life_test: 'Lernst du, dein inneres Wissen mit der Welt zu teilen?', master_gift: 'Die Fähigkeit, das Unsichtbare zu sehen und zu benennen', color: '#7c3aed' },
  8: { title: 'Der Manifestierer & Anführer', calling: 'Du bist dazu berufen, materielle und spirituelle Kräfte weise zu lenken', strength: 'Entschlossenheit, Durchsetzungsvermögen, strategisches Denken', shadow: 'Machtgier, Materialismus, Rücksichtslosigkeit', life_test: 'Lernst du, Macht mit Herz zu tragen?', master_gift: 'Die Fähigkeit, Großes zu manifestieren und andere dabei mitzunehmen', color: '#d4af37' },
  9: { title: 'Der Humanist & Vollender', calling: 'Du bist dazu berufen, der Menschheit zu dienen und alte Zyklen abzuschließen', strength: 'Universelle Liebe, Weisheit, Mitgefühl für alle Wesen', shadow: 'Selbstverleugnung, emotionale Distanz, ungelöste Vergangenheit', life_test: 'Lernst du, die Menschheit zu lieben ohne Menschen zu fliehen?', master_gift: 'Die Fähigkeit, durch deine bloße Anwesenheit andere zu heilen', color: '#c026d3' },
  11: { title: 'Der Illuminierte Inspirator (11)', calling: 'Du bist dazu berufen, spirituelles Licht in die Welt zu bringen und andere zu inspirieren', strength: 'Außergewöhnliche Intuition, visionäre Kraft, spirituelle Tiefe', shadow: 'Überwältigung, innere Zerrissenheit, unrealistische Ideale', life_test: 'Lernst du, mit deiner Intensität zu leben ohne dich zu verbrennen?', master_gift: 'Du kannst andere allein durch deine Energie transformieren', color: '#f472b6' },
  22: { title: 'Der Meisterbauer (22)', calling: 'Du bist dazu berufen, monumentale Werke zu erschaffen die Generationen überdauern', strength: 'Visionäres Denken, praktische Meisterschaft, globales Bewusstsein', shadow: 'Lähmung durch Größe der Vision, Perfektionismus', life_test: 'Lernst du, deinen göttlichen Auftrag anzunehmen?', master_gift: 'Die Fähigkeit, Träume von planetarischem Ausmaß zu verwirklichen', color: '#38bdf8' },
  33: { title: 'Der Meisterlehrer (33)', calling: 'Du bist dazu berufen, durch bedingungslose Liebe die höchste Wahrheit zu verkörpern', strength: 'Selbstlose Liebe, Heilung, tiefe spirituelle Weisheit', shadow: 'Selbstaufgabe, Martyrertum, Überlastung durch Fürsorge', life_test: 'Lernst du, Liebe ohne Bedingungen zu geben UND zu empfangen?', master_gift: 'Du bist ein lebendiger Kanal für göttliche Liebe', color: '#a78bfa' },
};

const DEFAULT_DESTINY = { title: 'Einzigartiger Schicksalsweg', calling: 'Dein Schicksal entfaltet sich auf einem einzigartigen Weg', strength: 'Die Stärke liegt in deiner Einzigartigkeit', shadow: 'Die Herausforderung ist das Annehmen des eigenen Weges', life_test: 'Vertraust du deinem einzigartigen Pfad?', master_gift: 'Deine Einzigartigkeit ist dein größtes Geschenk', color: '#d4af37' };

interface DestinyCardProps { name: string; birthDate: string; }

export function DestinyCard({ name }: DestinyCardProps) {
  const ex = calcExpression(name);
  const num = ex.value;
  const data = DESTINY[num] ?? DEFAULT_DESTINY;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Schicksalszahl (Ausdruckszahl) {num}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: data.color }}>{data.title}</div>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 10, background: `${data.color}07`, border: `1px solid ${data.color}20`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>★ Deine Berufung</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, lineHeight: 1.6, fontStyle: 'italic' }}>„{data.calling}"</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Stärke</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.strength}</p>
          </div>
          <div style={{ padding: '7px 9px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✗ Schatten</div>
            <p style={{ margin: 0, fontSize: 8, color: '#5a5448', lineHeight: 1.4 }}>{data.shadow}</p>
          </div>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)' }}>
          <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>◈ Lebenstest</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4, fontStyle: 'italic' }}>{data.life_test}</p>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: `${data.color}06`, border: `1px solid ${data.color}18` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>◉ Meister-Geschenk</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.master_gift}</p>
        </div>
      </div>
    </div>
  );
}
