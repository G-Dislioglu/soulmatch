import { useState } from 'react';
import { calcLifePath } from '../lib/calc';

interface LPDef {
  title: string;
  essence: string;
  color: string;
  planet: string;
  strengths: string[];
  challenges: string[];
  purpose: string;
  famous: string[];
}

const LP_DATA: Record<number, LPDef> = {
  1: { title: 'Die Pionierin / Der Pionier', essence: 'Führung, Originalität, Mut, Unabhängigkeit', color: '#ef4444', planet: '☉ Sonne', strengths: ['Visionäres Denken', 'Natürliche Führungskraft', 'Selbstständigkeit', 'Entschlossenheit'], challenges: ['Egoismus', 'Ungeduld', 'Dominanz', 'Einsamkeit'], purpose: 'Du bist hier, um neue Wege zu eröffnen — als Pionier, der anderen zeigt, dass Neues möglich ist. Deine Seele sucht Selbstausdruck und Unabhängigkeit.', famous: ['Steve Jobs', 'Lady Gaga', 'Martin Luther King'] },
  2: { title: 'Die Vermittlerin / Der Vermittler', essence: 'Harmonie, Kooperation, Intuition, Sensibilität', color: '#f472b6', planet: '☽ Mond', strengths: ['Tiefe Empathie', 'Diplomatisches Geschick', 'Intuitive Wahrnehmung', 'Teamgeist'], challenges: ['Zu sensitiv', 'Entscheidungsschwäche', 'Selbstvernachlässigung', 'Abhängigkeit'], purpose: 'Du bist der Brückenbauer zwischen Menschen. Deine Seele sucht Harmonie und tiefe Verbindung — als stiller Faden, der Menschen zusammenhält.', famous: ['Barack Obama', 'Madonna', 'Jennifer Aniston'] },
  3: { title: 'Die Kreative / Der Kreative', essence: 'Ausdruck, Freude, Kommunikation, Kreativität', color: '#fbbf24', planet: '♃ Jupiter', strengths: ['Kreative Begabung', 'Charisma & Humor', 'Kommunikationstalent', 'Optimismus'], challenges: ['Unkonzentriertheit', 'Oberflächlichkeit', 'Emotionale Ausbrüche', 'Zu viel streuen'], purpose: 'Du bist hier, um die Welt durch Ausdruck zu bereichern. Kunst, Worte, Musik — dein Kanal ist egal, solange du kreierst und deine Seele tanzt.', famous: ['Celine Dion', 'John Travolta', 'Christina Aguilera'] },
  4: { title: 'Die Architektin / Der Architekt', essence: 'Struktur, Disziplin, Loyalität, Zuverlässigkeit', color: '#a3a3a3', planet: '♄ Saturn', strengths: ['Unerschütterliche Zuverlässigkeit', 'Praktische Intelligenz', 'Durchhaltevermögen', 'Organisationstalent'], challenges: ['Starrheit', 'Überarbeitung', 'Angst vor Veränderung', 'Selbstkritik'], purpose: 'Du bist das Fundament, auf dem andere bauen. Deine Seele sucht dauerhafte Werke — Strukturen, die über dein Leben hinaus bestehen.', famous: ['Bill Gates', 'Oprah Winfrey', 'Elton John'] },
  5: { title: 'Die Abenteurerin / Der Abenteurer', essence: 'Freiheit, Abenteuer, Vielseitigkeit, Wandel', color: '#38bdf8', planet: '☿ Merkur', strengths: ['Anpassungsfähigkeit', 'Magnetische Persönlichkeit', 'Unternehmergeist', 'Kommunikationstalent'], challenges: ['Unbeständigkeit', 'Verantwortungsscheu', 'Überreizung', 'Bindungsangst'], purpose: 'Du bist hier, um Freiheit zu erfahren und zu lehren. Deine Seele sehnt sich nach Bewegung, Erfahrung und dem nächsten Horizont.', famous: ['Abraham Lincoln', 'Mick Jagger', 'Angelina Jolie'] },
  6: { title: 'Die Hüterin / Der Hüter', essence: 'Liebe, Fürsorge, Verantwortung, Heilung', color: '#34d399', planet: '♀ Venus', strengths: ['Tiefe Fürsorge', 'Heilende Präsenz', 'Häusliche Wärme', 'Gerechtigkeitssinn'], challenges: ['Zu selbstaufopfernd', 'Perfektionismus', 'Kontrollbedürfnis', 'Groll ansammeln'], purpose: 'Du bist hier um zu heilen, zu nähren und Geborgenheit zu schenken. Deine Seele findet Erfüllung im Dienst an anderen und in der Erschaffung von Heimat.', famous: ['Albert Einstein', 'John Lennon', 'Meryl Streep'] },
  7: { title: 'Die Mystikerin / Der Mystiker', essence: 'Weisheit, Spiritualität, Analyse, Innenschau', color: '#818cf8', planet: '♆ Neptun', strengths: ['Tiefes Analysevermögen', 'Spirituelle Wahrnehmung', 'Intellektuelle Brillanz', 'Intuitive Weisheit'], challenges: ['Rückzug & Isolation', 'Misstrauen', 'Gefühlskälte', 'Perfektionismus'], purpose: 'Du bist der Sucher der Wahrheit. Deine Seele braucht Stille und Tiefe, um die Geheimnisse des Lebens zu entschlüsseln und weiterzugeben.', famous: ['Fyodor Dostoyevsky', 'Princess Diana', 'Stephen Hawking'] },
  8: { title: 'Die Meisterin / Der Meister', essence: 'Macht, Fülle, Führung, Manifestation', color: '#d4af37', planet: '♄ Saturn', strengths: ['Unternehmerisches Talent', 'Naturelle Autorität', 'Ausdauer im Erfolg', 'Strategisches Denken'], challenges: ['Machtmissbrauch', 'Materialismus', 'Arbeitsucht', 'Selbstüberschätzung'], purpose: 'Du bist hier um Fülle zu erschaffen — nicht nur für dich, sondern als Kanal für materielle und spirituelle Prospertität auf der Erde.', famous: ['Pablo Picasso', 'Nelson Mandela', 'Martha Stewart'] },
  9: { title: 'Die Weltheilerin / Der Weltheiler', essence: 'Mitgefühl, Vollendung, Weisheit, Transformation', color: '#c084fc', planet: '♂ Mars', strengths: ['Universelles Mitgefühl', 'Tiefe Großzügigkeit', 'Spirituelle Führung', 'Künstlerisches Genie'], challenges: ['Idealismus', 'Emotionale Distanz', 'Selbstverlust', 'Bitterkeit'], purpose: 'Du bist der älteste Lebenspfad — die gesammelte Weisheit vieler Leben. Du bist hier um zu vollenden, zu heilen und loszulassen.', famous: ['Mahatma Gandhi', 'Mother Teresa', 'Morgan Freeman'] },
  11: { title: 'Die Erleuchtete / Der Erleuchtete', essence: 'Inspiration, Intuition, Erleuchtung, Vision', color: '#c084fc', planet: '☽ Mond / ☉ Sonne', strengths: ['Außergewöhnliche Intuition', 'Inspirierende Präsenz', 'Spirituelle Sensibilität', 'Visionäre Kraft'], challenges: ['Extreme Nervosität', 'Unrealistische Erwartungen', 'Intensität überfordert andere', 'Lebt oft auf LP-2 Ebene'], purpose: 'Du trägst die Kraft zweier Sonnen. Als Meisterzahl bist du hier, um Licht in die Welt zu bringen — als Kanal des Göttlichen.', famous: ['Barack Obama', 'Michelle Obama', 'Nikola Tesla'] },
  22: { title: 'Die Meisterbauerin / Der Meisterbauer', essence: 'Manifestation, Führung, Monumentalität, Dienst', color: '#d4af37', planet: '♄ Saturn / ♃ Jupiter', strengths: ['Monumentale Visionen', 'Praktische Weisheit', 'Natürliche Führung', 'Nachhaltiger Aufbau'], challenges: ['Überwältigende Verantwortung', 'Perfektionismus', 'Burnout-Gefahr', 'Lebt oft auf LP-4 Ebene'], purpose: 'Deine Seele ist hier um Großartiges zu bauen — Institutionen, Bewegungen, Werke, die Generationen überdauern. Die höchste materielle Lebenskraft.', famous: ['Bill Gates (Variante)', 'Will Smith', 'Tina Turner'] },
  33: { title: 'Die Meisterlehrerin / Der Meisterlehrer', essence: 'Bedingungslose Liebe, Heilung, Erleuchtung, Dienst', color: '#f472b6', planet: '♀ Venus / ♃ Jupiter', strengths: ['Bedingungslose Liebe', 'Tiefste Heilungskraft', 'Spirituelle Führung', 'Lebendiges Beispiel'], challenges: ['Martyrertum', 'Selbstaufopferung', 'Lebt oft auf LP-6 Ebene', 'Überwältigende Verantwortung'], purpose: 'Als seltenste Meisterzahl bist du hier um durch gelebte bedingungslose Liebe zu lehren. Du bist ein Kanal des Göttlichen Herzens.', famous: ['Francis of Assisi', 'Albert Einstein (33-Variante)'] },
};

