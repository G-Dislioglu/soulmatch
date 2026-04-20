/**
 * pushResultWaiter — koordiniert smartPush mit dem GitHub-Actions-Callback.
 *
 * Hintergrund:
 *   smartPush() dispatcht über den internen /push-Endpoint einen GitHub-Actions-Run.
 *   Die reine Dispatch-Akzeptanz (HTTP 204) bedeutet nicht, dass der Commit
 *   tatsächlich auf main gelandet ist. Der Workflow-Run kann später silent
 *   no-op enden (leerer staged diff, tsc/build-Fail, push-conflict).
 *
 *   Dieser Waiter koppelt smartPush an die execution-result-Callbacks, die
 *   der Workflow an /api/builder/tasks/:id/execution-result schickt.
 *
 * Semantik:
 *   - waitForPushResult(taskId, timeoutMs): Promise, resolved wenn ein
 *     terminaler Callback (committed: true | committed: false) für diese
 *     taskId eintrifft, oder nach Timeout.
 *   - signalPushResult(taskId, result): wird vom execution-result-Handler
 *     gerufen, resolved den passenden Waiter (wenn vorhanden).
 *
 * Scope:
 *   In-memory, pro Serverprozess. Beim Serverrestart mitten im Task gibt
 *   es einen Timeout — das ist sicherer als eine False-Positive-Success.
 *
 * Kontext: Teil von F9 (S31 False-Positive Pipeline Path Fix).
 */

export interface PushResult {
  landed: boolean;
  commitHash?: string;
  reason?: string;
}

interface Waiter {
  resolve: (result: PushResult) => void;
  timer: NodeJS.Timeout;
}

const waiters = new Map<string, Waiter>();

/**
 * Warte auf ein terminales Push-Signal für taskId.
 * Resolved mit landed:true bei committed:true, sonst landed:false mit Grund.
 * Ein Timeout zählt ebenfalls als landed:false mit reason: 'timeout_<ms>'.
 */
export function waitForPushResult(
  taskId: string,
  timeoutMs: number,
): Promise<PushResult> {
  return new Promise<PushResult>((resolve) => {
    // Falls bereits ein älterer Waiter für dieselbe taskId existiert,
    // ersetze ihn (sollte im Normalfall nicht passieren).
    const existing = waiters.get(taskId);
    if (existing) {
      clearTimeout(existing.timer);
      waiters.delete(taskId);
      existing.resolve({ landed: false, reason: 'replaced_by_newer_waiter' });
    }

    const timer = setTimeout(() => {
      waiters.delete(taskId);
      resolve({ landed: false, reason: `timeout_${timeoutMs}ms` });
    }, timeoutMs);

    // setTimeout hält den Prozess nicht davon ab, normal zu beenden.
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    waiters.set(taskId, { resolve, timer });
  });
}

/**
 * Terminales Signal aus dem execution-result-Handler.
 * Tut nichts, wenn kein Waiter für diese taskId registriert ist (z.B.
 * weil /push direkt aufgerufen wurde ohne smartPush-Wrapper).
 */
export function signalPushResult(taskId: string, result: PushResult): void {
  const waiter = waiters.get(taskId);
  if (!waiter) return;
  clearTimeout(waiter.timer);
  waiters.delete(taskId);
  waiter.resolve(result);
}

/**
 * Debug-/Observability-Helper.
 */
export function getPendingWaiterCount(): number {
  return waiters.size;
}
