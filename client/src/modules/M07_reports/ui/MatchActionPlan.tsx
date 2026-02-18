// Recommended actions for a matched pair — pure client-side, rule-based.

interface Action {
  icon: string;
  title: string;
  desc: string;
  category: 'kommunikation' | 'erfahrung' | 'wachstum' | 'ritual' | 'heilung';
}

const CATEGORY_COLOR: Record<string, string> = {
  kommunikation: '#38bdf8', erfahrung: '#fbbf24', wachstum: '#22c55e', ritual: '#c084fc', heilung: '#f472b6',
};

const PLANS: Record<string, Action[]> = {
  'Seelengefährte': [
    { icon: '☽', title: 'Monatliche Tiefengespräche', desc: 'Setzt euch einmal im Monat zusammen und stellt euch gegenseitig eine tiefe Lebensfrage.', category: 'kommunikation' },
    { icon: '✦', title: 'Gemeinsame Vision', desc: 'Schreibt eure persönlichen 5-Jahres-Visionen und sucht die Überschneidungen.', category: 'wachstum' },
    { icon: '♡', title: 'Seelentagebuch teilen', desc: 'Führt je ein Tagebucheintrag/Woche und lest euch gegenseitig vor.', category: 'ritual' },
    { icon: '🌅', title: 'Sonnenaufgangs-Ritual', desc: 'Beobachtet mindestens einmal gemeinsam den Sonnenaufgang — in Stille.', category: 'ritual' },
    { icon: '🔮', title: 'Shadow-Work-Runde', desc: 'Besprecht eure größten Ängste und helft euch gegenseitig, sie zu benennen.', category: 'heilung' },
  ],
  'Zwillingsflamme': [
    { icon: '⚡', title: 'Intensitäts-Check', desc: 'Setzt klare Grenzen für intensive Gespräche — Raum und Zeit schützen die Energie.', category: 'heilung' },
    { icon: '☯', title: 'Polaritäten umarmen', desc: 'Listet eure größten Gegensätze auf und feiert sie als Stärke.', category: 'wachstum' },
    { icon: '🌊', title: 'Kreatives Co-Projekt', desc: 'Erschafft gemeinsam etwas — Musik, Schreiben, Kochen — die Energie kanalisieren.', category: 'erfahrung' },
    { icon: '✦', title: 'Regulierungs-Pausen', desc: 'Bewusste Trennungszeiten von je 1-2 Tagen stärken die Verbindung paradoxerweise.', category: 'ritual' },
    { icon: '♡', title: 'Liebessprachen-Mapping', desc: 'Lernt die Liebessprachen des anderen und übt täglich eine davon.', category: 'kommunikation' },
  ],
  'Karmische Begegnung': [
    { icon: '📖', title: 'Lektions-Journal', desc: 'Schreibt auf, was ihr voneinander lernt — konkret, wöchentlich.', category: 'wachstum' },
    { icon: '☽', title: 'Reflexions-Gespräch', desc: 'Einmal monatlich: Was hat diese Begegnung in mir verändert?', category: 'kommunikation' },
    { icon: '🌿', title: 'Heilungs-Raum', desc: 'Schafft einen sicheren Raum, in dem alte Wunden angesprochen werden dürfen.', category: 'heilung' },
    { icon: '⟳', title: 'Zyklus-Bewusstsein', desc: 'Beobachtet die Muster und Wiederholungen in eurer Verbindung ohne Bewertung.', category: 'ritual' },
    { icon: '✦', title: 'Loslassen üben', desc: 'Übt, ohne Erwartungen präsent zu sein — jeder Moment ist vollständig in sich.', category: 'wachstum' },
  ],
  'Seelenfreundschaft': [
    { icon: '🗺️', title: 'Gemeinsames Abenteuer', desc: 'Plant einen Ausflug oder eine Reise, die keiner von euch allein buchen würde.', category: 'erfahrung' },
    { icon: '📚', title: 'Wissens-Austausch', desc: 'Jeder teilt sein Lieblingsthema — wechselseitig unterrichten für je 30 Minuten.', category: 'kommunikation' },
    { icon: '♡', title: 'Gegenseitige Unterstützung', desc: 'Benennt je ein Ziel, das der andere aktiv unterstützen kann.', category: 'wachstum' },
    { icon: '✦', title: 'Freundschafts-Ritual', desc: 'Schafft ein kleines jährliches Ritual nur für euch — ein Datum, das immer zählt.', category: 'ritual' },
    { icon: '🌿', title: 'Ehrlichkeits-Pakt', desc: 'Vereinbart: Wir sagen uns die Wahrheit, auch wenn sie unbequem ist.', category: 'kommunikation' },
  ],
  'Lehrmeister-Schüler': [
    { icon: '📖', title: 'Strukturiertes Lernen', desc: 'Definiert klare Lern-/Wachstumsziele und setzt monatliche Meilensteine.', category: 'wachstum' },
    { icon: '⟳', title: 'Rollen-Rotation', desc: 'Wechselt bewusst die Lehrer/Schüler-Rollen — jeder weiß etwas, das der andere nicht weiß.', category: 'kommunikation' },
    { icon: '✦', title: 'Feedback-Ritual', desc: 'Monatliches ehrliches Feedback: Was wächst, was stagniert?', category: 'ritual' },
    { icon: '🌱', title: 'Wachstums-Projekt', desc: 'Wählt gemeinsam eine neue Fähigkeit, die ihr zusammen erlernet.', category: 'erfahrung' },
    { icon: '♡', title: 'Dankbarkeits-Praxis', desc: 'Täglich: eine Sache, die du heute durch den anderen gelernt hast.', category: 'heilung' },
  ],
  'Harmonische Begleitung': [
    { icon: '🌸', title: 'Schönheits-Erlebnisse', desc: 'Besucht Museen, Konzerte, Natur — teilt, was euch berührt.', category: 'erfahrung' },
    { icon: '☽', title: 'Entspannungs-Rituale', desc: 'Schafft gemeinsame Rituale der Ruhe und Erholung.', category: 'ritual' },
    { icon: '♡', title: 'Wertschätzungs-Praxis', desc: 'Täglich eine echte Wertschätzung für die Präsenz des anderen.', category: 'kommunikation' },
    { icon: '🌿', title: 'Gemeinsam in der Natur', desc: 'Regelmäßige Spaziergänge oder Zeit in der Natur — ohne Agenda.', category: 'erfahrung' },
    { icon: '✦', title: 'Lebensfreude teilen', desc: 'Was macht dich wirklich glücklich? Zeig es dem anderen — konkret.', category: 'wachstum' },
  ],
};

