import { calcLifePath, calcExpression } from '../lib/calc';

const SHADOW_DATA: Record<number, { title: string; core: string; prompts: string[]; practice: string; color: string }> = {
  1: { title: 'Schatten des Ego', core: 'Dominanz, Angst vor Schwäche, Isolation durch Unabhängigkeit', prompts: ['Wo lasse ich andere nicht nah heran, um nicht verletzlich zu sein?', 'Wann kämpfe ich ums Rechthaben statt um Verbindung?', 'Was würde passieren, wenn ich um Hilfe bitte?'], practice: 'Täglich eine Schwäche zugeben — innerlich oder einem Vertrauten', color: '#ef4444' },
  2: { title: 'Schatten der Auflösung', core: 'Selbstverlust in Beziehungen, Angst vor Ablehnung', prompts: ['Wo höre ich auf meine eigene Meinung, wenn andere widersprechen?', 'Wann tue ich Dinge aus Angst, nicht aus Liebe?', 'Was brauche ich, ohne danach zu fragen?'], practice: 'Täglich eine eigene Meinung ausdrücken, auch wenn sie unbequem ist', color: '#93c5fd' },
  3: { title: 'Schatten der Zerstreuung', core: 'Oberflächlichkeit, Angst vor Tiefe, ständige Ablenkung', prompts: ['Was vermeide ich durch Humor und Leichtigkeit?', 'Wann wurde mein Ausdruck als Kind nicht willkommen geheißen?', 'Welches Gefühl halte ich durch Beschäftigung auf Abstand?'], practice: 'Täglich 10 Minuten mit einem Gefühl sitzen — ohne es wegzumachen', color: '#fbbf24' },
  4: { title: 'Schatten der Kontrolle', core: 'Rigidität, Angst vor Chaos, emotionale Unterdrückung', prompts: ['Was passiert in mir, wenn Pläne sich ändern?', 'Wo halte ich Kontrolle, um mich sicher zu fühlen?', 'Was ist das Schlimmste, das passieren könnte, wenn ich loslasse?'], practice: 'Eine Situation täglich dem Fluss überlassen — bewusst nicht eingreifen', color: '#a16207' },
  5: { title: 'Schatten der Flucht', core: 'Impulsivität, Sucht nach Neuem, Angst vor Tiefe', prompts: ['Was verlasse ich, bevor es tief wird?', 'Welcher Schmerz treibt mich von Erfahrung zu Erfahrung?', 'Was würde ich finden, wenn ich aufhöre zu suchen?'], practice: 'Eine Woche lang dieselbe Routine halten — und beobachten was auftaucht', color: '#22d3ee' },
  6: { title: 'Schatten der Aufopferung', core: 'Überverantwortlichkeit, Schuldgefühle, Selbstverleugnung', prompts: ['Wann gebe ich, um Schuldgefühle zu vermeiden?', 'Was brauche ich, das ich anderen nicht erlaube zu brauchen?', 'Wo opfere ich mich auf, um geliebt zu werden?'], practice: 'Täglich eine Bitte stellen — und das Unbehagen dabei aushalten', color: '#22c55e' },
  7: { title: 'Schatten der Isolation', core: 'Zynismus, emotionaler Rückzug, Misstrauen', prompts: ['Wo schütze ich mich durch intellektuellen Abstand?', 'Wann verließ mich das Vertrauen in andere das erste Mal?', 'Was würde es kosten, wirklich gesehen zu werden?'], practice: 'Täglich eine echte Verbindung suchen — ohne Analyse', color: '#7c3aed' },
  8: { title: 'Schatten der Macht', core: 'Kontrollsucht, materieller Fokus, Angst vor Verlust', prompts: ['Wo setze ich Kraft ein, wo ich Vertrauen brauche?', 'Was definiert meinen Wert außer Leistung?', 'Welche Schwäche verstecke ich hinter Erfolg?'], practice: 'Täglich etwas teilen — Zeit, Ressource, Aufmerksamkeit', color: '#d4af37' },
  9: { title: 'Schatten des Märtyrers', core: 'Selbstaufopferung, Bitterkeit, emotionale Distanz', prompts: ['Wo trage ich Schmerz der Welt, als wäre er meiner?', 'Wann erlaubte ich mir zuletzt, selber gerettet zu werden?', 'Was bedeutet es, nur für mich da zu sein?'], practice: 'Täglich etwas Persönliches tun — ohne Nutzen für andere', color: '#c026d3' },
  11: { title: 'Schatten der Überwältigung', core: 'Hypersensibilität, spirituelle Bypässe, nervöse Erschöpfung', prompts: ['Wo nutze ich Spiritualität, um menschlichen Schmerz zu umgehen?', 'Wann werde ich durch Sensibilität handlungsunfähig?', 'Was brauche ich wirklich gerade, ohne es zu spiritualisieren?'], practice: 'Täglich erden — Erde berühren, Körper wahrnehmen', color: '#818cf8' },
  22: { title: 'Schatten des Perfektionismus', core: 'Lähmung durch Größe der Vision, Angst zu versagen', prompts: ['Wo halte ich eine Idee zurück, weil sie nicht perfekt ist?', 'Wann war gut genug das letzte Mal wirklich gut genug?', 'Was würde ich tun, wenn Scheitern keine Option wäre?'], practice: 'Etwas Unvollständiges täglich zeigen — und stehen lassen', color: '#a78bfa' },
  33: { title: 'Schatten der Heiligen', core: 'Übermenschliche Erwartungen, Selbst-Opferung, Burnout', prompts: ['Wo fühle ich mich verpflichtet, niemals schwach zu sein?', 'Wann erlaubte ich mir zuletzt normale menschliche Fehler?', 'Was würde passieren, wenn ich mich selbst so liebte wie andere?'], practice: 'Täglich Selbstmitgefühl üben — wie ein geliebtes Kind mit sich sprechen', color: '#f9a8d4' },
};

const DEFAULT_SHADOW = { title: 'Schattenarbeit', core: 'Unbewusste Muster erkunden', prompts: ['Was vermeide ich zu fühlen?', 'Wann reagiere ich über?', 'Was brauche ich wirklich?'], practice: 'Täglich innehalten und beobachten', color: '#818cf8' };

interface ShadowWorkProps { name: string; birthDate: string; }

export function ShadowWork({ name, birthDate }: ShadowWorkProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const data = SHADOW_DATA[lp] ?? DEFAULT_SHADOW;
  const exData = SHADOW_DATA[ex] ?? DEFAULT_SHADOW;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>LP {lp} · Schattenarbeit</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, color: data.color }}>{data.title}</div>
        <div style={{ fontSize: 9, color: '#5a5448', marginTop: 2, fontStyle: 'italic' }}>{data.core}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>◈ Schattenarbeit-Fragen</div>
        {data.prompts.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, padding: '5px 0', borderBottom: i < data.prompts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ fontSize: 8, color: data.color, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
            <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>{p}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 11px', borderRadius: 9, background: `${data.color}08`, border: `1px solid ${data.color}20`, marginBottom: 8 }}>
        <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Tägliche Praxis</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.practice}</p>
      </div>

      <div style={{ padding: '6px 10px', borderRadius: 8, background: `${exData.color}06`, border: `1px solid ${exData.color}18` }}>
        <div style={{ fontSize: 7, color: exData.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Ausdrucks-Schatten EX {ex}</div>
        <p style={{ margin: 0, fontSize: 8, color: '#3a3530' }}>{exData.title} — {exData.core}</p>
      </div>
    </div>
  );
}
