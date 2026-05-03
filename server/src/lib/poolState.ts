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
  visionCapable?: boolean;
  supportsMultiImage?: boolean;
  supportsWebResearch?: boolean;
  recommendedVisualRoles?: string[];
  experimental?: boolean;
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
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['ui_review', 'layout_drift', 'multi_state_review'],
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
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['ui_review', 'ocr_and_label_check'],
  },
  'gpt-5.5': {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    provider: 'openai',
    model: 'gpt-5.5',
    quality: 88,
    speed: 'medium',
    color: '#22d3ee',
    pools: ['maya', 'council'],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['ui_review', 'frontend_recreation_hint', 'ocr_and_label_check'],
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
    label: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
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
    label: 'Kimi K2.6',
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2.6',
    quality: 65,
    speed: 'medium',
    color: '#f472b6',
    pools: ['council', 'worker'],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['multi_state_review', 'frontend_recreation_hint'],
  },
  mimo: {
    id: 'mimo',
    label: 'MiMo V2.5',
    provider: 'openrouter',
    model: 'xiaomi/mimo-v2.5',
    quality: 74,
    speed: 'medium',
    color: '#fb7185',
    pools: ['council', 'worker'],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['frontend_recreation_hint', 'ui_review'],
  },
  'mimo-pro': {
    id: 'mimo-pro',
    label: 'MiMo V2.5 Pro',
    provider: 'openrouter',
    model: 'xiaomi/mimo-v2.5-pro',
    quality: 82,
    speed: 'medium',
    color: '#f43f5e',
    pools: ['council', 'worker'],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['frontend_recreation_hint', 'multi_state_review'],
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
  'gemini-pro': {
    id: 'gemini-pro',
    label: 'Gemini 3 Pro Preview',
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    quality: 91,
    speed: 'medium',
    color: '#c084fc',
    pools: [],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['multi_state_review', 'ui_review', 'layout_drift'],
  },
  'qwen-vl': {
    id: 'qwen-vl',
    label: 'Qwen3 VL 32B',
    provider: 'openrouter',
    model: 'qwen/qwen3-vl-32b-instruct',
    quality: 86,
    speed: 'medium',
    color: '#8b5cf6',
    pools: [],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['ocr_and_label_check', 'ui_review'],
  },
  'glm-46v': {
    id: 'glm-46v',
    label: 'GLM 4.6V',
    provider: 'zhipu',
    model: 'glm-4.6v',
    quality: 84,
    speed: 'medium',
    color: '#10b981',
    pools: [],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['frontend_recreation_hint', 'layout_drift'],
  },
  'glm-5v': {
    id: 'glm-5v',
    label: 'GLM 5V Turbo',
    provider: 'zhipu',
    model: 'glm-5v-turbo',
    quality: 89,
    speed: 'medium',
    color: '#06b6d4',
    pools: [],
    visionCapable: true,
    supportsMultiImage: true,
    supportsWebResearch: false,
    recommendedVisualRoles: ['frontend_recreation_hint', 'ui_review', 'multi_state_review'],
  },
  'deepseek-scout': {
    id: 'deepseek-scout',
    label: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
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
  council: ['opus', 'sonnet', 'gpt-5.5'],
  worker: ['glm-turbo', 'glm51', 'minimax', 'kimi', 'mimo', 'qwen'],
  scout: ['deepseek-scout', 'glm-flash', 'gemini-flash'],
  distiller: ['glm-flash'],
};

let persistenceInitialized = false;
const POOL_ID_ALIASES: Record<string, string> = {
  'gpt-5.4': 'gpt-5.5',
};

function normalizePoolIds(pool: PoolType, ids: string[]): string[] {
  const allowed = new Set(POOL_AVAILABLE_MODELS[pool]);
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawId of ids) {
    const id = POOL_ID_ALIASES[rawId] ?? rawId;
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

export function getPoolModelCatalogEntry(id: string): PoolModelCatalogEntry | null {
  return POOL_MODEL_CATALOG[id] ?? null;
}

export function getVisionCapableModels(): PoolModelCatalogEntry[] {
  return Object.values(POOL_MODEL_CATALOG).filter((entry) => entry.visionCapable === true);
}

export function resolveModelById(id: string): ResolvedModel | null {
  const entry = POOL_MODEL_MAP[id];
  if (!entry) {
    return null;
  }
  return { id, provider: entry.provider, model: entry.model };
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
