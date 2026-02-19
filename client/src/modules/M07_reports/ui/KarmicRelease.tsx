import { calcLifePath, calcExpression, reduceToNumber } from '../../M05_numerology/lib/calc';

const KARMIC_LESSONS = [
  { num: 1, theme: 'Ego-Auflösung', pattern: 'Dominanz oder Unterwerfung', release: 'Lerne, gleichberechtigt zu führen und zu folgen', ritual: 'Schreibe gemeinsam eine neue Regel eurer Beziehung' },
  { num: 2, theme: 'Vertrauenswunden', pattern: 'Emotionale Abhängigkeit oder Distanz', release: 'Übe täglich kleine Akte des Vertrauens', ritual: 'Teilt täglich eine echte Verletzlichkeit miteinander' },
  { num: 3, theme: 'Kommunikations-Karma', pattern: 'Ungesagtes das sich anstaut', release: 'Sprich aus was du denkst bevor du es filterst', ritual: 'Tägliche 5-Minuten Check-ins ohne Handy' },
  { num: 4, theme: 'Stabilitäts-Karma', pattern: 'Kontrolle und Starrheit', release: 'Lass den anderen seinen eigenen Weg gehen', ritual: 'Plant gemeinsam ein Abenteuer ohne Struktur' },
  { num: 5, theme: 'Freiheits-Karma', pattern: 'Verlassenheit oder Klammern', release: 'Vertraue, dass Freiheit Liebe nicht tötet', ritual: 'Schenkt euch bewusst Zeit allein, ohne Erklärung' },
  { num: 6, theme: 'Fürsorge-Karma', pattern: 'Überversorgung oder Vernachlässigung', release: 'Frage: Was braucht der andere wirklich von mir?', ritual: 'Einmal pro Woche explizit fragen: Was brauchst du heute?' },
  { num: 7, theme: 'Verständnis-Karma', pattern: 'Geheimhaltung oder Überanalyse', release: 'Teile deine innere Welt ohne sie zu erklären', ritual: 'Stilles Meditieren nebeneinander, 10 Minuten täglich' },
  { num: 8, theme: 'Macht-Karma', pattern: 'Finanzielle oder emotionale Kontrolle', release: 'Entwickle gemeinsame Ressourcen und Entscheidungen', ritual: 'Einmal monatlich gemeinsam finanzielle Ziele setzen' },
  { num: 9, theme: 'Abschluss-Karma', pattern: 'Alte Wunden die immer wieder aufsteigen', release: 'Praktiziere bewusste Vergebung — nicht für sie, für dich', ritual: 'Schreibt Briefe die ihr nicht abschickt, verbrennt sie dann' },
];

interface KarmicReleaseProps { nameA: string; birthDateA: string; nameB: string; birthDateB: string; }

export function KarmicRelease({ nameA, birthDateA, nameB, birthDateB }: KarmicReleaseProps) {
  const lpA = calcLifePath(birthDateA).value;
  const lpB = calcLifePath(birthDateB).value;
  const exA = calcExpression(nameA).value;
  const exB = calcExpression(nameB).value;

  const k1num = reduceToNumber(lpA + lpB);
  const k2num = reduceToNumber(exA + exB);
  const k3num = reduceToNumber(lpA + exB);

  const k1 = KARMIC_LESSONS[(k1num - 1 + 9) % 9]!;
  const k2 = KARMIC_LESSONS[(k2num - 1 + 9) % 9]!;
  const k3 = KARMIC_LESSONS[(k3num - 1 + 9) % 9]!;

  const firstA = nameA.split(' ')[0] ?? nameA;
  const firstB = nameB.split(' ')[0] ?? nameB;

  const lessons = [
    { label: 'LP-Karma', lesson: k1 },
    { label: 'EX-Karma', lesson: k2 },
    { label: 'Kreuz-Karma', lesson: k3 },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {firstA} & {firstB} · Karma-Auflösung
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: '#818cf8', fontStyle: 'italic' }}>Drei karmische Muster die eure Seelen auflösen dürfen</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {lessons.map(({ label, lesson }, i) => (
          <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(129,140,248,0.04)', border: '1px solid rgba(129,140,248,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>{label} {['I', 'II', 'III'][i]}</span>
              <span style={{ fontSize: 7, color: '#5a5448' }}>{lesson.theme}</span>
            </div>
            <div style={{ fontSize: 9, color: '#3a3530', marginBottom: 4, fontStyle: 'italic' }}>Muster: {lesson.pattern}</div>
            <div style={{ fontSize: 9, color: '#5a5448', marginBottom: 6 }}>↗ {lesson.release}</div>
            <div style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', fontSize: 8, color: '#d4af37' }}>
              ✦ Ritual: {lesson.ritual}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
