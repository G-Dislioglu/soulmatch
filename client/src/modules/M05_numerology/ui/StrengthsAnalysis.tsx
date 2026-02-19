import { calcLifePath, calcExpression, calcSoulUrge } from '../lib/calc';

interface StrengthDef { strengths: string[]; challenges: string[]; growthTip: string; }

const DEFS: Record<number, StrengthDef> = {
  1: { strengths: ['Natürliche Führungsstärke', 'Außergewöhnlicher Mut', 'Pioniergeist', 'Unabhängigkeit', 'Kreative Vision'], challenges: ['Ungeduld mit anderen', 'Ego-Kämpfe', 'Schwierigkeit, Hilfe anzunehmen', 'Angst vor Abhängigkeit'], growthTip: 'Lerne zu delegieren — deine Stärke wächst, wenn andere mit dir wachsen.' },
  2: { strengths: ['Tiefe Empathie', 'Diplomatisches Geschick', 'Geduld & Ausdauer', 'Sensibler Zuhörer', 'Friedensstifter'], challenges: ['Entscheidungsschwäche', 'Überempfindlichkeit', 'Selbstaufopferung', 'Angst vor Konflikten'], growthTip: 'Deine Gefühle sind Stärke — setze klare Grenzen ohne Schuldgefühle.' },
  3: { strengths: ['Schöpferische Ausdruckskraft', 'Charme & Humor', 'Soziales Talent', 'Optim­ismus', 'Inspiriert andere'], challenges: ['Zerstreutheit', 'Übertriebener Optimismus', 'Unvollendete Projekte', 'Emotionale Schwankungen'], growthTip: 'Fokus ist dein Superkraft-Multiplikator — wähle einen Weg und gehe ihn durch.' },
  4: { strengths: ['Außerordentliche Zuverlässigkeit', 'Systematisches Denken', 'Ausdauer', 'Loyalität', 'Praktische Brillanz'], challenges: ['Starrheit & Sturheit', 'Workaholic-Tendenzen', 'Schwierigkeit mit Spontaneität', 'Übertriebene Kontrolle'], growthTip: 'Lass das Unerwartete zu — Flexibilität macht deine Strukturen lebendiger.' },
  5: { strengths: ['Grenzenlose Anpassungsfähigkeit', 'Charisma & Magnetismus', 'Vielseitigkeit', 'Abenteuerlust', 'Kommunikationstalent'], challenges: ['Bindungsscheu', 'Impulsivität', 'Unbeständigkeit', 'Flucht vor Verantwortung'], growthTip: 'Freiheit und Commitment schließen sich nicht aus — wähle bewusst was dir wichtig ist.' },
  6: { strengths: ['Bedingungslose Fürsorge', 'Starker Familiensinn', 'Ästhetisches Gespür', 'Heilende Präsenz', 'Tiefe Loyalität'], challenges: ['Kontrollbedürfnis', 'Eigene Bedürfnisse vernachlässigen', 'Perfektionismus', 'Schwierigkeit Nein zu sagen'], growthTip: 'Du kannst nur geben, was du hast — fülle zuerst deinen eigenen Becher.' },
  7: { strengths: ['Analytische Tiefe', 'Spirituelle Intelligenz', 'Intuition', 'Forschergeist', 'Inten­siver Fokus'], challenges: ['Soziale Isolation', 'Überkritisches Denken', 'Misstrauen', 'Emotionale Distanz'], growthTip: 'Teile deine Weisheit — dein Wissen gewinnt durch das Weitergeben.' },
  8: { strengths: ['Außergewöhnlicher Ehrgeiz', 'Organisationstalent', 'Natürliche Autorität', 'Manifestationskraft', 'Zielstrebigkeit'], challenges: ['Workaholismus', 'Kontrolle über andere', 'Materielle Besessenheit', 'Emotionale Kälte'], growthTip: 'Wahrer Reichtum entsteht, wenn du materielle und spirituelle Ziele verbindest.' },
  9: { strengths: ['Universelle Mitgefühl', 'Großzügigkeit', 'Charisma & Weisheit', 'Kreativität', 'Globale Perspektive'], challenges: ['Loslassen fällt schwer', 'Selbstaufopferung', 'Emotionale Überwältigung', 'Unrealistische Ideale'], growthTip: 'Der Abschluss von Zyklen macht Raum für Neues — Loslassen ist deine Superkraft.' },
  11: { strengths: ['Außerordentliche Intuition', 'Charismatische Inspiration', 'Spirituelle Sensibilität', 'Visionäres Denken', 'Heilende Ausstrahlung'], challenges: ['Nervosität & Überreizung', 'Erdung fehlt manchmal', 'Zu viel Druck auf sich selbst', 'Selbstzweifel'], growthTip: 'Meditiere täglich — deine Sensitivität ist ein Geschenk, das Pflege braucht.' },
  22: { strengths: ['Monumentale Visionskraft', 'Praktischer Idealismus', 'Außerordentliche Ausdauer', 'Natürliche Führung', 'Systemdenken'], challenges: ['Überwältigung durch eigene Vision', 'Perfektionismus lähmt', 'Selbstzweifel trotz Talent', 'Delegation fällt schwer'], growthTip: 'Du musst nicht alles alleine tragen — große Visionen brauchen große Teams.' },
  33: { strengths: ['Bedingungslose Liebe', 'Heilende Präsenz', 'Tiefe Empathie', 'Inspirierendes Vorbild', 'Universelle Fürsorge'], challenges: ['Selbstaufopferung bis zur Erschöpfung', 'Grenzen setzen schwierig', 'Höhere Standards als erreichbar', 'Emotionale Überlastung'], growthTip: 'Du bist kein Heiland — erlaube dir, unvollkommen und menschlich zu sein.' },
};

const DEFAULT_DEF: StrengthDef = { strengths: ['Authentizität', 'Lernbereitschaft', 'Einzigartigkeit'], challenges: ['Im Werden'], growthTip: 'Jeder Weg ist der richtige Weg — vertraue deinem Prozess.' };

interface StrengthsAnalysisProps { name: string; birthDate: string; }

export function StrengthsAnalysis({ name, birthDate }: StrengthsAnalysisProps) {
  const lp = calcLifePath(birthDate).value;
  const ex = calcExpression(name).value;
  const su = calcSoulUrge(name).value;
  const def = DEFS[lp] ?? DEFAULT_DEF;

  return (
    <div>
      <div style={{ fontSize: 9, color: '#7a7468', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        LP {lp} · EX {ex} · SU {su}
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>✦ Stärken</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {def.strengths.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 7, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#5a7a58' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Challenges */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>☽ Herausforderungen</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {def.challenges.map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 7, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#7a6a40' }}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Growth tip */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ fontSize: 8, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>✦ Wachstums-Impuls</div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: '#7a7468', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>{def.growthTip}</p>
      </div>
    </div>
  );
}
