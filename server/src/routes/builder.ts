// Phase 3: Memory CRUD endpoints added 2026-04-12
import { Router, type Request, type Response } from 'express';
import { and, eq, desc, asc, sql, inArray, ne } from 'drizzle-orm';
import { getDb } from '../db.js';
import {
  asyncJobs,
  builderActions,
  builderArtifacts,
  builderChatpool,
  builderErrorCards,
  builderOpusLog,
  builderReviews,
  builderTasks,
  builderTestResults,
  builderMemory,
  builderWorkerScores,
} from '../schema/builder.js';
import { TASK_TYPE_TO_PROFILE, type TaskType } from '../lib/builderPolicyProfiles.js';
import { readFile, listFiles } from '../lib/builderFileIO.js';
import { getRepoRoot } from '../lib/builderExecutor.js';
import { extractTextContent } from '../lib/builderBdlParser.js';
import { buildTaskAudit, getCanaryPromotionStatus, getCurrentCanaryStage } from '../lib/builderCanary.js';
import {
  buildBuilderTaskContract,
  deriveTaskCreationDefaults,
  presentBuilderTask,
} from '../lib/builderTaskContract.js';
import { buildDirectorContext } from '../lib/directorContext.js';
import { executeDirectorAction, executeDirectorActions, inferReadFileFallbackAction, parseDirectorActions, renderDirectorActionSummary, stripDirectorActions } from '../lib/directorActions.js';
import { handleBuilderChat, looksLikeTaskRequest, type ChatMessage } from '../lib/builderFusionChat.js';
import { reconcileAsyncJobResultWithCallback } from '../lib/builderAsyncJobReconciliation.js';
import { runDialogEngine } from '../lib/builderDialogEngine.js';
import { deleteBuilderMemoryForTask, syncBuilderMemoryForTask } from '../lib/builderMemory.js';
import { getBuilderSideEffectsFromGoal } from '../lib/builderSideEffects.js';
import { signalPushResult } from '../lib/pushResultWaiter.js';
import { buildDirectorSystemPrompt, MAYA_NAVIGATION_GUIDANCE } from '../lib/directorPrompt.js';
import { getPrototypeHtml, promotePrototype } from '../lib/builderPrototypeLane.js';
import { requireDevToken } from '../lib/requireDevToken.js';
import { callProvider, type ProviderMessagePart } from '../lib/providers.js';
import { WORKER_PROFILES, pickWorker } from '../lib/workerProfiles.js';
import { getActivePools, getPoolConfigSnapshot, updatePools, pickFromPool, getVisionCapableModels, getPoolModelCatalogEntry, resolveModelById } from '../lib/poolState.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const router = Router();
const ACCEPTANCE_SMOKE_MARKER = '[ACCEPTANCE_SMOKE]';

async function recordBuilderStatusTransition(input: {
  before: typeof builderTasks.$inferSelect;
  after: typeof builderTasks.$inferSelect;
  lane: string;
  reason: string;
  actor?: string;
  extraPayload?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(builderActions).values({
    taskId: input.after.id,
    lane: input.lane,
    kind: 'STATUS_TRANSITION',
    actor: input.actor ?? 'system',
    payload: {
      fromStatus: input.before.status,
      toStatus: input.after.status,
      reason: input.reason,
      contract: buildBuilderTaskContract(input.after),
      ...(input.extraPayload ?? {}),
    },
    result: {
      status: input.after.status,
      lifecyclePhase: buildBuilderTaskContract(input.after).lifecycle.phase,
    },
    tokenCount: 0,
  });
}

type VisualReviewTaskType =
  | 'ui_review'
  | 'layout_drift'
  | 'ocr_and_label_check'
  | 'frontend_recreation_hint'
  | 'multi_state_review';

type VisualReviewFinding = {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  suggestedFix?: string;
  confidence?: number;
  screenshotRef?: string;
  regionHint?: string;
};

type VisualReviewModelResult = {
  modelId: string;
  provider: string;
  model: string;
  summary: string;
  findings: VisualReviewFinding[];
  raw?: string;
  error?: string | null;
};

type VisualReviewFeedbackVerdict = 'confirmed' | 'mixed' | 'false_positive';

type VisionModelScoreAggregate = {
  modelId: string;
  runs: number;
  findingsEmitted: number;
  feedbackCount: number;
  confirmedCount: number;
  mixedCount: number;
  falsePositiveCount: number;
  avgUsefulness: number | null;
  score: number;
  taskTypes: string[];
};

type VisualCouncilModelResponse = {
  modelId: string;
  provider: string;
  model: string;
  position: string;
  recommendations: string[];
  risks: string[];
  error?: string | null;
  raw?: string;
};

type BrowserScreenshotArtifact = {
  id: string;
  artifactType: string;
  lane: string;
  path: string | null;
  createdAt: Date;
  jsonPayload: Record<string, unknown> | null;
};

function normalizeVisualReviewTaskType(value: unknown): VisualReviewTaskType {
  const allowed: VisualReviewTaskType[] = [
    'ui_review',
    'layout_drift',
    'ocr_and_label_check',
    'frontend_recreation_hint',
    'multi_state_review',
  ];
  return typeof value === 'string' && allowed.includes(value as VisualReviewTaskType)
    ? value as VisualReviewTaskType
    : 'ui_review';
}

function parseJsonObject<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeVisualFindings(value: unknown): VisualReviewFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const findings: VisualReviewFinding[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const severity = typeof record.severity === 'string' ? record.severity : 'medium';
    const finding: VisualReviewFinding = {
      severity: severity === 'critical' || severity === 'high' || severity === 'medium' || severity === 'low'
        ? severity
        : 'medium',
      category: typeof record.category === 'string' ? record.category : 'layout',
      title: typeof record.title === 'string' ? record.title : 'Untitled visual finding',
      description: typeof record.description === 'string' ? record.description : '',
      suggestedFix: typeof record.suggestedFix === 'string' ? record.suggestedFix : undefined,
      confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
      screenshotRef: typeof record.screenshotRef === 'string' ? record.screenshotRef : undefined,
      regionHint: typeof record.regionHint === 'string' ? record.regionHint : undefined,
    };
    if (finding.description.length > 0) {
      findings.push(finding);
    }
  }
  return findings;
}

function toVisualInputParts(
  screenshots: BrowserScreenshotArtifact[],
  taskType: VisualReviewTaskType,
  prompt?: string,
): ProviderMessagePart[] {
  const parts: ProviderMessagePart[] = [
    {
      type: 'text',
      text: [
        `Visual review task type: ${taskType}.`,
        prompt?.trim() ? `Operator request: ${prompt.trim()}` : null,
        'Review the screenshots and return only structured JSON.',
        'Focus on concrete UI/UX issues, layout drift, navigation friction, broken labels, visual noise, and implementation-relevant findings.',
      ].filter(Boolean).join('\n'),
    },
  ];

  screenshots.forEach((artifact, index) => {
    const payload = artifact.jsonPayload ?? {};
    const mimeType = typeof payload.contentType === 'string' ? payload.contentType : 'image/png';
    const data = typeof payload.dataBase64 === 'string' ? payload.dataBase64 : '';
    if (!data) {
      return;
    }
    const route = typeof payload.route === 'string' ? payload.route : 'unknown-route';
    const step = typeof payload.step === 'string' ? payload.step : `screenshot-${index + 1}`;
    parts.push({
      type: 'text',
      text: `Screenshot ${index + 1}: artifactId=${artifact.id}, step=${step}, route=${route}`,
    });
    parts.push({
      type: 'image',
      mediaType: mimeType,
      data,
      detail: 'high',
    });
  });

  return parts;
}

async function runVisualModelReview(input: {
  modelId: string;
  taskType: VisualReviewTaskType;
  screenshots: BrowserScreenshotArtifact[];
  prompt?: string;
}): Promise<VisualReviewModelResult> {
  const catalog = getPoolModelCatalogEntry(input.modelId);
  if (!catalog || catalog.visionCapable !== true) {
    return {
      modelId: input.modelId,
      provider: catalog?.provider ?? 'unknown',
      model: catalog?.model ?? input.modelId,
      summary: 'Model is not available as a vision-capable Builder model.',
      findings: [],
      error: 'model_not_vision_capable',
    };
  }

  const screenshots = catalog.supportsMultiImage === false ? input.screenshots.slice(0, 1) : input.screenshots;
  const system = [
    'You are a strict frontend and UI/UX visual reviewer.',
    'You analyze screenshots, not implementation code directly.',
    'Return only valid JSON with this shape:',
    '{"summary":"string","findings":[{"severity":"critical|high|medium|low","category":"layout|navigation|copy|consistency|accessibility|visual_noise|operator_confusion|implementation_hint","title":"string","description":"string","suggestedFix":"string","confidence":0.0,"screenshotRef":"artifact id","regionHint":"optional"}]}',
    'Do not wrap the JSON in markdown.',
    'Do not invent hidden code facts. Stay grounded in the screenshots.',
  ].join('\n');

  const response = await callProvider(catalog.provider, catalog.model, {
    system,
    messages: [{ role: 'user', content: toVisualInputParts(screenshots, input.taskType, input.prompt) }],
    maxTokens: 4000,
    temperature: 0.2,
  });

  const parsed = parseJsonObject<{ summary?: unknown; findings?: unknown }>(response);
  if (!parsed) {
    return {
      modelId: catalog.id,
      provider: catalog.provider,
      model: catalog.model,
      summary: 'Model returned non-JSON visual review output.',
      findings: [],
      raw: response,
      error: 'invalid_json',
    };
  }

  return {
    modelId: catalog.id,
    provider: catalog.provider,
    model: catalog.model,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    findings: normalizeVisualFindings(parsed.findings),
    raw: response,
    error: null,
  };
}

