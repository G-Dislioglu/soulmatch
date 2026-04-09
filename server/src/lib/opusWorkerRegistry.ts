/**
 * Zentrale Worker-Registry — Single Source of Truth
 * Alle Dateien importieren von hier statt eigene Maps zu pflegen.
 */

export interface WorkerConfig {
  provider: string;
  model: string;
}

export const WORKER_REGISTRY: Record<string, WorkerConfig> = {
  // Günstige Worker
  deepseek:   { provider: 'deepseek',    model: 'deepseek-chat' },
  minimax:    { provider: 'openrouter',   model: 'minimax/minimax-m2.7' },
  kimi:       { provider: 'openrouter',   model: 'moonshotai/kimi-k2.5' },
  qwen:       { provider: 'openrouter',   model: 'qwen/qwen3.6-plus' },
  glm:        { provider: 'zhipu',        model: 'glm-5-turbo' },
  'glm-flash': { provider: 'zhipu',       model: 'glm-4.7-flash' },
  grok:       { provider: 'xai',          model: 'grok-4-1-fast' },
  // Premium (Meister/Roundtable)
  opus:       { provider: 'anthropic',    model: 'claude-opus-4-6' },
  sonnet:     { provider: 'anthropic',    model: 'claude-sonnet-4-6' },
  gpt:        { provider: 'openai',       model: 'gpt-5.4' },
};

export const DEFAULT_WORKERS = ['deepseek', 'minimax', 'glm', 'qwen', 'grok'];

export function getProvider(workerName: string): string {
  return WORKER_REGISTRY[workerName]?.provider || workerName;
}

export function getModel(workerName: string): string {
  return WORKER_REGISTRY[workerName]?.model || workerName;
}
