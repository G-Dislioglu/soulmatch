/**
 * Zentrale Worker-Registry — Single Source of Truth
 * Kontext-Limits verifiziert April 2026.
 */

export interface WorkerConfig {
  provider: string;
  model: string;
  contextK: number;  // Kontext in Tausend Tokens (verifiziert)
}

export const WORKER_REGISTRY: Record<string, WorkerConfig> = {
  // Günstige Worker
  deepseek:    { provider: 'deepseek',    model: 'deepseek-chat',             contextK: 128 },
  'deepseek-reasoner': { provider: 'deepseek', model: 'deepseek-reasoner',  contextK: 128 },
  minimax:     { provider: 'openrouter',  model: 'minimax/minimax-m2.7',      contextK: 128 },
  kimi:        { provider: 'openrouter',  model: 'moonshotai/kimi-k2.5',      contextK: 256 },
  qwen:        { provider: 'openrouter',  model: 'qwen/qwen3.6-plus',         contextK: 128 },
  glm:         { provider: 'openrouter',  model: 'z-ai/glm-5-turbo',          contextK: 203 },
  'glm-flash': { provider: 'openrouter',  model: 'z-ai/glm-4.7-flash',        contextK: 203 },
  grok:        { provider: 'xai',         model: 'grok-4-1-fast',             contextK: 128 },
  gemini:      { provider: 'gemini',      model: 'gemini-3-flash-preview',    contextK: 1000 },
  // Premium (Meister/Roundtable)
  opus:        { provider: 'anthropic',   model: 'claude-opus-4-6',           contextK: 200 },
  sonnet:      { provider: 'anthropic',   model: 'claude-sonnet-4-6',         contextK: 200 },
  gpt:         { provider: 'openai',      model: 'gpt-5.4',                   contextK: 128 },
};

export const DEFAULT_WORKERS = ['deepseek', 'minimax', 'glm', 'qwen', 'kimi'];

// Judge: GPT-5.4 — bester Reviewer im Benchmark (82/100, spec-treu, defensiv)
export const JUDGE_WORKER = 'gpt';

export function getProvider(name: string): string {
  return WORKER_REGISTRY[name]?.provider || name;
}

export function getModel(name: string): string {
  return WORKER_REGISTRY[name]?.model || name;
}
