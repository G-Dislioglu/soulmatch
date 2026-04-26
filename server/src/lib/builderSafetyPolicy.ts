export type BuilderTaskClass = 'class_1' | 'class_2' | 'class_3';
export type ExecutionPolicy = 'allow_push' | 'dry_run_only' | 'manual_only';

export type BuilderSafetyDecision = {
  taskClass: BuilderTaskClass;
  executionPolicy: ExecutionPolicy;
  pushAllowed: boolean;
  protectedPathsTouched: string[];
  reasons: string[];
};

export type GuardedBuilderPushResult<T> =
  | {
      executed: false;
      decision: BuilderSafetyDecision;
      pushBlockedReason: string;
    }
  | {
      executed: true;
      decision: BuilderSafetyDecision;
      result: T;
    };

type BuilderSafetyInput = {
  instruction?: string;
  scope?: string[];
  targetFile?: string;
  files?: string[];
  dryRun?: boolean;
  allowAutonomousPush?: boolean;
};

const MANUAL_ONLY_RULES = [
  'server/src/lib/opusTaskOrchestrator.ts',
  'server/src/lib/opusSmartPush.ts',
  'server/src/lib/specHardening.ts',
  'server/src/lib/builderFusionChat.ts',
  'server/src/lib/opusBridgeController.ts',
  'server/src/lib/opusBridgeAuth.ts',
  'server/src/lib/builderGithubBridge.ts',
  'server/src/lib/builderGates.ts',
  'tools/wait-for-deploy.sh',
  '.github/workflows/',
  '.env',
  'server/.env',
] as const;

const MANUAL_ONLY_PATTERNS = [
  /^\.env(?:\..+)?$/i,
  /^server\/\.env(?:\..+)?$/i,
  /^\.github\/workflows\//i,
  /^(?:server\/src\/lib|tools|\.github)\/.*(?:auth|token|secret)/i,
  /^(?:server\/src\/lib|tools|\.github)\/.*deploy/i,
] as const;

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map(normalizePath).filter((entry) => entry.length > 0))];
}

function matchesRule(filePath: string, rule: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const normalizedRule = normalizePath(rule);

  return (
    normalizedPath === normalizedRule ||
    normalizedPath.startsWith(`${normalizedRule}/`) ||
    (normalizedRule.endsWith('/') && normalizedPath.startsWith(normalizedRule))
  );
}

function extractInstructionPaths(instruction?: string): string[] {
  if (!instruction) {
    return [];
  }

  const matches = instruction.match(/(?:\.github\/workflows\/[^\s"'`]+|\.env(?:\.[^\s"'`]+)?|(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+)/g) ?? [];
  return uniquePaths(matches);
}

function collectCandidatePaths(input: BuilderSafetyInput): string[] {
  return uniquePaths([
    ...(input.scope ?? []),
    ...(input.files ?? []),
    ...(input.targetFile ? [input.targetFile] : []),
    ...extractInstructionPaths(input.instruction),
  ]);
}

function isProtectedPath(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);
  return MANUAL_ONLY_RULES.some((rule) => matchesRule(normalizedPath, rule))
    || MANUAL_ONLY_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

export function classifyBuilderTask(input: BuilderSafetyInput): BuilderSafetyDecision {
  const candidatePaths = collectCandidatePaths(input);
  const protectedPathsTouched = candidatePaths.filter((path) => isProtectedPath(path));
  const reasons: string[] = [];

  const taskClass: BuilderTaskClass = protectedPathsTouched.length > 0
    ? 'class_3'
    : candidatePaths.length > 1
      ? 'class_2'
      : 'class_1';

  let executionPolicy: ExecutionPolicy = 'allow_push';

  if (protectedPathsTouched.length > 0) {
    executionPolicy = 'manual_only';
    reasons.push(`Protected builder paths require manual review: ${protectedPathsTouched.join(', ')}`);
  }

  if (input.dryRun) {
    if (executionPolicy === 'allow_push') {
      executionPolicy = 'dry_run_only';
    }
    reasons.push('dryRun=true blocks autonomous push.');
  }

  if (taskClass === 'class_2' && executionPolicy === 'allow_push' && input.allowAutonomousPush !== true) {
    executionPolicy = 'dry_run_only';
    reasons.push('Class-2 tasks require explicit allowAutonomousPush=true after external review.');
  }

  if (input.allowAutonomousPush === false) {
    if (executionPolicy === 'allow_push') {
      executionPolicy = 'dry_run_only';
    }
    reasons.push('allowAutonomousPush=false blocks autonomous push.');
  }

  return {
    taskClass,
    executionPolicy,
    pushAllowed: executionPolicy === 'allow_push',
    protectedPathsTouched,
    reasons,
  };
}

export async function guardBuilderPush<T>(
  decision: BuilderSafetyDecision,
  runPush: () => Promise<T> | T,
): Promise<GuardedBuilderPushResult<T>> {
  const pushBlockedReason = decision.reasons[0] ?? 'Autonomous push blocked by builder safety policy.';

  if (!decision.pushAllowed) {
    return {
      executed: false,
      decision,
      pushBlockedReason,
    };
  }

  return {
    executed: true,
    decision,
    result: await runPush(),
  };
}
