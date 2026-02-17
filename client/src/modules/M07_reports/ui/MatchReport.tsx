import type { MatchScoreResult } from '../../../shared/types/match';
import { Section } from './Section';
import { ScoreBar } from './ScoreBar';
import { ClaimsList } from './ClaimsList';

function formatWarning(warning: string): string {
  const map: Record<string, string> = {
    astro_unavailable_using_numerology_only: 'Astrologie derzeit nicht verfügbar - Bewertung basiert auf Numerologie.',
    astro_timezone_missing_using_numerology_only: 'Astrologie inaktiv: Zeitzone in den Geburtsdaten fehlt.',
    astro_calc_failed_using_numerology_only: 'Astrologie konnte nicht berechnet werden - Bewertung basiert auf Numerologie.',
    astro_unknown_time_no_houses: 'Astrologie aktiv ohne Häuser (Geburtszeit fehlt bei mindestens einem Profil).',
    narrative_gate_fallback_applied: 'Narrative Qualitäts-Gate aktiv: sichere Fallback-Analyse wurde verwendet.',
    anchors_used_outside_provided: 'Ankerverweise lagen außerhalb der bereitgestellten Faktenbasis.',
  };
  return map[warning] ?? `Hinweis: ${warning}`;
}

function seatLabel(seat: string): string {
  const labels: Record<string, string> = {
    maya: 'Maya',
    luna: 'Luna',
    orion: 'Orion',
    lilith: 'Lilith',
  };
  return labels[seat] ?? seat;
}

interface MatchReportProps {
  match: MatchScoreResult;
}

export function MatchReport({ match }: MatchReportProps) {
  const warnings = Array.isArray(match.meta.warnings) ? match.meta.warnings : [];
  const astrologyActive = match.breakdown.astrology > 0;
  const astroUnknownTime = warnings.includes('astro_unknown_time_no_houses');

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
          <p className="text-xs text-[color:var(--muted-fg)]">
            Astrologie aktiv: <span className="font-semibold text-[color:var(--fg)]">{astrologyActive ? 'Ja' : 'Nein'}</span>
            {astrologyActive && astroUnknownTime && (
              <span> · ohne Häuser (Geburtszeit fehlt)</span>
            )}
          </p>
          <ScoreBar label="Numerologie" value={match.breakdown.numerology} />
          <ScoreBar label="Astrologie" value={match.breakdown.astrology} />
          <ScoreBar label="Fusion" value={match.breakdown.fusion} />
        </div>
      </Section>

      {match.narrative && (
        <Section title="Analyse" subtitle="Narrative Match-Auswertung">
          <div className="flex flex-col gap-3 text-sm text-[color:var(--fg)]">
            {match.narrative.narrative.turns.map((turn, idx) => (
              <p key={`${turn.seat}-${idx}`}>
                <span className="font-semibold">{seatLabel(turn.seat)}:</span> {turn.text}
              </p>
            ))}
            <div>
              <p className="font-semibold mb-1">Nächste Schritte</p>
              <ul className="list-disc pl-5 space-y-1">
                {match.narrative.narrative.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
            <p><span className="font-semibold">Watch out:</span> {match.narrative.narrative.watchOut}</p>
            {!match.narrative.qualityDebug.pass && (
              <p className="text-xs text-[color:var(--muted-fg)]">
                Gate-Hinweis: {match.narrative.qualityDebug.reasons.join(', ')}
              </p>
            )}
          </div>
        </Section>
      )}

      {match.claims.length > 0 && (
        <Section title="Scoring Claims" subtitle={`${match.claims.length} Erkenntnisse`}>
          <ClaimsList claims={match.claims} />
        </Section>
      )}
    </>
  );
}
