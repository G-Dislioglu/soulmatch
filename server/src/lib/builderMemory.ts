import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  builderActions,
  builderMemory,
  builderReviews,
  builderTasks,
} from '../schema/builder.js';

type ChatRole = 'user' | 'assistant';

interface WorkingMemoryMessage {
  role: ChatRole;
  content: string;
  timestamp: string;
}

interface EpisodePayload {
  status: string;
  risk: string;
  taskType: string;
  durationMs: number;
  success: boolean;
  leadWorker: string | null;
  workerContributions: Record<string, number>;
  errorType: string | null;
  commitHash: string | null;
}

function toEpisodePayload(value: Record<string, unknown> | null | undefined): EpisodePayload | null {
  if (!value) {
    return null;
  }

  return {
    status: typeof value.status === 'string' ? value.status : 'unknown',
    risk: typeof value.risk === 'string' ? value.risk : 'unknown',
    taskType: typeof value.taskType === 'string' ? value.taskType : 'unknown',
    durationMs: typeof value.durationMs === 'number' ? value.durationMs : 0,
    success: value.success === true,
    leadWorker: typeof value.leadWorker === 'string' ? value.leadWorker : null,
    workerContributions: typeof value.workerContributions === 'object' && value.workerContributions !== null
      ? value.workerContributions as Record<string, number>
      : {},
    errorType: typeof value.errorType === 'string' ? value.errorType : null,
    commitHash: typeof value.commitHash === 'string' ? value.commitHash : null,
  };
}

const workingMemory = {
  activeTaskId: null as string | null,
  recentMessages: [] as WorkingMemoryMessage[],
};

function trimContent(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 240);
}

function pushWorkingMessage(role: ChatRole, content: string) {
  const normalized = trimContent(content);
  if (!normalized) {
    return;
  }

  workingMemory.recentMessages.push({
    role,
    content: normalized,
    timestamp: new Date().toISOString(),
  });
  workingMemory.recentMessages = workingMemory.recentMessages.slice(-10);
}

function normalizeVerdict(verdict: string | null | undefined) {
  const value = (verdict ?? '').toLowerCase();
  if (value === 'ok' || value === 'approve' || value === 'approved' || value === 'pass') {
    return 'ok';
  }
  if (value === 'block' || value === 'reject' || value === 'rejected' || value === 'fail') {
    return 'block';
  }
  return value || 'issue';
}

function extractErrorType(taskStatus: string, actions: Array<typeof builderActions.$inferSelect>) {
  const githubResult = [...actions].reverse().find((action) => action.kind === 'GITHUB_ACTION_RESULT');
  const githubPayload = githubResult?.result as Record<string, unknown> | null | undefined;

  if (githubPayload) {
    if (githubPayload.tsc_ok === false) {
      return 'tsc_failed';
    }
    if (githubPayload.build_ok === false) {
      return 'build_failed';
    }
  }

  const blockResult = [...actions].reverse().find((action) => action.kind === 'BLOCK');
  const blockPayload = blockResult?.result as Record<string, unknown> | null | undefined;
  if (typeof blockPayload?.error === 'string' && blockPayload.error.trim().length > 0) {
    return blockPayload.error.trim().slice(0, 80);
  }

  if (taskStatus === 'review_needed') {
    return 'review_needed';
  }
  if (taskStatus === 'needs_human_review') {
    return 'needs_human_review';
  }
  if (taskStatus === 'blocked') {
    return 'blocked';
  }
  if (taskStatus === 'reverted') {
    return 'reverted';
  }
  if (taskStatus === 'discarded') {
    return 'discarded';
  }

  return null;
}

function buildEpisodeSummary(task: typeof builderTasks.$inferSelect, payload: EpisodePayload) {
  const durationSeconds = Math.max(0, Math.round(payload.durationMs / 1000));
  const lead = payload.leadWorker ? ` ${payload.leadWorker} hat geführt.` : '';
  const error = payload.errorType ? ` Fehlertyp: ${payload.errorType}.` : '';
  return `${task.title} endete als ${payload.status} nach ${durationSeconds}s.${lead}${error}`.trim();
}

async function replaceLayerRows(layer: string, rows: Array<typeof builderMemory.$inferInsert>) {
  const db = getDb();
  try {
    const existing = await db
      .select({ id: builderMemory.id })
      .from(builderMemory)
      .where(eq(builderMemory.layer, layer));

    for (const row of existing) {
      await db.delete(builderMemory).where(eq(builderMemory.id, row.id));
    }

    if (rows.length > 0) {
      await db.insert(builderMemory).values(rows);
    }
  } catch (error) {
    console.error('[builderMemory] replaceLayerRows error:', error);
  }
}

