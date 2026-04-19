/**
 * poolState.ts — Shared pool configuration with DB persistence (S33/F7)
 *
 * Central source of truth for which models are active in each pool.
 * Updated by POST /maya/pools from the frontend.
 * Read by Scout, Distiller, Council, and Worker pipeline modules.
 *
 * Persistence (F7, 2026-04-19):
 *  - On server start, call `initializePoolState()` — it ensures the pool_state
 *    table exists and loads any persisted config from DB into activePools.
 *  - `updatePools()` still updates the in-memory state synchronously, then
 *    fires an async write-back to the DB (fire-and-forget, does not block
 *    HTTP response).
 *  - If DB is unreachable at startup, we log a warning and fall back to code
 *    defaults below. Same on write failure: log-and-continue.
 *  - The code default below remains the safety net; if the DB row is missing
 *    or corrupt, we land on this config.
 */

import { sql, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { poolState as poolStateTable } from '../schema/builder.js';

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

let persistenceInitialized = false;

/**
 * Call once at server start. Creates the pool_state table if missing,
 * then loads any persisted config into activePools. Safe to call multiple
 * times — subsequent calls are no-ops.
 */
export async function initializePoolState(): Promise<void> {
  if (persistenceInitialized) return;

  try {
    const db = getDb();

    // Ensure table exists (idempotent — matches schema/builder.ts definition).
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pool_state (
        id INTEGER PRIMARY KEY,
        pools_json TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Load the singleton row (id=1).
    const rows = await db.select().from(poolStateTable).where(eq(poolStateTable.id, 1));
    if (rows.length > 0 && rows[0]) {
      try {
        const loaded = JSON.parse(rows[0].poolsJson) as Partial<PoolConfig>;
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
    // Mark initialized anyway so we dont retry on every request.
    persistenceInitialized = true;
  }
}

export function getActivePools(): PoolConfig {
  return activePools;
}

export function updatePools(pools: Partial<PoolConfig>): void {
  if (pools.maya) activePools.maya = pools.maya;
  if (pools.council) activePools.council = pools.council;
  if (pools.worker) activePools.worker = pools.worker;
  if (pools.scout) activePools.scout = pools.scout;
  if (pools.distiller) activePools.distiller = pools.distiller;

  // Fire-and-forget persist (does not block HTTP response).
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
