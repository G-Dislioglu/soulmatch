import { reduceToNumber } from '../lib/calc';

function calcPersonalYear(birthDate: string): number {
  const parts = birthDate.split('-');
  const mm = parseInt(parts[1] ?? '0', 10);
  const dd = parseInt(parts[2] ?? '0', 10);
  const currentYear = new Date().getFullYear();
  return reduceToNumber(mm + dd + currentYear);
}

const ORACLE: Record<number, { title: string; message: string; action: string; avoid: string; symbol: string; color: string }> = {
  1: { title: 'Jahr des Neubeginns', message: 'Das Universum gibt dir ein weißes Blatt. Was du jetzt säst, erntest du 9 Jahre lang. Handle mutig und ohne Zögern.', action: 'Starte das Projekt, das du immer aufgeschoben hast', avoid: 'Alte Muster wiederholen statt wirklich neu zu beginnen', symbol: '🌱', color: '#ef4444' },
  2: { title: 'Jahr der Verbindung', message: 'Deine Superpower ist jetzt deine Sensibilität. Beziehungen, Partnerschaften und das stille Wachsen stehen im Vordergrund.', action: 'Pflege tiefe Verbindungen und sage was du fühlst', avoid: 'Ungeduld und Alleingänge — jetzt ist Kooperation der Schlüssel', symbol: '🤝', color: '#93c5fd' },
  3: { title: 'Jahr der Schöpfung', message: 'Deine kreative Energie ist auf dem Höhepunkt. Schreibe, male, erschaffe, teile — deine Stimme will gehört werden.', action: 'Drücke dich künstlerisch aus und teile es mit der Welt', avoid: 'Überstreuung und zu viele Projekte gleichzeitig', symbol: '🎨', color: '#fbbf24' },
  4: { title: 'Jahr des Aufbaus', message: 'Zeit für harte Arbeit, Fundamente und Beständigkeit. Was jetzt aufgebaut wird, bleibt für Generationen.', action: 'Schaffe Strukturen, plane langfristig, arbeite geduldig', avoid: 'Abkürzungen und Ungeduld — Qualität über Geschwindigkeit', symbol: '🏗', color: '#a16207' },
  5: { title: 'Jahr der Freiheit', message: 'Veränderung, Abenteuer und das Unerwartete rufen. Sei flexibel und folge dem Ruf der Freiheit — das Leben überrascht dich.', action: 'Reise, experimentiere und lass alte Strukturen los', avoid: 'Festhalten an Sicherheit und Vermeiden von Risiken', symbol: '🌊', color: '#22d3ee' },
  6: { title: 'Jahr der Verantwortung', message: 'Familie, Zuhause und Dienst stehen im Mittelpunkt. Deine Fürsorge wird gebraucht — und du wirst dafür geliebt.', action: 'Investiere in Beziehungen, Heimat und Gemeinschaft', avoid: 'Selbstverleugnung und zu viel Aufopferung', symbol: '🏡', color: '#22c55e' },
  7: { title: 'Jahr der Innenschau', message: 'Das Jahr lädt dich ein, still zu werden. Rückzug, Forschung, Meditation — dein inneres Wissen wartet auf dich.', action: 'Meditiere, lerne, forsche und vertraue deiner Intuition', avoid: 'Übersozialisierung und oberflächliche Beschäftigung', symbol: '🔮', color: '#7c3aed' },
  8: { title: 'Jahr der Manifestation', message: 'Kraft, Wohlstand und Autorität sind jetzt möglich. Handle mit Würde und nutze deine Energie weise für das Große.', action: 'Investiere, führe und manifestiere finanzielle Ziele', avoid: 'Machtmissbrauch und Gier ohne Großzügigkeit', symbol: '💎', color: '#d4af37' },
  9: { title: 'Jahr des Abschlusses', message: 'Ein 9-Jahres-Zyklus endet. Lasse los was abgenutzt ist — Beziehungen, Gewohnheiten, Überzeugungen. Mache Platz für das Neue.', action: 'Vergib, lasse los und schließe Kapitel mit Dankbarkeit', avoid: 'An Altem festhalten aus Angst vor dem Neuen', symbol: '🍂', color: '#c026d3' },
};

const DEFAULT_ORACLE = { title: 'Jahr des Potenzials', message: 'Ein einzigartiges Jahr entfaltet sich. Vertraue dem Rhythmus deiner Seele.', action: 'Folge deiner Intuition', avoid: 'Vergleiche mit anderen', symbol: '✨', color: '#d4af37' };

interface YearOracleProps { birthDate: string; }

export function YearOracle({ birthDate }: YearOracleProps) {
  const py = calcPersonalYear(birthDate);
  const oracle = ORACLE[py] ?? DEFAULT_ORACLE;
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Persönliches Jahr {py} · {currentYear}</div>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{oracle.symbol}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: oracle.color }}>{oracle.title}</div>
      </div>

      <div style={{ padding: '10px 13px', borderRadius: 10, background: `${oracle.color}08`, border: `1px solid ${oracle.color}22`, marginBottom: 9 }}>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#c8b870', lineHeight: 1.7, fontStyle: 'italic' }}>{oracle.message}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Fokus</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{oracle.action}</p>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✗ Vermeide</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{oracle.avoid}</p>
        </div>
      </div>
    </div>
  );
}