async function refreshSemanticMemory() {
  const db = getDb();
  let episodes: Array<typeof builderMemory.$inferSelect> = [];

  try {
    episodes = await db
      .select()
      .from(builderMemory)
      .where(eq(builderMemory.layer, 'episode'))
      .orderBy(desc(builderMemory.updatedAt));
  } catch (error) {
    console.error('[builderMemory] refreshSemanticMemory read error:', error);
    return;
  }

  const payloads = episodes
    .map((episode) => toEpisodePayload(episode.payload))
    .filter((payload): payload is EpisodePayload => payload !== null);
  const simpleTasks = payloads.filter((payload) => payload.risk === 'low');
  const successfulSimpleTasks = simpleTasks.filter((payload) => payload.success).length;
  const simpleSuccessRate = simpleTasks.length > 0
    ? Math.round((successfulSimpleTasks / simpleTasks.length) * 100)
    : null;

  const errorCounts = new Map<string, number>();
  for (const payload of payloads) {
    if (!payload.errorType) {
      continue;
    }
    errorCounts.set(payload.errorType, (errorCounts.get(payload.errorType) ?? 0) + 1);
  }

  const [topErrorType, topErrorCount] = [...errorCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];

  const rows: Array<typeof builderMemory.$inferInsert> = [];
  if (simpleSuccessRate !== null) {
    rows.push({
      layer: 'semantic',
      key: 'semantic:simple_success_rate',
      summary: `Einfache Tasks haben aktuell eine Erfolgsrate von ${simpleSuccessRate}%.`,
      payload: {
        sampleSize: simpleTasks.length,
        successRate: simpleSuccessRate,
      },
      updatedAt: new Date(),
    });
  }

  if (topErrorType) {
    rows.push({
      layer: 'semantic',
      key: 'semantic:frequent_error',
      summary: `${topErrorType} tritt aktuell am häufigsten auf (${topErrorCount}x gesehen).`,
      payload: {
        errorType: topErrorType,
        seenCount: topErrorCount,
      },
      updatedAt: new Date(),
    });
  }

  await replaceLayerRows('semantic', rows);
}

async function refreshWorkerProfiles() {
  const db = getDb();
  let reviews: Array<typeof builderReviews.$inferSelect> = [];
  let episodes: Array<typeof builderMemory.$inferSelect> = [];

  try {
    [reviews, episodes] = await Promise.all([
      db.select().from(builderReviews),
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'episode')),
    ]);
  } catch (error) {
    console.error('[builderMemory] refreshWorkerProfiles read error:', error);
    return;
  }

  const episodePayloads = episodes
    .map((episode) => toEpisodePayload(episode.payload))
    .filter((payload): payload is EpisodePayload => payload !== null);
  const workers = ['claude', 'chatgpt', 'gemini', 'deepseek'];

  const rows: Array<typeof builderMemory.$inferInsert> = workers.map((worker) => {
    const workerReviews = reviews.filter((review) => review.reviewer === worker);
    const okCount = workerReviews.filter((review) => normalizeVerdict(review.verdict) === 'ok').length;
    const blockCount = workerReviews.filter((review) => normalizeVerdict(review.verdict) === 'block').length;
    const leadCount = episodePayloads.filter((payload) => payload.leadWorker === worker).length;
    const successfulLeadCount = episodePayloads.filter((payload) => payload.leadWorker === worker && payload.success).length;
    const accuracy = workerReviews.length > 0 ? Math.round((okCount / workerReviews.length) * 100) : null;

    return {
      layer: 'worker_profile',
      key: `worker:${worker}`,
      worker,
      summary: `${worker}: approve ${okCount}/${workerReviews.length || 0}, block ${blockCount}/${workerReviews.length || 0}, lead ${leadCount}x.`,
      payload: {
        reviewCount: workerReviews.length,
        okCount,
        blockCount,
        leadCount,
        successfulLeadCount,
        accuracy,
      },
      updatedAt: new Date(),
    };
  });

  await replaceLayerRows('worker_profile', rows);
}

export function rememberBuilderUserMessage(content: string) {
  pushWorkingMessage('user', content);
}

export function rememberBuilderAssistantMessage(content: string) {
  pushWorkingMessage('assistant', content);
}

export function setActiveBuilderTask(taskId: string | null) {
  workingMemory.activeTaskId = taskId;
}

export function rememberBuilderChatHistory(history: Array<{ role: ChatRole; content: string }>) {
  for (const entry of history.slice(-10)) {
    pushWorkingMessage(entry.role, entry.content);
  }
}

