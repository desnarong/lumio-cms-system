/**
 * Small result cache for the assistant (docs/design/09-ai-assistant.md 9.4
 * "cache ผลลัพธ์ตาม hash ของ prompt+context").
 *
 * Two drivers implement it: the in-process LRU used in development and tests, and
 * `RedisAiCache` (see `ai.cache.redis.ts`) which lets every API instance share
 * what the assistant already answered. The interface is asynchronous because of
 * Redis; the memory driver simply resolves immediately.
 */

export const AI_CACHE = 'LUMIO_AI_CACHE';

export interface AiCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  /** Number of live entries this instance knows about (tests, diagnostics). */
  readonly size: number;
  /** Releases any external connection. */
  close?(): Promise<void>;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

export interface MemoryAiCacheOptions {
  /** Oldest entries are dropped past this, so the cache cannot grow forever. */
  maxEntries?: number;
  now?: () => number;
}

export class MemoryAiCache implements AiCache {
  private readonly entries = new Map<string, Entry>();

  private readonly maxEntries: number;

  private readonly now: () => number;

  constructor({ maxEntries = 200, now = Date.now }: MemoryAiCacheOptions = {}) {
    this.maxEntries = maxEntries;
    this.now = now;
  }

  get size(): number {
    return this.entries.size;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    // Re-insert so the most recently used key is the last to be evicted.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }
}