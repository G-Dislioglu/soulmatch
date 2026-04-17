// Render API Bridge — Allows the Builder to monitor and control the Render deployment
// Requires: RENDER_API_KEY and RENDER_SERVICE_ID env vars on Render

import { outboundFetch } from './outboundHttp.js';

const RENDER_API = 'https://api.render.com/v1';

function getConfig() {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID || 'srv-d69537c9c44c7384tl50';
  return { apiKey, serviceId };
}

async function renderFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { apiKey } = getConfig();
  if (!apiKey) {
    throw new Error('RENDER_API_KEY not set');
  }

  return outboundFetch(`${RENDER_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// ==================== Deploy Status ====================

export interface DeployInfo {
  id: string;
  status: string;
  commit?: { id: string; message: string; createdAt: string };
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export async function getDeployStatus(): Promise<{
  configured: boolean;
  latest?: DeployInfo;
  recent?: DeployInfo[];
  error?: string;
}> {
  const { apiKey, serviceId } = getConfig();
  if (!apiKey || !serviceId) {
    return {
      configured: false,
      error: !apiKey
        ? 'RENDER_API_KEY not set — create one at dashboard.render.com/account/api-keys'
        : 'RENDER_SERVICE_ID not set',
    };
  }

  try {
    const res = await renderFetch(`/services/${serviceId}/deploys?limit=5`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { configured: true, error: `Render API ${res.status}: ${text.slice(0, 200)}` };
    }

    const deploys = (await res.json()) as Array<{ deploy: Record<string, unknown> }>;
    const mapped: DeployInfo[] = deploys.map((d) => {
      const deploy = d.deploy ?? d;
      return {
        id: String(deploy.id ?? ''),
        status: String(deploy.status ?? 'unknown'),
        commit: deploy.commit
          ? {
              id: String((deploy.commit as Record<string, unknown>).id ?? ''),
              message: String((deploy.commit as Record<string, unknown>).message ?? ''),
              createdAt: String((deploy.commit as Record<string, unknown>).createdAt ?? ''),
            }
          : undefined,
        createdAt: String(deploy.createdAt ?? ''),
        updatedAt: String(deploy.updatedAt ?? ''),
        finishedAt: deploy.finishedAt ? String(deploy.finishedAt) : undefined,
      };
    });

    return {
      configured: true,
      latest: mapped[0],
      recent: mapped,
    };
  } catch (err) {
    return { configured: true, error: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ==================== Trigger Redeploy ====================

export async function triggerRedeploy(): Promise<{
  triggered: boolean;
  deployId?: string;
  error?: string;
}> {
  const { apiKey, serviceId } = getConfig();
  if (!apiKey || !serviceId) {
    return { triggered: false, error: 'RENDER_API_KEY or RENDER_SERVICE_ID not set' };
  }

  try {
    const res = await renderFetch(`/services/${serviceId}/deploys`, {
      method: 'POST',
      body: JSON.stringify({ clearCache: 'do_not_clear' }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { triggered: false, error: `Render API ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    const deploy = (data.deploy ?? data) as Record<string, unknown>;
    return { triggered: true, deployId: String(deploy.id ?? '') };
  } catch (err) {
    return { triggered: false, error: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ==================== Environment Variables ====================

export interface EnvVarInfo {
  key: string;
  hasValue: boolean; // never expose actual values
}

export async function listEnvVars(): Promise<{
  vars?: EnvVarInfo[];
  error?: string;
}> {
  const { apiKey, serviceId } = getConfig();
  if (!apiKey || !serviceId) {
    return { error: 'RENDER_API_KEY or RENDER_SERVICE_ID not set' };
  }

  try {
    const res = await renderFetch(`/services/${serviceId}/env-vars`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `Render API ${res.status}: ${text.slice(0, 200)}` };
    }

    const vars = (await res.json()) as Array<{ envVar: { key: string; value: string } }>;
    return {
      vars: vars.map((v) => {
        const envVar = v.envVar ?? v;
        return {
          key: String((envVar as Record<string, unknown>).key ?? ''),
          hasValue: Boolean((envVar as Record<string, unknown>).value),
        };
      }),
    };
  } catch (err) {
    return { error: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function updateEnvVar(
  key: string,
  value: string,
): Promise<{ updated: boolean; error?: string }> {
  const { apiKey, serviceId } = getConfig();
  if (!apiKey || !serviceId) {
    return { updated: false, error: 'RENDER_API_KEY or RENDER_SERVICE_ID not set' };
  }

  // Safety: never allow overwriting critical keys from the API
  const PROTECTED_KEYS = new Set(['DATABASE_URL', 'RENDER_API_KEY', 'GITHUB_PAT']);
  if (PROTECTED_KEYS.has(key)) {
    return { updated: false, error: `${key} is protected and cannot be changed via API` };
  }

  try {
    const res = await renderFetch(`/services/${serviceId}/env-vars/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { updated: false, error: `Render API ${res.status}: ${text.slice(0, 200)}` };
    }

    return { updated: true };
  } catch (err) {
    return { updated: false, error: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ==================== Server Info (local, no API key needed) ====================

const SERVER_START_TIME = Date.now();

export function getServerInfo() {
  return {
    uptime: process.uptime(),
    uptimeFormatted: formatUptime(process.uptime()),
    nodeVersion: process.version,
    serverStartedAt: new Date(SERVER_START_TIME).toISOString(),
    env: process.env.NODE_ENV || 'development',
    platform: process.platform,
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
