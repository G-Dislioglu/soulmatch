/**
 * Opus-Task Orchestrator: Ein Call = Ein Feature
 * 
 * Ablauf:
 * 1. Instruction → Decompose (welche Dateien, was ändern)
 * 2. Worker-Swarm parallel (alle relevanten Worker)
 * 3. Meister bewertet + wählt besten Patch
 * 4. Push → GitHub
 * 5. Deploy-Wait → Render
 * 6. Self-Test → Verifizierung
 * 7. Ergebnis-Report zurück
 */

import { callProvider } from './providers.js';
import { waitForDeploy } from './opusAssist.js';

interface OpusTaskInput {
  instruction: string;
  scope?: string[];           // Dateien die betroffen sind
  workers?: string[];         // Default: alle günstigen
  maxTokens?: number;
  skipDeploy?: boolean;       // Nur patch, nicht deployen
  skipWait?: boolean;         // Push aber nicht auf Deploy warten
}

interface OpusTaskResult {
  status: 'success' | 'partial' | 'failed';
  phases: PhaseResult[];
  totalDurationMs: number;
  summary: string;
}

interface PhaseResult {
  phase: string;
  status: 'ok' | 'skipped' | 'error';
  durationMs: number;
  detail?: any;
}

const WORKER_MAP: Record<string, { provider: string; model: string }> = {
  deepseek: { provider: 'deepseek', model: 'deepseek-chat' },
  minimax: { provider: 'openrouter', model: 'minimax/minimax-m2.7' },
  kimi: { provider: 'openrouter', model: 'moonshotai/kimi-k2.5' },
  qwen: { provider: 'openrouter', model: 'qwen/qwen3.6-plus' },
  glm: { provider: 'zhipu', model: 'glm-5-turbo' },
  'glm-flash': { provider: 'zhipu', model: 'glm-4.7-flash' },
  grok: { provider: 'xai', model: 'grok-4-1-fast' },
};

// ─── Phase 1: Scope-Analyse via günstigen Scout ───
async function analyzeScope(instruction: string): Promise<{ files: string[]; context: string }> {
  const prompt = `You are a code architect for a TypeScript/React/Express project (Soulmatch).
Given this task instruction, identify:
1. Which existing files need to be modified (full paths starting with server/src/ or client/src/)
2. Which NEW files need to be created
3. A brief technical plan (max 5 sentences)

Respond ONLY in this JSON format, no markdown:
{"files":["path1","path2"],"newFiles":["path3"],"plan":"..."}

Task: ${instruction}`;

  try {
    const response = await callProvider('zhipu', 'glm-4.7-flash', {
      system: 'You are a code architect. Respond only in JSON.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1000,
      temperature: 0.3,
      forceJsonObject: false,
    });
    const parsed = JSON.parse(response);
    return {
      files: [...(parsed.files || []), ...(parsed.newFiles || [])],
      context: parsed.plan || '',
    };
  } catch {
    return { files: [], context: 'Scope analysis failed, proceeding with instruction only.' };
  }
}

// ─── Phase 2: Parallel Worker-Swarm ───
async function runWorkerSwarm(
  instruction: string,
  scope: string[],
  fileContents: Map<string, string>,
  workers: string[],
  maxTokens: number,
): Promise<Array<{ worker: string; response: string; durationMs: number; error?: string }>> {

  const scopeContext = scope.map(f => {
    const content = fileContents.get(f);
    return content ? `--- ${f} ---\n${content}` : `--- ${f} (new file) ---`;
  }).join('\n\n');

  const fullPrompt = `Task: ${instruction}

Files in scope:
${scopeContext}

Write complete SEARCH/REPLACE patches or full new file content. 
For existing files use this format:
<<<< SEARCH (filename)
old code
====
new code
>>>> REPLACE

For new files, write the complete file content with the filename as header.
Return ONLY code patches, no explanation.`;

  const promises = workers.map(async (worker) => {
    const config = WORKER_MAP[worker];
    if (!config) return { worker, response: '', durationMs: 0, error: `Unknown: ${worker}` };
    const start = Date.now();
    try {
      const response = await Promise.race([
        callProvider(config.provider, config.model, {
          system: 'You are a senior TypeScript developer. Return only SEARCH/REPLACE patches or complete file content.',
          messages: [{ role: 'user', content: fullPrompt }],
          maxTokens,
          temperature: 0.4,
          forceJsonObject: false,
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 120_000)),
      ]) as string;
      return { worker, response, durationMs: Date.now() - start };
    } catch (e: any) {
      return { worker, response: '', durationMs: Date.now() - start, error: e.message?.slice(0, 200) };
    }
  });

  return Promise.all(promises);
}

