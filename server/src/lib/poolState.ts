/**
 * Shared pool configuration with DB persistence.
 *
 * Central source of truth for:
 * - which models are active in each pool
 * - which models are available per pool
 * - how the Builder UI labels those models
 */

import { sql, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { poolState as poolStateTable } from '../schema/builder.js';

export interface PoolConfig {
  maya: string[];
  council: string[];
  worker: string[];
  scout: string[];
  distiller: string[];
}

export type PoolType = keyof PoolConfig;

export interface PoolModelCatalogEntry {
  id: string;
  label: string;
  provider: string;
  model: string;
  quality: number;
  speed: 'slow' | 'medium' | 'fast';
  color: string;
  pools: PoolType[];
}

export const POOL_MODEL_CATALOG: Record<string, PoolModelCatalogEntry> = {
  opus: {
    id: 'opus',
    label: 'Opus 4.7',
    provider: 'anthropic',
    model: 'claude-opus-4-7',
    quality: 95,
    speed: 'slow',
    color: '#7c6af7',
    pools: ['maya', 'council'],
  },
  sonnet: {
    id: 'sonnet',
    label: 'Sonnet 4.6',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    quality: 85,
    speed: 'fast',
    color: '#a78bfa',
    pools: ['maya', 'council'],
  },
  'gpt-5.4': {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    provider: 'openai',
    model: 'gpt-5.4',
    quality: 88,
    speed: 'medium',
    color: '#22d3ee',
    pools: ['maya', 'council'],
  },
  grok: {
    id: 'grok',
    label: 'Grok 4.1',
    provider: 'xai',
    model: 'grok-4-1-fast',
    quality: 80,
    speed: 'fast',
    color: '#ef4444',
    pools: ['maya', 'council'],
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    quality: 72,
    speed: 'fast',
    color: '#4ade80',
    pools: ['council', 'worker'],
  },
  'glm-turbo': {
    id: 'glm-turbo',
    label: 'GLM 5 Turbo',
    provider: 'zhipu',
    model: 'glm-5-turbo',
    quality: 68,
    speed: 'fast',
    color: '#34d399',
    pools: ['maya', 'council', 'worker'],
  },
  glm51: {
    id: 'glm51',
    label: 'GLM 5.1',
    provider: 'zhipu',
    model: 'glm-5.1',
    quality: 90,
    speed: 'medium',
    color: '#22c55e',
    pools: ['maya', 'council', 'worker'],
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax M2.7',
    provider: 'openrouter',
    model: 'minimax/minimax-m2.7',
    quality: 60,
    speed: 'medium',
    color: '#fbbf24',
    pools: ['council', 'worker'],
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi K2.5',
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2.5',
    quality: 65,
    speed: 'medium',
    color: '#f472b6',
    pools: ['council', 'worker'],
  },
  qwen: {
    id: 'qwen',
    label: 'Qwen 3.6+',
    provider: 'openrouter',
    model: 'qwen/qwen3.6-plus',
    quality: 58,
    speed: 'fast',
    color: '#a78bfa',
    pools: ['council', 'worker'],
  },
  'glm-flash': {
    id: 'glm-flash',
    label: 'GLM FlashX',
    provider: 'zhipu',
    model: 'glm-4.7-flashx',
    quality: 72,
    speed: 'fast',
    color: '#34d399',
    pools: ['distiller', 'scout'],
  },
  'gemini-flash': {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    quality: 78,
    speed: 'fast',
    color: '#d4af37',
    pools: ['distiller', 'scout'],
  },
  'gemini-flash-lite': {
    id: 'gemini-flash-lite',
    label: 'Gemini Flash Lite',
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite-preview',
    quality: 70,
    speed: 'fast',
    color: '#eab308',
    pools: ['scout'],
  },
  'deepseek-scout': {
    id: 'deepseek-scout',
    label: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    quality: 70,
    speed: 'fast',
    color: '#4ade80',
    pools: ['distiller', 'scout'],
  },
  'qwen-scout': {
    id: 'qwen-scout',
    label: 'Qwen 3.6+',
    provider: 'openrouter',
    model: 'qwen/qwen3.6-plus',
    quality: 55,
    speed: 'fast',
    color: '#a78bfa',
    pools: ['distiller', 'scout'],
  },
};

export const POOL_MODEL_MAP: Record<string, { provider: string; model: string }> = Object.fromEntries(
  Object.values(POOL_MODEL_CATALOG).map((entry) => [entry.id, { provider: entry.provider, model: entry.model }]),
);

const POOL_AVAILABLE_MODELS: Record<PoolType, string[]> = {
  maya: Object.values(POOL_MODEL_CATALOG).filter((entry) => entry.pools.includes('maya')).map((entry) => entry.id),
  council: Object.values(POOL_MODEL_CATALOG).filter((entry) => entry.pools.includes('council')).map((entry) => entry.id),
  worker: Object.values(POOL_MODEL_CATALOG).filter((entry) => entry.pools.includes('worker')).map((entry) => entry.id),
  scout: Object.values(POOL_MODEL_CATALOG).filter((entry) => entry.pools.includes('scout')).map((entry) => entry.id),
  distiller: Object.values(POOL_MODEL_CATALOG).filter((entry) => entry.pools.includes('distiller')).map((entry) => entry.id),
};

const activePools: PoolConfig = {
  maya: ['glm51'],
  council: ['opus', 'sonnet', 'gpt-5.4'],
  worker: ['glm-turbo', 'glm51', 'minimax', 'kimi', 'qwen'],
  scout: ['deepseek-scout', 'glm-flash', 'gemini-flash'],
  distiller: ['glm-flash'],
};

let persistenceInitialized = false;

function normalizePoolIds(pool: PoolType, ids: string[]): string[] {
  const allowed = new Set(POOL_AVAILABLE_MODELS[pool]);
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const id of ids) {
    if (!allowed.has(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

function getNormalizedPoolConfig(input: Partial<PoolConfig>): Partial<PoolConfig> {
  const next: Partial<PoolConfig> = {};
  if (Array.isArray(input.maya)) next.maya = normalizePoolIds('maya', input.maya).slice(0, 1);
  if (Array.isArray(input.council)) next.council = normalizePoolIds('council', input.council);
  if (Array.isArray(input.worker)) next.worker = normalizePoolIds('worker', input.worker);
  if (Array.isArray(input.scout)) next.scout = normalizePoolIds('scout', input.scout);
  if (Array.isArray(input.distiller)) next.distiller = normalizePoolIds('distiller', input.distiller);
  return next;
}

export async function initializePoolState(): Promise<void> {
  if (persistenceInitialized) return;

  try {
    const db = getDb();

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pool_state (
        id INTEGER PRIMARY KEY,
        pools_json TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const rows = await db.select().from(poolStateTable).where(eq(poolStateTable.id, 1));
    if (rows.length > 0 && rows[0]) {
      try {
        const loaded = getNormalizedPoolConfig(JSON.parse(rows[0].poolsJson) as Partial<PoolConfig>);
        if (Array.isArray(loaded.maya)) activePools.maya = loaded.maya;
        if (Array.isArray(loaded.council)) activePools.council = loaded.council;
        if (Array.isArray(loaded.worker)) activePools.worker = loaded.worker;
        if (Array.isArray(loaded.scout)) activePools.scout = loaded.scout;
        if (Array.isArray(loaded.distiller)) activePools.distiller = loaded.distiller;
        console.log('[poolState] Loaded persisted config from DB', {
          maya: activePools.maya.length,
          council: activePools.council.length,
          worker: activePools.worker.length,
          scout: activePools.scout.length,
          distiller: activePools.distiller.length,
          updatedAt: rows[0].updatedAt,
        });
      } catch (parseErr) {
        console.warn('[poolState] Failed to parse persisted pools_json, using code defaults:', parseErr);
      }
    } else {
      console.log('[poolState] No persisted config row yet, using code defaults');
    }

    persistenceInitialized = true;
  } catch (err) {
    console.warn('[poolState] DB initialization failed, using code defaults:', err);
    persistenceInitialized = true;
  }
}

export function getActivePools(): PoolConfig {
  return activePools;
}

export interface PoolConfigSnapshot {
  selectionMode: 'manual';
  autoSelectionAvailable: true;
  active: PoolConfig;
  available: Record<PoolType, string[]>;
  models: PoolModelCatalogEntry[];
}

export function getPoolConfigSnapshot(): PoolConfigSnapshot {
  return {
    selectionMode: 'manual',
    autoSelectionAvailable: true,
    active: {
      maya: [...activePools.maya],
      council: [...activePools.council],
      worker: [...activePools.worker],
      scout: [...activePools.scout],
      distiller: [...activePools.distiller],
    },
    available: {
      maya: [...POOL_AVAILABLE_MODELS.maya],
      council: [...POOL_AVAILABLE_MODELS.council],
      worker: [...POOL_AVAILABLE_MODELS.worker],
      scout: [...POOL_AVAILABLE_MODELS.scout],
      distiller: [...POOL_AVAILABLE_MODELS.distiller],
    },
    models: Object.values(POOL_MODEL_CATALOG),
  };
}

export function updatePools(pools: Partial<PoolConfig>): void {
  const normalized = getNormalizedPoolConfig(pools);
  if (normalized.maya) activePools.maya = normalized.maya;
  if (normalized.council) activePools.council = normalized.council;
  if (normalized.worker) activePools.worker = normalized.worker;
  if (normalized.scout) activePools.scout = normalized.scout;
  if (normalized.distiller) activePools.distiller = normalized.distiller;
  void persistPoolsAsync();
}

async function persistPoolsAsync(): Promise<void> {
  try {
    const db = getDb();
    const json = JSON.stringify(activePools);
    await db.execute(sql`
      INSERT INTO pool_state (id, pools_json, updated_at)
      VALUES (1, ${json}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        pools_json = EXCLUDED.pools_json,
        updated_at = NOW()
    `);
  } catch (err) {
    console.warn('[poolState] Persist failed:', err);
  }
}

export interface ResolvedModel {
  id: string;
  provider: string;
  model: string;
}

export function pickFromPool(pool: PoolType, preferStrong = true): ResolvedModel | null {
  const ids = activePools[pool];
  if (ids.length === 0) return null;
  const id = preferStrong ? ids[0]! : ids[Math.floor(Math.random() * ids.length)]!;
  const entry = POOL_MODEL_MAP[id];
  if (!entry) return null;
  return { ...entry, id };
}

export function getAllFromPool(pool: PoolType): ResolvedModel[] {
  return activePools[pool]
    .map((id) => {
      const entry = POOL_MODEL_MAP[id];
      if (!entry) return null;
      return { ...entry, id };
    })
    .filter((model): model is ResolvedModel => model !== null);
}
