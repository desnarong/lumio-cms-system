import Redis from 'ioredis';
import { MemoryAiCache, type AiCache } from './ai.cache';

/** The Redis commands this driver uses, so tests can pass a stub. */
export interface RedisCacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'PX', ttlMs: number): Promise<unknown>;
  quit(): Promise<unknown>;
  disconnect(): void;
  on?(event: 'error', handler: (error: Error) => void): unknown;
}

export interface RedisAiCacheOptions {
  client: RedisCacheClient;
  /** Used when Redis is unreachable, so an answer is never lost to an outage. */
  fallback?: AiCache;
  logger?: { warn: (message: string) => void };
}

/**
 * Shared cache (docs/design/09-ai-assistant.md 9.4). Values are stored as JSON
 * with a millisecond TTL, so every API instance sees the same answers and an
 * expired one disappears on its own. When Redis cannot be reached the driver
 * quietly falls back to the in-process LRU instead of failing the request.
 */
export class RedisAiCache implements AiCache {
  private readonly fallback: AiCache;

  private hits = 0;

  /**
   * ioredis keeps retrying while Redis is down, so a warning per attempt would
   * flood the log of a busy instance. The first failure is reported; the rest
   * are answered from the fallback cache silently.
   */
  private warned = false;

  constructor(private readonly options: RedisAiCacheOptions) {
    this.fallback = options.fallback ?? new MemoryAiCache();
  }

  get size(): number {
    return this.hits;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.options.client.get(this.prefixed(key));
      if (raw === null) return null;
      this.hits += 1;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.warn(error);
      return this.fallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await this.options.client.set(this.prefixed(key), JSON.stringify(value), 'PX', ttlMs);
    } catch (error) {
      this.warn(error);
      await this.fallback.set(key, value, ttlMs);
    }
  }

  async close(): Promise<void> {
    try {
      await this.options.client.quit();
    } catch {
      this.options.client.disconnect();
    }
  }

  private prefixed(key: string): string {
    return `lumio:ai:${key}`;
  }

  private warn(error: unknown): void {
    if (this.warned) return;
    this.warned = true;
    const message = error instanceof Error && error.message.length > 0 ? error.message : 'ไม่ทราบสาเหตุ';
    this.options.logger?.warn(`แคชของผู้ช่วย AI บน Redis ใช้งานไม่ได้: ${message}`);
  }
}

export interface AiCacheOptions {
  redisUrl?: string;
  logger?: { warn: (message: string) => void };
}

/**
 * Builds the cache the AI module injects: Redis when `REDIS_URL` is configured,
 * an in-process LRU otherwise (single instance, tests).
 */
export const createAiCache = (options: AiCacheOptions = {}): AiCache => {
  const memory = new MemoryAiCache();
  const redisUrl = options.redisUrl?.trim();
  if (!redisUrl) return memory;

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    // Fail fast when Redis is down so `get` can use the memory fallback.
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  // One warning for the whole outage, not one per reconnect attempt.
  let warned = false;
  client.on('error', (error: Error) => {
    if (warned) return;
    warned = true;
    options.logger?.warn(
      `แคชของผู้ช่วย AI บน Redis ใช้งานไม่ได้: ${error.message || 'ไม่ทราบสาเหตุ'}`,
    );
  });

  return new RedisAiCache({
    client: client as unknown as RedisCacheClient,
    fallback: memory,
    ...(options.logger ? { logger: options.logger } : {}),
  });
};