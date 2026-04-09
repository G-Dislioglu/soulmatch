/**
 * Opus-Task Orchestrator: Ein Call = Ein Feature
 * 
 * Fixes vs. v1:
 * - WORKER_MAP aus zentraler Registry (kein Drift mehr)
 * - Default 5 Worker statt 2
 * - Judge: DeepSeek (64K Kontext) mit vollen Worker-Outputs statt truncated Preview
 * - Push via /push DIREKT statt via /build (kein doppelter Swarm!)
 * - Token nur aus Env (kein Hardcode-Fallback)
 */

import { callProvider } from './providers.js';
import { waitForDeploy } from './opusAssist.js';
import { WORKER_REGISTRY, DEFAULT_WORKERS, JUDGE_WORKER } from './opusWorkerRegistry.js';

interface OpusTaskInput {
  instruction: string;
  scope?: string[];
  workers?: string[];
  maxTokens?: number;
  skipDeploy?: boolean;
  skipWait?: boolean;
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

function internalUrl(path: string): string {
  const port = process.env.PORT || 3000;
  const token = process.env.OPUS_BRIDGE_SECRET;
  if (!token) throw new Error('OPUS_BRIDGE_SECRET env not set');
  return `http://localhost:${port}/api/builder/opus-bridge${path}?opus_token=${token}`;
}

// ─── Phase 1: Scope-Analyse (GLM-Flash, gratis) ───
async function analyzeScope(instruction: string): Promise<{ files: string[]; context: string }> {
  try {
    const config = WORKER_REGISTRY['glm-flash'];
    const response = await callProvider(config.provider, config.model, {
      system: 'Respond only in JSON, no markdown.',
      messages: [{ role: 'user', content: `You are a code architect for a TypeScript/React/Express project. Which files need modification?\nRespond ONLY: {"files":["path1"],"newFiles":["path2"],"plan":"..."}\n\nTask: ${instruction}` }],
      maxTokens: 1000,
      temperature: 0.3,
      forceJsonObject: false,
    });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    return { files: [...(parsed.files || []), ...(parsed.newFiles || [])], context: parsed.plan || '' };
  } catch {
    return { files: [], context: 'Scope analysis failed.' };
  }
}

// ─── Phase 3: Parallel Worker-Swarm ───
async function runWorkerSwarm(
  instruction: string, scope: string[], fileContents: Map<string, string>,
  workers: string[], maxTokens: number,
): Promise<Array<{ worker: string; response: string; durationMs: number; error?: string }>> {

  const scopeContext = scope.map(f => {
    const content = fileContents.get(f);
    return content ? `--- ${f} ---\n${content}` : `--- ${f} (new file) ---`;
  }).join('\n\n');

  const fullPrompt = `Task: ${instruction}\n\nFiles in scope:\n${scopeContext}\n\nFor existing files use SEARCH/REPLACE:\n<<<< SEARCH (filename)\nold code\n====\nnew code\n>>>> REPLACE\n\nFor new files, write complete file content.\nReturn ONLY code, no explanation.`;

  return Promise.all(workers.map(async (worker) => {
    const config = WORKER_REGISTRY[worker];
    if (!config) return { worker, response: '', durationMs: 0, error: `Unknown worker: ${worker}` };
    const start = Date.now();
    try {
      const response = await Promise.race([
        callProvider(config.provider, config.model, {
          system: 'You are a senior TypeScript developer. Return only code patches or complete files.',
          messages: [{ role: 'user', content: fullPrompt }],
          maxTokens, temperature: 0.4, forceJsonObject: false,
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), 150_000)),
      ]) as string;
      return { worker, response, durationMs: Date.now() - start };
    } catch (e: any) {
      return { worker, response: '', durationMs: Date.now() - start, error: e.message?.slice(0, 200) };
    }
  }));
}

