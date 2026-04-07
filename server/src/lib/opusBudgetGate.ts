/** Tracks per-session budget limits for the Opus Bridge */
interface SessionState {
  tasksUsed: number;
  tokensUsed: number;
  startedAt: Date;
}

const MAX_TASKS_PER_SESSION = 20;
const MAX_TOKENS_PER_SESSION = 100000;

let session: SessionState = {
  tasksUsed: 0,
  tokensUsed: 0,
  startedAt: new Date(),
};

export function getSessionState(): SessionState & {
  tasksRemaining: number;
  tokensRemaining: number;
} {
  return {
    ...session,
    tasksRemaining: MAX_TASKS_PER_SESSION - session.tasksUsed,
    tokensRemaining: MAX_TOKENS_PER_SESSION - session.tokensUsed,
  };
}

export function checkBudget(): { allowed: boolean; reason?: string } {
  if (session.tasksUsed >= MAX_TASKS_PER_SESSION) {
    return { allowed: false, reason: `Task-Limit erreicht (${MAX_TASKS_PER_SESSION})` };
  }
  if (session.tokensUsed >= MAX_TOKENS_PER_SESSION) {
    return { allowed: false, reason: `Token-Limit erreicht (${MAX_TOKENS_PER_SESSION})` };
  }
  return { allowed: true };
}

export function recordTaskUsage(tokens: number): void {
  session.tasksUsed += 1;
  session.tokensUsed += tokens;
}

export function resetSession(): void {
  session = { tasksUsed: 0, tokensUsed: 0, startedAt: new Date() };
}