async function synthesizeVisualReviewWithMaya(input: {
  taskType: VisualReviewTaskType;
  taskTitle: string;
  modelResults: VisualReviewModelResult[];
  prompt?: string;
}): Promise<{ modelId: string; provider: string; model: string; summary: string }> {
  const fallback = resolveModelById('glm51') ?? { id: 'glm51', provider: 'zhipu', model: 'glm-5.1' };
  const mayaModel = pickFromPool('maya', true) ?? fallback;

  const system = [
    'You are Maya, the Builder orchestrator.',
    'Synthesize the visual review findings into a concise recommendation.',
    'Prioritize operator clarity, UI correctness, and next implementation steps.',
    'Answer in plain text, not JSON.',
  ].join('\n');

  const findingsDigest = input.modelResults.map((result) => ({
    modelId: result.modelId,
    summary: result.summary,
    findings: result.findings,
    error: result.error,
  }));

  const summary = await callProvider(mayaModel.provider, mayaModel.model, {
    system,
    messages: [{
      role: 'user',
      content: [
        `Task: ${input.taskTitle}`,
        `Visual review type: ${input.taskType}`,
        input.prompt?.trim() ? `Operator request: ${input.prompt.trim()}` : null,
        'Model findings:',
        JSON.stringify(findingsDigest, null, 2),
      ].filter(Boolean).join('\n\n'),
    }],
    maxTokens: 1800,
    temperature: 0.3,
    forceJsonObject: false,
  });

  return {
    modelId: mayaModel.id,
    provider: mayaModel.provider,
    model: mayaModel.model,
    summary,
  };
}

async function computeVisionScoreAggregates(): Promise<VisionModelScoreAggregate[]> {
  const db = getDb();
  const artifacts = await db
    .select({
      id: builderArtifacts.id,
      taskId: builderArtifacts.taskId,
      artifactType: builderArtifacts.artifactType,
      jsonPayload: builderArtifacts.jsonPayload,
      createdAt: builderArtifacts.createdAt,
    })
    .from(builderArtifacts)
    .where(and(
      eq(builderArtifacts.lane, 'visual'),
      inArray(builderArtifacts.artifactType, ['visual_review_report', 'visual_review_feedback']),
    ))
    .orderBy(desc(builderArtifacts.createdAt));

  const aggregates = new Map<string, {
    modelId: string;
    runs: number;
    findingsEmitted: number;
    feedbackCount: number;
    confirmedCount: number;
    mixedCount: number;
    falsePositiveCount: number;
    usefulnessTotal: number;
    usefulnessCount: number;
    taskTypes: Set<string>;
  }>();

  const latestFeedbackByReportModel = new Map<string, { verdict: VisualReviewFeedbackVerdict; usefulness: number | null }>();

  for (const artifact of artifacts) {
    const payload = artifact.jsonPayload as Record<string, unknown> | null;
    if (!payload) {
      continue;
    }

    if (artifact.artifactType === 'visual_review_feedback') {
      const reportArtifactId = typeof payload.reportArtifactId === 'string' ? payload.reportArtifactId : null;
      const modelId = typeof payload.modelId === 'string' ? payload.modelId : null;
      const verdict = payload.verdict === 'confirmed' || payload.verdict === 'mixed' || payload.verdict === 'false_positive'
        ? payload.verdict
        : null;
      const usefulness = typeof payload.usefulness === 'number' ? payload.usefulness : null;
      if (reportArtifactId && modelId && verdict) {
        const key = `${reportArtifactId}:${modelId}`;
        if (!latestFeedbackByReportModel.has(key)) {
          latestFeedbackByReportModel.set(key, { verdict, usefulness });
        }
      }
    }
  }

  for (const artifact of artifacts) {
    if (artifact.artifactType !== 'visual_review_report') {
      continue;
    }
    const payload = artifact.jsonPayload as Record<string, unknown> | null;
    if (!payload) {
      continue;
    }
    const taskType = typeof payload.taskType === 'string' ? payload.taskType : 'ui_review';
    const modelResults = Array.isArray(payload.modelResults) ? payload.modelResults : [];
    for (const result of modelResults) {
      if (!result || typeof result !== 'object') {
        continue;
      }
      const record = result as Record<string, unknown>;
      const modelId = typeof record.modelId === 'string' ? record.modelId : null;
      const findings = Array.isArray(record.findings) ? record.findings : [];
      if (!modelId) {
        continue;
      }
      const aggregate = aggregates.get(modelId) ?? {
        modelId,
        runs: 0,
        findingsEmitted: 0,
        feedbackCount: 0,
        confirmedCount: 0,
        mixedCount: 0,
        falsePositiveCount: 0,
        usefulnessTotal: 0,
        usefulnessCount: 0,
        taskTypes: new Set<string>(),
      };
      aggregate.runs += 1;
      aggregate.findingsEmitted += findings.length;
      aggregate.taskTypes.add(taskType);

      const feedback = latestFeedbackByReportModel.get(`${artifact.id}:${modelId}`);
      if (feedback) {
        aggregate.feedbackCount += 1;
        if (feedback.verdict === 'confirmed') aggregate.confirmedCount += 1;
        if (feedback.verdict === 'mixed') aggregate.mixedCount += 1;
        if (feedback.verdict === 'false_positive') aggregate.falsePositiveCount += 1;
        if (typeof feedback.usefulness === 'number') {
          aggregate.usefulnessTotal += feedback.usefulness;
          aggregate.usefulnessCount += 1;
        }
      }

      aggregates.set(modelId, aggregate);
    }
  }

  return Array.from(aggregates.values()).map((aggregate) => {
    const avgUsefulness = aggregate.usefulnessCount > 0 ? aggregate.usefulnessTotal / aggregate.usefulnessCount : null;
    const precisionProxy = aggregate.feedbackCount > 0
      ? (aggregate.confirmedCount + aggregate.mixedCount * 0.5) / aggregate.feedbackCount
      : 0.5;
    const usefulnessNorm = avgUsefulness !== null ? Math.max(0, Math.min(1, avgUsefulness / 5)) : 0.5;
    const score = Number((precisionProxy * 0.7 + usefulnessNorm * 0.3).toFixed(3));
    return {
      modelId: aggregate.modelId,
      runs: aggregate.runs,
      findingsEmitted: aggregate.findingsEmitted,
      feedbackCount: aggregate.feedbackCount,
      confirmedCount: aggregate.confirmedCount,
      mixedCount: aggregate.mixedCount,
      falsePositiveCount: aggregate.falsePositiveCount,
      avgUsefulness: avgUsefulness !== null ? Number(avgUsefulness.toFixed(2)) : null,
      score,
      taskTypes: Array.from(aggregate.taskTypes.values()),
    } satisfies VisionModelScoreAggregate;
  }).sort((a, b) => b.score - a.score || b.runs - a.runs || a.modelId.localeCompare(b.modelId));
}

function pickVisionModelsForTask(
  taskType: VisualReviewTaskType,
  scores: VisionModelScoreAggregate[],
  requestedLimit: unknown,
) {
  const limit = typeof requestedLimit === 'number' && Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(8, Math.round(requestedLimit)))
    : 3;
  const scoreMap = new Map(scores.map((entry) => [entry.modelId, entry]));

  return getVisionCapableModels()
    .map((model) => {
      const score = scoreMap.get(model.id);
      const roleMatch = model.recommendedVisualRoles?.includes(taskType) ? 0.12 : 0;
      const feedbackWeight = score ? Math.min(0.2, score.feedbackCount * 0.025) : 0;
      const baseQuality = model.quality / 100;
      const learned = score ? score.score : 0.5;
      const compositeScore = Number((learned * 0.55 + baseQuality * 0.25 + roleMatch + feedbackWeight).toFixed(3));
      return {
        id: model.id,
        label: model.label,
        provider: model.provider,
        model: model.model,
        quality: model.quality,
        score: score?.score ?? null,
        runs: score?.runs ?? 0,
        feedbackCount: score?.feedbackCount ?? 0,
        compositeScore,
        reason: score
          ? `Score ${score.score.toFixed(2)}, ${score.runs} Runs, ${score.feedbackCount} Feedbacks`
          : `Cold start, quality ${model.quality}`,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore || b.quality - a.quality || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function normalizeCouncilList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0))];
}

async function runVisualCouncilMember(input: {
  modelId: string;
  taskTitle: string;
  reportPayload: Record<string, unknown>;
  operatorPrompt?: string;
}): Promise<VisualCouncilModelResponse> {
  const catalog = getPoolModelCatalogEntry(input.modelId);
  if (!catalog) {
    return {
      modelId: input.modelId,
      provider: 'unknown',
      model: input.modelId,
      position: 'Council model is not available in the Builder model catalog.',
      recommendations: [],
      risks: ['missing_model_catalog_entry'],
      error: 'missing_model_catalog_entry',
    };
  }

  const system = [
    'You are a Builder Council member reviewing visual review outputs.',
    'You do not see the screenshots directly in this step. You reason over the structured vision findings and Maya synthesis.',
    'Return only valid JSON with this shape:',
    '{"position":"string","recommendations":["string"],"risks":["string"]}',
    'Be direct. Disagree with the vision reports if the evidence is weak or contradictory.',
  ].join('\n');

  const response = await callProvider(catalog.provider, catalog.model, {
    system,
    messages: [{
      role: 'user',
      content: [
        `Task: ${input.taskTitle}`,
        input.operatorPrompt?.trim() ? `Operator request: ${input.operatorPrompt.trim()}` : null,
        'Visual review report payload:',
        JSON.stringify(input.reportPayload, null, 2),
      ].filter(Boolean).join('\n\n'),
    }],
    maxTokens: 2200,
    temperature: 0.35,
  });

  const parsed = parseJsonObject<{ position?: unknown; recommendations?: unknown; risks?: unknown }>(response);
  return {
    modelId: catalog.id,
    provider: catalog.provider,
    model: catalog.model,
    position: typeof parsed?.position === 'string' ? parsed.position : 'Council member returned non-JSON or incomplete output.',
    recommendations: Array.isArray(parsed?.recommendations)
      ? parsed.recommendations.filter((entry): entry is string => typeof entry === 'string')
      : [],
    risks: Array.isArray(parsed?.risks)
      ? parsed.risks.filter((entry): entry is string => typeof entry === 'string')
      : [],
    error: parsed ? null : 'invalid_json',
    raw: response,
  };
}