const DEFAULT_PLAN = PLANS['Harmonische Begleitung'] ?? [];

function normalize(ct: string): string {
  return ct?.trim() ?? '';
}

function findPlan(connectionType: string): Action[] {
  const ct = normalize(connectionType);
  if (PLANS[ct]) return PLANS[ct];
  // Fuzzy match
  const key = Object.keys(PLANS).find((k) => ct.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(ct.toLowerCase()));
  return (key ? PLANS[key] : DEFAULT_PLAN) ?? DEFAULT_PLAN;
}

interface MatchActionPlanProps {
  connectionType: string;
  nameA: string;
  nameB: string;
}

export function MatchActionPlan({ connectionType, nameA, nameB }: MatchActionPlanProps) {
  const actions = findPlan(connectionType);

  return (
    <div>
      <div style={{ fontSize: 10, color: '#5a5448', marginBottom: 10, fontStyle: 'italic' }}>
        Empfehlungen für {nameA} & {nameB}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {actions.map((a, i) => {
          const color = CATEGORY_COLOR[a.category] ?? '#a09a8e';
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '9px 12px', borderRadius: 10,
              background: `${color}07`, border: `1px solid ${color}20`,
              alignItems: 'flex-start',
            }}>
              <div style={{ fontSize: 14, flexShrink: 0, marginTop: 1, color }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#d4ccbc', marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 10, color: '#5a5448', lineHeight: 1.5 }}>{a.desc}</div>
              </div>
              <div style={{ fontSize: 8, color, padding: '2px 6px', borderRadius: 4, background: `${color}12`, border: `1px solid ${color}25`, flexShrink: 0, alignSelf: 'flex-start' }}>
                {a.category.charAt(0).toUpperCase() + a.category.slice(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
