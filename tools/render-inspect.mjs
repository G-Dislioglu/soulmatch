#!/usr/bin/env node

const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;

if (!apiKey) {
  console.error('RENDER_API_KEY missing');
  process.exit(1);
}

if (!serviceId) {
  console.error('RENDER_SERVICE_ID missing');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'builder-render-inspect',
};

async function renderFetch(path, init = {}) {
  const response = await fetch(`https://api.render.com/v1${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    json,
  };
}

async function getService() {
  const res = await renderFetch(`/services/${serviceId}`);
  if (!res.ok) {
    throw new Error(`service fetch failed: ${res.status} ${res.text.slice(0, 200)}`);
  }
  return res.json;
}

async function getDeploy(deployId) {
  const res = await renderFetch(`/services/${serviceId}/deploys/${deployId}`);
  if (!res.ok) {
    throw new Error(`deploy fetch failed: ${res.status} ${res.text.slice(0, 200)}`);
  }
  return res.json?.deploy ?? res.json;
}

async function listDeploys(limit = 5) {
  const res = await renderFetch(`/services/${serviceId}/deploys?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`deploy list failed: ${res.status} ${res.text.slice(0, 200)}`);
  }
  return Array.isArray(res.json) ? res.json : [];
}

async function listEnvKeys() {
  const res = await renderFetch(`/services/${serviceId}/env-vars`);
  if (!res.ok) {
    throw new Error(`env fetch failed: ${res.status} ${res.text.slice(0, 200)}`);
  }
  const rows = Array.isArray(res.json) ? res.json : [];
  return rows.map((row) => {
    const envVar = row?.envVar ?? row ?? {};
    return {
      key: String(envVar.key ?? ''),
      hasValue: Boolean(envVar.value),
    };
  });
}

async function listBuildLogs(limit = 50) {
  const service = await getService();
  const ownerId = service?.ownerId ?? service?.owner?.id;
  if (!ownerId) {
    throw new Error('owner id unavailable for build logs');
  }

  const query = new URLSearchParams({
    ownerId: String(ownerId),
    resource: String(serviceId),
    type: 'build',
    limit: String(Math.max(1, Math.min(Number(limit) || 50, 100))),
  });

  const res = await renderFetch(`/logs?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`log fetch failed: ${res.status} ${res.text.slice(0, 200)}`);
  }

  const payload = res.json;
  const data = Array.isArray(payload?.logs)
    ? payload.logs
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

  return data.map((entry) => ({
    timestamp: String(entry?.timestamp ?? entry?.time ?? ''),
    level: typeof entry?.level === 'string' ? entry.level : undefined,
    message: String(entry?.message ?? entry?.text ?? entry?.msg ?? ''),
  }));
}

async function triggerRedeploy({ clearCache = false, commitId = '' }) {
  const body = commitId
    ? { commitId }
    : { clearCache: clearCache ? 'clear' : 'do_not_clear' };

  const res = await renderFetch(`/services/${serviceId}/deploys`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`redeploy failed: ${res.status} ${res.text.slice(0, 200)}`);
  }

  return res.json?.deploy ?? res.json;
}

async function waitDeploy(deployId, timeoutSeconds = 180, intervalSeconds = 10) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < timeoutSeconds) {
    const deploy = await getDeploy(deployId);
    const status = String(deploy?.status ?? 'unknown');

    if (status === 'build_failed') {
      return { ok: false, deploy, terminal: true };
    }

    if (status === 'live' || status === 'deployed' || status === 'update_live') {
      return { ok: true, deploy, terminal: true };
    }

    if (status === 'canceled' || status === 'failed' || status === 'pre_deploy_failed') {
      return { ok: false, deploy, terminal: true };
    }

    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
  }

  return { ok: false, terminal: false, deploy: await getDeploy(deployId) };
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'service': {
        console.log(JSON.stringify(await getService(), null, 2));
        return;
      }
      case 'status': {
        console.log(JSON.stringify(await listDeploys(Number(process.argv[3] || '5')), null, 2));
        return;
      }
      case 'env': {
        console.log(JSON.stringify(await listEnvKeys(), null, 2));
        return;
      }
      case 'logs': {
        console.log(JSON.stringify(await listBuildLogs(Number(process.argv[3] || '50')), null, 2));
        return;
      }
      case 'deploy': {
        const deployId = process.argv[3];
        if (!deployId) {
          throw new Error('deploy id required');
        }
        console.log(JSON.stringify(await getDeploy(deployId), null, 2));
        return;
      }
      case 'redeploy': {
        const clearCache = process.argv.includes('--clear-cache');
        const commitIdx = process.argv.indexOf('--commit');
        const commitId = commitIdx >= 0 ? process.argv[commitIdx + 1] || '' : '';
        console.log(JSON.stringify(await triggerRedeploy({ clearCache, commitId }), null, 2));
        return;
      }
      case 'wait': {
        const deployId = process.argv[3];
        const timeoutSeconds = Number(process.argv[4] || '180');
        const intervalSeconds = Number(process.argv[5] || '10');
        if (!deployId) {
          throw new Error('deploy id required');
        }
        const result = await waitDeploy(deployId, timeoutSeconds, intervalSeconds);
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }
      default:
        throw new Error('usage: render-inspect.mjs <service|status|env|logs|deploy|redeploy|wait>');
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

await main();
