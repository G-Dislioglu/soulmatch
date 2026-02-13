import type { ScoreResult } from '../../../shared/types/scoring';
import { Section } from './Section';
import { ScoreBar } from './ScoreBar';
import { ClaimsList } from './ClaimsList';

interface ScoreReportProps {
  score: ScoreResult;
}

export function ScoreReport({ score }: ScoreReportProps) {
  return (
    <>
      <Section title="Gesamtscore">
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-5xl font-bold text-[color:var(--primary)]">
            {score.scoreOverall}
          </span>
          <span className="text-sm text-[color:var(--muted-fg)]">von 100</span>
        </div>
      </Section>

      <Section title="Aufschlüsselung" subtitle="Numerologie · Astrologie · Fusion">
        <div className="flex flex-col gap-3">
          <ScoreBar label="Numerologie" value={score.breakdown.numerology} />
          <ScoreBar label="Astrologie" value={score.breakdown.astrology} />
          <ScoreBar label="Fusion" value={score.breakdown.fusion} />
        </div>
      </Section>

      <Section title="Analyse" subtitle={`${score.claims.length} Erkenntnisse`}>
        <ClaimsList claims={score.claims} />
      </Section>
    </>
  );
}
