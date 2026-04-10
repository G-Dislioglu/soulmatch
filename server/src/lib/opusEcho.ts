export function echo(msg: string): { echo: string; timestamp: string } {
  return {
    echo: msg,
    timestamp: new Date().toISOString(),
  };
}