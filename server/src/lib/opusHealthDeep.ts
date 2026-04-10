export interface DeepHealthResult {
  status: 'ok';
  uptime: number;
  memoryMB: number;
  timestamp: string;
  nodeVersion: string;
}

export function getDeepHealth(): DeepHealthResult {
  return {
    status: 'ok',
    uptime: process.uptime(),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  };
}
