const KEEP_ALIVE_URL = 'https://soulmatch-1.onrender.com/api/health';
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;
const SERVER_STARTED_AT = new Date();

export function startKeepAlive(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const ping = async () => {
    try {
      const response = await fetch(KEEP_ALIVE_URL);
      console.log(`[KeepAlive] ping ${new Date().toISOString()} status=${response.status}`);
    } catch (error) {
      console.error('[KeepAlive] ping failed', new Date().toISOString(), String(error));
    }
  };

  void ping();
  setInterval(() => {
    void ping();
  }, KEEP_ALIVE_INTERVAL_MS);
}

export function getUptimeInfo(): { uptimeSeconds: number, startedAt: string, isHealthy: boolean } {
  const now = new Date();
  const uptimeSeconds = Math.floor((now.getTime() - SERVER_STARTED_AT.getTime()) / 1000);
  
  return {
    uptimeSeconds,
    startedAt: SERVER_STARTED_AT.toISOString(),
    isHealthy: uptimeSeconds > 0
  };
}
