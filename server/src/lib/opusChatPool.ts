import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderChatpool } from '../schema/opusBridge.js';

export type ChatPoolPhase = 'scout' | 'distiller' | 'roundtable' | 'chain_decision';

export interface ChatPoolMessageInput {
  taskId: string;
  round: number;
  phase: ChatPoolPhase;
  actor: string;
  model: string;
  content: string;
  commands?: unknown[];
  executionResults?: Record<string, unknown>;
  tokensUsed?: number;
  durationMs?: number;
}

export type ChatPoolMessage = typeof builderChatpool.$inferSelect;

export async function addChatPoolMessage(message: ChatPoolMessageInput): Promise<ChatPoolMessage> {
  const db = getDb();
  const [created] = await db
    .insert(builderChatpool)
    .values({
      taskId: message.taskId,
      round: message.round,
      phase: message.phase,
      actor: message.actor,
      model: message.model,
      content: message.content,
      commands: message.commands ?? [],
      executionResults: message.executionResults ?? {},
      tokensUsed: message.tokensUsed ?? 0,
      durationMs: message.durationMs ?? 0,
    })
    .returning();

  return created;
}

export async function getChatPoolForTask(taskId: string): Promise<ChatPoolMessage[]> {
  const db = getDb();
  return db
    .select()
    .from(builderChatpool)
    .where(eq(builderChatpool.taskId, taskId))
    .orderBy(asc(builderChatpool.round), asc(builderChatpool.createdAt));
}

function formatActorHeading(message: ChatPoolMessage): string {
  // Scout actors (pool-based)
  if (message.actor === 'scout-code') return `[${message.model}] Codebase-Scout:`;
  if (message.actor === 'scout-pattern') return `[${message.model}] Pattern-Scout:`;
  if (message.actor === 'scout-risk') return `[${message.model}] Risiko-Scout:`;
  if (message.actor === 'scout-web') return '[web-search] Web-Scout:';
  if (message.actor === 'graph') return '[graph] Repo-Kontext:';
  if (message.actor === 'scout-error') return '[error] Scout-Fehler:';

  // Distiller actors
  if (message.actor === 'distiller-extract') return `[${message.model}] Fakten-Extrakt:`;
  if (message.actor === 'distiller-reason') return `[${message.model}] Crush-Analyse:`;

  // Legacy fallbacks
  if (message.actor === 'deepseek') return '[deepseek] Codebase-Analyse:';
  if (message.actor === 'gpt-nano') return '[gpt-nano] Pattern-Scan:';
  if (message.actor === 'gemini' && message.phase === 'scout') return '[gemini] Web-Scout:';

  return `[${message.actor}]`;
}

export function formatChatPoolForModel(messages: ChatPoolMessage[]): string {
  if (messages.length === 0) {
    return '';
  }

  const sorted = [...messages].sort((left, right) => {
    if (left.round !== right.round) {
      return left.round - right.round;
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });

  const lines: string[] = [];
  let currentRound: number | null = null;

  for (const message of sorted) {
    if (message.round !== currentRound) {
      if (lines.length > 0) {
        lines.push('');
      }

      const heading = message.round === 0
        ? (message.phase === 'distiller' ? '--- Destillierter Brief (Runde 0) ---' : '--- Scout-Briefing (Runde 0) ---')
        : `--- Roundtable Runde ${message.round} ---`;

      lines.push(heading);
      lines.push('');
      currentRound = message.round;
    }

    lines.push(formatActorHeading(message));
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n').trim();
}

interface MarkerCount {
  count: number;
  actors: string[];
}

function countMarker(messages: ChatPoolMessage[], marker: '@APPROVE' | '@BLOCK', round?: number): MarkerCount {
  const actorSet = new Set<string>();
  let count = 0;

  for (const message of messages) {
    if (typeof round === 'number' && message.round !== round) {
      continue;
    }

    const matches = message.content.match(new RegExp(marker, 'g'));
    if (!matches) {
      continue;
    }

    count += matches.length;
    actorSet.add(message.actor);
  }

  return { count, actors: [...actorSet] };
}

export function countApprovals(messages: ChatPoolMessage[], round?: number): MarkerCount {
  return countMarker(messages, '@APPROVE', round);
}

export function countBlocks(messages: ChatPoolMessage[], round?: number): MarkerCount {
  return countMarker(messages, '@BLOCK', round);
}