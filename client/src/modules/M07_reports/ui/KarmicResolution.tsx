import { calcLifePath, calcExpression, reduceToNumber } from '../../M05_numerology/lib/calc';

const KARMIC_LESSONS: Record<number, { lesson: string; resolution: string; gift: string; color: string }> = {
  1: { lesson: 'Lernt, Führung ohne Dominanz auszuüben', resolution: 'Entscheidet gemeinsam und gebt abwechselnd die Richtung vor', gift: 'Gemeinsam seid ihr unaufhaltbare Pioniere', color: '#ef4444' },
  2: { lesson: 'Lernt, Bedürfnisse klar zu kommunizieren statt zu erwarten', resolution: 'Wöchentliches Gespräch: Was brauche ich wirklich?', gift: 'Tiefste Intimität die möglich ist', color: '#93c5fd' },
  3: { lesson: 'Lernt, Tiefe zuzulassen neben der Leichtigkeit', resolution: 'Teilt täglich einen echten Gedanken oder ein echtes Gefühl', gift: 'Gemeinsame Freude die andere beflügelt', color: '#fbbf24' },
  4: { lesson: 'Lernt, den anderen nicht nach eurem System zu formen', resolution: 'Respektiert unterschiedliche Strukturen im gemeinsamen Aufbau', gift: 'Das stabilste Fundament das Liebe kennt', color: '#a16207' },
  5: { lesson: 'Lernt, Freiheit als Geschenk zu geben, nicht als Bedrohung zu sehen', resolution: 'Plant gemeinsame Abenteuer und lasst den anderen auch alleine fliegen', gift: 'Eine Liebe die atmet und dadurch ewig bleibt', color: '#22d3ee' },
  6: { lesson: 'Lernt, Verantwortung zu teilen ohne sich aufzuopfern', resolution: 'Wöchentliche Verteilung: Wer trägt heute was?', gift: 'Ein Zuhause das andere heilt allein durch seine Existenz', color: '#22c55e' },
  7: { lesson: 'Lernt, die Stille miteinander zu teilen statt sie zu verstecken', resolution: 'Schweigt manchmal einfach zusammen — ohne Erklärung', gift: 'Die tiefste seelische Verbindung die möglich ist', color: '#7c3aed' },
  8: { lesson: 'Lernt, Macht als Werkzeug zu nutzen, nicht als Statussymbol', resolution: 'Fragt gemeinsam: Wofür setzen wir unsere Kraft ein?', gift: 'Zusammen könnt ihr Berge versetzen — wirklich', color: '#d4af37' },
  9: { lesson: 'Lernt, einander zu vergeben — immer wieder', resolution: 'Rituelle Vergebung: Sprecht monatlich aus was ihr loslasst', gift: 'Eine Liebe die die Welt ein bisschen heilender macht', color: '#c026d3' },
};

const DEFAULT_KARMIC = { lesson: 'Lernt voneinander ohne den anderen zu verlieren', resolution: 'Bleibt im Gespräch auch wenn es schwer wird', gift: 'Wachstum das nur durch euch zusammen möglich ist', color: '#818cf8' };

interface KarmicResolutionProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function KarmicResolution({ nameA, birthDateA, nameB, birthDateB }: KarmicResolutionProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;

  const karmicNum = reduceToNumber(lpA + lpB) || 9;
  const secondaryNum = reduceToNumber(exA + exB) || 6;

  const primary = KARMIC_LESSONS[karmicNum] ?? DEFAULT_KARMIC;
  const secondary = KARMIC_LESSONS[secondaryNum] ?? DEFAULT_KARMIC;
  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Karma-Auflösung
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, color: primary.color }}>Karma-Zahl {karmicNum}</div>
      </div>

      <div style={{ padding: '10px 13px', borderRadius: 10, background: `${primary.color}08`, border: `1px solid ${primary.color}22`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: primary.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Eure Karma-Lektion</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>{primary.lesson}</p>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Karma-Auflösung</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{primary.resolution}</p>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${primary.color}07`, border: `1px solid ${primary.color}1a`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: primary.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Euer Karma-Geschenk</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: primary.color, lineHeight: 1.5, fontStyle: 'italic' }}>„{primary.gift}"</p>
      </div>

      {secondary.color !== primary.color && (
        <div style={{ padding: '7px 11px', borderRadius: 8, background: `${secondary.color}06`, border: `1px solid ${secondary.color}18` }}>
          <div style={{ fontSize: 7, color: secondary.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Ausdrucks-Karma {secondaryNum}</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{secondary.lesson}</p>
        </div>
      )}
    </div>
  );
}
