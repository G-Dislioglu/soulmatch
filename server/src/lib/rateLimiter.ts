interface RequestRecord {
  timestamps: number[];
  lastCleanup: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord>;
  private maxRequests: number;
  private windowMs: number;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    for (const [key, record] of this.requests.entries()) {
      const validTimestamps = record.timestamps.filter(timestamp => timestamp > cutoff);
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        record.timestamps = validTimestamps;
        record.lastCleanup = now;
      }
    }
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, { timestamps: [now], lastCleanup: now });
      return true;
    }

    const record = this.requests.get(key)!;
    const validTimestamps = record.timestamps.filter(timestamp => timestamp > cutoff);
    
    if (validTimestamps.length < this.maxRequests) {
      validTimestamps.push(now);
      record.timestamps = validTimestamps;
      record.lastCleanup = now;
      return true;
    }

    return false;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      return this.maxRequests;
    }

    const record = this.requests.get(key)!;
    const validTimestamps = record.timestamps.filter(timestamp => timestamp > cutoff);
    
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

const defaultRateLimiter = new RateLimiter(60, 60000);

export default defaultRateLimiter;
