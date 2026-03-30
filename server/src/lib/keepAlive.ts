const KEEP_ALIVE_URL = 'https://soulmatch-1.onrender.com/api/health';
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;

export function startKeepAlive(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const ping = async () => {
    try {
      const response = await fetch(KEEP_ALIVE_URL);
      console.log(`[keepAlive] ping ${new Date().toISOString()} status=${response.status}`);
    } catch (error) {
      console.error('[keepAlive] ping failed', new Date().toISOString(), String(error));
    }
  };

  void ping();
  setInterval(() => {
    void ping();
  }, KEEP_ALIVE_INTERVAL_MS);
}