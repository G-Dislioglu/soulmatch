/**
 * Opus Judge — selects the best candidate via LLM
 */
import { callProvider } from './providers.js';
import { WORKER_REGISTRY, JUDGE_WORKER } from './opusWorkerRegistry.js';

// ─── Types ───

interface EditEnvelope {
  edits: Array<{
    path: string;
    mode: 'overwrite' | 'create' | 'patch';
    content?: string;
    patches?: Array<{ search: string; replace: string }>;
  }>;
  summary: string;
  worker: string;
}

function estimateEditSize(envelope: EditEnvelope): number {
  return envelope.edits.reduce((sum, edit) => {
    if (edit.mode === 'patch') {
      return sum + (edit.patches?.reduce((patchSum, patch) => patchSum + patch.search.length + patch.replace.length, 0) ?? 0);
    }
    return sum + (edit.content?.length ?? 0);
  }, 0);
}

// ─── Judge ───

/**
 * Select the best candidate from valid options via LLM.
 * Falls back to first candidate on errors.
 */
export async function judgeValidCandidates(
  instruction: string,
  candidates: Array<{ envelope: EditEnvelope; worker: string }>,
): Promise<EditEnvelope> {
  if (candidates.length === 1) return candidates[0].envelope;

  const judgeConfig = WORKER_REGISTRY[JUDGE_WORKER];
  if (!judgeConfig) return candidates[0].envelope;

  const comparison = candidates.map((c, i) =>
    `=== Candidate ${i + 1}: ${c.worker} ===\nFiles: ${c.envelope.edits.map(e => e.path).join(', ')}\nSummary: ${c.envelope.summary}\nChars: ${estimateEditSize(c.envelope)}`
  ).join('\n\n');

  try {
    const response = await callProvider(judgeConfig.provider, judgeConfig.model, {
      system: 'Pick the best code. Respond ONLY JSON: {"pick": 1, "reasoning": "..."}',
      messages: [{ role: 'user', content: `Task: ${instruction}\n\n${comparison}` }],
      maxTokens: 300,
      temperature: 0.1,
      forceJsonObject: false,
    });
    const m = response.match(/(\d+)/);
    const idx = m ? Math.max(0, Math.min(parseInt(m[1]) - 1, candidates.length - 1)) : 0;
    return candidates[idx].envelope;
  } catch {
    return candidates[0].envelope;
  }
}
