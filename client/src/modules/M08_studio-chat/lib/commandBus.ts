/**
 * Maya Command Bus
 *
 * Queues MayaCommands and dispatches them sequentially with a small
 * delay between each so animations don't collide.
 */

import type { MayaCommand } from './commandParser';

export type CommandDispatcher = (cmd: MayaCommand) => Promise<void>;

export interface CommandBus {
  push(cmd: MayaCommand): void;
  pushAll(cmds: MayaCommand[]): void;
  clear(): void;
}

export function createCommandBus(dispatch: CommandDispatcher): CommandBus {
  const queue: MayaCommand[] = [];
  let processing = false;

  async function processQueue() {
    if (processing || queue.length === 0) return;
    processing = true;

    while (queue.length > 0) {
      const cmd = queue.shift()!;
      await dispatch(cmd);
      if (queue.length > 0) await sleep(400);
    }

    processing = false;
  }

  return {
    push(cmd: MayaCommand) {
      queue.push(cmd);
      processQueue();
    },
    pushAll(cmds: MayaCommand[]) {
      for (const c of cmds) queue.push(c);
      processQueue();
    },
    clear() {
      queue.length = 0;
    },
  };
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
