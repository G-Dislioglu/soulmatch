import type { MatchScoreResult } from '../../../shared/types/match';
import { Section } from './Section';
import { ScoreBar } from './ScoreBar';
import { ClaimsList } from './ClaimsList';

function formatWarning(warning: string): string {
  const map: Record<string, string> = {
    astro_unavailable_using_numerology_only: 'Astrologie derzeit nicht verfügbar - Bewertung basiert auf Numerologie.',
  };
  return map[warning] ?? `Hinweis: ${warning}`;
}

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
          {match.connectionType && (
            <span className="text-xs uppercase tracking-wide text-[color:var(--muted-fg)]">
              Verbindungstyp: {match.connectionType}
            </span>
          )}
        </div>
      </Section>

      {Array.isArray(match.keyReasons) && match.keyReasons.length > 0 && (
        <Section title="Key Reasons" subtitle="Top 3 Gründe">
          <ul className="list-disc pl-5 text-sm text-[color:var(--fg)] space-y-1">
            {match.keyReasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Section>
      )}

      {Array.isArray(match.meta.warnings) && match.meta.warnings.length > 0 && (
        <Section title="Hinweise" subtitle="Datenqualität & Verfügbarkeit">
          <ul className="list-disc pl-5 text-sm text-[color:var(--muted-fg)] space-y-1">
            {match.meta.warnings.map((warning) => (
              <li key={warning}>{formatWarning(warning)}</li>
            ))}
          </ul>
        </Section>
      )}

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
