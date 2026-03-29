import { ScoreRing, TOKENS } from '../../../design';
import type { UserProfile } from '../../../shared/types/profile';
import type { ScoreResult } from '../../../shared/types/scoring';

interface ProfileScoreCardProps {
  profile: UserProfile;
  scoreResult: ScoreResult | null;
  computing: boolean;
  onComputeScore: () => void;
}

function getZodiacSign(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  void year;
  const value = (month ?? 1) * 100 + (day ?? 1);

  if (value >= 321 && value <= 419) return 'Widder';
  if (value >= 420 && value <= 520) return 'Stier';
  if (value >= 521 && value <= 620) return 'Zwillinge';
  if (value >= 621 && value <= 722) return 'Krebs';
  if (value >= 723 && value <= 822) return 'Loewe';
  if (value >= 823 && value <= 922) return 'Jungfrau';
  if (value >= 923 && value <= 1022) return 'Waage';
  if (value >= 1023 && value <= 1121) return 'Skorpion';
  if (value >= 1122 && value <= 1221) return 'Schuetze';
  if (value >= 1222 || value <= 119) return 'Steinbock';
  if (value >= 120 && value <= 218) return 'Wassermann';
  return 'Fische';
}

function getLifePath(date: string): number {
  const digits = date.replace(/\D/g, '').split('').map(Number);
  let sum = digits.reduce((total, digit) => total + digit, 0);

  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').map(Number).reduce((total, digit) => total + digit, 0);
  }

  return sum;
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2 }}>{label}</span>
        <span style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: TOKENS.b3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            borderRadius: 999,
            background: TOKENS.gold,
            boxShadow: `0 0 12px ${TOKENS.goldGlow}`,
          }}
        />
      </div>
    </div>
  );
}

export function ProfileScoreCard({ profile, scoreResult, computing, onComputeScore }: ProfileScoreCardProps) {
  const zodiac = getZodiacSign(profile.birthDate);
  const lifePath = getLifePath(profile.birthDate);

  return (
    <section
      className="sm-card"
      style={{
        padding: 22,
        display: 'grid',
        gap: 18,
        minHeight: 260,
        borderColor: TOKENS.goldSoft,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Profil und Score
          </div>
          <div style={{ fontFamily: TOKENS.font.serif, fontSize: 24, color: TOKENS.text, marginTop: 4 }}>
            {profile.name}
          </div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 12, color: TOKENS.text2, marginTop: 4 }}>
            Zodiac {zodiac} · Lebensweg {lifePath}
          </div>
        </div>

        <ScoreRing pct={scoreResult?.scoreOverall ?? 0} color="gold" size={78} />
      </div>

      {scoreResult ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <BreakdownBar label="Numerologie" value={scoreResult.breakdown.numerology} />
          <BreakdownBar label="Astrologie" value={scoreResult.breakdown.astrology} />
          <BreakdownBar label="Fusion" value={scoreResult.breakdown.fusion} />
        </div>
      ) : (
        <div style={{ padding: '10px 0', fontFamily: TOKENS.font.body, fontSize: 14, lineHeight: 1.7, color: TOKENS.text2 }}>
          Noch kein berechneter Score sichtbar. Die Karte bleibt bereit und zeigt danach sofort Numerologie, Astrologie und Fusion.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 'auto' }}>
        <button type="button" className="sm-btn sm-btn-gold" onClick={onComputeScore} disabled={computing}>
          {computing ? 'Berechne Score...' : 'Score berechnen'}
        </button>
      </div>
    </section>
  );
}