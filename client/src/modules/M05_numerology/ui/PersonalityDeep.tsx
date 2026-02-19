import { calcPersonality } from '../lib/calc';

const PERSONALITY: Record<number, { title: string; first_impression: string; outer_mask: string; how_others_see: string; hidden_depth: string; style_tip: string; color: string }> = {
  1: { title: 'Die kraftvolle Präsenz', first_impression: 'Selbstsicher, entschlossen, natürliche Autorität', outer_mask: 'Du wirkst stärker und unabhängiger als du dich innerlich fühlst', how_others_see: 'Als Anführer und Pionier — jemand der weiß was er will', hidden_depth: 'Dahinter verbirgt sich ein Mensch der Bestätigung und Verbindung braucht', style_tip: 'Klare Linien, kräftige Farben — dein Äußeres sollte deine innere Stärke widerspiegeln', color: '#ef4444' },
  2: { title: 'Die sanfte Diplomatin', first_impression: 'Freundlich, zugänglich, einfühlsam und kooperativ', outer_mask: 'Du wirkst harmonischer und geduldiger als du dich manchmal fühlst', how_others_see: 'Als Vermittler und Unterstützer — jemand auf den man sich verlassen kann', hidden_depth: 'Dahinter verbirgt sich ein Mensch mit tiefen eigenen Wünschen und Grenzen', style_tip: 'Weiche Farben und fließende Stoffe betonen deine natürliche Anmut', color: '#93c5fd' },
  3: { title: 'Der strahlende Entertainer', first_impression: 'Charmant, witzig, kreativ und voller Energie', outer_mask: 'Du wirkst sorgloser und fröhlicher als du dich manchmal fühlst', how_others_see: 'Als Lebensfreude-Bringer — jemand der jeden Raum erhellt', hidden_depth: 'Dahinter verbirgt sich ein sensibler Mensch der Tiefe und echte Verbindung sucht', style_tip: 'Lebhafte Farben und kreative Accessoires spiegeln deine Energie wider', color: '#fbbf24' },
  4: { title: 'Der zuverlässige Fels', first_impression: 'Seriös, bodenständig, vertrauenswürdig und beständig', outer_mask: 'Du wirkst kontrollierter und strukturierter als du dich innerlich fühlst', how_others_see: 'Als Säule der Stärke — jemand auf den man bauen kann', hidden_depth: 'Dahinter verbirgt sich ein Mensch der sich nach Spontanität und Leichtigkeit sehnt', style_tip: 'Klassische, hochwertige Kleidung in Erdtönen unterstreicht deine Seriosität', color: '#a16207' },
  5: { title: 'Der magnetische Freigeist', first_impression: 'Dynamisch, abenteuerlustig, unkonventionell und lebendig', outer_mask: 'Du wirkst freier und ungebundener als du dich manchmal fühlst', how_others_see: 'Als aufregender Geist — jemand der das Leben interessant macht', hidden_depth: 'Dahinter verbirgt sich ein Mensch der sich nach Stabilität und Tiefe sehnt', style_tip: 'Einzigartige, individuelle Stücke die deine Unverwechselbarkeit zeigen', color: '#22d3ee' },
  6: { title: 'Der wärmende Beschützer', first_impression: 'Fürsorglich, verantwortungsvoll, herzlich und einladend', outer_mask: 'Du wirkst selbstloser und harmonischer als du dich manchmal fühlst', how_others_see: 'Als Herzmensch — jemand der andere willkommen heißt und umsorgt', hidden_depth: 'Dahinter verbirgt sich ein Mensch der selbst Fürsorge und Anerkennung braucht', style_tip: 'Warme Farben und einladende Stile spiegeln deine natürliche Wärme wider', color: '#22c55e' },
  7: { title: 'Der geheimnisvolle Denker', first_impression: 'Reserviert, nachdenklich, intelligent und geheimnisvoll', outer_mask: 'Du wirkst distanzierter und kühler als du dich innerlich fühlst', how_others_see: 'Als Rätsel — jemand der Tiefe hat die man entdecken möchte', hidden_depth: 'Dahinter verbirgt sich ein Mensch voller Wärme der Vertrauen braucht um sich zu öffnen', style_tip: 'Elegante, schlichte Kleidung in kühlen Tönen betont deine mystische Aura', color: '#7c3aed' },
  8: { title: 'Die imposante Autorität', first_impression: 'Mächtig, selbstsicher, professionell und beeindruckend', outer_mask: 'Du wirkst unerschütterlicher und erfolgreicher als du dich manchmal fühlst', how_others_see: 'Als Erfolgsmensch — jemand der Dinge bewegt und Ergebnisse liefert', hidden_depth: 'Dahinter verbirgt sich ein Mensch der Anerkennung für mehr als nur Leistung sucht', style_tip: 'Hochwertige, kraftvolle Kleidung die Kompetenz und Würde ausstrahlt', color: '#d4af37' },
  9: { title: 'Der weise Humanist', first_impression: 'Mitfühlend, weise, großzügig und universell zugänglich', outer_mask: 'Du wirkst selbstloser und weiser als du dich manchmal fühlst', how_others_see: 'Als Seelenverwandter — jemand der jeden versteht und akzeptiert', hidden_depth: 'Dahinter verbirgt sich ein Mensch der selbst Grenzen und Eigenraum braucht', style_tip: 'Fließende, elegante Kleidung in tiefen Farben spiegelt deine Tiefe wider', color: '#c026d3' },
};

const DEFAULT_P = { title: 'Einzigartige Persönlichkeit', first_impression: 'Einzigartig und unverwechselbar', outer_mask: 'Deine äußere Erscheinung ist einzigartig', how_others_see: 'Als jemand Besonderes', hidden_depth: 'Deine Tiefe entfaltet sich auf deinem eigenen Weg', style_tip: 'Trage was sich für dich richtig anfühlt', color: '#d4af37' };

interface PersonalityDeepProps { name: string; }

export function PersonalityDeep({ name }: PersonalityDeepProps) {
  const pe = calcPersonality(name);
  const num = pe.value;
  const data = PERSONALITY[num] ?? DEFAULT_P;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Persönlichkeitszahl {num}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: data.color }}>{data.title}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: `${data.color}07`, border: `1px solid ${data.color}20` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◉ Erster Eindruck</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.first_impression}</p>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)' }}>
          <div style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>◈ Deine äußere Maske</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.outer_mask}</p>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Wie andere dich sehen</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.how_others_see}</p>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div style={{ fontSize: 7, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>★ Verborgene Tiefe</div>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: '#c8b870', lineHeight: 1.5, fontStyle: 'italic' }}>„{data.hidden_depth}"</p>
        </div>
        <div style={{ padding: '7px 10px', borderRadius: 8, background: `${data.color}06`, border: `1px solid ${data.color}18` }}>
          <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>✧ Stil-Tipp</div>
          <p style={{ margin: 0, fontSize: 9, color: '#5a5448', lineHeight: 1.4 }}>{data.style_tip}</p>
        </div>
      </div>
    </div>
  );
}
