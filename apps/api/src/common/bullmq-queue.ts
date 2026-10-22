import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';
import {
  InMemoryJobQueue,
  queueDriverName,
  type ConsumeOptions,
  type JobFailure,
  type JobHandler,
  type JobOf,
  type JobQueue,
  type QueueConsumer,
} from './job-queue';

export interface BullMqOptions {
  /** Queue name; publish and media jobs use separate queues. */
  name: string;
  redisUrl?: string;
  /** Kept for the worker: how many jobs one worker handles at a time. */
  concurrency?: number;
}

/** How many failures stay in memory for the dashboard/tests. */
const MAX_REMEMBERED_FAILURES = 100;

/**
 * BullMQ rejects `:` in a queue name, and the injection tokens look like
 * `lumio:publish-queue`. The token stays the DI key; the Redis key is derived
 * from it here so both the API and the worker agree.
 */
export const toBullQueueName = (name: string): string =>
  name.replace(/[^A-Za-z0-9_.-]+/g, '-');

/**
 * `REDIS_URL` in the shape BullMQ expects. It is parsed once here so the URL in
 * `.env.example` keeps working for the rate limiter and the queue alike.
 */
export const connectionFromRedisUrl = (redisUrl: string): ConnectionOptions => {
  const url = new URL(redisUrl);
  const database = url.pathname.replace(/^\//, '');

  return {
    host: url.hostname,
    port: Number(url.port || '6379'),
    // A worker must keep a job when the connection blips, or Redis would mark
    // it as stalled; BullMQ requires this to be null.
    maxRetriesPerRequest: null,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(database ? { db: Number(database) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
};

const toJob = <Input>(job: Job, input: Input): JobOf<Input> =>
  ({
    ...input,
    id: String(job.id ?? ''),
    attempts: job.attemptsMade,
    createdAt: new Date(job.timestamp ?? Date.now()).toISOString(),
  }) as JobOf<Input>;

/**
 * Redis-backed driver. Jobs live in a BullMQ queue, so every API instance can
 * enqueue and every worker can consume the same backlog; retries and the
 * attempts counter are handled by BullMQ itself.
 *
 * Delivery is push-based: `consume` starts a `Worker` and `take` therefore
 * answers `null`. Failures surfaced by the worker are remembered in memory so
 * the worker log and the tests can see them.
 */
export class BullMqJobQueue<Input extends object> implements JobQueue<Input> {
  readonly driver = 'bullmq' as const;

  private readonly queue: Queue;
  private readonly connection: ConnectionOptions;
  private readonly queueName: string;
  private readonly workers: Worker[] = [];
  private readonly failureList: Array<JobFailure<Input>> = [];
  private pending = 0;

  constructor(private readonly options: BullMqOptions) {
    const redisUrl = options.redisUrl?.trim() ?? '';
    if (!redisUrl) {
      throw new Error('ต้องตั้งค่า REDIS_URL ก่อนใช้ QUEUE_DRIVER=bullmq');
    }

    this.queueName = toBullQueueName(options.name);
    this.connection = connectionFromRedisUrl(redisUrl);
    this.queue = new Queue(this.queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    });
  }

  async add(input: Input): Promise<JobOf<Input>> {
    const job = await this.queue.add('job', input);
    this.pending += 1;
    return toJob(job, input);
  }

  async take(): Promise<JobOf<Input> | null> {
    // BullMQ hands jobs to its own worker; there is nothing to pull by hand.
    return null;
  }

  complete(_jobId: string): void {
    // BullMQ marks the job completed once the worker's handler resolves.
  }

  fail(job: JobOf<Input>, reason: string): void {
    this.remember(job, reason);
    this.pending = Math.max(0, this.pending - 1);
  }

  async consume(
    handler: JobHandler<Input>,
    _options: ConsumeOptions = {},
  ): Promise<QueueConsumer> {
    const worker = new Worker(
      this.queueName,
      async (job: Job) => {
        const input = (job.data ?? {}) as Input;
        await handler(toJob(job, input));
      },
      { connection: this.connection, concurrency: this.options.concurrency ?? 2 },
    );

    worker.on('completed', () => {
      this.pending = Math.max(0, this.pending - 1);
    });
    worker.on('failed', (job: Job | undefined, error: Error) => {
      this.pending = Math.max(0, this.pending - 1);
      if (job) this.remember(toJob(job, (job.data ?? {}) as Input), error.message);
    });

    this.workers.push(worker);
    return {
      stop: async () => {
        await worker.close();
      },
    };
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.workers.length = 0;
    await this.queue.close();
  }

  get size(): number {
    return this.pending;
  }

  get failures(): ReadonlyArray<JobFailure<Input>> {
    return this.failureList;
  }

  private remember(job: JobOf<Input>, reason: string): void {
    this.failureList.push({ job, reason });
    if (this.failureList.length > MAX_REMEMBERED_FAILURES) this.failureList.shift();
  }
}

/**
 * Builds the queue the modules inject: Redis when `QUEUE_DRIVER=bullmq`, an
 * in-process queue otherwise (docs/design/18-deployment.md).
 */
export const createJobQueue = <Input extends object>(options: {
  name: string;
  prefix: string;
  env?: NodeJS.ProcessEnv;
}): JobQueue<Input> => {
  const env = options.env ?? process.env;
  if (queueDriverName(env) === 'bullmq') {
    return new BullMqJobQueue<Input>({ name: options.name, redisUrl: env.REDIS_URL });
  }
  return new InMemoryJobQueue<Input>(options.prefix);
};