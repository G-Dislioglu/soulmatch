import type { AstroAspect, AstroAspectType, MatchAccuracy, MatchScoreResult } from '../../../shared/types/match';
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
    astro_synastry_aspects_active: 'Synastrie-Aspekte aktiv: Planetenkonstellationen beider Profile einbezogen.',
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
  onRequestProfileEdit?: (focusField: 'birthTime' | 'birthLocation') => void;
}

const ASPECT_BODY_DE: Record<string, string> = {
  sun: 'Sonne',
  moon: 'Mond',
  venus: 'Venus',
  mars: 'Mars',
};

const ASPECT_TYPE_DE: Record<string, string> = {
  conjunction: 'Konjunktion',
  opposition: 'Opposition',
  trine: 'Trigon',
  square: 'Quadrat',
  sextile: 'Sextil',
};

const ASPECT_IS_HARMONIC: Record<AstroAspectType, boolean> = {
  conjunction: true,
  opposition: false,
  trine: true,
  square: false,
  sextile: true,
};

function AccuracyCTA({ accuracy, onRequestProfileEdit }: { accuracy: MatchAccuracy; onRequestProfileEdit?: (focusField: 'birthTime' | 'birthLocation') => void }) {
  const showTimezone = !accuracy.astrologyActive && accuracy.missing.includes('birthLocation.timezone');
  const showBirthTime = accuracy.missing.includes('birthTime');
  if (!showTimezone && !showBirthTime) return null;

  return (
    <Section title="Genauigkeit verbessern" subtitle="Mehr Daten = präzisere Analyse">
      <div className="flex flex-col gap-3">
        {showTimezone && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-amber-400">Astrologie inaktiv</span>
              <span className="text-xs text-[color:var(--muted-fg)]">Geburtsort mit Zeitzone hinzufügen für vollständige Astro-Analyse.</span>
            </div>
            {onRequestProfileEdit && (
              <button
                type="button"
                onClick={() => onRequestProfileEdit('birthLocation')}
                className="shrink-0 rounded px-2.5 py-1 text-[11px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
              >
                Geburtsort (Zeitzone) ergänzen
              </button>
            )}
          </div>
        )}
        {showBirthTime && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-sky-400">Genauigkeit: Mittel</span>
              <span className="text-xs text-[color:var(--muted-fg)]">Geburtszeit hinzufügen für Häuser, Aszendent & höhere Präzision.</span>
            </div>
            {onRequestProfileEdit && (
              <button
                type="button"
                onClick={() => onRequestProfileEdit('birthTime')}
                className="shrink-0 rounded px-2.5 py-1 text-[11px] font-medium bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition-colors"
              >
                Zeit ergänzen
              </button>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function AspectRow({ aspect }: { aspect: AstroAspect }) {
  const harmonic = ASPECT_IS_HARMONIC[aspect.aspect];
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[color:var(--fg)]">
        {ASPECT_BODY_DE[aspect.aBody] ?? aspect.aBody} (A)
        {' · '}{ASPECT_TYPE_DE[aspect.aspect] ?? aspect.aspect}{' · '}
        {ASPECT_BODY_DE[aspect.bBody] ?? aspect.bBody} (B)
        {' · '}Orb {aspect.orbDeg.toFixed(1)}°
      </span>
      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
        harmonic
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-amber-500/15 text-amber-400'
      }`}>
        {harmonic ? 'harmonisch' : 'herausfordernd'}
      </span>
    </div>
  );
}

export function MatchReport({ match, onRequestProfileEdit }: MatchReportProps) {
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

      {match.accuracy && (
        <AccuracyCTA accuracy={match.accuracy} onRequestProfileEdit={onRequestProfileEdit} />
      )}

      {Array.isArray(match.astroAspects) && match.astroAspects.length > 0 && (
        <Section title="Top-Aspekte" subtitle="Synastrie · Planetenkonstellationen">
          <div className="flex flex-col gap-2">
            {match.astroAspects.slice(0, 3).map((aspect, idx) => (
              <AspectRow key={`${aspect.aBody}-${aspect.aspect}-${aspect.bBody}-${idx}`} aspect={aspect} />
            ))}
          </div>
        </Section>
      )}

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
