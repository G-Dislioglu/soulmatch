import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderAgentProfiles, builderAssumptions, builderMemory } from '../schema/builder.js';
import { POOL_MODEL_MAP, getActivePools, type PoolConfig } from './poolState.js';
import { getWorkerById } from './workerProfiles.js';

export type TeamAwarenessRole = 'maya' | 'scout' | 'distiller' | 'council' | 'worker';

interface TeamAwarenessPosition {
  stage: string;
  authority: string;
  upstream: string;
  downstream: string;
  duty: string;
}

export interface TeamAwarenessOptions {
  role: TeamAwarenessRole;
  actorId?: string;
  taskGoal?: string;
  scope?: string[];
}

interface TeamAwarenessProfile {
  avgQuality: number;
  taskCount: number;
  successCount: number;
  strengths: unknown;
  weaknesses: unknown;
  fileExperience: unknown;
}

const ROLE_POSITIONS: Record<TeamAwarenessRole, TeamAwarenessPosition> = {
  maya: {
    stage: 'maya_frontdoor',
    authority: 'User-Intent korrekt lesen, Mode waehlen, keine stille Eskalation.',
    upstream: 'User-Nachricht, Builder-Status, Memory-Lage, aktuelle Pools.',
    downstream: 'Task-Vorschlag, direkte Antwort oder Builder-Ausfuehrungspfad.',
    duty: 'Klare Routing- und Erklaerungsentscheidung fuer den naechsten Builder-Schritt.',
  },
  scout: {
    stage: 'scout_research',
    authority: 'Evidence vor Intuition. Keine erfundenen Pfade oder Patterns.',
    upstream: 'Task-Ziel, Scope, Project DNA, Graph, Error Cards.',
    downstream: 'Distiller und Council erwarten harte Hinweise statt Rohmeinungen.',
    duty: 'Relevante Dateien, bestehende Patterns, Risiken und Reuse-Signale sichtbar machen.',
  },
  distiller: {
    stage: 'distiller_briefing',
    authority: 'Scout-Rauschen verdichten und offene Luecken klar markieren.',
    upstream: 'Roh-Scout-Outputs plus relevante Memory-Signale.',
    downstream: 'Council bekommt nur den verdichteten Brief als Arbeitsbasis.',
    duty: 'Harte Fakten, Risiken und den besten Startansatz fuer das Team zusammenziehen.',
  },
  council: {
    stage: 'council_decision',
    authority: 'Architektur- und Umsetzungsrichtung fuer Worker/Decomposer setzen.',
    upstream: 'Destillierter Brief, Builder Memory, Moderator-Fokus.',
    downstream: 'Worker und Meister brauchen klare Aufgaben und begruendete Entscheidungen.',
    duty: 'Dissens sauber austragen, dann einen belastbaren Build-Pfad festlegen.',
  },
  worker: {
    stage: 'worker_execution',
    authority: 'Nur den zugewiesenen Slice loesen, keine stillen Scope-Ausweitungen.',
    upstream: 'Council-Begruendung oder Decomposer-Assignment.',
    downstream: 'Meister, Patch-Validation und Apply-Schicht erwarten exakte, pruefbare Aenderungen.',
    duty: 'Sauberen Patch im eigenen Slice liefern und fuer Downstream lesbar hinterlassen.',
  },
};

const ROLE_RELEVANT_POOLS: Record<TeamAwarenessRole, Array<keyof PoolConfig>> = {
  maya: ['maya', 'council', 'distiller', 'scout', 'worker'],
  scout: ['scout', 'distiller', 'council'],
  distiller: ['distiller', 'scout', 'council'],
  council: ['maya', 'council', 'worker'],
  worker: ['maya', 'council', 'worker'],
};

