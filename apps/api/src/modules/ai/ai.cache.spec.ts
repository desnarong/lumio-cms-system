import { describe, expect, it } from 'vitest';
import { MemoryAiCache } from './ai.cache.js';

describe('MemoryAiCache', () => {
  it('remembers a value until it expires', async () => {
    let now = 1_000;
    const cache = new MemoryAiCache({ now: () => now });

    await cache.set('k', { texts: ['กาแฟ'] }, 5_000);
    expect((await cache.get<{ texts: string[] }>('k'))?.texts).toEqual(['กาแฟ']);

    now += 5_001;
    expect(await cache.get('k')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('reports a miss for a key it never saw', async () => {
    expect(await new MemoryAiCache().get('missing')).toBeNull();
  });

  it('drops the least recently used entry instead of growing forever', async () => {
    const cache = new MemoryAiCache({ maxEntries: 2 });
    await cache.set('a', 1, 60_000);
    await cache.set('b', 2, 60_000);
    // Touching "a" makes "b" the oldest, so "b" is the one that goes.
    expect(await cache.get('a')).toBe(1);
    await cache.set('c', 3, 60_000);

    expect(cache.size).toBe(2);
    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('c')).toBe(3);
  });

  it('refreshes a key that is written twice', async () => {
    const cache = new MemoryAiCache();
    await cache.set('k', 'first', 60_000);
    await cache.set('k', 'second', 60_000);
    expect(await cache.get('k')).toBe('second');
    expect(cache.size).toBe(1);
  });
});