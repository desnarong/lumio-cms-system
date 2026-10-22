import Redis from 'ioredis';

export interface RateLimitResult {
  /** Hits seen for the key inside the current window. */
  count: number;
  /** Epoch milliseconds at which the window resets. */
  resetAt: number;
}

export interface RateLimitStore {
  /** Counts one hit for `key` inside a `windowMs` fixed window. */
  hit(key: string, windowMs: number): Promise<RateLimitResult>;
  /** Clears a key, e.g. after a successful login. */
  reset(key: string): Promise<void>;
  /** Releases any external connection. */
  close?(): Promise<void>;
}

const MAX_TRACKED_KEYS = 10_000;

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Process-local fallback. When the map is full it drops expired entries and
 * then the least-recently-used key, so a flood of new keys can no longer reset
 * the counters of clients that are actively being limited
 * (docs/design/15-security.md 15.2).
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly maxKeys: number = MAX_TRACKED_KEYS) {}

  async hit(key: string, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (existing && existing.resetAt > now) {
      existing.count += 1;
      // Re-insert so the most recently used key moves to the end of the LRU order.
      this.buckets.delete(key);
      this.buckets.set(key, existing);
      return { count: existing.count, resetAt: existing.resetAt };
    }

    if (existing) this.buckets.delete(key);
    this.evict(now);

    const bucket: Bucket = { count: 1, resetAt: now + windowMs };
    this.buckets.set(key, bucket);
    return { count: bucket.count, resetAt: bucket.resetAt };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  /** Number of keys currently tracked (used by tests). */
  get size(): number {
    return this.buckets.size;
  }

  private evict(now: number): void {
    if (this.buckets.size < this.maxKeys) return;

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }

    while (this.buckets.size >= this.maxKeys) {
      const oldest = this.buckets.keys().next().value;
      if (oldest === undefined) break;
      this.buckets.delete(oldest);
    }
  }
}

/**
 * Atomic fixed window on Redis so every API instance shares one counter
 * (`INCR` + `PEXPIRE` on the first hit). If Redis is unreachable the store
 * falls back to memory instead of failing the request.
 */
const FIXED_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

export class RedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly client: Redis,
    private readonly fallback: RateLimitStore = new MemoryRateLimitStore(),
  ) {}

  async hit(key: string, windowMs: number): Promise<RateLimitResult> {
    try {
      const [count, ttl] = (await this.client.eval(
        FIXED_WINDOW_SCRIPT,
        1,
        `ratelimit:${key}`,
        String(windowMs),
      )) as [number | string, number | string];
      return { count: Number(count), resetAt: Date.now() + Number(ttl) };
    } catch {
      return this.fallback.hit(key, windowMs);
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.client.del(`ratelimit:${key}`);
    } catch {
      await this.fallback.reset(key);
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}

export interface RateLimitStoreOptions {
  redisUrl?: string;
  logger?: { warn: (message: string) => void };
}

/**
 * Builds the shared counter store: Redis when `REDIS_URL` is configured, an
 * in-process LRU otherwise (single instance or tests).
 */
export const createRateLimitStore = (options: RateLimitStoreOptions = {}): RateLimitStore => {
  const memory = new MemoryRateLimitStore();
  const redisUrl = options.redisUrl?.trim();
  if (!redisUrl) return memory;

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    // Fail fast when Redis is down so `hit` can use the memory fallback.
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  // ioredis retries while Redis is down; report the outage once instead of
  // flooding the log with one line per attempt.
  let warned = false;
  client.on('error', (error: Error) => {
    if (warned) return;
    warned = true;
    options.logger?.warn(
      `ที่เก็บตัวนับ rate limit บน Redis ใช้งานไม่ได้: ${error.message || 'ไม่ทราบสาเหตุ'}`,
    );
  });

  return new RedisRateLimitStore(client, memory);
};
