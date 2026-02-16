import type { MatchRequest, MatchScoreResult } from '../../../shared/types/match';
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
      computedAt?: string;
      scoreOverall?: number;
      matchOverall?: number;
      breakdown?: MatchScoreResult['breakdown'];
      connectionType?: string;
      anchorsProvided?: string[];
      keyReasons?: string[];
      claims?: MatchScoreResult['claims'];
      warnings?: string[];
    } | null;

    if (!response.ok || !payload || !payload.breakdown || !Array.isArray(payload.claims)) {
      throw new Error(payload?.error ?? 'Match API request failed');
    }

    return {
      aProfileId: payload.profileA?.id ?? req.aProfileId,
      bProfileId: payload.profileB?.id ?? req.bProfileId,
      meta: {
        engine: payload.engine === 'unified_match' ? 'unified_match' : 'local',
        engineVersion: payload.engineVersion ?? 'v1',
        computedAt: payload.computedAt ?? new Date().toISOString(),
        warnings: payload.warnings,
      },
      matchOverall: payload.matchOverall ?? payload.scoreOverall ?? 0,
      scoreOverall: payload.scoreOverall,
      breakdown: payload.breakdown,
      connectionType: payload.connectionType,
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
