import { and, eq, lt } from 'drizzle-orm';
import { getDb } from '../db.js';
import { addChatPoolMessage, getChatPoolForTask } from './opusChatPool.js';
import { builderOpusLog, builderTasks } from '../schema/builder.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

const STALE_THRESHOLDS = {
  classifying: 5 * 60 * 1000,
  planning: 10 * 60 * 1000,
  scouting: 10 * 60 * 1000,
  scouted: 10 * 60 * 1000,
  swarm: 15 * 60 * 1000,
  consensus: 15 * 60 * 1000,
  no_consensus: 10 * 60 * 1000,
  push_candidate: 10 * 60 * 1000,
  review_needed: 20 * 60 * 1000,
  applying: 10 * 60 * 1000,
} as const;

let staleDetectorStarted = false;
let staleDetectorInterval: NodeJS.Timeout | null = null;
let staleSweepRunning = false;

function formatThresholdMinutes(thresholdMs: number): number {
  return Math.round(thresholdMs / 60000);
}

async function getNextNotificationRound(taskId: string): Promise<number> {
  const chatPool = await getChatPoolForTask(taskId);
  const lastRound = chatPool.reduce((maxRound, message) => Math.max(maxRound, message.round), 0);
  return lastRound + 1;
}

async function notifyMayaAboutStaleTask(task: { id: string; title: string }, previousStatus: string, thresholdMs: number) {
  const round = await getNextNotificationRound(task.id);
  const minutes = formatThresholdMinutes(thresholdMs);

  await addChatPoolMessage({
    taskId: task.id,
    round,
    phase: 'chain_decision',
    actor: 'maya',
    model: 'system',
    content: `Maya-Hinweis: Task wurde automatisch auf blocked gesetzt, weil er laenger als ${minutes} Minuten in ${previousStatus} hing. Bitte Ursache pruefen oder neu anstossen.`,
  });
}

async function blockStaleTasksForStatus(status: keyof typeof STALE_THRESHOLDS): Promise<number> {
  const db = getDb();
  const thresholdMs = STALE_THRESHOLDS[status];
  const cutoff = new Date(Date.now() - thresholdMs);

  const staleTasks = await db
    .select({ id: builderTasks.id, title: builderTasks.title })
    .from(builderTasks)
    .where(
      and(
        eq(builderTasks.status, status),
        lt(builderTasks.updatedAt, cutoff),
      ),
    );

  if (staleTasks.length === 0) {
    return 0;
  }

  let blockedCount = 0;
  for (const task of staleTasks) {
    const blockedAt = new Date();
    const minutes = formatThresholdMinutes(thresholdMs);

    await db
      .update(builderTasks)
      .set({ status: 'blocked', updatedAt: blockedAt })
      .where(eq(builderTasks.id, task.id));

    await db.insert(builderOpusLog).values({
      action: 'stale_blocked',
      taskId: task.id,
      input: {
        previousStatus: status,
        thresholdMinutes: minutes,
        title: task.title,
      },
      output: {
        status: 'blocked',
        reason: 'auto_stale_detection',
        blockedAt: blockedAt.toISOString(),
      },
      tokensUsed: 0,
    });

    await notifyMayaAboutStaleTask(task, status, thresholdMs);

    console.log(
      `[stale-detector] blocked ${task.id.slice(0, 8)} - was ${status} for >${minutes}min: ${task.title.slice(0, 60)}`,
    );
    blockedCount += 1;
  }

  return blockedCount;
}

async function runStaleSweep(): Promise<void> {
  if (staleSweepRunning) {
    console.log('[stale-detector] previous sweep still running, skipping overlapping tick');
    return;
  }

  staleSweepRunning = true;
  try {
    let totalBlocked = 0;
    for (const status of Object.keys(STALE_THRESHOLDS) as Array<keyof typeof STALE_THRESHOLDS>) {
      totalBlocked += await blockStaleTasksForStatus(status);
    }

    if (totalBlocked > 0) {
      console.log(`[stale-detector] ${totalBlocked} stale tasks blocked`);
    }
  } catch (error) {
    console.error('[stale-detector] error:', error);
  } finally {
    staleSweepRunning = false;
  }
}

export function startStaleDetector() {
  if (staleDetectorStarted) {
    return;
  }

  staleDetectorStarted = true;

  if (!process.env.DATABASE_URL) {
    console.warn('[stale-detector] skipped - DATABASE_URL missing');
    return;
  }

  staleDetectorInterval = setInterval(() => {
    void runStaleSweep();
  }, CHECK_INTERVAL_MS);
  staleDetectorInterval.unref?.();

  void runStaleSweep();
  console.log('[stale-detector] started - checking every 5 min');
}

export function stopStaleDetector() {
  if (staleDetectorInterval) {
    clearInterval(staleDetectorInterval);
    staleDetectorInterval = null;
  }
  staleDetectorStarted = false;
}