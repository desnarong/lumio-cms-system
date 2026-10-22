import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BullMqJobQueue, connectionFromRedisUrl, createJobQueue, toBullQueueName } from './bullmq-queue';
import { InMemoryJobQueue } from './job-queue';

/**
 * The BullMQ driver is verified against a stand-in for the library: what has to
 * be right is the queue name, the connection options, the job that is added,
 * how a delivered job reaches the handler and how failures are remembered.
 * Running a real Redis is not needed for any of that.
 */
const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  queueClose: vi.fn(),
  workerClose: vi.fn(),
  queueNames: [] as string[],
  queueOptions: [] as unknown[],
  workerOptions: [] as unknown[],
  workers: [] as Array<{
    name: string;
    processor: (job: unknown) => Promise<unknown>;
    handlers: Record<string, (...args: unknown[]) => void>;
  }>,
}));

vi.mock('bullmq', () => ({
  Queue: class FakeQueue {
    readonly name: string;
    constructor(name: string, options: unknown) {
      this.name = name;
      mocks.queueNames.push(name);
      mocks.queueOptions.push(options);
    }
    add(name: string, data: unknown): Promise<unknown> {
      return mocks.add(name, data) as Promise<unknown>;
    }
    close(): Promise<void> {
      return mocks.queueClose() as Promise<void>;
    }
  },
  Worker: class FakeWorker {
    readonly name: string;
    readonly processor: (job: unknown) => Promise<unknown>;
    readonly handlers: Record<string, (...args: unknown[]) => void> = {};
    constructor(name: string, processor: (job: unknown) => Promise<unknown>, options: unknown) {
      this.name = name;
      this.processor = processor;
      mocks.workerOptions.push(options);
      mocks.workers.push(this);
    }
    on(event: string, handler: (...args: unknown[]) => void): this {
      this.handlers[event] = handler;
      return this;
    }
    close(): Promise<void> {
      return mocks.workerClose() as Promise<void>;
    }
  },
}));

interface PublishInput {
  siteId: string;
  paths: string[];
}

const bullJob = (data: unknown) => ({
  id: '42',
  data,
  attemptsMade: 1,
  timestamp: 1_760_000_000_000,
});

describe('toBullQueueName', () => {
  it('turns an injection token into a name BullMQ accepts', () => {
    expect(toBullQueueName('lumio:publish-queue')).toBe('lumio-publish-queue');
    expect(toBullQueueName('lumio:media queue')).toBe('lumio-media-queue');
  });
});

describe('connectionFromRedisUrl', () => {
  it('maps a plain redis URL to connection options a worker can retry on', () => {
    expect(connectionFromRedisUrl('redis://localhost:49537')).toMatchObject({
      host: 'localhost',
      port: 49537,
      maxRetriesPerRequest: null,
    });
  });

  it('carries the database, credentials and TLS across', () => {
    expect(connectionFromRedisUrl('rediss://user:pa%40ss@redis.example.com:6380/3')).toMatchObject({
      host: 'redis.example.com',
      port: 6380,
      username: 'user',
      password: 'pa@ss',
      db: 3,
      tls: {},
    });
  });
});