async function synthesizeVisualCouncilWithMaya(input: {
  taskTitle: string;
  visualReportPayload: Record<string, unknown>;
  councilResults: VisualCouncilModelResponse[];
  operatorPrompt?: string;
}) {
  const fallback = resolveModelById('glm51') ?? { id: 'glm51', provider: 'zhipu', model: 'glm-5.1' };
  const mayaModel = pickFromPool('maya', true) ?? fallback;
  const system = [
    'You are Maya, moderating a Builder Council discussion after a visual review.',
    'Use the vision findings and the Council positions to decide the next practical UI/UX step.',
    'Answer in plain text with a short decision, ranked priorities, and the next action.',
  ].join('\n');

  const summary = await callProvider(mayaModel.provider, mayaModel.model, {
    system,
    messages: [{
      role: 'user',
      content: [
        `Task: ${input.taskTitle}`,
        input.operatorPrompt?.trim() ? `Operator request: ${input.operatorPrompt.trim()}` : null,
        'Visual report:',
        JSON.stringify(input.visualReportPayload, null, 2),
        'Council results:',
        JSON.stringify(input.councilResults, null, 2),
      ].filter(Boolean).join('\n\n'),
    }],
    maxTokens: 1800,
    temperature: 0.25,
    forceJsonObject: false,
  });

  return {
    modelId: mayaModel.id,
    provider: mayaModel.provider,
    model: mayaModel.model,
    summary,
  };
}

function getLocalOpusBridgeUrl(endpoint: string): string {
  const port = process.env.PORT || 10000;
  const token = process.env.OPUS_BRIDGE_SECRET || '';
  const sep = endpoint.includes('?') ? '&' : '?';
  return `http://localhost:${port}/api/builder/opus-bridge${endpoint}${sep}opus_token=${encodeURIComponent(token)}`;
}

async function proxyOpusBridgeRequest<T = unknown>(
  endpoint: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; result: T | { status: number } }> {
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) {
    return {
      ok: false,
      status: 500,
      result: { status: 500 },
    };
  }

  const response = await fetch(getLocalOpusBridgeUrl(endpoint), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({ status: response.status }));
  return {
    ok: response.ok,
    status: response.status,
    result: result as T | { status: number },
  };
}

// GET /api/builder/preview/:taskId â€” prototype preview without dev token
router.get('/preview/:taskId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select({ id: builderTasks.id })
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.taskId))
      .limit(1);

    if (!task) {
      res.status(404).send('Task not found');
      return;
    }

    const html = await getPrototypeHtml(req.params.taskId);
    if (!html) {
      res.status(404).send('No preview available');
      return;
    }

    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[builder] GET /preview/:taskId error:', err);
    res.status(500).send('Preview error');
  }
});

router.use(requireDevToken);

router.get('/render/status', async (_req: Request, res: Response) => {
  try {
    const proxied = await proxyOpusBridgeRequest('/render/status');
    res.status(proxied.status).json(proxied.result);
  } catch (err) {
    console.error('[builder] GET /render/status error:', err);
    res.status(500).json({ error: 'Render status proxy failed' });
  }
});

router.get('/render/service', async (_req: Request, res: Response) => {
  try {
    const proxied = await proxyOpusBridgeRequest('/render/service');
    res.status(proxied.status).json(proxied.result);
  } catch (err) {
    console.error('[builder] GET /render/service error:', err);
    res.status(500).json({ error: 'Render service proxy failed' });
  }
});

router.get('/render/env', async (_req: Request, res: Response) => {
  try {
    const proxied = await proxyOpusBridgeRequest('/render/env');
    res.status(proxied.status).json(proxied.result);
  } catch (err) {
    console.error('[builder] GET /render/env error:', err);
    res.status(500).json({ error: 'Render env proxy failed' });
  }
});

router.get('/render/logs/build', async (req: Request, res: Response) => {
  try {
    const rawLimit = typeof req.query.limit === 'string' ? req.query.limit : '50';
    const proxied = await proxyOpusBridgeRequest(`/render/logs/build?limit=${encodeURIComponent(rawLimit)}`);
    res.status(proxied.status).json(proxied.result);
  } catch (err) {
    console.error('[builder] GET /render/logs/build error:', err);
    res.status(500).json({ error: 'Render build logs proxy failed' });
  }
});

router.post('/render/redeploy', async (req: Request, res: Response) => {
  try {
    const { clearCache, commitId } = req.body as { clearCache?: boolean; commitId?: string };
    const proxied = await proxyOpusBridgeRequest('/render/redeploy', {
      method: 'POST',
      body: JSON.stringify({ clearCache, commitId }),
    });
    res.status(proxied.status).json(proxied.result);
  } catch (err) {
    console.error('[builder] POST /render/redeploy error:', err);
    res.status(500).json({ error: 'Render redeploy proxy failed' });
  }
});

// POST /api/builder/chat â€” natural language chat with Gemini
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

        const userId = req.body?.userId ?? (req as any).user?.id ?? (req as any).session?.userId ?? undefined;
    const response = await handleBuilderChat(message, history ?? [], userId);
    res.json(response);
  } catch (err) {
    console.error('[builder] POST /chat error:', err);
    res.status(500).json({ error: 'Chat error' });
  }
});

