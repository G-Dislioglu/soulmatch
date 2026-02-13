export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 'llm' | 'api' | 'system' | 'client';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ProviderStats {
  requests: number;
  successes: number;
  failures: number;
  lastError?: string;
  lastErrorAt?: string;
  avgDurationMs: number;
}

class DevLogger {
  private buffer: LogEntry[] = [];
  private maxSize = 200;
  private idCounter = 0;
  private startedAt = new Date().toISOString();
  private stats: Record<string, ProviderStats> = {};
  private durations: Record<string, number[]> = {};

  log(level: LogLevel, category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: ++this.idCounter,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      meta,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }

    // Also log to console for Render logs
    const prefix = `[DEV:${level.toUpperCase()}:${category}]`;
    if (level === 'error') {
      console.error(prefix, message, meta ?? '');
    } else if (level === 'warn') {
      console.warn(prefix, message, meta ?? '');
    } else {
      console.log(prefix, message, meta ?? '');
    }
  }

  info(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.log('info', category, message, meta);
  }

  warn(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.log('warn', category, message, meta);
  }

  error(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.log('error', category, message, meta);
  }

  trackLLMCall(provider: string, durationMs: number, success: boolean, errorMsg?: string): void {
    if (!this.stats[provider]) {
      this.stats[provider] = { requests: 0, successes: 0, failures: 0, avgDurationMs: 0 };
      this.durations[provider] = [];
    }

    const s = this.stats[provider];
    s.requests++;
    if (success) {
      s.successes++;
    } else {
      s.failures++;
      s.lastError = errorMsg;
      s.lastErrorAt = new Date().toISOString();
    }

    this.durations[provider].push(durationMs);
    // Keep last 50 durations for avg
    if (this.durations[provider].length > 50) {
      this.durations[provider].shift();
    }
    const durs = this.durations[provider];
    s.avgDurationMs = Math.round(durs.reduce((a, b) => a + b, 0) / durs.length);
  }

  getLogs(limit = 50, level?: LogLevel, category?: LogCategory): LogEntry[] {
    let entries = [...this.buffer];
    if (level) entries = entries.filter(e => e.level === level);
    if (category) entries = entries.filter(e => e.category === category);
    return entries.slice(-limit).reverse();
  }

  getHealth(): Record<string, unknown> {
    const envKeys = ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'XAI_API_KEY', 'DEV_TOKEN'];
    const envStatus: Record<string, boolean> = {};
    for (const key of envKeys) {
      envStatus[key] = !!process.env[key];
    }

    return {
      uptime: process.uptime(),
      startedAt: this.startedAt,
      nodeVersion: process.version,
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      envStatus,
      providerStats: { ...this.stats },
      totalLogs: this.buffer.length,
      recentErrors: this.buffer.filter(e => e.level === 'error').slice(-5).reverse(),
    };
  }
}

// Singleton
export const devLogger = new DevLogger();