interface LifePathDetailProps { name: string; birthDate: string; }

export function LifePathDetail({ name: _name, birthDate }: LifePathDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const lp = calcLifePath(birthDate);
  const def = LP_DATA[lp.value];
  if (!def) return null;

  return (
    <div>
      {/* Header row */}
      <div role="button" onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: expanded ? 14 : 0 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 13, flexShrink: 0,
          background: `${def.color}14`, border: `1.5px solid ${def.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 16px ${def.color}25`,
        }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: def.color }}>{lp.value}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: def.color, lineHeight: 1.2 }}>{def.title}</div>
          <div style={{ fontSize: 10, color: '#6a6458', marginTop: 2 }}>{def.planet} · {def.essence.split(',')[0]?.trim()}</div>
        </div>
        <div style={{ fontSize: 14, color: '#4a4540', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div>
          {/* Purpose */}
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.7, color: '#c8c0b0', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', borderLeft: `2px solid ${def.color}40`, paddingLeft: 12 }}>
            {def.purpose}
          </p>

          {/* Strengths + Challenges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: `${def.color}08`, border: `1px solid ${def.color}20` }}>
              <div style={{ fontSize: 9, color: def.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Stärken</div>
              {def.strengths.map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: '#8a8278', marginBottom: 2 }}>+ {s}</div>
              ))}
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 9, color: '#7a7468', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Wachstum</div>
              {def.challenges.map((c, i) => (
                <div key={i} style={{ fontSize: 11, color: '#5a5448', marginBottom: 2 }}>△ {c}</div>
              ))}
            </div>
          </div>

          {/* Famous */}
          <div style={{ fontSize: 9, color: '#4a4540', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Bekannte Seelen</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {def.famous.map((f, i) => (
              <span key={i} style={{ fontSize: 10, color: def.color, padding: '2px 8px', borderRadius: 6, background: `${def.color}10`, border: `1px solid ${def.color}25` }}>{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
