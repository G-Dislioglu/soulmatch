import dns from 'node:dns';
import * as net from 'node:net';
import type { LookupFunction } from 'node:net';
import {
  Agent,
  fetch as undiciFetch,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici';

const OUTBOUND_AGENT_OPTIONS = {
  connections: 128,
  pipelining: 1,
} as const;

const DNS_LOOKUP_TTL_MS = 300_000;
const DNS_LOOKUP_MAX_ENTRIES = 256;

type DnsLookupCacheEntry = {
  address: string;
  family: number;
  expires: number;
};

const dnsLookupCache = new Map<string, DnsLookupCacheEntry>();

const DNS_ROTATION_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'EAI_FAIL',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT',
]);

function buildDnsLookupCacheKey(hostname: string, options: Parameters<LookupFunction>[1]): string {
  if (typeof options === 'number') {
    return `${hostname}|family:${options}`;
  }

  return [
    hostname,
    `family:${options.family ?? 0}`,
    `hints:${options.hints ?? 0}`,
    `verbatim:${options.verbatim === true ? 1 : 0}`,
    `order:${options.order ?? 'default'}`,
  ].join('|');
}

function readDnsLookupCache(cacheKey: string): DnsLookupCacheEntry | undefined {
  const now = Date.now();
  const cached = dnsLookupCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  if (cached.expires <= now) {
    dnsLookupCache.delete(cacheKey);
    return undefined;
  }

  dnsLookupCache.delete(cacheKey);
  dnsLookupCache.set(cacheKey, cached);
  return cached;
}

function writeDnsLookupCache(cacheKey: string, address: string, family: number): void {
  if (dnsLookupCache.has(cacheKey)) {
    dnsLookupCache.delete(cacheKey);
  } else if (dnsLookupCache.size >= DNS_LOOKUP_MAX_ENTRIES) {
    const oldestKey = dnsLookupCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      dnsLookupCache.delete(oldestKey);
    }
  }

  dnsLookupCache.set(cacheKey, {
    address,
    family,
    expires: Date.now() + DNS_LOOKUP_TTL_MS,
  });
}

const customLookup = ((hostname, options, callback) => {
  const cacheKey = buildDnsLookupCacheKey(hostname, options);
  const cached = readDnsLookupCache(cacheKey);
  if (cached) {
    callback(null, cached.address, cached.family);
    return;
  }

  dns.lookup(hostname, options, (err, address, family) => {
    if (!err && typeof address === 'string' && typeof family === 'number') {
      writeDnsLookupCache(cacheKey, address, family);
    }

    callback(err, address, family);
  });
}) as LookupFunction;

function createOutboundDispatcher(): Agent {
  return new Agent({
    ...OUTBOUND_AGENT_OPTIONS,
    connect: {
      lookup: customLookup,
    },
  });
}

let outboundDispatcher = createOutboundDispatcher();
let outboundDispatcherGeneration = 0;
let outboundIpv4Dispatcher = new Agent({
  ...OUTBOUND_AGENT_OPTIONS,
  connect: {
    lookup: customLookup,
    family: 4,
  },
});

let outboundDefaultsInstalled = false;

export function installOutboundHttpDefaults(): void {
  if (outboundDefaultsInstalled) {
    return;
  }

  dns.setDefaultResultOrder('ipv4first');
  const netModule = net as typeof net & {
    setDefaultAutoSelectFamily?: (value: boolean) => void;
  };
  netModule.setDefaultAutoSelectFamily?.(false);
  setGlobalDispatcher(outboundDispatcher);
  outboundDefaultsInstalled = true;
}

type OutboundFetchInput = Parameters<typeof undiciFetch>[0];
export type OutboundFetchInit = Exclude<Parameters<typeof undiciFetch>[1], undefined> & {
  dispatcher?: Dispatcher;
};
export type OutboundFetchResponse = Awaited<ReturnType<typeof undiciFetch>>;

type OutboundErrorLike = {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  cause?: unknown;
};

function isOutboundQuiet(): boolean {
  return process.env.OUTBOUND_HTTP_QUIET === '1';
}

function createRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function resolveMethod(input: OutboundFetchInput, init: OutboundFetchInit): string {
  const requestMethod = typeof Request !== 'undefined' && input instanceof Request ? input.method : undefined;
  return (init.method ?? requestMethod ?? 'GET').toUpperCase();
}

function resolveHost(input: OutboundFetchInput): string {
  try {
    if (typeof input === 'string') {
      return new URL(input).hostname || 'unknown';
    }

    if (input instanceof URL) {
      return input.hostname || 'unknown';
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
      return new URL(input.url).hostname || 'unknown';
    }
  } catch {
    return 'unknown';
  }

  return 'unknown';
}

function toErrorLike(err: unknown): OutboundErrorLike {
  if (!err || typeof err !== 'object') {
    return {};
  }

  return err as OutboundErrorLike;
}

