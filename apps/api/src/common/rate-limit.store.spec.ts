import { describe, expect, it, vi } from 'vitest';
import { MemoryRateLimitStore, createRateLimitStore } from './rate-limit.store';

describe('MemoryRateLimitStore', () => {
  it('counts hits inside the window', async () => {
    const store = new MemoryRateLimitStore();

    const first = await store.hit('a', 60_000);
    const second = await store.hit('a', 60_000);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(second.resetAt).toBeGreaterThanOrEqual(first.resetAt);
  });

  it('starts a fresh window once the old one expires', async () => {
    vi.useFakeTimers();
    try {
      const store = new MemoryRateLimitStore();
      await store.hit('a', 1_000);
      vi.advanceTimersByTime(1_500);

      expect((await store.hit('a', 1_000)).count).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears a key on reset', async () => {
    const store = new MemoryRateLimitStore();
    await store.hit('a', 60_000);
    await store.hit('a', 60_000);

    await store.reset('a');

    expect((await store.hit('a', 60_000)).count).toBe(1);
  });

  it('evicts the least recently used key instead of clearing every counter', async () => {
    const store = new MemoryRateLimitStore(2);
    await store.hit('first', 60_000);
    await store.hit('second', 60_000);
    await store.hit('first', 60_000); // refresh "first" so it is not the oldest
    await store.hit('third', 60_000); // over capacity -> drops "second"

    expect(store.size).toBe(2);
    // The active client keeps its counter, so a flood cannot reset it.
    expect((await store.hit('first', 60_000)).count).toBe(3);
  });
});

describe('createRateLimitStore', () => {
  it('keeps counters in memory when no Redis is configured', () => {
    expect(createRateLimitStore({})).toBeInstanceOf(MemoryRateLimitStore);
    expect(createRateLimitStore({ redisUrl: '  ' })).toBeInstanceOf(MemoryRateLimitStore);
  });

  it('reports a Redis outage once instead of on every retry', async () => {
    const warn = vi.fn();
    const store = createRateLimitStore({ redisUrl: 'redis://127.0.0.1:1', logger: { warn } });

    // The client emits an error per reconnect attempt; the store must not log
    // each of them.
    const client = (store as unknown as { client?: { emit?: (event: string, error: Error) => void } })
      .client;
    if (client?.emit) {
      client.emit('error', new Error('connection refused'));
      client.emit('error', new Error('connection refused'));
      expect(warn).toHaveBeenCalledTimes(1);
    }

    await store.close?.();
  });
});