// ─── Phase 3: Meister wählt besten Patch ───
async function selectBestPatch(
  instruction: string,
  workerResults: Array<{ worker: string; response: string; durationMs: number; error?: string }>,
): Promise<{ selectedWorker: string; patch: string; reasoning: string }> {

  const successResults = workerResults.filter(r => r.response && !r.error);
  if (successResults.length === 0) {
    return { selectedWorker: 'none', patch: '', reasoning: 'All workers failed' };
  }
  if (successResults.length === 1) {
    return { selectedWorker: successResults[0].worker, patch: successResults[0].response, reasoning: 'Only one worker succeeded' };
  }

  // Let GLM-5-turbo (cheap but smart) judge — not Opus (expensive)
  const comparison = successResults.map((r, i) =>
    `=== Worker ${i + 1}: ${r.worker} (${r.response.length} chars, ${r.durationMs}ms) ===\n${r.response.slice(0, 3000)}`
  ).join('\n\n');

  const judgePrompt = `Task was: ${instruction}

Here are ${successResults.length} worker responses. Pick the BEST one — most complete, correct TypeScript, proper types, fewest bugs.

${comparison}

Respond ONLY in JSON: {"pick":1,"reasoning":"..."}  (pick = 1-indexed worker number)`;

  try {
    const judgeResponse = await callProvider('zhipu', 'glm-5-turbo', {
      system: 'You are a senior code reviewer. Respond ONLY with JSON, no markdown, no explanation.',
      messages: [{ role: 'user', content: judgePrompt }],
      maxTokens: 500,
      temperature: 0.2,
      forceJsonObject: false,
    });
    // Extract JSON even if wrapped in markdown or surrounding text
    let parsed: any;
    try {
      parsed = JSON.parse(judgeResponse);
    } catch {
      const jsonMatch = judgeResponse.match(/\{[\s\S]*"pick"\s*:\s*(\d+)[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {
          parsed = { pick: parseInt(jsonMatch[1]) || 1, reasoning: 'Extracted from partial JSON' };
        }
      } else {
        // Last resort: look for any number that could be the pick
        const numMatch = judgeResponse.match(/(\d+)/);
        parsed = { pick: numMatch ? parseInt(numMatch[1]) : 1, reasoning: 'Extracted number from response' };
      }
    }
    const pickIdx = (parsed.pick || 1) - 1;
    const selected = successResults[Math.min(pickIdx, successResults.length - 1)];
    return { selectedWorker: selected.worker, patch: selected.response, reasoning: parsed.reasoning || '' };
  } catch {
    // Fallback: pick longest response
    const longest = successResults.sort((a, b) => b.response.length - a.response.length)[0];
    return { selectedWorker: longest.worker, patch: longest.response, reasoning: 'Judge failed, picked longest response' };
  }
}

// ─── Phase 4+5: Push + Deploy-Wait (reuse existing /push internally) ───
async function pushAndDeploy(
  files: Array<{ file: string; content: string }>,
  commitMessage: string,
  skipDeploy: boolean,
  skipWait: boolean,
): Promise<{ pushed: boolean; deployed: boolean; error?: string; durationMs: number }> {
  const start = Date.now();

  try {
    // Use internal fetch to /push
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const token = process.env.OPUS_BRIDGE_TOKEN || 'opus-bridge-2026-geheim';

    const pushRes = await fetch(`${baseUrl}/api/builder/opus-bridge/push?opus_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, message: commitMessage }),
    });
    const pushData = await pushRes.json() as any;

    if (!pushData.triggered) {
      return { pushed: false, deployed: false, error: 'Push failed', durationMs: Date.now() - start };
    }

    if (skipDeploy || skipWait) {
      return { pushed: true, deployed: false, durationMs: Date.now() - start };
    }

    // Wait for deploy
    const serviceId = process.env.RENDER_SERVICE_ID || '';
    const apiKey = process.env.RENDER_API_KEY || '';
    if (serviceId && apiKey) {
      const deployResult = await waitForDeploy(serviceId, apiKey, 360_000, 15_000);
      return { pushed: true, deployed: deployResult.deployed, durationMs: Date.now() - start };
    }

    return { pushed: true, deployed: false, error: 'No RENDER credentials', durationMs: Date.now() - start };
  } catch (e: any) {
    return { pushed: false, deployed: false, error: e.message, durationMs: Date.now() - start };
  }
}

// ─── Phase 6: Self-Test ───
async function runSelfTest(): Promise<{ passed: boolean; durationMs: number }> {
  const start = Date.now();
  try {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const token = process.env.OPUS_BRIDGE_TOKEN || 'opus-bridge-2026-geheim';
    const res = await fetch(`${baseUrl}/api/builder/opus-bridge/self-test?opus_token=${token}`, { method: 'POST' });
    const data = await res.json() as any;
    return { passed: !!data.allPassed, durationMs: Date.now() - start };
  } catch {
    return { passed: false, durationMs: Date.now() - start };
  }
}

// ─── Hauptfunktion: orchestrateTask ───
export async function orchestrateTask(input: OpusTaskInput): Promise<OpusTaskResult> {
  const totalStart = Date.now();
  const phases: PhaseResult[] = [];
  const workers = input.workers || ['deepseek', 'minimax', 'glm', 'qwen', 'grok'];
  const maxTokens = input.maxTokens || 6000;

  // Phase 1: Scope
  const scopeStart = Date.now();
  let scope = input.scope || [];
  let scopeContext = '';
  if (scope.length === 0) {
    const analysis = await analyzeScope(input.instruction);
    scope = analysis.files;
    scopeContext = analysis.context;
  }
  phases.push({ phase: 'scope', status: 'ok', durationMs: Date.now() - scopeStart, detail: { files: scope, context: scopeContext } });

  // Phase 2: Read file contents via GitHub raw
  const fileContents = new Map<string, string>();
  for (const file of scope) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/G-Dislioglu/soulmatch/main/${file}`);
      if (res.ok) fileContents.set(file, await res.text());
    } catch { /* new file, no content */ }
  }

  // Phase 3: Worker Swarm
  const swarmStart = Date.now();
  const workerResults = await runWorkerSwarm(input.instruction, scope, fileContents, workers, maxTokens);
  const successCount = workerResults.filter(r => r.response && !r.error).length;
  phases.push({
    phase: 'swarm',
    status: successCount > 0 ? 'ok' : 'error',
    durationMs: Date.now() - swarmStart,
    detail: workerResults.map(r => ({ worker: r.worker, chars: r.response.length, ms: r.durationMs, error: r.error })),
  });

  if (successCount === 0) {
    return {
      status: 'failed',
      phases,
      totalDurationMs: Date.now() - totalStart,
      summary: 'All workers failed. No patch generated.',
    };
  }

  // Phase 4: Meister selection
  const selectStart = Date.now();
  const selection = await selectBestPatch(input.instruction, workerResults);
  phases.push({
    phase: 'selection',
    status: selection.patch ? 'ok' : 'error',
    durationMs: Date.now() - selectStart,
    detail: { selectedWorker: selection.selectedWorker, reasoning: selection.reasoning, patchLength: selection.patch.length },
  });

  if (!selection.patch) {
    return {
      status: 'failed',
      phases,
      totalDurationMs: Date.now() - totalStart,
      summary: 'Meister could not select a valid patch.',
    };
  }

  // Phase 5: Push (TODO: parse SEARCH/REPLACE patches into actual file changes)
  // For now, if scope has exactly 1 new file, push the patch as the file content
  // For existing files with SEARCH/REPLACE, we rely on /build's patch executor
  const pushStart = Date.now();
  if (input.skipDeploy) {
    phases.push({ phase: 'push', status: 'skipped', durationMs: 0 });
  } else {
    // Use /build internally which handles SEARCH/REPLACE parsing
    try {
      const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
      const token = process.env.OPUS_BRIDGE_TOKEN || 'opus-bridge-2026-geheim';
      const buildRes = await fetch(`${baseUrl}/api/builder/opus-bridge/build?opus_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: input.instruction,
          scope: scope,
          skipDeploy: input.skipWait || false,
          _workerOverride: selection.patch,  // inject pre-selected patch
        }),
      });
      const buildData = await buildRes.json() as any;
      phases.push({
        phase: 'build',
        status: buildData.status === 'success' ? 'ok' : 'error',
        durationMs: Date.now() - pushStart,
        detail: { buildStatus: buildData.status, patchCount: buildData.patchCount },
      });
    } catch (e: any) {
      phases.push({ phase: 'build', status: 'error', durationMs: Date.now() - pushStart, detail: { error: e.message } });
    }
  }

  // Phase 6: Deploy-Wait (if not skipped)
  if (!input.skipDeploy && !input.skipWait) {
    const waitStart = Date.now();
    const serviceId = process.env.RENDER_SERVICE_ID || '';
    const apiKey = process.env.RENDER_API_KEY || '';
    if (serviceId && apiKey) {
      const deployResult = await waitForDeploy(serviceId, apiKey);
      phases.push({
        phase: 'deploy-wait',
        status: deployResult.deployed ? 'ok' : 'error',
        durationMs: Date.now() - waitStart,
        detail: deployResult,
      });
    } else {
      phases.push({ phase: 'deploy-wait', status: 'skipped', durationMs: 0, detail: 'No RENDER credentials' });
    }
  }

  // Phase 7: Self-Test
  if (!input.skipDeploy) {
    const testResult = await runSelfTest();
    phases.push({ phase: 'self-test', status: testResult.passed ? 'ok' : 'error', durationMs: testResult.durationMs });
  }

  const allOk = phases.every(p => p.status === 'ok' || p.status === 'skipped');
  const totalMs = Date.now() - totalStart;
  const workerSummary = workerResults
    .filter(r => r.response)
    .map(r => `${r.worker}:${r.response.length}ch`)
    .join(', ');

  return {
    status: allOk ? 'success' : 'partial',
    phases,
    totalDurationMs: totalMs,
    summary: `${allOk ? '✅' : '⚠️'} Task completed in ${Math.round(totalMs / 1000)}s. Workers: ${workerSummary}. Selected: ${selection.selectedWorker}. ${selection.reasoning}`,
  };
}