function normalizeErrorField(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function normalizeErrorCause(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'object') {
    const causeRecord = value as { code?: unknown; name?: unknown };
    return normalizeErrorField(causeRecord.code) ?? normalizeErrorField(causeRecord.name);
  }

  return normalizeErrorField(value);
}

function normalizeErrorMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isDnsRotationError(err: unknown): boolean {
  const errorLike = toErrorLike(err);
  const causeLike = toErrorLike(errorLike.cause);
  const signals = [
    normalizeErrorField(errorLike.code),
    normalizeErrorField(errorLike.name),
    normalizeErrorField(causeLike.code),
    normalizeErrorField(causeLike.name),
    normalizeErrorMessage(errorLike.message),
    normalizeErrorMessage(causeLike.message),
  ].filter((value): value is string => value !== undefined);

  return signals.some((signal) => {
    const normalized = signal.toUpperCase();
    return DNS_ROTATION_ERROR_CODES.has(normalized)
      || normalized.includes('DNS')
      || normalized.includes('GETADDRINFO')
      || normalized.includes('CACHE OVERFLOW');
  });
}

function recycleOutboundDispatcher(
  staleGeneration: number,
  requestId: string,
  host: string,
  reason: string,
): void {
  if (staleGeneration !== outboundDispatcherGeneration) {
    return;
  }

  const previousDispatcher = outboundDispatcher;
  const previousIpv4Dispatcher = outboundIpv4Dispatcher;
  outboundDispatcherGeneration += 1;
  dnsLookupCache.clear();
  outboundDispatcher = createOutboundDispatcher();
  outboundIpv4Dispatcher = new Agent({
    ...OUTBOUND_AGENT_OPTIONS,
    connect: {
      lookup: customLookup,
      family: 4,
    },
  });
  setGlobalDispatcher(outboundDispatcher);

  if (!isOutboundQuiet()) {
    console.warn('[outbound-recycle]', JSON.stringify({
      requestId,
      host,
      reason,
      previousGeneration: staleGeneration,
      nextGeneration: outboundDispatcherGeneration,
    }));
  }

  void previousDispatcher.close().catch(() => {
    previousDispatcher.destroy();
  });
  void previousIpv4Dispatcher.close().catch(() => {
    previousIpv4Dispatcher.destroy();
  });
}

function shouldForceIpv4Host(host: string): boolean {
  return host === 'api.github.com'
    || host === 'github.com'
    || host === 'raw.githubusercontent.com';
}

function resolveManagedDispatcher(init: OutboundFetchInit, host: string): { dispatcher: Dispatcher; generation: number } {
  if (init.dispatcher) {
    return {
      dispatcher: init.dispatcher,
      generation: -1,
    };
  }

  if (shouldForceIpv4Host(host)) {
    return {
      dispatcher: outboundIpv4Dispatcher,
      generation: outboundDispatcherGeneration,
    };
  }

  return {
    dispatcher: outboundDispatcher,
    generation: outboundDispatcherGeneration,
  };
}

export async function outboundFetch(
  input: OutboundFetchInput,
  init: OutboundFetchInit = {},
): Promise<OutboundFetchResponse> {
  installOutboundHttpDefaults();
  const requestId = createRequestId();
  const method = resolveMethod(input, init);
  const host = resolveHost(input);
  const start = Date.now();

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const managed = resolveManagedDispatcher(init, host);

    try {
      const response = await undiciFetch(input, {
        ...init,
        dispatcher: managed.dispatcher,
      });

      if (!isOutboundQuiet()) {
        console.log('[outbound]', JSON.stringify({
          requestId,
          method,
          host,
          durationMs: Date.now() - start,
          status: response.status,
          ok: response.ok,
          attempt,
          dispatcherGeneration: managed.generation,
        }));
      }

      return response;
    } catch (err: unknown) {
      const errorLike = toErrorLike(err);
      const shouldRetry = !init.dispatcher && attempt === 1 && isDnsRotationError(err);

      if (!isOutboundQuiet()) {
        console.error('[outbound-err]', JSON.stringify({
          requestId,
          method,
          host,
          durationMs: Date.now() - start,
          errName: normalizeErrorField(errorLike.name),
          errCode: normalizeErrorField(errorLike.code),
          errCause: normalizeErrorCause(errorLike.cause),
          attempt,
          dispatcherGeneration: managed.generation,
          retrying: shouldRetry,
        }));
      }

      if (shouldRetry) {
        recycleOutboundDispatcher(
          managed.generation,
          requestId,
          host,
          normalizeErrorCause(errorLike.cause)
            ?? normalizeErrorField(errorLike.code)
            ?? normalizeErrorField(errorLike.name)
            ?? 'dns-error',
        );
        continue;
      }

      throw err;
    }
  }

  throw new Error(`Outbound fetch exhausted retries for ${method} ${host}`);
}

export { outboundDispatcher as OUTBOUND_DISPATCHER };
