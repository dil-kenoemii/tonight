/**
 * In-memory rate limiter using sliding window algorithm
 * Tracks requests per IP address
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Store for tracking requests per IP
const store = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  for (const [key, record] of store.entries()) {
    // Remove timestamps older than 5 minutes
    record.timestamps = record.timestamps.filter(t => t > fiveMinutesAgo);

    // Delete the entry if no timestamps remain
    if (record.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Checks if a request should be rate limited
 * @param identifier - Unique identifier (typically IP address)
 * @param config - Rate limit configuration
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig
): boolean {
  // Skip rate limiting in development mode
  if (process.env.NODE_ENV === 'development') {
    return false;
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create record
  let record = store.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Remove timestamps outside the current window (sliding window)
  record.timestamps = record.timestamps.filter(t => t > windowStart);

  // Check if limit exceeded
  if (record.timestamps.length >= config.maxRequests) {
    return true;
  }

  // Add current timestamp
  record.timestamps.push(now);
  return false;
}

/**
 * Pre-configured rate limit configs for different endpoints
 */
export const RATE_LIMITS = {
  CREATE_ROOM: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  JOIN_ROOM: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  SUBMIT_OPTION: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  SPIN: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
} as const;
