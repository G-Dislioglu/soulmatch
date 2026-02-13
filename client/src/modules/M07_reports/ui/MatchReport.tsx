import type { MatchScoreResult } from '../../../shared/types/match';
import { Section } from './Section';
import { ScoreBar } from './ScoreBar';
import { ClaimsList } from './ClaimsList';

interface MatchReportProps {
  match: MatchScoreResult;
}

export function MatchReport({ match }: MatchReportProps) {
  return (
    <>
      <Section title="Match Score">
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-5xl font-bold text-[color:var(--primary)]">
            {match.matchOverall}
          </span>
          <span className="text-sm text-[color:var(--muted-fg)]">von 100</span>
        </div>
      </Section>

      <Section title="Aufschlüsselung" subtitle="Numerologie · Astrologie · Fusion">
        <div className="flex flex-col gap-3">
          <ScoreBar label="Numerologie" value={match.breakdown.numerology} />
          <ScoreBar label="Astrologie" value={match.breakdown.astrology} />
          <ScoreBar label="Fusion" value={match.breakdown.fusion} />
        </div>
      </Section>

      {match.claims.length > 0 && (
        <Section title="Analyse" subtitle={`${match.claims.length} Erkenntnisse`}>
          <ClaimsList claims={match.claims} />
        </Section>
      )}
    </>
  );
}
