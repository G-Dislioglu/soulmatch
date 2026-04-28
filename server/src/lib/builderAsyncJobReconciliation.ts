type ReconcileOutcome = {
  changed: boolean;
  result: unknown;
};

type ReconcileInput = {
  committed: boolean;
  commitHash?: string;
  reason?: string;
};

type MutableRecord = Record<string, unknown>;

function isObject(value: unknown): value is MutableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneRecord<T extends MutableRecord>(value: T): T {
  return { ...value };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isPendingPushReason(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return value.includes('timeout') || value.includes('pending');
}

function buildLaterLandedSummary(currentSummary: unknown, commitHash: string): string {
  const prior = asString(currentSummary);
  const suffix = `Later landed on ${commitHash}; inline post-push checks were not rerun.`;
  if (!prior) {
    return `Callback bestaetigte spaeteres Landing auf ${commitHash}. Inline post-push checks wurden in diesem Result nicht erneut ausgefuehrt.`;
  }
  if (prior.includes(suffix) || prior.includes(commitHash)) {
    return prior;
  }
  return `${prior} ${suffix}`;
}

function buildTerminalFailureSummary(currentSummary: unknown, reason: string): string {
  const prior = asString(currentSummary);
  const suffix = `Callback bestaetigte terminalen Push-Fehler: ${reason}.`;
  if (!prior) {
    return suffix;
  }
  if (prior.includes(reason)) {
    return prior;
  }
  return `${prior} ${suffix}`;
}

function reconcilePushPhase(phasesValue: unknown, input: ReconcileInput): { changed: boolean; phases: unknown } {
  if (!Array.isArray(phasesValue)) {
    return { changed: false, phases: phasesValue };
  }

  let changed = false;
  const phases = phasesValue.map((phase) => {
    if (!isObject(phase) || phase.phase !== 'push') {
      return phase;
    }

    const nextPhase = cloneRecord(phase);
    const detail = isObject(phase.detail) ? cloneRecord(phase.detail) : {};

    if (input.committed) {
      if (nextPhase.status !== 'ok') {
        nextPhase.status = 'ok';
        changed = true;
      }
      if (detail.landed !== true) {
        detail.landed = true;
        changed = true;
      }
      if (input.commitHash && detail.verifiedCommit !== input.commitHash) {
        detail.verifiedCommit = input.commitHash;
        changed = true;
      }
      if (isPendingPushReason(detail.error)) {
        delete detail.error;
        changed = true;
      }
    } else {
      if (nextPhase.status !== 'error') {
        nextPhase.status = 'error';
        changed = true;
      }
      if (detail.landed !== false) {
        detail.landed = false;
        changed = true;
      }
      if (input.reason && detail.error !== input.reason) {
        detail.error = input.reason;
        changed = true;
      }
    }

    nextPhase.detail = detail;
    return nextPhase;
  });

  return { changed, phases };
}

export function reconcileAsyncJobResultWithCallback(
  currentResult: unknown,
  input: ReconcileInput,
): ReconcileOutcome {
  if (!isObject(currentResult)) {
    return { changed: false, result: currentResult };
  }

  const nextResult = cloneRecord(currentResult);
  let changed = false;

  if (input.committed) {
    if (nextResult.landed !== true) {
      nextResult.landed = true;
      changed = true;
    }
    if (input.commitHash && nextResult.verifiedCommit !== input.commitHash) {
      nextResult.verifiedCommit = input.commitHash;
      changed = true;
    }
    if (isPendingPushReason(nextResult.pushBlockedReason)) {
      delete nextResult.pushBlockedReason;
      changed = true;
    }

    const nextSummary = buildLaterLandedSummary(nextResult.summary, input.commitHash ?? 'unknown commit');
    if (nextResult.summary !== nextSummary) {
      nextResult.summary = nextSummary;
      changed = true;
    }
  } else {
    if (nextResult.landed !== false) {
      nextResult.landed = false;
      changed = true;
    }
    if (input.reason && nextResult.pushBlockedReason !== input.reason) {
      nextResult.pushBlockedReason = input.reason;
      changed = true;
    }

    const nextSummary = buildTerminalFailureSummary(
      nextResult.summary,
      input.reason ?? 'commit_not_landed',
    );
    if (nextResult.summary !== nextSummary) {
      nextResult.summary = nextSummary;
      changed = true;
    }
  }

  if (nextResult.status !== 'partial') {
    nextResult.status = 'partial';
    changed = true;
  }

  const phasesResult = reconcilePushPhase(nextResult.phases, input);
  if (phasesResult.changed) {
    nextResult.phases = phasesResult.phases;
    changed = true;
  }

  return { changed, result: nextResult };
}
