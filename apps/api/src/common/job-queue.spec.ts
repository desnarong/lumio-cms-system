import { describe, expect, it, vi } from 'vitest';
import { InMemoryJobQueue, queueDriverName } from './job-queue';

interface CleanupInput {
  siteId: string;
  paths: string[];
}

describe('InMemoryJobQueue', () => {
  it('queues a job with its own identity and hands it out once', async () => {
    const queue = new InMemoryJobQueue<CleanupInput>('test');

    const job = await queue.add({ siteId: 'site-a', paths: ['/about'] });

    expect(job.id.startsWith('test_')).toBe(true);
    expect(job.attempts).toBe(0);
    expect(job.siteId).toBe('site-a');
    expect(queue.size).toBe(1);

    const taken = await queue.take();
    expect(taken).toEqual(job);
    expect(queue.size).toBe(0);
    expect(await queue.take()).toBeNull();
  });

  it('remembers failures with their reason', async () => {
    const queue = new InMemoryJobQueue<CleanupInput>('test');
    const job = await queue.add({ siteId: 'site-a', paths: [] });

    queue.fail(job, 'renderer responded 500');

    expect(queue.failures).toEqual([{ job, reason: 'renderer responded 500' }]);
  });

  it('consumes jobs until it is stopped, counting attempts', async () => {
    const queue = new InMemoryJobQueue<CleanupInput>('test');
    const seen: string[] = [];

    await queue.add({ siteId: 'site-a', paths: ['/a'] });
    await queue.add({ siteId: 'site-a', paths: ['/b'] });

    const consumer = await queue.consume(
      async (job) => {
        seen.push(job.paths[0] ?? '');
        expect(job.attempts).toBe(1);
      },
      { pollMs: 5 },
    );

    await vi.waitFor(() => expect(seen).toHaveLength(2));
    await consumer.stop();

    await queue.add({ siteId: 'site-a', paths: ['/c'] });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(seen).toEqual(['/a', '/b']);
  });

  it('records a failing handler instead of dying, and keeps draining', async () => {
    const queue = new InMemoryJobQueue<CleanupInput>('test');
    await queue.add({ siteId: 'site-a', paths: ['/broken'] });
    await queue.add({ siteId: 'site-a', paths: ['/fine'] });

    const handled: string[] = [];
    const consumer = await queue.consume(
      async (job) => {
        handled.push(job.paths[0] ?? '');
        if (job.paths[0] === '/broken') throw new Error('boom');
      },
      { pollMs: 5 },
    );

    await vi.waitFor(() => expect(handled).toHaveLength(2));
    await consumer.stop();

    expect(queue.failures).toHaveLength(1);
    expect(queue.failures[0]?.reason).toBe('boom');
  });

  it('closes by dropping anything still waiting', async () => {
    const queue = new InMemoryJobQueue<CleanupInput>('test');
    await queue.add({ siteId: 'site-a', paths: [] });

    await queue.close();

    expect(queue.size).toBe(0);
    expect(queue.driver).toBe('memory');
  });
});

describe('queueDriverName', () => {
  it('defaults to the in-process driver', () => {
    expect(queueDriverName({} as NodeJS.ProcessEnv)).toBe('memory');
    expect(queueDriverName({ QUEUE_DRIVER: 'memory' } as NodeJS.ProcessEnv)).toBe('memory');
  });

  it('switches to Redis when asked', () => {
    expect(queueDriverName({ QUEUE_DRIVER: 'bullmq' } as NodeJS.ProcessEnv)).toBe('bullmq');
  });
});