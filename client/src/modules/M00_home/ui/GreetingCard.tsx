import { TOKENS } from '../../../design';
import type { UserProfile } from '../../../shared/types/profile';

interface GreetingCardProps {
  profile: UserProfile;
  onPrimaryAction: () => void;
  onProfileAction: () => void;
  onExploreAction: () => void;
}

function getTimeOfDayLabel(hour: number): string {
  if (hour < 11) return 'Guten Morgen';
  if (hour < 17) return 'Guten Tag';
  if (hour < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

function getSubStatus(hour: number): string {
  if (hour < 11) return 'Die Tageslinie oeffnet sich langsam.';
  if (hour < 17) return 'Heute ist ein guter Moment fuer klare Entscheidungen.';
  if (hour < 22) return 'Die Atmosphaere eignet sich fuer Reflexion und Verbindung.';
  return 'Halte die Signale leise und die Fragen praezise.';
}

export function GreetingCard({ profile, onPrimaryAction, onProfileAction, onExploreAction }: GreetingCardProps) {
  const now = new Date();
  const greeting = getTimeOfDayLabel(now.getHours());
  const dateText = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return (
    <section
      className="sm-card"
      style={{
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        position: 'relative',
        overflow: 'hidden',
        borderColor: TOKENS.goldSoft,
        boxShadow: `0 22px 60px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: TOKENS.gold,
          boxShadow: `0 0 18px ${TOKENS.goldGlow}`,
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -32,
          right: -28,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${TOKENS.goldGlow} 0%, transparent 68%)`,
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
        <span
          style={{
            fontFamily: TOKENS.font.body,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: TOKENS.text2,
          }}
        >
          {dateText}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: TOKENS.font.display,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: TOKENS.text,
          }}
        >
          {greeting}, {profile.name}
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: TOKENS.font.serif,
            fontSize: 22,
            lineHeight: 1.35,
            color: TOKENS.text,
            maxWidth: 760,
          }}
        >
          Maya haelt heute deine Richtung, deine Signale und deine naechste Bewegung zusammen.
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: TOKENS.font.body,
            fontSize: 14,
            lineHeight: 1.7,
            color: TOKENS.text2,
            maxWidth: 720,
          }}
        >
          {getSubStatus(now.getHours())}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, position: 'relative', zIndex: 1 }}>
        <button type="button" className="sm-btn sm-btn-gold" onClick={onPrimaryAction}>
          Mit Maya starten
        </button>
        <button type="button" className="sm-btn sm-btn-ghost" onClick={onProfileAction}>
          Profil ansehen
        </button>
        <button type="button" className="sm-btn sm-btn-ghost" onClick={onExploreAction}>
          Heute entdecken
        </button>
      </div>
    </section>
  );
}