describe('BullMqJobQueue', () => {
  beforeEach(() => {
    mocks.add.mockReset();
    mocks.queueClose.mockReset();
    mocks.workerClose.mockReset();
    mocks.queueNames.length = 0;
    mocks.queueOptions.length = 0;
    mocks.workerOptions.length = 0;
    mocks.workers.length = 0;
    mocks.add.mockResolvedValue(bullJob({ siteId: 'site-a', paths: ['/about'] }));
    mocks.queueClose.mockResolvedValue(undefined);
    mocks.workerClose.mockResolvedValue(undefined);
  });

  it('refuses to start without a Redis URL', () => {
    expect(() => new BullMqJobQueue<PublishInput>({ name: 'lumio:publish-queue' })).toThrow(
      /REDIS_URL/,
    );
  });

  it('adds the payload to the named queue with retries configured', async () => {
    const queue = new BullMqJobQueue<PublishInput>({
      name: 'lumio:publish-queue',
      redisUrl: 'redis://localhost:49537',
    });

    const job = await queue.add({ siteId: 'site-a', paths: ['/about'] });

    expect(mocks.queueNames).toEqual(['lumio-publish-queue']);
    expect(mocks.add).toHaveBeenCalledWith('job', { siteId: 'site-a', paths: ['/about'] });
    expect(job.id).toBe('42');
    expect(job.siteId).toBe('site-a');
    expect(job.paths).toEqual(['/about']);
    expect(queue.size).toBe(1);

    const options = mocks.queueOptions[0] as {
      defaultJobOptions: { attempts: number };
      connection: { maxRetriesPerRequest: null };
    };
    expect(options.defaultJobOptions.attempts).toBe(3);
    expect(options.connection.maxRetriesPerRequest).toBeNull();
  });

  it('delivers jobs through a worker instead of pulling them by hand', async () => {
    const queue = new BullMqJobQueue<PublishInput>({
      name: 'lumio:publish-queue',
      redisUrl: 'redis://localhost:49537',
    });
    const handled: string[] = [];

    const consumer = await queue.consume(async (job) => {
      handled.push(job.paths[0] ?? '');
      expect(job.attempts).toBe(1);
    });

    expect(await queue.take()).toBeNull();

    const worker = mocks.workers[0];
    expect(worker?.name).toBe('lumio-publish-queue');
    await worker?.processor(bullJob({ siteId: 'site-a', paths: ['/sitemap.xml'] }));

    expect(handled).toEqual(['/sitemap.xml']);

    // Completion is reported by BullMQ, which also lowers the backlog counter.
    worker?.handlers.completed?.(bullJob({}));
    expect(queue.size).toBe(0);

    await consumer.stop();
    expect(mocks.workerClose).toHaveBeenCalledTimes(1);
  });

  it('remembers the failures BullMQ reports', async () => {
    const queue = new BullMqJobQueue<PublishInput>({
      name: 'lumio:publish-queue',
      redisUrl: 'redis://localhost:49537',
    });
    await queue.add({ siteId: 'site-a', paths: ['/about'] });
    await queue.consume(async () => undefined);

    mocks.workers[0]?.handlers.failed?.(
      bullJob({ siteId: 'site-a', paths: ['/about'] }),
      new Error('renderer responded 500'),
    );

    expect(queue.failures).toHaveLength(1);
    expect(queue.failures[0]?.reason).toBe('renderer responded 500');
    expect(queue.size).toBe(0);
  });

  it('also records a failure the API reports itself', async () => {
    const queue = new BullMqJobQueue<PublishInput>({
      name: 'lumio:publish-queue',
      redisUrl: 'redis://localhost:49537',
    });
    const job = await queue.add({ siteId: 'site-a', paths: [] });

    queue.fail(job, 'renderer unreachable');
    queue.complete(job.id);

    expect(queue.failures).toEqual([{ job, reason: 'renderer unreachable' }]);
  });

  it('closes the workers and the queue', async () => {
    const queue = new BullMqJobQueue<PublishInput>({
      name: 'lumio:publish-queue',
      redisUrl: 'redis://localhost:49537',
    });
    await queue.consume(async () => undefined);

    await queue.close();

    expect(mocks.workerClose).toHaveBeenCalledTimes(1);
    expect(mocks.queueClose).toHaveBeenCalledTimes(1);
    expect(queue.driver).toBe('bullmq');
  });

  it('keeps the worker concurrency off the main thread budget', async () => {
    const queue = new BullMqJobQueue<PublishInput>({
      name: 'lumio:media-queue',
      redisUrl: 'redis://localhost:49537',
      concurrency: 3,
    });
    await queue.consume(async () => undefined);

    expect(mocks.workerOptions[0]).toMatchObject({ concurrency: 3 });
  });
});

describe('createJobQueue', () => {
  it('builds an in-process queue unless Redis is asked for', () => {
    const queue = createJobQueue<PublishInput>({
      name: 'lumio:publish-queue',
      prefix: 'pub',
      env: {} as NodeJS.ProcessEnv,
    });

    expect(queue).toBeInstanceOf(InMemoryJobQueue);
    expect(queue.driver).toBe('memory');
  });

  it('builds the Redis driver when QUEUE_DRIVER=bullmq', () => {
    const queue = createJobQueue<PublishInput>({
      name: 'lumio:publish-queue',
      prefix: 'pub',
      env: {
        QUEUE_DRIVER: 'bullmq',
        REDIS_URL: 'redis://localhost:49537',
      } as NodeJS.ProcessEnv,
    });

    expect(queue).toBeInstanceOf(BullMqJobQueue);
    expect(queue.driver).toBe('bullmq');
  });
});