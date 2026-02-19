import { calcLifePath, calcExpression } from '../lib/calc';

const MISSIONS: Record<number, { title: string; core: string; how: string; gift: string }> = {
  1: {
    title: 'Pionier & Wegbereiter',
    core: 'Deine Lebensaufgabe ist es, neue Wege zu eröffnen — nicht nur für dich, sondern für all jene, die noch nicht den Mut haben zu gehen.',
    how: 'Du erfüllst sie, indem du Eigenverantwortung übernimmst, führst ohne zu dominieren und originell bleibst auch wenn Konformität bequemer wäre.',
    gift: 'Wenn du deiner Lebensaufgabe folgst, inspirierst du ganze Generationen durch deinen Mut.',
  },
  2: {
    title: 'Vermittler & Heiler',
    core: 'Du bist hier, um Brücken zu bauen — zwischen Menschen, zwischen Ideen, zwischen Welten, die sich ohne dich nie begegnet wären.',
    how: 'Durch Kooperation, tiefes Zuhören und die Bereitschaft, Konflikte mit Sanftheit zu lösen statt mit Gewalt.',
    gift: 'Frieden. Deine Anwesenheit senkt die Temperatur in jedem Raum, den du betrittst.',
  },
  3: {
    title: 'Schöpfer & Freudenbringer',
    core: 'Deine Seele ist hier, um zu erschaffen und die Welt durch Ausdruck, Schönheit und Freude zu erhellen.',
    how: 'Durch ehrlichen Selbstausdruck, Kreativität ohne Scham und die Bereitschaft, Freude als deinen Beitrag zur Welt anzuerkennen.',
    gift: 'Inspiration. Du erinnerst andere daran, wie schön das Leben ist.',
  },
  4: {
    title: 'Baumeister & Hüter der Ordnung',
    core: 'Du bist hier, um Fundamente zu legen — auf denen andere aufbauen können, lange nachdem du gegangen bist.',
    how: 'Durch beharrliche Arbeit, Integrität und die Bereitschaft, langsam zu gehen wenn Schnelligkeit die Qualität gefährdet.',
    gift: 'Stabilität. In einer chaotischen Welt bist du der Fels, an dem andere sich orientieren.',
  },
  5: {
    title: 'Freiheitskämpfer & Lehrer des Wandels',
    core: 'Du bist hier, um zu zeigen, dass Veränderung keine Bedrohung ist — sondern das Atmen der Seele.',
    how: 'Durch gelebte Freiheit, Offenheit für das Unbekannte und die Bereitschaft, als erster zu springen.',
    gift: 'Befreiung. Du zeigst anderen, dass das Leben außerhalb der Komfortzone beginnt.',
  },
  6: {
    title: 'Hüter & Heiler des Herzens',
    core: 'Du bist hier, um zu dienen — nicht aus Pflicht, sondern aus der tiefen Überzeugung, dass Liebe die Welt verwandelt.',
    how: 'Durch bedingungslose Fürsorge, Schaffung von Harmonie und die Bereitschaft, Verantwortung zu tragen, wenn andere wegsehen.',
    gift: 'Heilung. Deine Fürsorge hinterlässt einen Abdruck, den Zeit nicht löscht.',
  },
  7: {
    title: 'Sucher & Übermittler der Wahrheit',
    core: 'Deine Seele sucht das Wesentliche hinter der Oberfläche — und ist berufen, es mit denen zu teilen, die bereit sind zuzuhören.',
    how: 'Durch unermüdliche Suche, Stille als spirituelle Praxis und den Mut, unbequeme Wahrheiten zu nennen.',
    gift: 'Weisheit. Dein Verständnis öffnet Türen, die andere für verschlossen hielten.',
  },
  8: {
    title: 'Manifestor & Steward der Fülle',
    core: 'Du bist hier, um zu zeigen, dass materielle Fülle und spirituelle Tiefe kein Widerspruch sind — sondern zusammengehören.',
    how: 'Durch kraftvolle Intention, strategisches Denken und die Bereitschaft, deinen Reichtum in den Dienst von etwas Größerem zu stellen.',
    gift: 'Ermächtigung. Du zeigst anderen, dass es möglich ist, groß zu träumen und noch größer zu manifestieren.',
  },
  9: {
    title: 'Universaler Liebender & Abschluss-Bringer',
    core: 'Du trägst die Weisheit vieler Leben in dir — und bist hier, um sie zurückzugeben, bevor du in den nächsten Zyklus eintrittst.',
    how: 'Durch bedingungsloses Mitgefühl, die Bereitschaft loszulassen was nicht mehr dient und Dienst an der größten Gemeinschaft — der Menschheit.',
    gift: 'Transformation. Alles, was du berührst, lässt du verändert und bereichert zurück.',
  },
  11: {
    title: 'Visionär & spiritueller Kanal',
    core: 'Du bist eine Brücke zwischen dem Gesehenen und dem Ungesehenen — berufen, kosmische Einblicke in menschliche Erfahrung zu übersetzen.',
    how: 'Durch Entwicklung deiner Intuition, Vertrauen in das, was du fühlst aber nicht beweisen kannst, und Mut, als Visionär zu sprechen.',
    gift: 'Erleuchtung. Deine Worte und dein Sein entzünden das Licht in anderen.',
  },
  22: {
    title: 'Meisterbaumeister der Zivilisation',
    core: 'Du hast die seltene Berufung, etwas zu erschaffen, das größer ist als ein Einzelleben — Systeme, Institutionen, Bewegungen.',
    how: 'Durch meisterhafte Planung, kollektive Vision und die Bereitschaft, dein persönliches Komfort dem größeren Werk zu opfern.',
    gift: 'Vermächtnis. Was du baust, dient der Menschheit über deine Lebenszeit hinaus.',
  },
  33: {
    title: 'Lichtträger & Meisterheiler',
    core: 'Du bist hier, um bedingungslose Liebe zu verkörpern — nicht als Konzept, sondern als gelebte Wirklichkeit, die andere transformiert.',
    how: 'Durch vollständige Hingabe an Mitgefühl, Heilung durch deine bloße Anwesenheit und Akzeptanz aller Menschen ohne Unterschied.',
    gift: 'Erlösung. Deine Liebe heilt Wunden, die andere nicht einmal sehen konnten.',
  },
};