// ─── Phase 4: Judge (Gemini 3 Flash, 1M Kontext, günstig, zuverlässig) ───
async function selectBestPatch(
  instruction: string,
  workerResults: Array<{ worker: string; response: string; durationMs: number; error?: string }>,
): Promise<{ selectedWorker: string; patch: string; reasoning: string }> {

  const ok = workerResults.filter(r => r.response.length > 50 && !r.error);
  if (ok.length === 0) return { selectedWorker: 'none', patch: '', reasoning: 'All workers failed' };
  if (ok.length === 1) return { selectedWorker: ok[0].worker, patch: ok[0].response, reasoning: 'Only one worker succeeded' };

  // Volle Outputs senden — DeepSeek hat 64K Kontext, kein Truncation nötig
  const comparison = ok.map((r, i) =>
    `=== Worker ${i + 1}: ${r.worker} (${r.response.length} chars) ===\n${r.response}`
  ).join('\n\n');

  const judgePrompt = `Task: ${instruction}\n\n${ok.length} worker code responses. Pick the BEST — most complete, correct TypeScript, proper types, fewest bugs.\n\n${comparison}\n\nRespond ONLY JSON: {"pick":1,"reasoning":"..."} (1-indexed)`;

  try {
    const config = WORKER_REGISTRY[JUDGE_WORKER];
    const judgeResponse = await callProvider(config.provider, config.model, {
      system: 'You are a code reviewer. Respond ONLY with JSON, no markdown.',
      messages: [{ role: 'user', content: judgePrompt }],
      maxTokens: 500, temperature: 0.2, forceJsonObject: false,
    });

    let parsed: any;
    try {
      // Clean response: remove newlines inside JSON strings, strip markdown
      const cleaned = judgeResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/\n/g, ' ').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const m = judgeResponse.match(/\{[\s\S]*?"pick"\s*:\s*(\d+)[\s\S]*?\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = { pick: parseInt(m[1]) || 1, reasoning: 'Partial JSON' }; }
      } else {
        const n = judgeResponse.match(/(\d+)/);
        parsed = { pick: n ? parseInt(n[1]) : 1, reasoning: 'Number extraction fallback' };
      }
    }

    const idx = Math.max(0, Math.min((parsed.pick || 1) - 1, ok.length - 1));
    return { selectedWorker: ok[idx].worker, patch: ok[idx].response, reasoning: parsed.reasoning || '' };
  } catch {
    const longest = ok.sort((a, b) => b.response.length - a.response.length)[0];
    return { selectedWorker: longest.worker, patch: longest.response, reasoning: 'Judge error, picked longest' };
  }
}

// ─── Phase 5: Push direkt via /push (NICHT /build!) ───
async function pushPatch(
  scope: string[], patch: string, fileContents: Map<string, string>, instruction: string,
): Promise<{ pushed: boolean; filesCount: number; error?: string; durationMs: number }> {
  const start = Date.now();
  try {
    const files: Array<{ file: string; content: string }> = [];

    for (const filePath of scope) {
      const existing = fileContents.get(filePath);
      if (!existing) {
        // Neue Datei — Patch = Content (Code-Blöcke entfernen)
        const cleaned = patch
          .replace(/^```(?:typescript|tsx|ts)?\s*\n?/gm, '')
          .replace(/\n?```\s*$/gm, '')
          .replace(/^---\s+\S+\s+---\s*\n/gm, '')
          .trim();
        files.push({ file: filePath, content: cleaned });
      } else {
        // Bestehende Datei — SEARCH/REPLACE parsen
        let newContent = existing;
        const pattern = /<<<< SEARCH[^\n]*\n([\s\S]*?)====\n([\s\S]*?)>>>> REPLACE/g;
        let match;
        let applied = false;
        while ((match = pattern.exec(patch)) !== null) {
          const search = match[1].trim();
          const replace = match[2].trim();
          if (newContent.includes(search)) {
            newContent = newContent.replace(search, replace);
            applied = true;
          }
        }
        if (applied) files.push({ file: filePath, content: newContent });
      }
    }

    if (files.length === 0) {
      return { pushed: false, filesCount: 0, error: 'Patch parsing failed — no files to push', durationMs: Date.now() - start };
    }

    const res = await fetch(internalUrl('/push'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, message: `feat(opus-task): ${instruction.slice(0, 80)}` }),
    });
    const data = await res.json() as any;
    return { pushed: !!data.triggered, filesCount: files.length, durationMs: Date.now() - start };
  } catch (e: any) {
    return { pushed: false, filesCount: 0, error: e.message, durationMs: Date.now() - start };
  }
}

// ─── Phase 7: Self-Test ───
async function runSelfTest(): Promise<{ passed: boolean; durationMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(internalUrl('/self-test'), { method: 'POST' });
    const data = await res.json() as any;
    return { passed: !!data.allPassed, durationMs: Date.now() - start };
  } catch {
    return { passed: false, durationMs: Date.now() - start };
  }
}

