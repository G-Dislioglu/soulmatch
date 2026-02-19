import { calcLifePath, calcExpression, calcSoulUrge, reduceToNumber } from '../lib/calc';

const FUTURE_MESSAGES: Record<number, string[]> = {
  1: [
    'Deine größte Schöpfung liegt noch vor dir. Vertraue dem Mut, den ersten Schritt zu wagen — auch wenn niemand mitgeht.',
    'Du wirst Menschen führen, die noch nicht in dein Leben getreten sind. Sei bereit.',
    'Die Unabhängigkeit, die du suchst, ist schon in dir. Sie wartet nur auf deine Entscheidung.',
  ],
  2: [
    'Die Verbindung, nach der du dich sehnst, wird kommen — wenn du aufhörst, sie zu erzwingen.',
    'Deine Fähigkeit, Brücken zu bauen, wird eines Tages Leben verändern.',
    'Die stille Kraft, die du in dir trägst, ist mächtiger als alle lauten Stimmen um dich herum.',
  ],
  3: [
    'Dein kreativstes Werk ist noch nicht erschaffen. Die Welt wartet darauf.',
    'Lache öfter — deine Freude ist eine Heilkraft für alle, die dich kennen.',
    'Der Moment, in dem du aufhörst, dich zu verstellen, ist der Moment, in dem Magie entsteht.',
  ],
  4: [
    'Das Fundament, das du baust, wird von anderen darauf stehen — auch wenn du es nie siehst.',
    'Deine Beharrlichkeit ist ein Geschenk an die Zukunft.',
    'Was solide gebaut ist, übersteht jeden Sturm. Du baust solid.',
  ],
  5: [
    'Die Reise, die dich am meisten verändert, steht noch bevor.',
    'Freiheit ist keine Flucht — sie ist eine Entscheidung. Triff sie bewusst.',
    'Der Wandel, den du fürchtest, wird das Beste werden, das dir je passiert ist.',
  ],
  6: [
    'Das Zuhause, das du erschaffst — ob physisch oder emotional — ist ein heiliger Ort für andere.',
    'Deine Fürsorge heilt Wunden, die du nie sehen wirst.',
    'Lass dich selbst lieben. Du verdienst, was du gibst.',
  ],
  7: [
    'Die Antwort, nach der du suchst, liegt in der Stille — nicht im Lärm.',
    'Deine Erkenntnisse werden eines Tages anderen den Weg weisen.',
    'Das Geheimnis, das du entdeckst, wird größer sein als du dir vorstellst.',
  ],
  8: [
    'Der Reichtum, den du erschaffst, hat die Kraft, die Welt zu verändern — wenn du ihn teilst.',
    'Deine wahre Macht liegt nicht in dem, was du hast, sondern in dem, was du gibst.',
    'Der Erfolg, den du anstrebst, kommt — aber er sieht anders aus als gedacht. Besser.',
  ],
  9: [
    'Das Loslassen, das sich unmöglich anfühlt, wird dich befreien.',
    'Dein Mitgefühl reist weiter als du — es berührt Herzen, die du nie triffst.',
    'Der Zyklus, der endet, macht Platz für das Schönste, das noch kommt.',
  ],
  11: [
    'Die Vision, die du trägst, ist real. Die Welt ist noch nicht bereit — aber sie wird es sein.',
    'Deine Sensitivität ist kein Fluch. Sie ist deine stärkste Gabe.',
    'Das Licht, das durch dich strömt, findet immer seinen Weg.',
  ],
  22: [
    'Das Große, das du baust, wird Generationen überdauern.',
    'Deine Vision ist der Bauplan einer besseren Welt.',
    'Die Last, die du trägst, ist auch deine größte Kraft.',
  ],
  33: [
    'Deine Liebe ist grenzenlos — und genau das wird die Welt heilen.',
    'Du bist nicht hier, um perfekt zu sein. Du bist hier, um zu lieben.',
    'Das Licht, das du trägst, wird immer seinen Weg finden — auch durch die dunkelsten Zeiten.',
  ],
};

const DEFAULT_MESSAGES = [
  'Dein einzigartiger Weg ist genau richtig für dich.',
  'Was du heute säst, erntest du in einer Zukunft, die noch auf dich wartet.',
  'Das Beste kommt oft dann, wenn wir aufgehört haben, darauf zu warten.',
];

function getDailyIndex(birthDate: string): number {
  const d = new Date();
  const val = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + birthDate.split('-').reduce((s, p) => s + Number(p), 0);
  return val % 3;
}

interface TimeCapsulleProps { name: string; birthDate: string; }

export function TimeCapsulle({ name, birthDate }: TimeCapsulleProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;
  const idx = getDailyIndex(birthDate);

  const messages = FUTURE_MESSAGES[lp] ?? DEFAULT_MESSAGES;
  const message = messages[idx % messages.length] ?? messages[0]!;

  // Future year based on personal year cycle
  const currentYear = new Date().getFullYear();
  const parts = birthDate.split('-');
  const pyDigits = `${currentYear + 9}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  const futureYear = currentYear + Math.max(3, reduceToNumber(pyDigits.reduce((a, b) => a + b, 0)));

  const GOLD = '#d4af37';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          Nachricht an dich · {futureYear}
        </div>
        <div style={{ fontSize: 28, marginBottom: 4 }}>⟳</div>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)', marginBottom: 14, textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, lineHeight: 1.8, color: '#d4ccbc', fontStyle: 'italic' }}>
          "{message}"
        </p>
        <div style={{ marginTop: 8, fontSize: 9, color: '#5a5448' }}>
          — Aus dem Kosmos, für LP {lp}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {[{ label: 'LP', val: lp, color: GOLD }, { label: 'EX', val: ex, color: '#c084fc' }, { label: 'SU', val: su, color: '#38bdf8' }].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '5px 10px', borderRadius: 8, background: `${color}08`, border: `1px solid ${color}20` }}>
            <div style={{ fontSize: 7, color, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 8, color: '#2a2520', textAlign: 'center' }}>
        Botschaft wechselt täglich · Basiert auf Lebenspfad {lp}
      </div>
    </div>
  );
}
