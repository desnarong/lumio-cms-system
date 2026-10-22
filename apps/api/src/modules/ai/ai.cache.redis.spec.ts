import { describe, expect, it, vi } from 'vitest';
import { MemoryAiCache } from './ai.cache';
import { RedisAiCache, createAiCache, type RedisCacheClient } from './ai.cache.redis';

/** In-memory stand-in for ioredis, so the driver is tested without a server. */
const clientStub = (
  options: { fail?: boolean } = {},
): RedisCacheClient & { store: Map<string, { value: string; ttlMs: number }> } => {
  const store = new Map<string, { value: string; ttlMs: number }>();
  return {
    store,
    get: async (key: string) => (options.fail ? Promise.reject(new Error('down')) : (store.get(key)?.value ?? null)),
    set: async (key: string, value: string, _mode: 'PX', ttlMs: number) => {
      if (options.fail) throw new Error('down');
      store.set(key, { value, ttlMs });
      return 'OK';
    },
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };
};

describe('RedisAiCache', () => {
  it('stores JSON with a millisecond TTL and reads it back', async () => {
    const client = clientStub();
    const cache = new RedisAiCache({ client });

    await cache.set('abc', { texts: ['กาแฟ'] }, 60_000);

    expect(client.store.get('lumio:ai:abc')).toEqual({
      value: JSON.stringify({ texts: ['กาแฟ'] }),
      ttlMs: 60_000,
    });
    expect(await cache.get<{ texts: string[] }>('abc')).toEqual({ texts: ['กาแฟ'] });
    expect(cache.size).toBe(1);
  });

  it('reports a miss for a key that is not there', async () => {
    const cache = new RedisAiCache({ client: clientStub() });

    expect(await cache.get('missing')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('keeps working from memory when Redis is unreachable', async () => {
    const warn = vi.fn();
    const cache = new RedisAiCache({ client: clientStub({ fail: true }), logger: { warn } });

    await cache.set('abc', { texts: ['กาแฟ'] }, 60_000);
    const cached = await cache.get<{ texts: string[] }>('abc');

    expect(cached).toEqual({ texts: ['กาแฟ'] });
    expect(warn).toHaveBeenCalled();
  });

  it('closes the connection and never throws on shutdown', async () => {
    const client = clientStub();
    const cache = new RedisAiCache({ client });

    await cache.close();
    expect(client.quit).toHaveBeenCalledTimes(1);

    const failing = new RedisAiCache({
      client: { ...clientStub(), quit: vi.fn().mockRejectedValue(new Error('already gone')) },
    });
    await expect(failing.close()).resolves.toBeUndefined();
  });
});

describe('createAiCache', () => {
  it('uses the in-process cache when no Redis is configured', () => {
    expect(createAiCache({})).toBeInstanceOf(MemoryAiCache);
    expect(createAiCache({ redisUrl: '   ' })).toBeInstanceOf(MemoryAiCache);
  });

  it('uses Redis when REDIS_URL is set', () => {
    const cache = createAiCache({ redisUrl: 'redis://localhost:49537' });

    expect(cache).toBeInstanceOf(RedisAiCache);
    void cache.close?.();
  });
});