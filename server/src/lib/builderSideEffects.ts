export type BuilderSideEffectsMode = 'default' | 'none';

export interface BuilderSideEffectsContract {
  mode?: BuilderSideEffectsMode;
  allowSessionLog?: boolean;
  allowRepoIndex?: boolean;
  allowShaBackfill?: boolean;
}

export interface NormalizedBuilderSideEffectsContract {
  mode: BuilderSideEffectsMode;
  allowSessionLog: boolean;
  allowRepoIndex: boolean;
  allowShaBackfill: boolean;
}

export const BUILDER_SIDE_EFFECTS_NONE_MARKER = '[SIDE_EFFECTS_NONE]';

export function normalizeBuilderSideEffects(
  contract?: BuilderSideEffectsContract | null,
): NormalizedBuilderSideEffectsContract {
  if (contract?.mode === 'none') {
    return {
      mode: 'none',
      allowSessionLog: false,
      allowRepoIndex: false,
      allowShaBackfill: false,
    };
  }

  return {
    mode: 'default',
    allowSessionLog: true,
    allowRepoIndex: true,
    allowShaBackfill: true,
  };
}

export function appendBuilderSideEffectsMarker(
  goal: string,
  contract?: BuilderSideEffectsContract | null,
): string {
  const normalized = normalizeBuilderSideEffects(contract);
  if (normalized.mode !== 'none' || goal.includes(BUILDER_SIDE_EFFECTS_NONE_MARKER)) {
    return goal;
  }
  return `${goal} ${BUILDER_SIDE_EFFECTS_NONE_MARKER}`;
}

export function getBuilderSideEffectsFromGoal(goal?: string | null): NormalizedBuilderSideEffectsContract {
  if (typeof goal === 'string' && goal.includes(BUILDER_SIDE_EFFECTS_NONE_MARKER)) {
    return normalizeBuilderSideEffects({ mode: 'none' });
  }
  return normalizeBuilderSideEffects();
}
