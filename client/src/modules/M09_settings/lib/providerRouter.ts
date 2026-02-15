import type { StudioRequest, StudioResult } from '../../../shared/types/studio';
import type { AiProvider } from '../../../shared/types/settings';
import { loadSettings } from './settingsStorage';

export type LilithIntensity = 'mild' | 'ehrlich' | 'brutal';

// --- Roundtable Cache (localStorage, TTL 24h) ---
const RT_CACHE_PREFIX = 'soulmatch.rt.cache.';
const RT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function stableStringify(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function rtCacheKey(
  provider: string,
  model: string | undefined,
  req: StudioRequest,
  opts?: StudioCallOptions,
): string {
  const keyObj: Record<string, unknown> = {
    provider,
    model: model ?? '',
    mode: req.mode,
    profileId: req.profileId ?? '',
    matchKey: req.matchKey ?? '',
    userMessage: req.userMessage,
    seats: req.seats,
    maxTurns: req.maxTurns,
    lilithIntensity: opts?.lilithIntensity ?? 'ehrlich',
    freeMode: opts?.freeMode ?? false,
  };
  return RT_CACHE_PREFIX + btoa(unescape(encodeURIComponent(stableStringify(keyObj)))).slice(0, 180);
}

function readRtCache(key: string): StudioResult | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { t: number; v: StudioResult };
    if (!parsed?.t || !parsed?.v) return null;
    if (Date.now() - parsed.t > RT_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

function writeRtCache(key: string, value: StudioResult): void {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // ignore quota errors
  }
}

export interface StudioCallOptions {
  lilithIntensity?: LilithIntensity;
  soloPersona?: string;
  freeMode?: boolean;
  chatExcerpt?: string;
}

export interface StudioProvider {
  generateStudio(req: StudioRequest, opts?: StudioCallOptions): Promise<StudioResult>;
}

class LLMProvider implements StudioProvider {
  private providerName: AiProvider;
  private apiKey: string | undefined;
  private model: string | undefined;

  constructor(providerName: AiProvider, apiKey?: string, model?: string) {
    this.providerName = providerName;
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateStudio(req: StudioRequest, opts?: StudioCallOptions): Promise<StudioResult> {
    // Roundtable cache: only for multi-seat, non-solo requests
    const isRoundtable = req.seats && req.seats.length > 1 && !opts?.soloPersona;
    const cacheK = isRoundtable ? rtCacheKey(this.providerName, this.model, req, opts) : '';

    if (isRoundtable) {
      const hit = readRtCache(cacheK);
      if (hit) return hit;
    }

    const res = await fetch('/api/studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioRequest: req,
        provider: this.providerName,
        clientApiKey: this.apiKey,
        model: this.model,
        lilithIntensity: opts?.lilithIntensity ?? 'ehrlich',
        soloPersona: opts?.soloPersona,
        freeMode: opts?.freeMode ?? false,
        chatExcerpt: opts?.chatExcerpt,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
      throw new Error(errData.error ?? `LLM API returned ${res.status}`);
    }

    const out = await res.json() as StudioResult;
    if (isRoundtable) writeRtCache(cacheK, out);
    return out;
  }
}

export function getStudioProvider(): StudioProvider {
  const settings = loadSettings();

  if (!settings.features.llmEnabled) {
    throw new Error('LLM ist nicht aktiviert. Bitte in den Einstellungen aktivieren.');
  }

  const provider = settings.provider.provider;
  if (provider === 'none') {
    throw new Error('Kein Provider ausgewählt. Bitte in den Einstellungen einen Provider wählen.');
  }

  const keyEntry = settings.provider.keys?.[provider];
  const apiKey = keyEntry?.apiKey ?? settings.provider.apiKey;
  const model = settings.provider.model ?? keyEntry?.model;

  return new LLMProvider(provider, apiKey, model);
}
