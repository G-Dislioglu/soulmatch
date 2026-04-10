export function echo(msg: string): { echo: string; ts: number } {
  return {
    echo: msg,
    ts: Date.now(),
  };
}