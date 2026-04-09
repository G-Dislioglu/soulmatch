/**
 * Interface representing a request record for rate limiting.
 * @property timestamps - Array of timestamps for requests within the window.
 * @property lastCleanup - Timestamp of the last cleanup for this record.
 */
interface RequestRecord {
  timestamps: number[];
  lastCleanup: number;
}

/**
 * In-memory rate limiter class.
 * Tracks requests per key within a sliding time window.
 * Automatically cleans up expired entries every 60 seconds.
 */
export class RateLimiter {
  private requests: Map<string, RequestRecord>;
  private maxRequests: number;
  private windowMs: number;
  private cleanupInterval: NodeJS.Timeout | null;

  /**
   * Creates a new RateLimiter instance.
   * @param maxRequests - Maximum number of requests allowed per window.
   * @param windowMs - Time window in milliseconds.
   */
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Starts the automatic cleanup interval (runs every 60 seconds).
   * @private
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  /**
   * Removes expired entries from the request map.
   * @private
   */
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

  /**
   * Checks if a request for the given key is allowed.
   * @param key - The identifier for rate limiting (e.g., IP address, user ID).
   * @returns True if the request is allowed, false if rate limited.
   */
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

  /**
   * Gets the number of remaining requests allowed for the given key.
   * @param key - The identifier for rate limiting.
   * @returns The number of remaining requests within the current window.
   */
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

  /**
   * Stops the cleanup interval and clears all stored requests.
   * Call this method when the rate limiter is no longer needed.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

/**
 * Default rate limiter instance with a limit of 60 requests per 60 seconds.
 */
const defaultLimiter = new RateLimiter(60, 60000);

export default defaultLimiter;
