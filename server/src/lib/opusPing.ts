export function ping(): { pong: true; ts: number } {
  return {
    pong: true,
    ts: Date.now()
  };
}
