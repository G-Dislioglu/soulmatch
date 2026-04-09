/**
 * Opus-Assist: Verlängerte Hand für Claude Opus
 * Spart Tool-Calls indem teure Schleifen (Deploy-Wait, Parallel-Benchmark)
 * intern auf dem Server laufen statt als einzelne API-Calls.
 * @author Claude Opus Worker Swarm
 */

import { callProvider } from './providers.js';

// ─── Deploy-Wait: Pollt Render bis Deploy live ───
export async function waitForDeploy(
  renderServiceId: string,
  renderApiKey: string,
  maxWaitMs = 360_000,  // 6 Minuten
  pollIntervalMs = 15_000
): Promise<{ deployed: boolean; durationMs: number; commitId?: string; error?: string }> {
  const start = Date.now();
  let lastStatus = '';
  let commitId = '';

  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(
        `https://api.render.com/v1/services/${renderServiceId}/deploys?limit=1`,
        { headers: { Authorization: `Bearer ${renderApiKey}` } }
      );
      const deploys = await res.json() as any[];
      if (deploys?.[0]) {
        lastStatus = deploys[0].deploy?.status || deploys[0].status || '';
        commitId = deploys[0].deploy?.commit?.id || deploys[0].commit?.id || '';
        if (lastStatus === 'live') {
          return { deployed: true, durationMs: Date.now() - start, commitId };
        }
      }
    } catch (e: any) {
      // Ignore polling errors, keep trying
    }
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  return { deployed: false, durationMs: Date.now() - start, error: `Timeout after ${maxWaitMs}ms, last status: ${lastStatus}` };
}

// ─── Benchmark: Alle Worker parallel, Ergebnisse gesammelt + bewertet ───
export interface BenchmarkResult {
  worker: string;
  status: 'success' | 'error' | 'timeout';
  responseLength: number;
  durationMs: number;
  featureChecks: Record<string, boolean>;
  score: number;
  error?: string;
  responsePreview?: string;
}

export async function runBenchmark(
  task: string,
  workers: string[],
  options: {
    maxTokens?: number;
    system?: string;
    featureKeywords?: string[];  // Keywords to check in output
    timeoutMs?: number;
  } = {}
): Promise<{ results: BenchmarkResult[]; summary: string }> {
  const {
    maxTokens = 6000,
    system = 'You are a senior TypeScript/React developer. Return only complete working code.',
    featureKeywords = [],
    timeoutMs = 120_000,
  } = options;

  // Worker short names → provider + model mapping
  const WORKER_MAP: Record<string, { provider: string; model: string }> = {
    deepseek: { provider: 'deepseek', model: 'deepseek-chat' },
    minimax: { provider: 'openrouter', model: 'minimax/minimax-m2.7' },
    kimi: { provider: 'openrouter', model: 'moonshotai/kimi-k2.5' },
    qwen: { provider: 'openrouter', model: 'qwen/qwen3.6-plus' },
    glm: { provider: 'zhipu', model: 'glm-5-turbo' },
    'glm-flash': { provider: 'zhipu', model: 'glm-4.7-flash' },
    grok: { provider: 'xai', model: 'grok-4-1-fast' },
    sonnet: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    gpt: { provider: 'openai', model: 'gpt-5.4' },
  };

  const promises = workers.map(async (worker): Promise<BenchmarkResult> => {
    const config = WORKER_MAP[worker];
    if (!config) return { worker, status: 'error', responseLength: 0, durationMs: 0, featureChecks: {}, score: 0, error: `Unknown worker: ${worker}` };

    const start = Date.now();
    try {
      const response = await Promise.race([
        callProvider(config.provider, config.model, {
          system,
          messages: [{ role: 'user', content: task }],
          maxTokens,
          temperature: 0.7,
          forceJsonObject: false,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
      ]) as string;

      const durationMs = Date.now() - start;
      const lower = response.toLowerCase();

      // Feature checks
      const featureChecks: Record<string, boolean> = {};
      for (const kw of featureKeywords) {
        featureChecks[kw] = lower.includes(kw.toLowerCase());
      }

      // Auto-score: length + feature coverage
      const featureScore = featureKeywords.length > 0
        ? (Object.values(featureChecks).filter(Boolean).length / featureKeywords.length) * 50
        : 25;
      const lengthScore = Math.min(response.length / 100, 30);  // max 30 for length
      const speedScore = durationMs < 30000 ? 20 : durationMs < 60000 ? 15 : durationMs < 90000 ? 10 : 5;
      const score = Math.round(featureScore + lengthScore + speedScore);

      return {
        worker,
        status: 'success',
        responseLength: response.length,
        durationMs,
        featureChecks,
        score,
        responsePreview: response.slice(0, 300),
      };
    } catch (e: any) {
      return {
        worker,
        status: e.message === 'Timeout' ? 'timeout' : 'error',
        responseLength: 0,
        durationMs: Date.now() - start,
        featureChecks: {},
        score: 0,
        error: e.message?.slice(0, 200),
      };
    }
  });

  const results = await Promise.all(promises);
  results.sort((a, b) => b.score - a.score);

  const summary = results.map(r =>
    `${r.worker}: ${r.status === 'success' ? '✅' : '❌'} ${r.responseLength}ch, ${Math.round(r.durationMs / 1000)}s, score=${r.score}`
  ).join('\n');

  return { results, summary };
}
