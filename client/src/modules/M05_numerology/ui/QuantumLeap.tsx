import { calcLifePath, calcExpression } from '../lib/calc';

const LEAPS: Record<number, { title: string; shift: string; trigger: string; practice: string; sign: string; color: string }> = {
  1: { title: 'Sprung ins Führertum', shift: 'Von Abhängigkeit zu Selbstbestimmung', trigger: 'Wenn du aufhörst, auf Erlaubnis zu warten', practice: 'Täglich eine Entscheidung allein treffen — ohne zu fragen', sign: '⚡', color: '#ef4444' },
  2: { title: 'Sprung in die Stille', shift: 'Von Reaktion zu tiefer Intuition', trigger: 'Wenn du lernst, dem Raum zwischen Worten zu lauschen', practice: '5 Minuten täglich in absoluter Stille sitzen', sign: '🌙', color: '#93c5fd' },
  3: { title: 'Sprung in den Ausdruck', shift: 'Von Selbstzensur zu freiem Schaffen', trigger: 'Wenn du aufhörst, auf Anerkennung zu warten', practice: 'Jeden Tag etwas erschaffen, ohne es zu zeigen', sign: '✨', color: '#fbbf24' },
  4: { title: 'Sprung ins Vertrauen', shift: 'Von Kontrolle zu fließendem Aufbau', trigger: 'Wenn du erkennst, dass Struktur dient, nicht einengt', practice: 'Einen Plan machen und dann flexibel bleiben', sign: '🏔', color: '#a16207' },
  5: { title: 'Sprung in die Freiheit', shift: 'Von Sucht nach Veränderung zu bewusster Wahl', trigger: 'Wenn du Freiheit innen findest, nicht außen suchst', practice: 'Eine Gewohnheit 7 Tage halten — bewusst, nicht aus Zwang', sign: '🦅', color: '#22d3ee' },
  6: { title: 'Sprung in die Selbstliebe', shift: 'Von Aufopferung zu liebevollem Geben', trigger: 'Wenn du erkennst, dass du nur geben kannst, was du hast', practice: 'Täglich eine Grenze setzen und sie halten', sign: '💚', color: '#22c55e' },
  7: { title: 'Sprung ins Vertrauen', shift: 'Von Isolation zu verbundener Tiefe', trigger: 'Wenn du deine innere Welt mit der äußeren teilst', practice: 'Einen Gedanken täglich mit jemandem teilen', sign: '🔮', color: '#7c3aed' },
  8: { title: 'Sprung in Fülle', shift: 'Von Angst vor Macht zu bewusstem Manifestieren', trigger: 'Wenn du erkennst, dass Überfluss dienen kann', practice: 'Täglich eine Ressource bewusst teilen', sign: '♾', color: '#d4af37' },
  9: { title: 'Sprung ins Loslassen', shift: 'Von Festhalten zu weisem Vollenden', trigger: 'Wenn du erkennst, dass Ende Anfang ist', practice: 'Täglich etwas loslassen — eine Sorge, einen Gegenstand', sign: '🌸', color: '#e879f9' },
  11: { title: 'Sprung ins Licht', shift: 'Von spiritueller Spannung zu erleuchteter Führung', trigger: 'Wenn deine Sensibilität zur Gabe wird', practice: 'Meditiere täglich und teile eine Einsicht', sign: '💫', color: '#818cf8' },
  22: { title: 'Sprung in die Manifestation', shift: 'Von Vision zu realem Aufbau', trigger: 'Wenn du erkennst, dass große Träume kleine Schritte brauchen', practice: 'Einen konkreten Baustein täglich setzen', sign: '🏛', color: '#a78bfa' },
  33: { title: 'Sprung in Heilige Liebe', shift: 'Von persönlicher zu universeller Liebe', trigger: 'Wenn dein Herz die ganze Menschheit umfasst', practice: 'Eine fremde Person täglich mit Güte behandeln', sign: '🌹', color: '#f9a8d4' },
};

const DEFAULT_LEAP = { title: 'Quantensprung', shift: 'Von Unbewusstsein zu Erwachen', trigger: 'Wenn du erkennst, wer du wirklich bist', practice: 'Täglich einen Moment inne halten', sign: '🌟', color: '#d4af37' };

interface QuantumLeapProps { name: string; birthDate: string; }

export function QuantumLeap({ name, birthDate }: QuantumLeapProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const leap = LEAPS[lp] ?? DEFAULT_LEAP;
  const exLeap = LEAPS[ex] ?? DEFAULT_LEAP;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · Quantensprung-Profil</div>
        <div style={{ fontSize: 24, marginBottom: 6 }}>{leap.sign}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: leap.color }}>{leap.title}</div>
        <div style={{ fontSize: 10, color: '#5a5448', marginTop: 2, fontStyle: 'italic' }}>{leap.shift}</div>
      </div>

      <div style={{ padding: '10px 13px', borderRadius: 10, background: `${leap.color}08`, border: `1px solid ${leap.color}22`, marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: leap.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>✦ Auslöser des Sprungs</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: leap.color, lineHeight: 1.6, fontStyle: 'italic' }}>„{leap.trigger}"</p>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>◈ Tägliche Praxis</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{leap.practice}</p>
      </div>

      <div style={{ padding: '8px 11px', borderRadius: 8, background: `${exLeap.color}07`, border: `1px solid ${exLeap.color}18` }}>
        <div style={{ fontSize: 7, color: exLeap.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Ausdrucks-Sprung EX {ex}</div>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{exLeap.title} — {exLeap.shift}</p>
      </div>
    </div>
  );
}