// ─── Hauptfunktion ───
export async function orchestrateTask(input: OpusTaskInput): Promise<OpusTaskResult> {
  const totalStart = Date.now();
  const phases: PhaseResult[] = [];
  const workers = input.workers || DEFAULT_WORKERS;
  const maxTokens = input.maxTokens || 6000;

  // Phase 1: Scope
  const s1 = Date.now();
  let scope = input.scope || [];
  let scopeCtx = '';
  if (scope.length === 0) {
    const a = await analyzeScope(input.instruction);
    scope = a.files; scopeCtx = a.context;
  }
  phases.push({ phase: 'scope', status: scope.length > 0 ? 'ok' : 'error', durationMs: Date.now() - s1, detail: { files: scope, context: scopeCtx } });

  // Phase 2: Dateien holen
  const s2 = Date.now();
  const fileContents = new Map<string, string>();
  await Promise.all(scope.map(async (f) => {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/G-Dislioglu/soulmatch/main/${f}`);
      if (r.ok) fileContents.set(f, await r.text());
    } catch { /* new file */ }
  }));
  phases.push({ phase: 'fetch', status: 'ok', durationMs: Date.now() - s2, detail: { fetched: fileContents.size, total: scope.length } });

  // Phase 3: Worker Swarm
  const s3 = Date.now();
  const results = await runWorkerSwarm(input.instruction, scope, fileContents, workers, maxTokens);
  const okCount = results.filter(r => r.response.length > 50 && !r.error).length;
  phases.push({
    phase: 'swarm', status: okCount > 0 ? 'ok' : 'error', durationMs: Date.now() - s3,
    detail: results.map(r => ({ worker: r.worker, chars: r.response.length, ms: r.durationMs, error: r.error })),
  });
  if (okCount === 0) return { status: 'failed', phases, totalDurationMs: Date.now() - totalStart, summary: 'All workers failed.' };

  // Phase 4: Judge
  const s4 = Date.now();
  const sel = await selectBestPatch(input.instruction, results);
  phases.push({
    phase: 'judge', status: sel.patch ? 'ok' : 'error', durationMs: Date.now() - s4,
    detail: { winner: sel.selectedWorker, reasoning: sel.reasoning, patchChars: sel.patch.length },
  });
  if (!sel.patch) return { status: 'failed', phases, totalDurationMs: Date.now() - totalStart, summary: 'No valid patch.' };

  // Phase 5: Push
  if (input.skipDeploy) {
    phases.push({ phase: 'push', status: 'skipped', durationMs: 0 });
  } else {
    const push = await pushPatch(scope, sel.patch, fileContents, input.instruction);
    phases.push({ phase: 'push', status: push.pushed ? 'ok' : 'error', durationMs: push.durationMs, detail: push });
    if (!push.pushed) return { status: 'partial', phases, totalDurationMs: Date.now() - totalStart, summary: `Push failed: ${push.error}` };
  }

  // Phase 6: Deploy-Wait
  if (!input.skipDeploy && !input.skipWait) {
    const s6 = Date.now();
    const sid = process.env.RENDER_SERVICE_ID || '';
    const key = process.env.RENDER_API_KEY || '';
    if (sid && key) {
      const dep = await waitForDeploy(sid, key);
      phases.push({ phase: 'deploy-wait', status: dep.deployed ? 'ok' : 'error', durationMs: Date.now() - s6, detail: dep });
    } else {
      phases.push({ phase: 'deploy-wait', status: 'skipped', durationMs: 0 });
    }
  }

  // Phase 7: Self-Test
  if (!input.skipDeploy && !input.skipWait) {
    const t = await runSelfTest();
    phases.push({ phase: 'self-test', status: t.passed ? 'ok' : 'error', durationMs: t.durationMs });
  }

  const allOk = phases.every(p => p.status === 'ok' || p.status === 'skipped');
  const wSum = results.filter(r => r.response.length > 50).map(r => `${r.worker}:${r.response.length}chars`).join(', ');

  return {
    status: allOk ? 'success' : 'partial',
    phases, totalDurationMs: Date.now() - totalStart,
    summary: `${allOk ? '✅' : '⚠️'} ${Math.round((Date.now() - totalStart) / 1000)}s | Workers: ${wSum} | Winner: ${sel.selectedWorker} — ${sel.reasoning}`,
  };
}
