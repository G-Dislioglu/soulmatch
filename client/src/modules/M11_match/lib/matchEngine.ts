import type { MatchNarrativeResult, MatchRequest, MatchScoreResult } from '../../../shared/types/match';
import { getProfileById } from '../../M03_profile';

export interface MatchEngine {
  compute(req: MatchRequest): Promise<MatchScoreResult>;
}

class LocalMatchEngine implements MatchEngine {
  async compute(req: MatchRequest): Promise<MatchScoreResult> {
    const profileA = getProfileById(req.aProfileId);
    const profileB = getProfileById(req.bProfileId);
    if (!profileA || !profileB) {
      throw new Error('Selected profiles not found');
    }

    const response = await fetch('/api/match/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileA: {
          id: profileA.id,
          name: profileA.name,
          birthDate: profileA.birthDate,
          birthTime: profileA.birthTime,
          birthLocation: profileA.birthLocation,
        },
        profileB: {
          id: profileB.id,
          name: profileB.name,
          birthDate: profileB.birthDate,
          birthTime: profileB.birthTime,
          birthLocation: profileB.birthLocation,
        },
      }),
    });

    const payload = await response.json().catch(() => null) as {
      error?: string;
      profileA?: { id?: string };
      profileB?: { id?: string };
      engine?: string;
      engineVersion?: string;
      scoringEngineVersion?: string;
      computedAt?: string;
      matchOverall?: number;
      breakdown?: MatchScoreResult['breakdown'];
      connectionType?: string;
      astroAspects?: MatchScoreResult['astroAspects'];
      anchorsProvided?: string[];
      keyReasons?: string[];
      claims?: MatchScoreResult['claims'];
      warnings?: string[];
    } | null;

    if (
      !response.ok
      || !payload
      || !payload.breakdown
      || !Array.isArray(payload.claims)
      || typeof payload.matchOverall !== 'number'
    ) {
      throw new Error(payload?.error ?? 'Match API request failed');
    }

    return {
      aProfileId: payload.profileA?.id ?? req.aProfileId,
      bProfileId: payload.profileB?.id ?? req.bProfileId,
      meta: {
        engine: payload.engine === 'unified_match' ? 'unified_match' : 'local',
        engineVersion: payload.engineVersion ?? 'v1',
        scoringEngineVersion: payload.scoringEngineVersion,
        computedAt: payload.computedAt ?? new Date().toISOString(),
        warnings: payload.warnings,
      },
      matchOverall: payload.matchOverall,
      breakdown: payload.breakdown,
      connectionType: payload.connectionType,
      astroAspects: payload.astroAspects,
      anchorsProvided: payload.anchorsProvided,
      keyReasons: payload.keyReasons,
      claims: payload.claims,
    };
  }
}

const defaultEngine = new LocalMatchEngine();

export function computeMatch(req: MatchRequest): Promise<MatchScoreResult> {
  return defaultEngine.compute(req);
}

export async function computeMatchNarrative(input: {
  profileA: { id: string; name: string };
  profileB: { id: string; name: string };
  matchOverall: number;
  connectionType?: string;
  scoringEngineVersion?: string;
  keyReasons?: string[];
  anchorsProvided?: string[];
  anchorsUsed?: string[];
  forceFallback?: boolean;
}): Promise<MatchNarrativeResult> {
  const response = await fetch('/api/match/narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null) as {
    error?: string;
    status?: string;
    narrative?: MatchNarrativeResult['narrative'];
    qualityDebug?: MatchNarrativeResult['qualityDebug'];
    anchorsProvided?: string[];
    anchorsUsed?: string[];
    meta?: MatchNarrativeResult['meta'];
  } | null;

  if (
    !response.ok
    || !payload
    || payload.status !== 'ok'
    || !payload.narrative
    || !payload.qualityDebug
    || !Array.isArray(payload.anchorsProvided)
    || !Array.isArray(payload.anchorsUsed)
    || !payload.meta
  ) {
    throw new Error(payload?.error ?? 'Match narrative API request failed');
  }

  return {
    status: 'ok',
    narrative: payload.narrative,
    qualityDebug: payload.qualityDebug,
    anchorsProvided: payload.anchorsProvided,
    anchorsUsed: payload.anchorsUsed,
    meta: payload.meta,
  };
}
