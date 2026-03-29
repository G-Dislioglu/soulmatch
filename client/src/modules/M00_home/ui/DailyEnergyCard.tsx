import { TOKENS } from '../../../design';
import type { UserProfile } from '../../../shared/types/profile';

interface DailyEnergyCardProps {
  profile: UserProfile;
}

function getEnergySeed(profile: UserProfile): number {
  return `${profile.birthDate}-${new Date().toISOString().slice(0, 10)}`
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

const ENERGY_TONES = [
  {
    title: 'Klare Ausrichtung',
    body: 'Heute tragen strukturierte Entscheidungen weiter als spontane Umwege.',
    accent: 'gold',
  },
  {
    title: 'Offene Resonanz',
    body: 'Gespräche werden fruchtbarer, wenn du zuerst den Kern und dann die Emotion benennst.',
    accent: 'purple',
  },
  {
    title: 'Weite Perspektive',
    body: 'Ein kleiner Abstand hilft heute mehr als zusätzlicher Druck auf dieselbe Frage.',
    accent: 'cyan',
  },
  {
    title: 'Mut zur Nähe',
    body: 'Verbindung entsteht heute dort, wo du präzise statt perfekt antwortest.',
    accent: 'rose',
  },
];

export function DailyEnergyCard({ profile }: DailyEnergyCardProps) {
  const seed = getEnergySeed(profile);
  const tone = ENERGY_TONES[seed % ENERGY_TONES.length]!;
  const pulse = 56 + (seed % 33);

  const accentMap = {
    gold: TOKENS.gold,
    purple: TOKENS.purple,
    cyan: TOKENS.cyan,
    rose: TOKENS.rose,
  } as const;

  const accent = accentMap[tone.accent as keyof typeof accentMap] ?? TOKENS.gold;

  return (
    <section className="sm-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Tagesenergie
          </div>
          <div style={{ fontFamily: TOKENS.font.serif, fontSize: 24, color: TOKENS.text, marginTop: 4 }}>
            {tone.title}
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: `1.5px solid ${TOKENS.b1}`,
            background: `radial-gradient(circle, ${accent}22 0%, transparent 72%)`,
            display: 'grid',
            placeItems: 'center',
            boxShadow: `0 0 24px ${accent}22`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: TOKENS.font.display, fontSize: 18, color: accent }}>{pulse}</span>
        </div>
      </div>

      <p style={{ margin: 0, fontFamily: TOKENS.font.body, fontSize: 14, lineHeight: 1.7, color: TOKENS.text2 }}>
        {tone.body}
      </p>

      <div style={{ display: 'grid', gap: 10, marginTop: 'auto' }}>
        {[
          ['Fokus', 'Richtung halten'],
          ['Beziehung', 'klar und weich sprechen'],
          ['Momentum', `${pulse}% aktiv`],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 10, borderTop: `1px solid ${TOKENS.b3}` }}>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>{label}</span>
            <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, fontWeight: 500, color: TOKENS.text }}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}