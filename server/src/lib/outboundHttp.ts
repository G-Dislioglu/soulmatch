import dns from 'node:dns';
import * as net from 'node:net';
import {
  Agent,
  fetch as undiciFetch,
  setGlobalDispatcher,
  type Dispatcher,
} from 'undici';

const OUTBOUND_DISPATCHER = new Agent({
  connections: 128,
  pipelining: 1,
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
  setGlobalDispatcher(OUTBOUND_DISPATCHER);
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

export async function outboundFetch(
  input: OutboundFetchInput,
  init: OutboundFetchInit = {},
): Promise<OutboundFetchResponse> {
  installOutboundHttpDefaults();
  const requestId = createRequestId();
  const method = resolveMethod(input, init);
  const host = resolveHost(input);
  const start = Date.now();

  try {
    const response = await undiciFetch(input, {
      ...init,
      dispatcher: init.dispatcher ?? OUTBOUND_DISPATCHER,
    });

    if (!isOutboundQuiet()) {
      console.log('[outbound]', JSON.stringify({
        requestId,
        method,
        host,
        durationMs: Date.now() - start,
        status: response.status,
        ok: response.ok,
      }));
    }

    return response;
  } catch (err: unknown) {
    if (!isOutboundQuiet()) {
      const errorLike = toErrorLike(err);
      console.error('[outbound-err]', JSON.stringify({
        requestId,
        method,
        host,
        durationMs: Date.now() - start,
        errName: normalizeErrorField(errorLike.name),
        errCode: normalizeErrorField(errorLike.code),
        errCause: normalizeErrorCause(errorLike.cause),
      }));
    }

    throw err;
  }
}

export { OUTBOUND_DISPATCHER };