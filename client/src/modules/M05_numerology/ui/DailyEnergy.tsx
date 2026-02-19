import { reduceToNumber } from '../lib/calc';

function calcDailyNumber(birthDate: string): number {
  const today = new Date();
  const parts = birthDate.split('-');
  const mm = parseInt(parts[1] ?? '0', 10);
  const dd = parseInt(parts[2] ?? '0', 10);
  const tm = today.getMonth() + 1;
  const td = today.getDate();
  const ty = today.getFullYear();
  return reduceToNumber(mm + dd + tm + td + ty);
}

const DAILY: Record<number, { title: string; vibe: string; focus: string; avoid: string; affirmation: string; color: string; icon: string }> = {
  1: { title: 'Tag der Initiative', vibe: 'Kraftvoll, klar, selbstbestimmt', focus: 'Starte etwas Neues — heute ist deine Energie unaufhaltsam', avoid: 'Zögern und auf andere warten', affirmation: 'Ich handle mit Mut und Klarheit', color: '#ef4444', icon: '⚡' },
  2: { title: 'Tag der Verbindung', vibe: 'Sensibel, kooperativ, fürsorglich', focus: 'Höre anderen zu und stärke Beziehungen', avoid: 'Alleingänge und harte Entscheidungen', affirmation: 'Ich bin offen für echte Verbindung', color: '#93c5fd', icon: '🤝' },
  3: { title: 'Tag der Freude', vibe: 'Kreativ, spielerisch, kommunikativ', focus: 'Erschaffe, lache, drücke dich aus', avoid: 'Ernste Analysen und Isolation', affirmation: 'Ich lasse meine innere Freude strahlen', color: '#fbbf24', icon: '🌟' },
  4: { title: 'Tag der Ordnung', vibe: 'Diszipliniert, praktisch, bodenständig', focus: 'Organisiere, plane, räume auf', avoid: 'Ablenkungen und Spontanität', affirmation: 'Ich schaffe solide Grundlagen für mein Leben', color: '#a16207', icon: '🏗' },
  5: { title: 'Tag der Freiheit', vibe: 'Dynamisch, neugierig, abenteuerlustig', focus: 'Probiere etwas Neues, bewege dich, reise', avoid: 'Routinen und Einschränkungen', affirmation: 'Ich umarme den Fluss des Lebens', color: '#22d3ee', icon: '🌊' },
  6: { title: 'Tag der Fürsorge', vibe: 'Liebevoll, verantwortungsvoll, heilend', focus: 'Diene anderen, verschönere dein Zuhause', avoid: 'Selbstvernachlässigung und Streit', affirmation: 'Meine Fürsorge heilt mich und andere', color: '#22c55e', icon: '💚' },
  7: { title: 'Tag der Stille', vibe: 'Intuitiv, nachdenklich, spirituell', focus: 'Meditiere, reflektiere, forsche', avoid: 'Lärm, soziale Verpflichtungen, Hektik', affirmation: 'Ich vertraue meiner inneren Weisheit', color: '#7c3aed', icon: '🔮' },
  8: { title: 'Tag der Macht', vibe: 'Ambitioniert, fokussiert, magnetisch', focus: 'Verhandle, präsentiere, manifestiere', avoid: 'Kleinmut und Selbstzweifel', affirmation: 'Ich manifestiere mit Würde und Kraft', color: '#d4af37', icon: '💎' },
  9: { title: 'Tag des Loslassens', vibe: 'Mitfühlend, abschließend, weise', focus: 'Vergib, lasse los, schenke anderen', avoid: 'Festhalten und neue Projekte starten', affirmation: 'Ich lasse los was mich nicht mehr dient', color: '#c026d3', icon: '🍂' },
};

const DEFAULT_DAILY = { title: 'Besonderer Tag', vibe: 'Einzigartige Energie', focus: 'Folge deiner Intuition', avoid: 'Selbstzweifel', affirmation: 'Ich vertraue dem Rhythmus meiner Seele', color: '#d4af37', icon: '✨' };

interface DailyEnergyProps { birthDate: string; }

export function DailyEnergy({ birthDate }: DailyEnergyProps) {
  const dn = calcDailyNumber(birthDate);
  const data = DAILY[dn] ?? DEFAULT_DAILY;
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 8, color: '#5a5448', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{dateStr} · Tages-Energie {dn}</div>
        <div style={{ fontSize: 28, marginBottom: 5 }}>{data.icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: data.color }}>{data.title}</div>
        <div style={{ fontSize: 9, color: '#5a5448', marginTop: 3, fontStyle: 'italic' }}>{data.vibe}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div style={{ fontSize: 7, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✦ Fokus heute</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.focus}</p>
        </div>
        <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 7, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>✗ Vermeide heute</div>
          <p style={{ margin: 0, fontSize: 10, color: '#5a5448', lineHeight: 1.4 }}>{data.avoid}</p>
        </div>
      </div>

      <div style={{ padding: '9px 12px', borderRadius: 9, background: `${data.color}08`, border: `1px solid ${data.color}22`, textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: data.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>✧ Tages-Affirmation</div>
        <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: data.color, lineHeight: 1.6, fontStyle: 'italic' }}>„{data.affirmation}"</p>
      </div>
    </div>
  );
}
