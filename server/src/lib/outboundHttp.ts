import dns from 'node:dns';
import * as net from 'node:net';
import { Agent, fetch as undiciFetch, setGlobalDispatcher, type Dispatcher } from 'undici';

const OUTBOUND_DISPATCHER = new Agent({
  connections: 128,
  pipelining: 1,
  connect: {
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
  setGlobalDispatcher(OUTBOUND_DISPATCHER);
  outboundDefaultsInstalled = true;
}

type OutboundFetchInput = Parameters<typeof undiciFetch>[0];
type OutboundFetchInit = NonNullable<Parameters<typeof undiciFetch>[1]> & {
  dispatcher?: Dispatcher;
};

export async function outboundFetch(
  input: OutboundFetchInput,
  init: OutboundFetchInit = {},
): Promise<Response> {
  installOutboundHttpDefaults();
  return undiciFetch(input, {
    ...init,
    dispatcher: init.dispatcher ?? OUTBOUND_DISPATCHER,
  });
}

export { OUTBOUND_DISPATCHER };