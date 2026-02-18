import { calcLifePath, calcSoulUrge, calcExpression, reduceToNumber } from '../lib/calc';

const LP_INTENTIONS: Record<number, string> = {
  1: 'Ich bin hier, um Pionierarbeit zu leisten und anderen den Weg zu öffnen.',
  2: 'Ich bin hier, um Brücken zu bauen und Harmonie zwischen Seelen zu schaffen.',
  3: 'Ich bin hier, um durch Kreativität und Ausdruck das Leben zu bereichern.',
  4: 'Ich bin hier, um bleibende Fundamente zu bauen, auf denen Generationen aufbauen können.',
  5: 'Ich bin hier, um durch Freiheit und Erfahrung das Bewusstsein zu erweitern.',
  6: 'Ich bin hier, um durch bedingungslose Liebe und Fürsorge zu heilen.',
  7: 'Ich bin hier, um die tiefsten Wahrheiten zu entdecken und weiterzugeben.',
  8: 'Ich bin hier, um Fülle zu erschaffen und anderen Kraft zu geben, dasselbe zu tun.',
  9: 'Ich bin hier, um mit universeller Liebe zu dienen und loszulassen, was nicht mehr wächst.',
  11: 'Ich bin hier, als Kanal des Lichts — Inspiration und Erleuchtung in die Welt zu bringen.',
  22: 'Ich bin hier, um monumentale Strukturen im Dienst der gesamten Menschheit zu errichten.',
  33: 'Ich bin hier, als Meisterlehrer der bedingungslosen Liebe.',
};

const SU_DESIRES: Record<number, string> = {
  1: 'Mein tiefster Wunsch ist Unabhängigkeit und Ausdruck meiner einzigartigen Kraft.',
  2: 'Mein tiefster Wunsch ist echte Verbindung, Zugehörigkeit und Harmonie.',
  3: 'Mein tiefster Wunsch ist Freude, Kreativität und Ausdruck meiner Seele.',
  4: 'Mein tiefster Wunsch ist Sicherheit, Ordnung und dauerhafte Bedeutung.',
  5: 'Mein tiefster Wunsch ist Freiheit, Abenteuer und grenzenlose Erfahrung.',
  6: 'Mein tiefster Wunsch ist geliebt zu werden und eine harmonische Familie.',
  7: 'Mein tiefster Wunsch ist Wissen, Stille und die Tiefe des Seins zu erfahren.',
  8: 'Mein tiefster Wunsch ist Erfolg, Anerkennung und materielle Sicherheit.',
  9: 'Mein tiefster Wunsch ist die Welt zu verbessern und einen universellen Beitrag zu leisten.',
  11: 'Mein tiefster Wunsch ist spirituelle Erleuchtung und Verbindung mit dem Göttlichen.',
  22: 'Mein tiefster Wunsch ist etwas Monumentales zu erschaffen, das die Menschheit voranbringt.',
  33: 'Mein tiefster Wunsch ist alle mit bedingungsloser Liebe zu umarmen.',
};

function personalYear(birthDate: string): number {
  const now = new Date();
  const parts = birthDate.split('-');
  const digits = `${now.getFullYear()}${parts[1] ?? '01'}${parts[2] ?? '01'}`.split('').map(Number);
  return reduceToNumber(digits.reduce((a, b) => a + b, 0));
}

const PY_FOCUS: Record<number, string> = {
  1: 'Dieses Jahr steht im Zeichen von Neuanfang und Selbstbestimmung.',
  2: 'Dieses Jahr lädt dich ein, Geduld zu üben und tiefe Verbindungen zu pflegen.',
  3: 'Dieses Jahr fließt deine kreative Energie — lass sie spielen.',
  4: 'Dieses Jahr geht es ums Bauen, Planen und Fundamente stärken.',
  5: 'Dieses Jahr bringt Veränderung und Freiheit — umarme das Unbekannte.',
  6: 'Dieses Jahr dreht sich alles um Familie, Verantwortung und Liebe.',
  7: 'Dieses Jahr ist ein Jahr der Innenschau, Stille und Spiritualität.',
  8: 'Dieses Jahr erntest du, was du gesät hast — Fülle ist möglich.',
  9: 'Dieses Jahr ist die Vollendung eines Zyklus — lasse los, was nicht mehr dient.',
  11: 'Dieses Jahr intensiviert deine Intuition — vertraue deinen Träumen.',
  22: 'Dieses Jahr ruft dich, an etwas Großem und Dauerhaftem zu arbeiten.',
  33: 'Dieses Jahr öffnet dein Herz zu universeller Fürsorge.',
};

interface SoulIntentionProps { name: string; birthDate: string; }

export function SoulIntention({ name, birthDate }: SoulIntentionProps) {
  const lp = calcLifePath(birthDate).value;
  const su = calcSoulUrge(name).value;
  const ex = calcExpression(name).value;
  const py = personalYear(birthDate);

  const intention = LP_INTENTIONS[lp] ?? 'Ich bin hier, um meinen einzigartigen Seelenweg zu gehen.';
  const desire = SU_DESIRES[su] ?? 'Mein tiefster Wunsch ist Authentizität und Wachstum.';
  const focus = PY_FOCUS[py] ?? 'Dieses Jahr trägt besondere Wachstumschancen für dich.';

  const GOLD = '#d4af37';

  return (
    <div>
      {/* Soul number summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
        {[{ label: 'LP', val: lp, color: GOLD }, { label: 'SU', val: su, color: '#c084fc' }, { label: 'EX', val: ex, color: '#38bdf8' }, { label: 'PJ', val: py, color: '#22c55e' }].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '5px 10px', borderRadius: 8, background: `${color}08`, border: `1px solid ${color}20` }}>
            <div style={{ fontSize: 8, color, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Intention */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 20, marginBottom: 8, color: GOLD }}>✦</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', lineHeight: 1.7, color: '#d4ccbc' }}>
          "{intention}"
        </p>
      </div>

      {/* Desire */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.2)', marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>☽ Seelenwunsch</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{desire}</p>
      </div>

      {/* Personal year focus */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
        <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Jahres-Fokus {new Date().getFullYear()}</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{focus}</p>
      </div>
    </div>
  );
}
