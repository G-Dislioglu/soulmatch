import { runMeisterPlan, type BuildPlan } from './opusMeisterPlan.js';
import { orchestrateTask, type OpusTaskResult } from './opusTaskOrchestrator.js';
import { runVordenker, type BuildOrder, type ScoutReport } from './opusVordenker.js';

export interface OpusFeatureInput {
  featureId: string;
  description: string;
  context?: string;
  skipDryRun?: boolean;
  skipDeploy?: boolean;
}

export interface OpusFeatureResult {
  status: 'planned' | 'dry_run' | 'success' | 'partial' | 'failed';
  featureId: string;
  instruction: string;
  buildOrder: BuildOrder;
  scout: ScoutReport;
  plan: BuildPlan;
  scope: string[];
  totalDurationMs: number;
  summary: string;
  preflight?: OpusTaskResult;
  execution?: OpusTaskResult;
}

interface FeatureContext {
  requirements: string[];
  constraints: string[];
  complexity?: string;
}

function parseContext(raw?: string): FeatureContext {
  if (!raw) {
    return { requirements: [], constraints: [], complexity: undefined };
  }

  try {
    const parsed = JSON.parse(raw) as {
      requirements?: unknown;
      constraints?: unknown;
      complexity?: unknown;
    };

    return {
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.filter((value): value is string => typeof value === 'string')
        : [],
      constraints: Array.isArray(parsed.constraints)
        ? parsed.constraints.filter((value): value is string => typeof value === 'string')
        : [],
      complexity: typeof parsed.complexity === 'string' ? parsed.complexity : undefined,
    };
  } catch {
    return {
      requirements: [],
      constraints: [],
      complexity: raw,
    };
  }
}

function buildOrderFromInput(description: string, context: FeatureContext): BuildOrder {
  const estimatedFiles = Math.max(
    1,
    context.requirements.length,
    context.constraints.length > 0 ? 1 : 0,
  );

  return {
    intent: description,
    requirements: context.requirements,
    constraints: context.constraints,
    estimatedFiles,
  };
}

function dedupeScope(plan: BuildPlan, scout: ScoutReport): string[] {
  const seen = new Set<string>();
  const scope: string[] = [];

  for (const file of plan.tasks.map((task) => task.file).concat(scout.relevantFiles.map((file) => file.path))) {
    if (!file || seen.has(file)) {
      continue;
    }
    seen.add(file);
    scope.push(file);
  }

  return scope;
}

function buildExecutionInstruction(buildOrder: BuildOrder, scout: ScoutReport, plan: BuildPlan): string {
  const requirements = buildOrder.requirements.length > 0
    ? buildOrder.requirements.map((item) => `- ${item}`).join('\n')
    : '- No explicit requirements provided';
  const constraints = buildOrder.constraints.length > 0
    ? buildOrder.constraints.map((item) => `- ${item}`).join('\n')
    : '- No explicit constraints provided';
  const patterns = scout.patterns.length > 0
    ? scout.patterns.map((item) => `- ${item}`).join('\n')
    : '- No reuse patterns identified';
  const tasks = plan.tasks.length > 0
    ? plan.tasks.map((task) => `- ${task.file} (${task.worker}): ${task.instruction}`).join('\n')
    : '- No independent subtasks generated; keep the implementation minimal and scoped';

  return `FEATURE INTENT:\n${buildOrder.intent}\n\nREQUIREMENTS:\n${requirements}\n\nCONSTRAINTS:\n${constraints}\n\nREUSE-FIRST PATTERNS:\n${patterns}\n\nMEISTER PLAN:\n${tasks}\n\nRULES:\n- Touch only files that are clearly necessary for this feature\n- Reuse existing patterns and interfaces where possible\n- Keep the implementation minimal and production-safe`;
}

function preflightFailed(result: OpusTaskResult): boolean {
  return result.status === 'failed';
}

export async function orchestrateFeature(input: OpusFeatureInput): Promise<OpusFeatureResult> {
  const start = Date.now();
  const context = parseContext(input.context);
  const buildOrder = buildOrderFromInput(input.description, context);
  const scout = await runVordenker(buildOrder);
  const plan = await runMeisterPlan(buildOrder, scout);
  const scope = dedupeScope(plan, scout);
  const instruction = buildExecutionInstruction(buildOrder, scout, plan);

  let preflight: OpusTaskResult | undefined;

  if (!input.skipDryRun) {
    preflight = await orchestrateTask({
      instruction,
      scope: scope.length > 0 ? scope : undefined,
      dryRun: true,
      skipDeploy: true,
    });

    if (preflightFailed(preflight)) {
      return {
        status: 'failed',
        featureId: input.featureId,
        instruction,
        buildOrder,
        scout,
        plan,
        scope,
        totalDurationMs: Date.now() - start,
        summary: `Preflight failed: ${preflight.summary}`,
        preflight,
      };
    }

    if (input.skipDeploy) {
      return {
        status: 'dry_run',
        featureId: input.featureId,
        instruction,
        buildOrder,
        scout,
        plan,
        scope,
        totalDurationMs: Date.now() - start,
        summary: preflight.summary,
        preflight,
      };
    }
  }

  const execution = await orchestrateTask({
    instruction,
    scope: scope.length > 0 ? scope : undefined,
    skipDeploy: input.skipDeploy,
  });

  return {
    status: execution.status,
    featureId: input.featureId,
    instruction,
    buildOrder,
    scout,
    plan,
    scope,
    totalDurationMs: Date.now() - start,
    summary: execution.summary,
    ...(preflight ? { preflight } : {}),
    execution,
  };
}