function hasDatabaseAccess(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function compactText(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function roleLabel(role: TeamAwarenessRole): string {
  switch (role) {
    case 'maya':
      return 'Maya';
    case 'scout':
      return 'Scout';
    case 'distiller':
      return 'Distiller';
    case 'council':
      return 'Council';
    case 'worker':
      return 'Worker';
  }
}

function warnDegraded(section: 'agent profiles' | 'memory lines'): void {
  console.warn(`[team-awareness] ${section} unavailable, using degraded fallback.`);
}

function fallbackSelfLine(actorId: string | undefined, role: TeamAwarenessRole): string {
  if (!actorId) {
    return `Rolle ${roleLabel(role)} ohne expliziten Agenten-Key.`;
  }

  const staticProfile = getWorkerById(actorId);
  if (staticProfile) {
    return `${actorId}: ${staticProfile.role}, Staerken: ${staticProfile.strengths.slice(0, 3).join(', ')}.`;
  }

  const model = POOL_MODEL_MAP[actorId];
  if (model) {
    return `${actorId}: ${model.provider}/${model.model}. Profil noch nicht verdichtet.`;
  }

  return `${actorId}: kein verdichtetes Profil vorhanden.`;
}

function createProfileReader() {
  const cache = new Map<string, TeamAwarenessProfile | null>();
  let dbReadable = hasDatabaseAccess();
  let warned = false;

  return async (agentId: string): Promise<TeamAwarenessProfile | null> => {
    if (!dbReadable) {
      return null;
    }

    if (cache.has(agentId)) {
      return cache.get(agentId) ?? null;
    }

    try {
      const db = getDb();
      const [profile] = await db
        .select({
          avgQuality: builderAgentProfiles.avgQuality,
          taskCount: builderAgentProfiles.taskCount,
          successCount: builderAgentProfiles.successCount,
          strengths: builderAgentProfiles.strengths,
          weaknesses: builderAgentProfiles.weaknesses,
          fileExperience: builderAgentProfiles.fileExperience,
        })
        .from(builderAgentProfiles)
        .where(eq(builderAgentProfiles.agentId, agentId))
        .limit(1);

      const result = profile ?? null;
      cache.set(agentId, result);
      return result;
    } catch (error) {
      dbReadable = false;
      if (!warned) {
        warned = true;
        warnDegraded('agent profiles');
      }
      return null;
    }
  };
}

async function buildSelfLine(
  actorId: string | undefined,
  role: TeamAwarenessRole,
  scope: string[],
  getProfile: (agentId: string) => Promise<TeamAwarenessProfile | null>,
): Promise<string> {
  if (!actorId) {
    return fallbackSelfLine(undefined, role);
  }

  const profile = await getProfile(actorId);
  if (!profile) {
    return fallbackSelfLine(actorId, role);
  }

  const successRate = profile.taskCount > 0
    ? Math.round((profile.successCount / profile.taskCount) * 100)
    : 0;
  const strengths = (profile.strengths ?? []) as string[];
  const weaknesses = (profile.weaknesses ?? []) as string[];
  const fileExperience = (profile.fileExperience ?? {}) as Record<string, { success: number; fail: number; lastUsed: string }>;
  const scopeExperience = scope
    .map((file) => {
      const exp = fileExperience[file];
      if (!exp) return null;
      const total = exp.success + exp.fail;
      return `${file.split('/').pop()}: ${total}x/${exp.success} OK`;
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);

  const parts = [
    `${actorId}: ${profile.avgQuality}/100 avg, ${profile.taskCount} Tasks, ${successRate}% Erfolg.`,
  ];

  if (strengths.length > 0) {
    parts.push(`Staerken: ${strengths.slice(0, 3).join(', ')}.`);
  }
  if (weaknesses.length > 0) {
    parts.push(`Achtung: ${weaknesses.slice(0, 2).join(', ')}.`);
  }
  if (scopeExperience.length > 0) {
    parts.push(`Scope-Erfahrung: ${scopeExperience.join('; ')}.`);
  }

  return compactText(parts.join(' '), 320);
}

async function describePoolMember(
  memberId: string,
  getProfile: (agentId: string) => Promise<TeamAwarenessProfile | null>,
): Promise<string> {
  const profile = await getProfile(memberId);
  if (profile) {
    const strengths = (profile.strengths ?? []) as string[];
    return compactText(
      `${memberId}: ${profile.avgQuality}/100 avg, ${profile.taskCount} Tasks${strengths.length > 0 ? `, ${strengths.slice(0, 2).join(', ')}` : ''}.`,
      180,
    );
  }

  const workerProfile = getWorkerById(memberId);
  if (workerProfile) {
    return compactText(
      `${memberId}: ${workerProfile.role}, ${workerProfile.strengths.slice(0, 2).join(', ')}, Rel ${workerProfile.reliability}/100.`,
      180,
    );
  }

  const model = POOL_MODEL_MAP[memberId];
  if (model) {
    return `${memberId}: ${model.provider}/${model.model}, Profil noch nicht verdichtet.`;
  }

  return `${memberId}: unbekannter Pool-Eintrag.`;
}

async function buildTeamLines(
  role: TeamAwarenessRole,
  getProfile: (agentId: string) => Promise<TeamAwarenessProfile | null>,
  actorId?: string,
): Promise<string[]> {
  const activePools = getActivePools();
  const lines: string[] = [];

  for (const pool of ROLE_RELEVANT_POOLS[role]) {
    const members = activePools[pool].filter((member) => member !== actorId);
    if (members.length === 0) {
      continue;
    }

    const summaries = await Promise.all(
      members.slice(0, 2).map((member) => describePoolMember(member, getProfile)),
    );
    lines.push(`${pool.toUpperCase()}: ${summaries.join(' | ')}`);
  }

  return lines;
}

async function loadMemoryLines(actorId: string | undefined): Promise<string[]> {
  if (!hasDatabaseAccess()) {
    return [];
  }

  try {
    const db = getDb();
    const memoryRows = await db
      .select({
        layer: builderMemory.layer,
        summary: builderMemory.summary,
        worker: builderMemory.worker,
      })
      .from(builderMemory)
      .where(inArray(builderMemory.layer, ['continuity', 'semantic', 'episode', 'worker_profile']))
      .orderBy(desc(builderMemory.updatedAt))
      .limit(12);

    const continuity = memoryRows.find((row) => row.layer === 'continuity');
    const semantic = memoryRows.filter((row) => row.layer === 'semantic').slice(0, 2);
    const workerProfile = actorId
      ? memoryRows.find((row) => row.layer === 'worker_profile' && row.worker === actorId)
      : undefined;
    const recentEpisode = actorId
      ? memoryRows.find((row) => row.layer === 'episode' && row.worker === actorId)
      : memoryRows.find((row) => row.layer === 'episode');

    const assumptionRows = await db
      .select({
        text: builderAssumptions.text,
        hardeningStatus: builderAssumptions.hardeningStatus,
      })
      .from(builderAssumptions)
      .where(and(
        eq(builderAssumptions.reuseAllowed, true),
        eq(builderAssumptions.hardeningStatus, 'accepted'),
      ))
      .orderBy(desc(builderAssumptions.updatedAt))
      .limit(2);

    const lines: string[] = [];

    if (continuity) {
      lines.push(`Continuity: ${compactText(continuity.summary, 180)}`);
    }

    if (semantic.length > 0) {
      lines.push(`Semantic: ${semantic.map((row) => compactText(row.summary, 120)).join(' | ')}`);
    }

    if (workerProfile) {
      lines.push(`Worker-Pattern: ${compactText(workerProfile.summary, 140)}`);
    }

    if (recentEpisode) {
      lines.push(`Letzte Episode: ${compactText(recentEpisode.summary, 140)}`);
    }

    if (assumptionRows.length > 0) {
      lines.push(`Assumptions: ${assumptionRows.map((row) => compactText(row.text, 90)).join(' | ')}`);
    }

    return lines;
  } catch {
    warnDegraded('memory lines');
    return [];
  }
}

export async function buildTeamAwarenessBrief(options: TeamAwarenessOptions): Promise<string> {
  const position = ROLE_POSITIONS[options.role];
  const scope = options.scope ?? [];
  const getProfile = createProfileReader();

  const [selfLine, teamLines, memoryLines] = await Promise.all([
    buildSelfLine(options.actorId, options.role, scope, getProfile),
    buildTeamLines(options.role, getProfile, options.actorId),
    loadMemoryLines(options.actorId),
  ]);

  const sections: string[] = ['=== TEAM-AWARENESS BRIEFING ==='];

  sections.push('SELF');
  sections.push(`- ${selfLine}`);

  sections.push('TEAM');
  if (teamLines.length === 0) {
    sections.push('- Keine relevante Teamlage verfuegbar.');
  } else {
    for (const line of teamLines) {
      sections.push(`- ${line}`);
    }
  }

  sections.push('POSITION');
  sections.push(`- Stage: ${position.stage}`);
  sections.push(`- Auftrag: ${position.duty}`);
  sections.push(`- Upstream: ${position.upstream}`);
  sections.push(`- Downstream: ${position.downstream}`);
  sections.push(`- Entscheidungsvorrang: ${position.authority}`);

  sections.push('MEMORY');
  if (memoryLines.length === 0) {
    sections.push('- Keine relevanten Team-Memory-Signale verfuegbar.');
  } else {
    for (const line of memoryLines) {
      sections.push(`- ${line}`);
    }
  }

  return sections.join('\n');
}
