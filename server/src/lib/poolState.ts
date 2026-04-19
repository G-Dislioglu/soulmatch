/**
 * poolState.ts — Shared pool configuration
 * 
 * Central source of truth for which models are active in each pool.
 * Updated by POST /maya/pools from the frontend.
 * Read by Scout, Distiller, Council, and Worker pipeline modules.
 */

export const POOL_MODEL_MAP: Record<string, { provider: string; model: string }> = {
  opus: { provider: 'anthropic', model: 'claude-opus-4-6' },
  sonnet: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  'gpt-5.4': { provider: 'openai', model: 'gpt-5.4' },
  grok: { provider: 'xai', model: 'grok-4-1-fast' },
  deepseek: { provider: 'deepseek', model: 'deepseek-chat' },
  'glm-turbo': { provider: 'zhipu', model: 'glm-5-turbo' },
  glm51: { provider: 'zhipu', model: 'glm-5.1' },
  minimax: { provider: 'openrouter', model: 'minimax/minimax-m2.7' },
  kimi: { provider: 'openrouter', model: 'moonshotai/kimi-k2.5' },
  qwen: { provider: 'openrouter', model: 'qwen/qwen3.6-plus' },
  'glm-flash': { provider: 'zhipu', model: 'glm-4.7-flashx' },
  'gemini-flash': { provider: 'gemini', model: 'gemini-3-flash-preview' },
  'gemini-flash-lite': { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },  // Added 19.04.2026 for Scout-gestützter Maya-Vergleichstest
  'deepseek-scout': { provider: 'deepseek', model: 'deepseek-chat' },
  'qwen-scout': { provider: 'openrouter', model: 'qwen/qwen3.6-plus' },
};

export interface PoolConfig {
  maya: string[];
  council: string[];
  worker: string[];
  scout: string[];
  distiller: string[];
}

const activePools: PoolConfig = {
  maya: ['glm51'],
  council: ['opus', 'sonnet', 'gpt-5.4'],
  worker: ['glm-turbo', 'glm51', 'minimax', 'kimi', 'qwen'],
  scout: ['deepseek-scout', 'glm-flash', 'gemini-flash'],
  distiller: ['glm-flash'],
};

export function getActivePools(): PoolConfig {
  return activePools;
}

export function updatePools(pools: Partial<PoolConfig>): void {
  if (pools.maya) activePools.maya = pools.maya;
  if (pools.council) activePools.council = pools.council;
  if (pools.worker) activePools.worker = pools.worker;
  if (pools.scout) activePools.scout = pools.scout;
  if (pools.distiller) activePools.distiller = pools.distiller;
}

export interface ResolvedModel {
  id: string;
  provider: string;
  model: string;
}

/** Pick one model from a pool. preferStrong=true picks first, false picks random. */
export function pickFromPool(pool: keyof PoolConfig, preferStrong = true): ResolvedModel | null {
  const ids = activePools[pool];
  if (ids.length === 0) return null;
  const id = preferStrong ? ids[0]! : ids[Math.floor(Math.random() * ids.length)]!;
  const entry = POOL_MODEL_MAP[id];
  if (!entry) return null;
  return { ...entry, id };
}

/** Get ALL active models from a pool, resolved to provider+model. */
export function getAllFromPool(pool: keyof PoolConfig): ResolvedModel[] {
  return activePools[pool]
    .map((id) => {
      const entry = POOL_MODEL_MAP[id];
      if (!entry) return null;
      return { ...entry, id };
    })
    .filter((m): m is ResolvedModel => m !== null);
}