export async function buildBuilderMemoryContext(): Promise<string> {
  const db = getDb();
  let episodes: Array<typeof builderMemory.$inferSelect> = [];
  let semanticRows: Array<typeof builderMemory.$inferSelect> = [];
  let workerProfiles: Array<typeof builderMemory.$inferSelect> = [];

  try {
    [episodes, semanticRows, workerProfiles] = await Promise.all([
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'episode')).orderBy(desc(builderMemory.updatedAt)).limit(3),
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'semantic')).orderBy(desc(builderMemory.updatedAt)).limit(3),
      db.select().from(builderMemory).where(eq(builderMemory.layer, 'worker_profile')).orderBy(desc(builderMemory.updatedAt)).limit(4),
    ]);
  } catch (error) {
    console.error('[builderMemory] buildBuilderMemoryContext error:', error);
  }

  const parts: string[] = [];

  if (workingMemory.activeTaskId || workingMemory.recentMessages.length > 0) {
    parts.push('Arbeitsgedaechtnis:');
    if (workingMemory.activeTaskId) {
      parts.push(`- Aktiver Task: ${workingMemory.activeTaskId}`);
    }
    for (const message of workingMemory.recentMessages.slice(-10)) {
      parts.push(`- ${message.role}: ${message.content}`);
    }
  }

  if (episodes.length > 0) {
    parts.push('Episodisches Gedaechtnis:');
    for (const episode of episodes) {
      parts.push(`- ${episode.summary}`);
    }
  }

  if (semanticRows.length > 0) {
    parts.push('Semantisches Gedaechtnis:');
    for (const row of semanticRows) {
      parts.push(`- ${row.summary}`);
    }
  }

  if (workerProfiles.length > 0) {
    parts.push('Worker-Profile:');
    for (const profile of workerProfiles) {
      parts.push(`- ${profile.summary}`);
    }
  }

  return parts.join('\n');
}

export async function syncBuilderMemoryForTask(taskId: string) {
  const db = getDb();
  let task: typeof builderTasks.$inferSelect | undefined;

  try {
    [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));
  } catch (error) {
    console.error('[builderMemory] syncBuilderMemoryForTask task read error:', error);
    return;
  }

  if (!task) {
    return;
  }

  if (!['done', 'blocked', 'review_needed', 'needs_human_review', 'reverted', 'discarded'].includes(task.status)) {
    return;
  }

  let actions: Array<typeof builderActions.$inferSelect> = [];
  let reviews: Array<typeof builderReviews.$inferSelect> = [];

  try {
    [actions, reviews] = await Promise.all([
      db.select().from(builderActions).where(eq(builderActions.taskId, taskId)).orderBy(desc(builderActions.createdAt)),
      db.select().from(builderReviews).where(eq(builderReviews.taskId, taskId)),
    ]);
  } catch (error) {
    console.error('[builderMemory] syncBuilderMemoryForTask detail read error:', error);
    return;
  }

  const workerContributions = actions.reduce<Record<string, number>>((acc, action) => {
    if (action.actor === 'system') {
      return acc;
    }
    acc[action.actor] = (acc[action.actor] ?? 0) + 1;
    return acc;
  }, {});

  for (const review of reviews) {
    workerContributions[review.reviewer] = (workerContributions[review.reviewer] ?? 0) + 1;
  }

  const leadWorker = [...Object.entries(workerContributions)].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const durationMs = Math.max(0, new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime());

  const payload: EpisodePayload = {
    status: task.status,
    risk: task.risk,
    taskType: task.taskType,
    durationMs,
    success: task.status === 'done',
    leadWorker,
    workerContributions,
    errorType: extractErrorType(task.status, actions),
    commitHash: task.commitHash ?? null,
  };

  try {
    const existingEpisodes = await db
      .select({ id: builderMemory.id })
      .from(builderMemory)
      .where(eq(builderMemory.taskId, taskId));

    for (const existing of existingEpisodes) {
      await db.delete(builderMemory).where(eq(builderMemory.id, existing.id));
    }

    await db.insert(builderMemory).values({
      layer: 'episode',
      key: `task:${taskId}`,
      taskId,
      worker: leadWorker,
      summary: buildEpisodeSummary(task, payload),
      payload: payload as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('[builderMemory] syncBuilderMemoryForTask write error:', error);
    return;
  }

  await refreshSemanticMemory();
  await refreshWorkerProfiles();
}

export async function deleteBuilderMemoryForTask(taskId: string) {
  const db = getDb();
  try {
    const existingEpisodes = await db
      .select({ id: builderMemory.id })
      .from(builderMemory)
      .where(eq(builderMemory.taskId, taskId));

    for (const existing of existingEpisodes) {
      await db.delete(builderMemory).where(eq(builderMemory.id, existing.id));
    }
  } catch (error) {
    console.error('[builderMemory] deleteBuilderMemoryForTask error:', error);
    return;
  }

  await refreshSemanticMemory();
  await refreshWorkerProfiles();
}