const DEFAULT_MISSION = {
  title: 'Einzigartiger Seelenweg',
  core: 'Deine Lebensaufgabe ist so einzigartig wie du selbst — sie entfaltet sich in dem Maße, wie du authentisch dir selbst treu bleibst.',
  how: 'Indem du auf die leisen Impulse deines Herzens hörst und sie in Handlung umsetzt.',
  gift: 'Deine einzigartige Perspektive ist dein Geschenk an die Welt.',
};

interface LifeMissionProps { name: string; birthDate: string; }

export function LifeMission({ name, birthDate }: LifeMissionProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const mission = MISSIONS[lp] ?? DEFAULT_MISSION;
  const GOLD = '#d4af37';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · EX {ex}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: GOLD, marginBottom: 8 }}>{mission.title}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '10px 13px', borderRadius: 10, background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
          <div style={{ fontSize: 8, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Kern-Berufung</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, lineHeight: 1.7, color: '#d4ccbc', fontStyle: 'italic' }}>
            {mission.core}
          </p>
        </div>

        <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Wie du sie erfüllst</div>
          <p style={{ margin: 0, fontSize: 11, color: '#5a5448', lineHeight: 1.5 }}>{mission.how}</p>
        </div>

        <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.15)' }}>
          <div style={{ fontSize: 8, color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Dein Geschenk an die Welt</div>
          <p style={{ margin: 0, fontSize: 11, color: '#5a5448', lineHeight: 1.5 }}>{mission.gift}</p>
        </div>
      </div>
    </div>
  );
}