// GET /api/builder/canary â€” current canary config and promotion status
router.get('/canary', async (_req: Request, res: Response) => {
  try {
    const current = getCurrentCanaryStage();
    const promotion = await getCanaryPromotionStatus();
    res.json({
      currentStage: current.stage,
      config: current.config,
      manualPromotion: current.manualPromotion,
      envVar: current.envVar,
      promotion,
    });
  } catch (err) {
    console.error('[builder] GET /canary error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/files â€” list repo files or a subdirectory
router.get('/files', async (req: Request, res: Response) => {
  try {
    const repoRoot = getRepoRoot();
    const subPath = typeof req.query.path === 'string' ? req.query.path : undefined;
    const files = await listFiles(repoRoot, subPath);
    res.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to list files';
    const status = message.includes('blocked') || message.includes('scope') ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

// GET /api/builder/files/* â€” read a repo file as text
router.get('/files/*', async (req: Request, res: Response) => {
  try {
    const repoRoot = getRepoRoot();
    const relativePath = req.params[0] ?? '';
    const file = await readFile(repoRoot, relativePath);
    res.json(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to read file';
    const status = message.includes('ENOENT')
      ? 404
      : message.includes('blocked') || message.includes('scope')
        ? 403
        : 500;
    res.status(status).json({ error: message });
  }
});

// GET /api/builder/tasks â€” list all tasks, optional ?status= filter
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

    const tasks = statusFilter
      ? await db
          .select()
          .from(builderTasks)
          .where(eq(builderTasks.status, statusFilter))
          .orderBy(desc(builderTasks.createdAt))
          .limit(50)
      : await db
          .select()
          .from(builderTasks)
          .orderBy(desc(builderTasks.createdAt))
          .limit(50);

    res.json(tasks.map((task) => presentBuilderTask(task)));
  } catch (err) {
    console.error('[builder] GET /tasks error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks â€” create a new task
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { title, goal, risk, taskType, intentKind, requestedOutputKind, requestedOutputFormat } = req.body as {
      title: string;
      goal: string;
      risk?: string;
      taskType: string;
      intentKind?: string;
      requestedOutputKind?: string;
      requestedOutputFormat?: string;
    };

    if (!title || !goal || !taskType) {
      res.status(400).json({ error: 'title, goal and taskType are required' });
      return;
    }

    const policyProfile = TASK_TYPE_TO_PROFILE[taskType as TaskType] ?? null;
    const creationDefaults = deriveTaskCreationDefaults({
      title,
      goal,
      taskType,
      risk: risk ?? 'low',
      intentKind,
      requestedOutputKind,
      requestedOutputFormat,
    });

    const db = getDb();
    const [created] = await db
      .insert(builderTasks)
      .values({
        title,
        goal,
        risk: risk ?? 'low',
        taskType,
        intentKind: creationDefaults.intentKind,
        requestedOutputKind: creationDefaults.requestedOutputKind,
        requestedOutputFormat: creationDefaults.requestedOutputFormat,
        requiredLanes: creationDefaults.requiredLanes,
        policyProfile,
      })
      .returning();

    res.status(201).json(presentBuilderTask(created));
  } catch (err) {
    console.error('[builder] POST /tasks error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id â€” task by ID
router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(presentBuilderTask(task));
  } catch (err) {
    console.error('[builder] GET /tasks/:id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/builder/tasks/:id â€” cascade delete task and all related records
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const taskId = req.params.id;
    const [task] = await db.select().from(builderTasks).where(eq(builderTasks.id, taskId));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Cascade: delete all child records first
    await db.delete(builderChatpool).where(eq(builderChatpool.taskId, taskId));
    await db.delete(builderActions).where(eq(builderActions.taskId, taskId));
    await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, taskId));
    await db.delete(builderTestResults).where(eq(builderTestResults.taskId, taskId));
    await db.delete(builderReviews).where(eq(builderReviews.taskId, taskId));
    await db.delete(builderWorkerScores).where(eq(builderWorkerScores.taskId, taskId));
    await db.delete(builderOpusLog).where(eq(builderOpusLog.taskId, taskId));
    await db.update(builderErrorCards).set({ sourceTaskId: null }).where(eq(builderErrorCards.sourceTaskId, taskId));
    await deleteBuilderMemoryForTask(taskId);
    await db.delete(builderTasks).where(eq(builderTasks.id, taskId));

    res.json({ deleted: true, taskId });
  } catch (err) {
    console.error('[builder] DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Delete failed: ' + String(err) });
  }
});

// POST /api/builder/tasks/:id/run â€” set status to classifying
router.post('/tasks/:id/run', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'queued') {
      res.status(409).json({ error: 'Task is not queued' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'classifying', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await recordBuilderStatusTransition({
      before: task,
      after: updated,
      lane: 'code',
      reason: 'manual_run_requested',
    });

    void runDialogEngine(req.params.id).catch((error) => {
      console.error('[builder] dialog engine error:', error);
    });

    res.status(202).json({ taskId: updated.id, status: 'classifying' });
  } catch (err) {
    console.error('[builder] POST /tasks/:id/run error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id/dialog â€” raw or text-only dialog history
router.get('/tasks/:id/dialog', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const actions = await db
      .select()
      .from(builderActions)
      .where(eq(builderActions.taskId, req.params.id))
      .orderBy(asc(builderActions.createdAt));

    const format = req.query.format === 'text' ? 'text' : 'dsl';
    if (format !== 'text') {
      res.json(actions);
      return;
    }

    const textActions = actions.map((action) => {
      const payload = action.payload as Record<string, unknown> | null;
      const rawResponse = typeof payload?.rawResponse === 'string' ? payload.rawResponse : '';

      return {
        ...action,
        text: extractTextContent(rawResponse),
      };
    });

    res.json(textActions);
  } catch (err) {
    console.error('[builder] GET /tasks/:id/dialog error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id/evidence â€” latest evidence pack
router.get('/tasks/:id/evidence', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [artifact] = await db
      .select()
      .from(builderArtifacts)
      .where(and(
        eq(builderArtifacts.taskId, req.params.id),
        eq(builderArtifacts.artifactType, 'evidence_pack'),
      ))
      .orderBy(desc(builderArtifacts.createdAt))
      .limit(1);

    if (!artifact) {
      res.status(404).json({ error: 'Evidence pack not found' });
      return;
    }

    res.json(artifact.jsonPayload);
  } catch (err) {
    console.error('[builder] GET /tasks/:id/evidence error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id/artifacts â€” recent stored artifacts except evidence packs
router.get('/tasks/:id/artifacts', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const artifacts = await db
      .select({
        id: builderArtifacts.id,
        taskId: builderArtifacts.taskId,
        artifactType: builderArtifacts.artifactType,
        lane: builderArtifacts.lane,
        path: builderArtifacts.path,
        jsonPayload: builderArtifacts.jsonPayload,
        createdAt: builderArtifacts.createdAt,
      })
      .from(builderArtifacts)
      .where(and(
        eq(builderArtifacts.taskId, req.params.id),
        ne(builderArtifacts.artifactType, 'evidence_pack'),
      ))
      .orderBy(desc(builderArtifacts.createdAt))
      .limit(24);

    res.json(artifacts);
  } catch (err) {
    console.error('[builder] GET /tasks/:id/artifacts error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/builder/tasks/:id/audit â€” canary audit summary for a task
router.post('/visual-perception/run', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { taskId, artifactIds, modelIds, taskType, prompt } = req.body as {
      taskId?: string;
      artifactIds?: string[];
      modelIds?: string[];
      taskType?: string;
      prompt?: string;
    };

    if (!taskId) {
      res.status(400).json({ error: 'taskId is required' });
      return;
    }

    const selectedModelIds = Array.isArray(modelIds)
      ? [...new Set(modelIds.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))]
      : [];
    if (selectedModelIds.length === 0) {
      res.status(400).json({ error: 'modelIds is required' });
      return;
    }

    const invalidModelIds = selectedModelIds.filter((id) => getPoolModelCatalogEntry(id)?.visionCapable !== true);
    if (invalidModelIds.length > 0) {
      res.status(400).json({ error: `Non-vision models selected: ${invalidModelIds.join(', ')}` });
      return;
    }

    const [task] = await db
      .select({ id: builderTasks.id, title: builderTasks.title })
      .from(builderTasks)
      .where(eq(builderTasks.id, taskId))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const requestedArtifactIds = Array.isArray(artifactIds)
      ? [...new Set(artifactIds.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))]
      : [];

    const screenshots = await db
      .select({
        id: builderArtifacts.id,
        artifactType: builderArtifacts.artifactType,
        lane: builderArtifacts.lane,
        path: builderArtifacts.path,
        createdAt: builderArtifacts.createdAt,
        jsonPayload: builderArtifacts.jsonPayload,
      })
      .from(builderArtifacts)
      .where(and(
        eq(builderArtifacts.taskId, taskId),
        eq(builderArtifacts.artifactType, 'browser_screenshot'),
        requestedArtifactIds.length > 0 ? inArray(builderArtifacts.id, requestedArtifactIds) : sql`true`,
      ))
      .orderBy(desc(builderArtifacts.createdAt))
      .limit(requestedArtifactIds.length > 0 ? Math.max(requestedArtifactIds.length, 1) : 3) as BrowserScreenshotArtifact[];

    if (screenshots.length === 0) {
      res.status(404).json({ error: 'No browser screenshot artifacts found for task' });
      return;
    }

    const normalizedTaskType = normalizeVisualReviewTaskType(taskType);
    const modelResults = await Promise.all(selectedModelIds.map((id) =>
      runVisualModelReview({
        modelId: id,
        taskType: normalizedTaskType,
        screenshots,
        prompt,
      }),
    ));

    const mayaSynthesis = await synthesizeVisualReviewWithMaya({
      taskType: normalizedTaskType,
      taskTitle: task.title,
      modelResults,
      prompt,
    });

    const [stored] = await db.insert(builderArtifacts).values({
      taskId,
      artifactType: 'visual_review_report',
      lane: 'visual',
      path: null,
      jsonPayload: {
        taskType: normalizedTaskType,
        prompt: prompt?.trim() || null,
        modelIds: selectedModelIds,
        screenshotArtifactIds: screenshots.map((artifact) => artifact.id),
        modelResults,
        mayaSynthesis,
      },
    }).returning({ id: builderArtifacts.id });

    await db.insert(builderActions).values({
      taskId,
      lane: 'visual',
      kind: 'VISUAL_REVIEW_RUN',
      actor: 'maya',
      payload: {
        taskType: normalizedTaskType,
        modelIds: selectedModelIds,
        screenshotArtifactIds: screenshots.map((artifact) => artifact.id),
      },
      result: {
        reportArtifactId: stored?.id ?? null,
        mayaSummary: mayaSynthesis.summary,
        findingsPerModel: modelResults.map((entry) => ({ modelId: entry.modelId, count: entry.findings.length, error: entry.error ?? null })),
      },
      tokenCount: 0,
    });

    res.json({
      success: true,
      taskId,
      reportArtifactId: stored?.id ?? null,
      taskType: normalizedTaskType,
      screenshotArtifactIds: screenshots.map((artifact) => artifact.id),
      modelResults,
      mayaSynthesis,
    });
  } catch (err) {
    console.error('[builder] POST /visual-perception/run error:', err);
    res.status(500).json({ error: 'Visual perception run failed' });
  }
});

router.post('/visual-perception/auto-pick', async (req: Request, res: Response) => {
  try {
    const { taskType, limit } = req.body as { taskType?: string; limit?: number };
    const normalizedTaskType = normalizeVisualReviewTaskType(taskType);
    const scores = await computeVisionScoreAggregates();
    const selected = pickVisionModelsForTask(normalizedTaskType, scores, limit);

    res.json({
      success: true,
      taskType: normalizedTaskType,
      modelIds: selected.map((entry) => entry.id),
      selected,
      scores,
    });
  } catch (err) {
    console.error('[builder] POST /visual-perception/auto-pick error:', err);
    res.status(500).json({ error: 'Vision auto-pick failed' });
  }
});

router.post('/visual-perception/reports/:artifactId/council', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { councilModelIds, prompt, confirmed } = req.body as {
      councilModelIds?: string[];
      prompt?: string;
      confirmed?: boolean;
    };

    const [report] = await db
      .select({
        id: builderArtifacts.id,
        taskId: builderArtifacts.taskId,
        artifactType: builderArtifacts.artifactType,
        jsonPayload: builderArtifacts.jsonPayload,
      })
      .from(builderArtifacts)
      .where(eq(builderArtifacts.id, req.params.artifactId))
      .limit(1);

    if (!report || report.artifactType !== 'visual_review_report') {
      res.status(404).json({ error: 'Visual review report not found' });
      return;
    }

    if (!report.taskId) {
      res.status(400).json({ error: 'Visual review report is not attached to a task' });
      return;
    }

    const [task] = await db
      .select({ id: builderTasks.id, title: builderTasks.title })
      .from(builderTasks)
      .where(eq(builderTasks.id, report.taskId))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found for visual review report' });
      return;
    }

    const requestedCouncilIds = normalizeCouncilList(councilModelIds);
    const activeCouncilIds = getActivePools().council;
    const fallbackCouncilIds = ['opus', 'sonnet', 'gpt-5.5'];
    const selectedCouncilIds = (requestedCouncilIds.length > 0 ? requestedCouncilIds : activeCouncilIds.length > 0 ? activeCouncilIds : fallbackCouncilIds)
      .filter((id) => Boolean(getPoolModelCatalogEntry(id)))
      .slice(0, 5);

    if (selectedCouncilIds.length === 0) {
      res.status(400).json({ error: 'No valid council models available' });
      return;
    }

    if (confirmed !== true) {
      res.status(409).json({
        success: false,
        needsConfirmation: true,
        risk: 'provider_cost',
        message: 'Visual Council calls multiple providers. Re-submit with confirmed:true to start the model round.',
        reportArtifactId: report.id,
        councilModelIds: selectedCouncilIds,
        modelCount: selectedCouncilIds.length,
      });
      return;
    }

    const visualReportPayload = report.jsonPayload as Record<string, unknown> | null;
    if (!visualReportPayload) {
      res.status(400).json({ error: 'Visual review report has no payload' });
      return;
    }

    const councilResults = await Promise.all(selectedCouncilIds.map((modelId) =>
      runVisualCouncilMember({
        modelId,
        taskTitle: task.title,
        reportPayload: visualReportPayload,
        operatorPrompt: prompt,
      }),
    ));
    const mayaSynthesis = await synthesizeVisualCouncilWithMaya({
      taskTitle: task.title,
      visualReportPayload,
      councilResults,
      operatorPrompt: prompt,
    });

    const [stored] = await db.insert(builderArtifacts).values({
      taskId: task.id,
      artifactType: 'visual_council_debate',
      lane: 'visual',
      path: null,
      jsonPayload: {
        reportArtifactId: report.id,
        prompt: typeof prompt === 'string' && prompt.trim().length > 0 ? prompt.trim() : null,
        councilModelIds: selectedCouncilIds,
        councilResults,
        mayaSynthesis,
      },
    }).returning({ id: builderArtifacts.id });

    await db.insert(builderActions).values({
      taskId: task.id,
      lane: 'visual',
      kind: 'VISUAL_COUNCIL_ESCALATION',
      actor: 'maya',
      payload: {
        reportArtifactId: report.id,
        councilModelIds: selectedCouncilIds,
      },
      result: {
        debateArtifactId: stored?.id ?? null,
        mayaSummary: mayaSynthesis.summary,
      },
      tokenCount: 0,
    });

    res.json({
      success: true,
      taskId: task.id,
      reportArtifactId: report.id,
      debateArtifactId: stored?.id ?? null,
      councilResults,
      mayaSynthesis,
    });
  } catch (err) {
    console.error('[builder] POST /visual-perception/reports/:artifactId/council error:', err);
    res.status(500).json({ error: 'Visual council escalation failed' });
  }
});

router.post('/visual-perception/reports/:artifactId/feedback', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { modelId, verdict, usefulness, notes } = req.body as {
      modelId?: string;
      verdict?: VisualReviewFeedbackVerdict;
      usefulness?: number;
      notes?: string;
    };

    if (!modelId || (verdict !== 'confirmed' && verdict !== 'mixed' && verdict !== 'false_positive')) {
      res.status(400).json({ error: 'modelId and valid verdict are required' });
      return;
    }

    const [report] = await db
      .select({
        id: builderArtifacts.id,
        taskId: builderArtifacts.taskId,
        artifactType: builderArtifacts.artifactType,
        jsonPayload: builderArtifacts.jsonPayload,
      })
      .from(builderArtifacts)
      .where(eq(builderArtifacts.id, req.params.artifactId))
      .limit(1);

    if (!report || report.artifactType !== 'visual_review_report') {
      res.status(404).json({ error: 'Visual review report not found' });
      return;
    }

    const payload = report.jsonPayload as Record<string, unknown> | null;
    const modelResults = Array.isArray(payload?.modelResults) ? payload.modelResults : [];
    const hasModel = modelResults.some((result) => result && typeof result === 'object' && (result as Record<string, unknown>).modelId === modelId);
    if (!hasModel) {
      res.status(400).json({ error: 'modelId not part of report' });
      return;
    }

    const clampedUsefulness = typeof usefulness === 'number'
      ? Math.max(1, Math.min(5, Math.round(usefulness)))
      : verdict === 'confirmed'
        ? 5
        : verdict === 'mixed'
          ? 3
          : 1;

    const [stored] = await db.insert(builderArtifacts).values({
      taskId: report.taskId,
      artifactType: 'visual_review_feedback',
      lane: 'visual',
      path: null,
      jsonPayload: {
        reportArtifactId: report.id,
        modelId,
        verdict,
        usefulness: clampedUsefulness,
        notes: typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null,
      },
    }).returning({ id: builderArtifacts.id });

    res.json({
      success: true,
      feedbackArtifactId: stored?.id ?? null,
      reportArtifactId: report.id,
      modelId,
      verdict,
      usefulness: clampedUsefulness,
    });
  } catch (err) {
    console.error('[builder] POST /visual-perception/reports/:artifactId/feedback error:', err);
    res.status(500).json({ error: 'Visual review feedback failed' });
  }
});

router.get('/tasks/:id/audit', async (req: Request, res: Response) => {
  try {
    const audit = await buildTaskAudit(req.params.id);

    if (!audit) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(audit);
  } catch (err) {
    console.error('[builder] GET /tasks/:id/audit error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/approve â€” set status to done, store commitHash
router.post('/tasks/:id/approve', async (req: Request, res: Response) => {
  try {
    const { commitHash } = req.body as { commitHash?: string };

    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status === 'prototype_review') {
      res.status(409).json({ error: 'Use approve-prototype for prototype_review tasks' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'done', commitHash: commitHash ?? null, updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await recordBuilderStatusTransition({
      before: task,
      after: updated,
      lane: 'review',
      reason: 'human_approved',
      extraPayload: { commitHash: commitHash ?? null },
    });

    await syncBuilderMemoryForTask(req.params.id);

    res.json(presentBuilderTask(updated));
  } catch (err) {
    console.error('[builder] POST /tasks/:id/approve error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/approve-prototype â€” promote preview and continue code lane
router.post('/tasks/:id/approve-prototype', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'prototype_review') {
      res.status(409).json({ error: 'Task is not waiting for prototype review' });
      return;
    }

    const { approved, exclude } = req.body as { approved?: string[]; exclude?: string[] };
    const result = await promotePrototype(req.params.id, approved ?? [], exclude ?? []);

    if (!result.promoted) {
      res.status(400).json({ error: result.notes });
      return;
    }

    const [updatedTask] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (updatedTask) {
      await recordBuilderStatusTransition({
        before: task,
        after: updatedTask,
        lane: 'prototype',
        reason: 'prototype_promoted',
        extraPayload: { approved: approved ?? [], exclude: exclude ?? [] },
      });
    }

    void runDialogEngine(req.params.id).catch((error) => {
      console.error('[builder] engine error:', error);
    });

    res.status(202).json(result);
  } catch (err) {
    console.error('[builder] POST /tasks/:id/approve-prototype error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/revise-prototype â€” send task back to prototype lane
router.post('/tasks/:id/revise-prototype', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body as { notes?: string };
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'prototype_review') {
      res.status(409).json({ error: 'Task is not waiting for prototype review' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'prototyping', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await recordBuilderStatusTransition({
      before: task,
      after: updated,
      lane: 'prototype',
      reason: 'prototype_revision_requested',
      extraPayload: { notes: notes ?? 'Revision requested' },
    });

    void runDialogEngine(req.params.id).catch((error) => {
      console.error('[builder] engine error:', error);
    });

    res.status(202).json({ status: 'prototyping', notes: notes ?? 'Revision requested' });
  } catch (err) {
    console.error('[builder] POST /tasks/:id/revise-prototype error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/discard â€” discard a prototype under review
router.post('/tasks/:id/discard', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'prototype_review') {
      res.status(409).json({ error: 'Use revert for non-prototype tasks' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'discarded', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await recordBuilderStatusTransition({
      before: task,
      after: updated,
      lane: 'prototype',
      reason: 'prototype_discarded',
    });

    await syncBuilderMemoryForTask(req.params.id);

    res.json(presentBuilderTask(updated));
  } catch (err) {
    console.error('[builder] POST /tasks/:id/discard error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/revert â€” set status to reverted
router.post('/tasks/:id/revert', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [task] = await db
      .select()
      .from(builderTasks)
      .where(eq(builderTasks.id, req.params.id))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status === 'prototype_review') {
      res.status(409).json({ error: 'Use discard for prototype_review tasks' });
      return;
    }

    const [updated] = await db
      .update(builderTasks)
      .set({ status: 'reverted', updatedAt: new Date() })
      .where(eq(builderTasks.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await recordBuilderStatusTransition({
      before: task,
      after: updated,
      lane: 'review',
      reason: 'human_reverted',
    });

    await syncBuilderMemoryForTask(req.params.id);

    res.json(presentBuilderTask(updated));
  } catch (err) {
    console.error('[builder] POST /tasks/:id/revert error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/builder/tasks/:id â€” delete a task and its related data
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const taskId = req.params.id;
    const [task] = await db
      .select({ id: builderTasks.id })
      .from(builderTasks)
      .where(eq(builderTasks.id, taskId));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await deleteBuilderMemoryForTask(taskId);
    await db.delete(builderArtifacts).where(eq(builderArtifacts.taskId, taskId));
    await db.delete(builderActions).where(eq(builderActions.taskId, taskId));
    await db.delete(builderTestResults).where(eq(builderTestResults.taskId, taskId));
    await db.delete(builderReviews).where(eq(builderReviews.taskId, taskId));
    await db.delete(builderTasks).where(eq(builderTasks.id, taskId));

    res.json({ deleted: true, taskId });
  } catch (err) {
    console.error('[builder] DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/builder/tasks/:id/execution-result â€” GitHub Actions callback
router.post('/tasks/:id/execution-result', requireDevToken, async (req: Request, res: Response) => {
  try {
    const { tsc, build, diff, run_id, run_url, commit_hash, committed, reason } = req.body;
    const db = getDb();
    const taskId = req.params.id;
    const [taskMeta] = await db
      .select({ goal: builderTasks.goal, sourceAsyncJobId: builderTasks.sourceAsyncJobId })
      .from(builderTasks)
      .where(eq(builderTasks.id, taskId))
      .limit(1);
    const isAcceptanceSmokeTask = typeof taskMeta?.goal === 'string' && taskMeta.goal.includes(ACCEPTANCE_SMOKE_MARKER);
    const taskSideEffects = getBuilderSideEffectsFromGoal(taskMeta?.goal);

    await db.insert(builderActions).values({
      taskId,
      lane: 'code',
      kind: 'GITHUB_ACTION_RESULT',
      actor: 'system',
      payload: { tsc, build, diff, run_id, run_url, reason },
      result: {
        tsc_ok: tsc === 'true',
        build_ok: build === 'true',
        committed: committed === true,
        commit_hash: commit_hash || null,
        reason: typeof reason === 'string' ? reason : null,
      },
      tokenCount: 0,
    });

    if (committed === true && commit_hash) {
      // Terminaler Erfolgs-Callback: Commit liegt auf main.
      await db
        .update(builderTasks)
        .set({
          status: 'done',
          commitHash: commit_hash,
          updatedAt: new Date(),
        })
        .where(eq(builderTasks.id, taskId));
      await syncBuilderMemoryForTask(taskId);
      if (!isAcceptanceSmokeTask && taskSideEffects.allowRepoIndex) {
        const { regenerateRepoIndex } = await import('../lib/opusIndexGenerator.js');
        await regenerateRepoIndex({ mode: taskSideEffects.mode }).catch((regenErr) => {
          console.error('[builder] index refresh after commit callback failed:', regenErr);
        });
      }
      if (taskMeta?.sourceAsyncJobId) {
        const [asyncJob] = await db
          .select({ result: asyncJobs.result })
          .from(asyncJobs)
          .where(eq(asyncJobs.id, taskMeta.sourceAsyncJobId))
          .limit(1);
        const reconciled = reconcileAsyncJobResultWithCallback(asyncJob?.result, {
          committed: true,
          commitHash: commit_hash,
        });
        if (reconciled.changed) {
          await db
            .update(asyncJobs)
            .set({ result: reconciled.result, updatedAt: new Date() })
            .where(eq(asyncJobs.id, taskMeta.sourceAsyncJobId));
        }
      }
      signalPushResult(taskId, { landed: true, commitHash: commit_hash });
    } else if (committed === false) {
      // Terminaler Fehler-Callback aus dem Workflow (empty_staged_diff,
      // checks_failed, push_conflict_after_3_retries). Der Workflow-Exit
      // kann trotzdem 0 sein (Legacy-Pfad); fÃ¼r die Bridge-Semantik
      // zÃ¤hlt allein dieses Signal.
      await db
        .update(builderTasks)
        .set({ status: 'review_needed', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));
      await syncBuilderMemoryForTask(taskId);
      if (taskMeta?.sourceAsyncJobId) {
        const [asyncJob] = await db
          .select({ result: asyncJobs.result })
          .from(asyncJobs)
          .where(eq(asyncJobs.id, taskMeta.sourceAsyncJobId))
          .limit(1);
        const reconciled = reconcileAsyncJobResultWithCallback(asyncJob?.result, {
          committed: false,
          reason: typeof reason === 'string' && reason.length > 0 ? reason : 'commit_not_landed',
        });
        if (reconciled.changed) {
          await db
            .update(asyncJobs)
            .set({ result: reconciled.result, updatedAt: new Date() })
            .where(eq(asyncJobs.id, taskMeta.sourceAsyncJobId));
        }
      }
      signalPushResult(taskId, {
        landed: false,
        reason: typeof reason === 'string' && reason.length > 0 ? reason : 'commit_not_landed',
      });
    } else if (tsc === 'true' && build === 'true') {
      // Erster Callback nach erfolgreichem Build, Push steht noch aus.
      // Kein Signal â€” der zweite Callback mit committed:true|false folgt.
      await db
        .update(builderTasks)
        .set({
          status: 'push_candidate',
          updatedAt: new Date(),
        })
        .where(eq(builderTasks.id, taskId));
    } else if (tsc || build) {
      // Erster Callback, aber tsc oder build sind nicht 'true' (leer
      // bedeutet Step davor ist gescheitert, z.B. REPLACE_FAILED im
      // Apply-Step). Der zweite Callback mit committed:false folgt und
      // signalisiert dann den konkreten Grund.
      await db
        .update(builderTasks)
        .set({ status: 'review_needed', updatedAt: new Date() })
        .where(eq(builderTasks.id, taskId));
      await syncBuilderMemoryForTask(taskId);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[builder] POST /tasks/:id/execution-result error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAYA COMMAND CENTER â€” Phase 1 Endpoints
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/builder/maya/context â€” aggregated dashboard snapshot
router.get('/maya/context', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const [tasks, episodes, continuity, workerStats] = await Promise.all([
      // Active tasks (last 10, newest first)
      db.select({
        id: builderTasks.id,
        title: builderTasks.title,
        status: builderTasks.status,
        risk: builderTasks.risk,
        taskType: builderTasks.taskType,
        updatedAt: builderTasks.updatedAt,
      }).from(builderTasks).orderBy(desc(builderTasks.updatedAt)).limit(10),

      // Recent memory episodes (last 5)
      db.select({
        id: builderMemory.id,
        key: builderMemory.key,
        summary: builderMemory.summary,
        updatedAt: builderMemory.updatedAt,
      }).from(builderMemory)
        .where(eq(builderMemory.layer, 'episode'))
        .orderBy(desc(builderMemory.updatedAt))
        .limit(5),

      // Latest continuity notes (last 3)
      db.select({
        id: builderMemory.id,
        key: builderMemory.key,
        summary: builderMemory.summary,
        updatedAt: builderMemory.updatedAt,
      }).from(builderMemory)
        .where(eq(builderMemory.layer, 'continuity'))
        .orderBy(desc(builderMemory.updatedAt))
        .limit(3),

      // Worker stats (raw SQL for aggregation)
      db.execute(sql`
        SELECT worker,
          ROUND(AVG(quality)) as avg_quality,
          COUNT(*) as task_count
        FROM builder_worker_scores
        GROUP BY worker
        ORDER BY avg_quality DESC
        LIMIT 8
      `).catch(() => ({ rows: [] })),
    ]);

    res.json({
      tasks,
      memory: { episodes },
      continuityNotes: continuity,
      workerStats: workerStats.rows,
      poolConfig: getPoolConfigSnapshot(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[maya] GET /maya/context error:', err);
    res.status(500).json({ error: 'Context aggregation failed' });
  }
});

// POST /api/builder/maya/chat â€” Maya command center chat
router.post('/maya/director', async (req: Request, res: Response) => {
  try {
    const { message, directorModel, thinking = false, conversationHistory = [] } = req.body as {
      message?: string;
      directorModel?: 'opus' | 'gpt5.4' | 'gpt5.5' | 'glm5.1';
      thinking?: boolean;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: 'message required' });
      return;
    }

    if (directorModel !== 'opus' && directorModel !== 'gpt5.4' && directorModel !== 'gpt5.5' && directorModel !== 'glm5.1') {
      res.status(400).json({ error: 'directorModel must be opus, gpt5.5 or glm5.1' });
      return;
    }

    const context = await buildDirectorContext();
    const systemPrompt = buildDirectorSystemPrompt(context, thinking ? 'deep' : 'fast');
    const providerConfig = (() => {
      switch (directorModel) {
        case 'opus':
          return {
            provider: 'anthropic',
            model: 'claude-opus-4-7',
            maxTokens: 100000,
            anthropicThinking: thinking ? { type: 'enabled' as const, budget_tokens: 50000 } : undefined,
          };
        case 'gpt5.4':
        case 'gpt5.5':
          return {
            provider: 'openai',
            model: 'gpt-5.5',
            maxTokens: 100000,
            reasoning: thinking,
          };
        case 'glm5.1':
          return {
            provider: 'openrouter',
            model: 'z-ai/glm-5.1',
            maxTokens: 100000,
            reasoning: { enabled: thinking },
          };
      }
    })();

    const messages = conversationHistory
      .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant') && typeof entry.content === 'string')
      .slice(-16)
      .map((entry) => ({ role: entry.role, content: entry.content }));

    const response = await callProvider(providerConfig.provider, providerConfig.model, {
      system: systemPrompt,
      messages: [...messages, { role: 'user', content: message }],
      maxTokens: providerConfig.maxTokens,
      temperature: 0.3,
      forceJsonObject: false,
      reasoning: 'reasoning' in providerConfig ? providerConfig.reasoning : undefined,
      anthropicThinking: 'anthropicThinking' in providerConfig ? providerConfig.anthropicThinking : undefined,
    });

    const actions = parseDirectorActions(response);
    const fallbackAction = inferReadFileFallbackAction(message, response, actions);
    const actionResults = actions.length > 0
      ? await executeDirectorActions(actions)
      : fallbackAction
        ? [await executeDirectorAction(fallbackAction)]
        : [];
    const visibleResponse = stripDirectorActions(response);
    const finalResponse = visibleResponse.trim() || (actionResults.length > 0 ? 'Maya-Aktionen ausgefuehrt.' : 'Maya ohne sichtbare Antwort.');

    try {
      const db = getDb();
      const messageSnippet = message.trim().replace(/\s+/g, ' ').slice(0, 100);
      const actionSummary = actionResults.length > 0
        ? actionResults.map((result) => `${result.tool}:${result.ok ? 'ok' : 'fail'}`).join(', ')
        : 'keine';
      const responseSnippet = finalResponse.replace(/\s+/g, ' ').slice(0, 200);

      await db.insert(builderMemory).values({
        layer: 'continuity',
        key: `maya-brain-${Date.now()}`,
        summary: `[${directorModel}/${thinking ? 'deep' : 'fast'}] User: "${messageSnippet}" -> Actions: ${actionSummary} -> Ergebnis: ${responseSnippet}`,
        payload: {
          source: 'maya-director',
          directorModel,
          thinking,
          actionResults,
          message: message.slice(0, 500),
          response: finalResponse.slice(0, 1000),
        },
      });
    } catch (memoryError) {
      console.warn('[maya] director continuity write failed:', memoryError);
    }

    res.json({
      response: finalResponse,
      model: `maya-brain-${directorModel}-${thinking ? 'deep' : 'fast'}`,
      contextUsed: {
        tasksLoaded: context.recentTasks.length,
        hasContinuity: context.continuityNote !== 'Keine Continuity Note vorhanden.',
      },
      actions: actionResults,
    });
  } catch (err) {
    console.error('[maya] POST /maya/director error:', err);
    res.status(500).json({ error: 'Director failed: ' + String(err) });
  }
});

// POST /api/builder/maya/chat â€” Maya command center chat
router.post('/maya/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], file } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      file?: { data: string; mime: string; name: string };
    };

    if (!message) {
      res.status(400).json({ error: 'message required' });
      return;
    }

    const userId = req.body?.userId ?? (req as any).user?.id ?? (req as any).session?.userId ?? undefined;
    const mappedHistory: ChatMessage[] = history.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    if (!file && looksLikeTaskRequest(message)) {
      const routed = await handleBuilderChat(message, mappedHistory, userId);
      const taskContextUsed = { tasksLoaded: 0, hasContinuity: false };

      if (routed.type === 'task_created' || routed.type === 'task_action' || routed.type === 'task_status') {
        res.json({
          response: routed.message,
          model: 'opus-bridge' as const,
          contextUsed: taskContextUsed,
          isTask: routed.type === 'task_created',
          taskId: routed.taskId ?? null,
          taskTitle: routed.taskTitle ?? null,
        });
        return;
      }

      if (routed.type === 'error') {
        res.json({
          response: routed.message,
          model: 'opus-bridge' as const,
          contextUsed: taskContextUsed,
          isTask: false,
        });
        return;
      }
    }

    const db = getDb();

    // Aggregate hot context (max 2 background calls per Council rule)
    const [tasks, continuity] = await Promise.all([
      db.select({
        id: builderTasks.id,
        title: builderTasks.title,
        status: builderTasks.status,
        risk: builderTasks.risk,
      }).from(builderTasks).orderBy(desc(builderTasks.updatedAt)).limit(8),

      db.select({
        summary: builderMemory.summary,
      }).from(builderMemory)
        .where(eq(builderMemory.layer, 'continuity'))
        .orderBy(desc(builderMemory.updatedAt))
        .limit(1),
    ]);

    const taskSummary = tasks.map(t => `[${t.status}] ${t.title} (risk:${t.risk}, id:${t.id})`).join('\n');
    const lastNote = continuity[0]?.summary || 'Keine Continuity Note.';

    // Build compact worker summary for system prompt
    const workerSummary = WORKER_PROFILES.map(w =>
      `â€¢ ${w.id} (${w.costTier}/${w.speedTier}) â€” ${w.role}: ${w.bestFor.slice(0, 3).join(', ')}. QualitÃ¤t: ${w.codeQuality}/100`
    ).join('\n');

    const systemPrompt = `Du bist Maya â€” die zentrale Steuereinheit des Opus-Bridge Builder-Systems im Soulmatch-Projekt. Du sprichst Deutsch.

DEIN LIVE-KONTEXT:
Continuity (letzte Session): ${lastNote}

Aktive Tasks (mit IDs):
${taskSummary || 'Keine Tasks.'}

WORKER-POOL (wÃ¤hle den besten fÃ¼r jede Aufgabe):
${workerSummary}

AKTIVE POOL-ZUSAMMENSETZUNG:
Maya KI: ${getActivePools().maya.join(', ') || 'leer'}
Master Council: ${getActivePools().council.join(', ') || 'leer'}
Destillierer: ${getActivePools().distiller.join(', ') || 'leer'}
Worker Pool: ${getActivePools().worker.join(', ') || 'leer'}
Scout Pool: ${getActivePools().scout.join(', ') || 'leer'}
Du kannst die Pools per Action-Block aendern:
[ACTION: endpoint=/maya/pools, risk=safe]
pools: { maya: ["opus"], council: ["opus", "sonnet"], distiller: ["glm-flash", "deepseek-scout"], worker: ["glm-turbo", "kimi"], scout: ["glm-flash", "gemini-flash"] }
[/ACTION]

DEINE FÃ„HIGKEITEN:
- /build â€” Code-Ã„nderungen am Soulmatch-Repo (Worker: GLM-Turbo, FlashX, GPT-5.5, MiniMax, Kimi K2.6, MiMo)
- /repo-query â€” Fragen an den Code beantworten
- /git-push â€” Dateien direkt auf GitHub pushen (main oder staging Branch)
- /push â€” Code deployen (mit branch Parameter fÃ¼r staging)
- /render/redeploy â€” Render neu deployen
- /memory â€” Dein GedÃ¤chtnis abrufen
- /task-history â€” Vergangene Tasks einsehen
- /worker-stats â€” Worker Performance vergleichen
- /self-test â€” System Health prÃ¼fen
- /tasks/:id â€” Task lÃ¶schen (method: DELETE)
- /maya/memory â€” Continuity/Episode Note erstellen (POST, body: { layer, key, summary })
- /maya/memory/:id â€” Note bearbeiten (PUT) oder lÃ¶schen (DELETE)
- /batch-delete-tasks â€” Mehrere Tasks auf einmal lÃ¶schen (POST, body: { ids: string[] })

REGELN:
- Sei direkt, kritisch, keine Floskeln
- ErklÃ¤re in Alltagssprache mit Metaphern
- Bewerte Ideen auf 0-100% Skala mit SchwÃ¤chen zuerst
- Du bist Partnerin und Architektin, nicht Tool
- Bei klaren AuftrÃ¤gen ("fix den Bug", "build Feature X") handle SOFORT mit Action-BlÃ¶cken â€” frag nicht nach BestÃ¤tigung fÃ¼r safe/staging Aktionen
- WÃ¤hle den Worker basierend auf Task-Typ (siehe WORKER-POOL oben)
- FÃ¼r Task-Details: Nutze /tasks/:id/dialog und /tasks/:id/evidence

VERFÃœGBARE AKTIONEN:

VERFÃœGBARE AKTIONEN:
Wenn du eine Builder-Aktion ausfÃ¼hren willst, antworte mit einem Action-Block:
[ACTION: endpoint=/build, branch=staging, worker=glm-turbo, risk=safe]
Beschreibung was passieren wird
[/ACTION]

FÃ¼r destruktive Aktionen (push main, deploy, revert):
[ACTION: endpoint=/push, branch=main, risk=destructive]
Beschreibung
[/ACTION]

PROAKTIVES HANDELN:
- Bei "fix Bug X" â†’ sofort /build Action-Block mit passendem Worker
- Bei "was macht Task X" â†’ direkt die Details abrufen und zusammenfassen
- Bei "deploy" â†’ /push + /render/redeploy Action-BlÃ¶cke
- Bei "zeig Worker" â†’ Tabelle mit allen Workern und ihrer Performance

${MAYA_NAVIGATION_GUIDANCE}`;

    // Route to Opus for complex reasoning, cheaper model for simple status queries
    // If file attached â†’ always use Gemini (multimodal)
    const hasFile = !!file?.data;
    const isSimpleQuery = !hasFile && /^(status|was lÃ¤uft|health|wie viele|zeig|list)/i.test(message.trim());

    if (hasFile && file.mime.startsWith('image/')) {
      // Multimodal path â†’ Gemini with inline image
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) { res.status(500).json({ error: 'GEMINI_API_KEY not set' }); return; }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      const contents = [
        ...history.slice(-12).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.mime, data: file.data } },
            { text: `[Datei: ${file.name}]\n\n${message}` },
          ],
        },
      ];

      const geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      });

      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        throw new Error(`Gemini API ${geminiResp.status}: ${errText.slice(0, 200)}`);
      }

      const geminiData = await geminiResp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Keine Antwort von Gemini.';

      res.json({
        response: geminiText,
        model: 'gemini' as const,
        contextUsed: { tasksLoaded: tasks.length, hasContinuity: !!continuity[0] },
      });
      return;
    }

    // Non-image file â†’ append content as text
    let userContent = message;
    if (hasFile && !file.mime.startsWith('image/')) {
      try {
        const decoded = Buffer.from(file.data, 'base64').toString('utf-8');
        userContent = `[Datei: ${file.name}]\n\`\`\`\n${decoded.slice(0, 8000)}\n\`\`\`\n\n${message}`;
      } catch {
        userContent = `[Datei: ${file.name} â€” konnte nicht gelesen werden]\n\n${message}`;
      }
    }

    const provider = isSimpleQuery
      ? (pickFromPool('scout', false)?.provider ?? 'zhipu')
      : (pickFromPool('maya', true)?.provider ?? 'anthropic');
    const model = isSimpleQuery
      ? (pickFromPool('scout', false)?.model ?? 'glm-4.7-flashx')
      : (pickFromPool('maya', true)?.model ?? 'claude-opus-4-7');
    const modelLabel = isSimpleQuery
      ? (pickFromPool('scout', false)?.id ?? 'flash')
      : (pickFromPool('maya', true)?.id ?? 'opus');

    const messages = [
      ...history.slice(-16),
      { role: 'user' as const, content: userContent },
    ];

    const response = await callProvider(provider, model, {
      system: systemPrompt,
      messages,
      maxTokens: 2000,
      temperature: 0.7,
    });

    // Save to continuity if Maya suggests important context
    res.json({
      response,
      model: modelLabel,
      contextUsed: { tasksLoaded: tasks.length, hasContinuity: !!continuity[0] },
    });
  } catch (err) {
    console.error('[maya] POST /maya/chat error:', err);
    res.status(500).json({ error: 'Maya chat failed: ' + String(err) });
  }
});

// POST /api/builder/maya/action â€” execute a builder action Maya suggested
router.post('/maya/action', async (req: Request, res: Response) => {
  try {
    const { action, confirmed } = req.body as {
      action: { endpoint: string; method?: string; branch?: string; worker?: string; params?: Record<string, unknown> };
      confirmed?: boolean;
    };

    if (!action?.endpoint) {
      res.status(400).json({ error: 'action.endpoint required' });
      return;
    }

    const ALLOWED = ['/build', '/push', '/git-push', '/render/redeploy', '/self-test', '/repo-query', '/execute', '/maya/pools'];
    const BUILDER_ROUTES = ['/batch-delete-tasks']; // routes under /api/builder (not opus-bridge)
    // Also allow task and memory endpoints with dynamic IDs
    const isTaskDelete = /^\/tasks\/[\w-]+$/.test(action.endpoint);
    const isOverride = /^\/override\/[\w-]+$/.test(action.endpoint);
    const isMemoryOp = /^\/maya\/memory(\/[\w-]+)?$/.test(action.endpoint);
    if (!ALLOWED.includes(action.endpoint) && !BUILDER_ROUTES.includes(action.endpoint) && !isTaskDelete && !isOverride && !isMemoryOp) {
      res.status(400).json({ error: `Endpoint ${action.endpoint} not allowed.` });
      return;
    }

    const DESTRUCTIVE = new Set(['/push', '/render/redeploy']);
    const isDestructive = DESTRUCTIVE.has(action.endpoint) && (action.branch === 'main' || !action.branch);
    const risk = isDestructive ? 'destructive' : DESTRUCTIVE.has(action.endpoint) ? 'staging' : 'safe';

    if (isDestructive && !confirmed) {
      res.json({
        success: false,
        needsConfirmation: true,
        risk,
        endpoint: action.endpoint,
        message: `âš ï¸ ${action.endpoint} (${action.branch || 'main'}) ist destruktiv. BestÃ¤tige mit confirmed:true.`,
      });
      return;
    }

    // For opus-bridge routes: use server-side secret (trusted internal call)
    // For builder routes: forward user token from query
    const userToken = (req.query.opus_token || req.query.token || '') as string;
    const port = process.env.PORT || 10000;
    // Task/memory/batch endpoints are under /api/builder, opus-bridge endpoints under /api/builder/opus-bridge
    const isBuilderRoute = isTaskDelete || isMemoryOp || BUILDER_ROUTES.includes(action.endpoint);
    const baseUrl = `http://localhost:${port}/api/builder${isBuilderRoute ? '' : '/opus-bridge'}`;
    const authToken = isBuilderRoute ? userToken : (process.env.OPUS_BRIDGE_SECRET || userToken);

    const method = action.method || (isTaskDelete ? 'DELETE' : 'POST');
    const body: Record<string, unknown> = { ...action.params };
    if (action.branch) body.branch = action.branch;
    if (action.worker) body.worker = action.worker;

    const fetchOpts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    };
    if (method !== 'DELETE') fetchOpts.body = JSON.stringify(body);

    const sep = action.endpoint.includes('?') ? '&' : '?';
    const proxyRes = await fetch(`${baseUrl}${action.endpoint}${sep}opus_token=${encodeURIComponent(authToken)}`, fetchOpts);

    const result = await proxyRes.json().catch(() => ({ status: proxyRes.status }));

    res.json({ success: proxyRes.ok, endpoint: action.endpoint, risk, result });
  } catch (err) {
    console.error('[maya] POST /maya/action error:', err);
    res.status(500).json({ error: 'Action execution failed: ' + String(err) });
  }
});

// POST /api/builder/maya/memory â€” create a memory entry
router.post('/maya/memory', async (req: Request, res: Response) => {
  try {
    const { layer, key, summary } = req.body as { layer?: string; key?: string; summary?: string };
    if (!layer || !key || !summary) { res.status(400).json({ error: 'layer, key, summary required' }); return; }
    const db = getDb();
    const [result] = await db.insert(builderMemory).values({ layer, key, summary }).returning();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Memory create failed: ' + String(err) });
  }
});

// PUT /api/builder/maya/memory/:id â€” update a memory entry
router.put('/maya/memory/:id', async (req: Request, res: Response) => {
  try {
    const { summary } = req.body as { summary?: string };
    if (!summary) { res.status(400).json({ error: 'summary required' }); return; }
    const db = getDb();
    const [result] = await db.update(builderMemory)
      .set({ summary, updatedAt: new Date() })
      .where(eq(builderMemory.id, req.params.id))
      .returning();
    if (!result) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Memory update failed: ' + String(err) });
  }
});

// DELETE /api/builder/maya/memory/:id â€” delete a memory entry
router.delete('/maya/memory/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    await db.delete(builderMemory).where(eq(builderMemory.id, req.params.id));
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Memory delete failed: ' + String(err) });
  }
});

// POST /api/builder/batch-delete-tasks â€” delete multiple tasks at once
router.post('/batch-delete-tasks', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids[] required' });
      return;
    }
    const db = getDb();
    let deleted = 0;
    for (const id of ids) {
      try {
        await db.delete(builderTasks).where(eq(builderTasks.id, id));
        deleted++;
      } catch { /* skip FK constraint errors */ }
    }
    res.json({ success: true, deleted, total: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Batch delete failed: ' + String(err) });
  }
});

// GET /api/builder/maya/workers â€” worker profiles for Maya's selection
router.get('/maya/workers', (_req: Request, res: Response) => {
  res.json(WORKER_PROFILES.map(w => ({
    id: w.id, provider: w.provider, model: w.model, role: w.role,
    strengths: w.strengths, weaknesses: w.weaknesses,
    bestFor: w.bestFor, avoidFor: w.avoidFor,
    costTier: w.costTier, speedTier: w.speedTier,
    codeQuality: w.codeQuality, reliability: w.reliability,
  })));
});

// POST /api/builder/maya/pick-worker â€” Maya asks for best worker for a task
router.post('/maya/pick-worker', (req: Request, res: Response) => {
  const { description } = req.body as { description?: string };
  if (!description) { res.status(400).json({ error: 'description required' }); return; }
  const worker = pickWorker(description);
  res.json({ recommended: worker });
});

// POST /api/builder/maya/brief â€” compile an active brief for a task
router.post('/maya/brief', async (req: Request, res: Response) => {
  try {
    const { taskGoal } = req.body as { taskGoal?: string };
    if (!taskGoal) { res.status(400).json({ error: 'taskGoal required' }); return; }

    const db = getDb();
    const [tasks, continuity, workerStats] = await Promise.all([
      db.select({ id: builderTasks.id, title: builderTasks.title, status: builderTasks.status, risk: builderTasks.risk })
        .from(builderTasks).orderBy(desc(builderTasks.updatedAt)).limit(5),
      db.select({ summary: builderMemory.summary })
        .from(builderMemory).where(eq(builderMemory.layer, 'continuity')).orderBy(desc(builderMemory.updatedAt)).limit(1),
      db.execute(sql`SELECT worker, ROUND(AVG(quality)) as avg_quality, COUNT(*) as task_count FROM builder_worker_scores GROUP BY worker ORDER BY avg_quality DESC LIMIT 5`).catch(() => ({ rows: [] })),
    ]);

    const worker = pickWorker(taskGoal);

    res.json({
      brief: {
        taskGoal,
        recommendedWorker: { id: worker.id, model: worker.model, strengths: worker.strengths, reliability: worker.reliability },
        activeTasks: tasks.map(t => `[${t.status}] ${t.title}`),
        lastSession: continuity[0]?.summary || 'Keine Continuity Note.',
        workerPerformance: workerStats.rows,
        risks: worker.avoidFor,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Brief compilation failed: ' + String(err) });
  }
});

// POST /api/builder/maya/pools â€” receive pool configuration from frontend
router.get('/maya/pools', (_req: Request, res: Response) => {
  res.json(getPoolConfigSnapshot());
});

router.get('/maya/vision-models', (_req: Request, res: Response) => {
  const models = getVisionCapableModels();
  res.json({ models, count: models.length });
});

router.get('/maya/vision-scores', async (_req: Request, res: Response) => {
  try {
    const scores = await computeVisionScoreAggregates();
    res.json({ scores, count: scores.length });
  } catch (err) {
    console.error('[builder] GET /maya/vision-scores error:', err);
    res.status(500).json({ error: 'Vision score aggregation failed' });
  }
});

router.post('/maya/pools', (req: Request, res: Response) => {
  const { pools } = req.body as { pools?: { maya?: string[]; council?: string[]; distiller?: string[]; worker?: string[]; scout?: string[] } };
  if (!pools) { res.status(400).json({ error: 'pools required' }); return; }
  updatePools(pools);
  const current = getActivePools();
  console.log('[maya] Pools updated:', { maya: current.maya.length, council: current.council.length, distiller: current.distiller.length, worker: current.worker.length, scout: current.scout.length });
  res.json({ success: true, pools: current, poolConfig: getPoolConfigSnapshot() });
});

export { router as builderRouter };
