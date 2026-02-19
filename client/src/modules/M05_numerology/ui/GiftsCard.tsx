import { calcExpression, calcLifePath, calcSoulUrge } from '../lib/calc';

const GIFTS: Record<number, { title: string; talents: string[]; calling: string; mastery: string; color: string }> = {
  1: { title: 'Der Pionier', talents: ['Führungsqualität', 'Originalität', 'Entschlossenheit', 'Mut', 'Unabhängigkeit'], calling: 'Neue Wege eröffnen, die andere dann gehen können', mastery: 'Aus dem Nichts etwas erschaffen', color: '#ef4444' },
  2: { title: 'Der Verbinder', talents: ['Empathie', 'Diplomatie', 'Intuition', 'Kooperation', 'Feingefühl'], calling: 'Brücken zwischen Menschen und Ideen bauen', mastery: 'Im Hintergrund die entscheidende Kraft sein', color: '#93c5fd' },
  3: { title: 'Der Schöpfer', talents: ['Kreativität', 'Kommunikation', 'Inspiration', 'Freude', 'Ausdruck'], calling: 'Die Welt durch Kunst und Worte berühren', mastery: 'Freude als spirituelle Praxis leben', color: '#fbbf24' },
  4: { title: 'Der Baumeister', talents: ['Zuverlässigkeit', 'Organisation', 'Ausdauer', 'Pragmatismus', 'Treue'], calling: 'Beständige Strukturen für andere errichten', mastery: 'Das Fundament sein, auf dem andere stehen', color: '#a16207' },
  5: { title: 'Der Freigeist', talents: ['Anpassungsfähigkeit', 'Neugier', 'Vielseitigkeit', 'Mut zur Veränderung', 'Redegewandtheit'], calling: 'Als lebendiger Beweis für die Kraft der Freiheit wirken', mastery: 'Transformation verkörpern und andere inspirieren', color: '#22d3ee' },
  6: { title: 'Der Heiler', talents: ['Fürsorge', 'Verantwortungsbewusstsein', 'Ästhetik', 'Heilung', 'Gemeinschaft'], calling: 'Heilung und Schönheit in die Welt bringen', mastery: 'Liebe als tägliche Praxis und nicht als Gefühl', color: '#22c55e' },
  7: { title: 'Der Weise', talents: ['Analyse', 'Spiritualität', 'Intuition', 'Forschungsgeist', 'Tiefe'], calling: 'Das verborgene Wissen der Welt zu Tage bringen', mastery: 'Das Unsichtbare sichtbar machen', color: '#7c3aed' },
  8: { title: 'Der Manifestor', talents: ['Autorität', 'Geschäftssinn', 'Effizienz', 'Willensstärke', 'Führung'], calling: 'Materielle und spirituelle Fülle erschaffen', mastery: 'Macht im Dienst des Größeren einsetzen', color: '#d4af37' },
  9: { title: 'Der Humanist', talents: ['Universelle Liebe', 'Weisheit', 'Kreativität', 'Mitgefühl', 'Vollendung'], calling: 'Die Menschheit durch Beispiel und Liebe erheben', mastery: 'Loslassen als höchste spirituelle Tugend', color: '#c026d3' },
  11: { title: 'Der Visionär', talents: ['Intuition', 'Inspiration', 'Spiritualität', 'Charisma', 'Erleuchtung'], calling: 'Als Kanal für höhere Weisheit dienen', mastery: 'Das Licht der Vision in die Welt bringen', color: '#818cf8' },
  22: { title: 'Der Meisterbauer', talents: ['Vision', 'Führung', 'Ausdauer', 'Pragmatismus', 'Universelles Denken'], calling: 'Große Träume in dauerhafte Realität umwandeln', mastery: 'Die Brücke zwischen Himmel und Erde bauen', color: '#a78bfa' },
  33: { title: 'Der Meisterlehrer', talents: ['Bedingungslose Liebe', 'Heilung', 'Inspiration', 'Aufopferung', 'Transzendenz'], calling: 'Als Lichtträger die Welt durch Liebe heilen', mastery: 'Selbstlosigkeit als kosmisches Prinzip leben', color: '#f9a8d4' },
};

const DEFAULT_GIFT = { title: 'Das Einzigartige', talents: ['Einzigartigkeit', 'Individualität', 'Potenzial', 'Wandelbarkeit', 'Tiefe'], calling: 'Den eigenen unverwechselbaren Weg gehen', mastery: 'Aus dem Eigenen heraus schöpfen', color: '#d4af37' };

interface GiftsCardProps { name: string; birthDate: string; }

export function GiftsCard({ name, birthDate }: GiftsCardProps) {
  const ex = calcExpression(name).value;
  const lp = calcLifePath(birthDate).value;
  const su = calcSoulUrge(name).value;

  const primary = GIFTS[ex] ?? DEFAULT_GIFT;
  const support = GIFTS[lp] ?? DEFAULT_GIFT;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>EX {ex} · Ausdruckszahl</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: primary.color }}>{primary.title}</div>
      </div>

      {/* Talents */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 11, justifyContent: 'center' }}>
        {primary.talents.map(t => (
          <span key={t} style={{ fontSize: 8, color: primary.color, padding: '2px 8px', borderRadius: 10, background: `${primary.color}12`, border: `1px solid ${primary.color}25` }}>{t}</span>
        ))}
      </div>

      {/* Calling */}
      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${primary.color}08`, border: `1px solid ${primary.color}20`, marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: primary.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Deine Berufung</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', lineHeight: 1.6, fontStyle: 'italic' }}>{primary.calling}</p>
      </div>

      {/* Mastery */}
      <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 9 }}>
        <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Meisterschaft</div>
        <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{primary.mastery}</p>
      </div>

      {/* LP support */}
      <div style={{ padding: '7px 11px', borderRadius: 8, background: `${support.color}06`, border: `1px solid ${support.color}18` }}>
        <div style={{ fontSize: 7, color: support.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>LP {lp} & SU {su} · Unterstützende Gabe</div>
        <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{support.calling}</p>
      </div>
    </div>
  );
}
